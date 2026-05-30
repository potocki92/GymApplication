import Foundation
import HealthKit

/// Wynik pojedynczego kroku synchronizacji przyrostowej dla jednego typu.
public struct IncrementalChange {
    public let addedCount: Int
    public let deletedCount: Int
    public let newAnchor: HKQueryAnchor?

    public init(addedCount: Int, deletedCount: Int, newAnchor: HKQueryAnchor?) {
        self.addedCount = addedCount
        self.deletedCount = deletedCount
        self.newAnchor = newAnchor
    }
}

/// Źródło danych oparte o HealthKit, zwracające **typy domenowe** (sekcja 2.2).
///
/// Spina niskopoziomowe `HealthReading` / `HealthWriting` (punkt 1) z `HealthKitMapper`,
/// tak aby `HealthRepositoryImpl` nie znał już ani `HKSample`, ani `HKUnit`.
/// To ostatnia warstwa, w której pojawia się `import HealthKit`.
public final class HealthKitDataSource {
    private let reader: HealthReading
    private let writer: HealthWriting
    private let mapper: HealthKitMapper
    private let anchorStore: HealthAnchorStore
    private let calendar: Calendar

    public init(
        reader: HealthReading = HealthKitReader(),
        writer: HealthWriting = HealthKitWriter(),
        mapper: HealthKitMapper = HealthKitMapper(),
        anchorStore: HealthAnchorStore = InMemoryAnchorStore(),
        calendar: Calendar = .current
    ) {
        self.reader = reader
        self.writer = writer
        self.mapper = mapper
        self.anchorStore = anchorStore
        self.calendar = calendar
    }

    // MARK: - Agregaty dzienne

    /// Suma dzienna typu ilościowego (kroki, energia aktywna).
    public func dailySum(for kind: MetricKind, on day: Date) async throws -> Double? {
        try await dailyStatistic(for: kind, on: day, options: .cumulativeSum)
    }

    /// Średnia dzienna typu ilościowego (tętno spoczynkowe, HRV).
    public func dailyAverage(for kind: MetricKind, on day: Date) async throws -> Double? {
        try await dailyStatistic(for: kind, on: day, options: .discreteAverage)
    }

    private func dailyStatistic(
        for kind: MetricKind,
        on day: Date,
        options: HKStatisticsOptions
    ) async throws -> Double? {
        let type = mapper.healthDataType(for: kind)
        guard
            let quantityType = type.readObjectType as? HKQuantityType,
            let unit = type.canonicalUnit
        else { return nil }

        let dayStart = calendar.startOfDay(for: day)
        guard let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) else { return nil }

        let stats = try await reader.fetchDailyStatistics(
            quantityType: quantityType,
            unit: unit,
            options: options,
            start: dayStart,
            end: dayEnd,
            calendar: calendar
        )
        return stats[dayStart]
    }

    /// Najnowsza wartość typu ilościowego (np. ostatnia zmierzona masa ciała).
    public func latestValue(for kind: MetricKind) async throws -> Double? {
        let type = mapper.healthDataType(for: kind)
        guard
            let quantityType = type.readObjectType as? HKQuantityType,
            let unit = type.canonicalUnit
        else { return nil }

        let samples = try await reader.fetchSamples(
            type: quantityType,
            predicate: nil,
            limit: 1,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
        )
        guard let sample = samples.first as? HKQuantitySample else { return nil }
        return mapper
            .metric(from: sample, kind: kind, unit: unit, domainUnit: domainUnit(for: kind))
            .value
    }

    // MARK: - Sen i treningi

    /// Sesja snu nakładająca się na dobę `day` (sekcja 2.3 / mapper scala fazy).
    public func sleepSession(on day: Date) async throws -> SleepSession? {
        guard let sampleType = HealthDataType.sleepAnalysis.sampleType else { return nil }
        let samples = try await reader.fetchSamples(
            type: sampleType,
            predicate: dayOverlapPredicate(for: day),
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
        )
        let categorySamples = samples.compactMap { $0 as? HKCategorySample }
        return mapper.sleepSession(from: categorySamples)
    }

    /// Treningi rozpoczęte/zakończone w dobie `day`.
    public func workouts(on day: Date) async throws -> [WorkoutSummary] {
        let samples = try await reader.fetchSamples(
            type: HKObjectType.workoutType(),
            predicate: dayOverlapPredicate(for: day),
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
        )
        return samples
            .compactMap { $0 as? HKWorkout }
            .map(mapper.workoutSummary(from:))
    }

    // MARK: - Synchronizacja przyrostowa

    /// Synchronizacja delta dla zbioru typów: czyta anchor z `anchorStore`, odpytuje
    /// HealthKit i zapisuje nowy anchor. Zwraca zsumowane liczności — bez wyciekania
    /// `HKQueryAnchor` na zewnątrz (anchor jest opaque dla warstwy repozytorium).
    public func sync(_ kinds: Set<MetricKind>) async throws -> (added: Int, deleted: Int, kinds: Set<MetricKind>) {
        var added = 0
        var deleted = 0
        var synced: Set<MetricKind> = []

        // Deterministyczna kolejnosc po rawValue — stabilne testy i logi.
        for kind in kinds.sorted(by: { $0.rawValue < $1.rawValue }) {
            let change = try await incremental(for: kind, anchor: anchorStore.anchor(for: kind))
            anchorStore.setAnchor(change.newAnchor, for: kind)
            added += change.addedCount
            deleted += change.deletedCount
            synced.insert(kind)
        }
        return (added, deleted, synced)
    }

    /// Odczyt delta względem anchora — zwraca liczności i nowy anchor (sekcja 3.2).
    public func incremental(for kind: MetricKind, anchor: HKQueryAnchor?) async throws -> IncrementalChange {
        let type = mapper.healthDataType(for: kind)
        guard let sampleType = type.sampleType else {
            return IncrementalChange(addedCount: 0, deletedCount: 0, newAnchor: anchor)
        }
        let result = try await reader.fetchIncremental(
            type: sampleType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        )
        return IncrementalChange(
            addedCount: result.added.count,
            deletedCount: result.deleted.count,
            newAnchor: result.newAnchor
        )
    }

    // MARK: - Zapis

    /// Zapis masy ciała do Apple Health.
    public func saveBodyMass(_ kilograms: Double, at date: Date) async throws {
        try await writer.saveQuantity(
            kilograms,
            type: .bodyMass,
            start: date,
            end: date,
            metadata: nil
        )
    }

    // MARK: - Helpers

    private func dayOverlapPredicate(for day: Date) -> NSPredicate {
        let dayStart = calendar.startOfDay(for: day)
        let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? day
        return HKQuery.predicateForSamples(withStart: dayStart, end: dayEnd, options: [])
    }

    private func domainUnit(for kind: MetricKind) -> MetricUnit {
        switch kind {
        case .steps:                            return .count
        case .heartRate, .restingHeartRate:     return .bpm
        case .hrv:                              return .millisecond
        case .activeEnergy, .basalEnergy:       return .kilocalorie
        case .bodyMass:                         return .kilogram
        case .sleep, .workout:                  return .minute
        }
    }
}
