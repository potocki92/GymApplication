import Foundation
import HealthKit

/// Granica anty-korupcyjna: tłumaczy typy HealthKit na czyste typy domenowe
/// (sekcja 2.4 blueprintu).
///
/// To jedyne miejsce (obok `HealthKitDataSource`), w którym domena „dotyka"
/// HealthKit. Mapper jest bezstanowy i deterministyczny → trywialny do testów
/// jednostkowych z ręcznie złożonymi próbkami.
public struct HealthKitMapper {
    public init() {}

    // MARK: - Most enumów (HealthDataType ↔ MetricKind)

    /// Domenowy odpowiednik typu z warstwy HealthKit.
    public func metricKind(for type: HealthDataType) -> MetricKind {
        switch type {
        case .steps:                return .steps
        case .heartRate:            return .heartRate
        case .restingHeartRate:     return .restingHeartRate
        case .heartRateVariability: return .hrv
        case .sleepAnalysis:        return .sleep
        case .activeEnergy:         return .activeEnergy
        case .basalEnergy:          return .basalEnergy
        case .bodyMass:             return .bodyMass
        case .workouts:             return .workout
        }
    }

    /// Typ z warstwy HealthKit odpowiadający metryce domenowej.
    public func healthDataType(for kind: MetricKind) -> HealthDataType {
        switch kind {
        case .steps:            return .steps
        case .heartRate:        return .heartRate
        case .restingHeartRate: return .restingHeartRate
        case .hrv:              return .heartRateVariability
        case .sleep:            return .sleepAnalysis
        case .activeEnergy:     return .activeEnergy
        case .basalEnergy:      return .basalEnergy
        case .bodyMass:         return .bodyMass
        case .workout:          return .workouts
        }
    }

    // MARK: - Pomiary ilościowe

    /// Mapuje próbkę ilościową na `HealthMetric`. `id == sample.uuid` (idempotencja).
    public func metric(
        from sample: HKQuantitySample,
        kind: MetricKind,
        unit: HKUnit,
        domainUnit: MetricUnit
    ) -> HealthMetric {
        HealthMetric(
            id: sample.uuid,
            kind: kind,
            value: sample.quantity.doubleValue(for: unit),
            unit: domainUnit,
            start: sample.startDate,
            end: sample.endDate,
            source: sample.sourceRevision.source.bundleIdentifier
        )
    }

    // MARK: - Sen

    /// Mapuje pojedynczą wartość kategorii snu na fazę domenową.
    public func sleepStageKind(from value: Int) -> SleepStageKind {
        guard let analysis = HKCategoryValueSleepAnalysis(rawValue: value) else {
            return .asleepUnspecified
        }
        switch analysis {
        case .inBed:              return .inBed
        case .awake:              return .awake
        case .asleepCore:         return .core
        case .asleepDeep:         return .deep
        case .asleepREM:          return .rem
        case .asleepUnspecified:  return .asleepUnspecified
        @unknown default:         return .asleepUnspecified
        }
    }

    /// Scala próbki kategorii snu w jedną sesję (sekcja 2.3).
    ///
    /// Okno „w łóżku" wyliczamy z minimalnego startu i maksymalnego końca,
    /// a okno snu z faz różnych niż `inBed`/`awake`. Zwraca `nil` dla pustego wejścia.
    public func sleepSession(from samples: [HKCategorySample]) -> SleepSession? {
        guard let first = samples.min(by: { $0.startDate < $1.startDate }) else { return nil }

        let stages = samples.map {
            SleepStage(
                kind: sleepStageKind(from: $0.value),
                interval: DateInterval(start: $0.startDate, end: $0.endDate)
            )
        }

        let inBedStart = samples.map(\.startDate).min() ?? first.startDate
        let inBedEnd = samples.map(\.endDate).max() ?? first.endDate

        let asleepStages = stages.filter { $0.kind != .inBed && $0.kind != .awake }
        let asleep: DateInterval?
        if let start = asleepStages.map({ $0.interval.start }).min(),
           let end = asleepStages.map({ $0.interval.end }).max() {
            asleep = DateInterval(start: start, end: end)
        } else {
            asleep = nil
        }

        return SleepSession(
            id: first.uuid,
            inBed: DateInterval(start: inBedStart, end: inBedEnd),
            asleep: asleep,
            stages: stages,
            timeZoneIdentifier: TimeZone.current.identifier
        )
    }

    // MARK: - Treningi

    /// Mapuje `HKWorkout` na domenowe podsumowanie treningu.
    public func workoutSummary(from workout: HKWorkout) -> WorkoutSummary {
        WorkoutSummary(
            id: workout.uuid,
            activity: activityName(for: workout.workoutActivityType),
            start: workout.startDate,
            end: workout.endDate,
            activeEnergyKcal: workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
            distanceMeters: workout.totalDistance?.doubleValue(for: .meter()),
            source: workout.sourceRevision.source.bundleIdentifier
        )
    }

    /// Czytelna nazwa najczęstszych aktywności; reszta jako `other(<rawValue>)`.
    private func activityName(for type: HKWorkoutActivityType) -> String {
        switch type {
        case .running:                    return "running"
        case .walking:                    return "walking"
        case .cycling:                    return "cycling"
        case .swimming:                   return "swimming"
        case .traditionalStrengthTraining: return "strengthTraining"
        case .functionalStrengthTraining: return "functionalStrength"
        case .highIntensityIntervalTraining: return "hiit"
        case .yoga:                       return "yoga"
        case .coreTraining:               return "coreTraining"
        case .rowing:                     return "rowing"
        default:                          return "other(\(type.rawValue))"
        }
    }
}
