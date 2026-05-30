import Foundation
import HealthKit

/// Wynik zapytania przyrostowego (anchored) — sekcja 1.4(c) / 3.2 blueprintu.
public struct AnchoredFetchResult {
    public let added: [HKSample]
    public let deleted: [HKDeletedObject]
    public let newAnchor: HKQueryAnchor?

    public init(added: [HKSample], deleted: [HKDeletedObject], newAnchor: HKQueryAnchor?) {
        self.added = added
        self.deleted = deleted
        self.newAnchor = newAnchor
    }
}

/// Abstrakcja odczytu z HealthKit (sekcja 1.4 blueprintu).
public protocol HealthReading: AnyObject {
    /// (a) Jednorazowy odczyt surowych próbek.
    func fetchSamples(
        type: HKSampleType,
        predicate: NSPredicate?,
        limit: Int,
        sortDescriptors: [NSSortDescriptor]
    ) async throws -> [HKSample]

    /// (b) Agregaty w oknach czasu — HealthKit sam sumuje i deduplikuje źródła.
    func fetchDailyStatistics(
        quantityType: HKQuantityType,
        unit: HKUnit,
        options: HKStatisticsOptions,
        start: Date,
        end: Date,
        calendar: Calendar
    ) async throws -> [Date: Double]

    /// (c) Odczyt przyrostowy względem anchora — rdzeń synchronizacji delta.
    func fetchIncremental(
        type: HKSampleType,
        predicate: NSPredicate?,
        anchor: HKQueryAnchor?,
        limit: Int
    ) async throws -> AnchoredFetchResult
}

public final class HealthKitReader: HealthReading {
    private let store: HealthStore

    public init(store: HealthStore = HealthKitStoreProvider.shared.store) {
        self.store = store
    }

    // MARK: - (a) HKSampleQuery

    public func fetchSamples(
        type: HKSampleType,
        predicate: NSPredicate?,
        limit: Int = HKObjectQueryNoLimit,
        sortDescriptors: [NSSortDescriptor] = [
            NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        ]
    ) async throws -> [HKSample] {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: limit,
                sortDescriptors: sortDescriptors
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: HealthKitError.queryFailed(message: error.localizedDescription))
                } else {
                    continuation.resume(returning: samples ?? [])
                }
            }
            store.execute(query)
        }
    }

    // MARK: - (b) HKStatisticsCollectionQuery

    public func fetchDailyStatistics(
        quantityType: HKQuantityType,
        unit: HKUnit,
        options: HKStatisticsOptions = .cumulativeSum,
        start: Date,
        end: Date,
        calendar: Calendar = .current
    ) async throws -> [Date: Double] {
        let anchorDate = calendar.startOfDay(for: start)
        var interval = DateComponents()
        interval.day = 1

        return try await withCheckedThrowingContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(
                withStart: start,
                end: end,
                options: .strictStartDate
            )
            let query = HKStatisticsCollectionQuery(
                quantityType: quantityType,
                quantitySamplePredicate: predicate,
                options: options,
                anchorDate: anchorDate,
                intervalComponents: interval
            )

            query.initialResultsHandler = { _, results, error in
                if let error {
                    continuation.resume(throwing: HealthKitError.queryFailed(message: error.localizedDescription))
                    return
                }
                var output: [Date: Double] = [:]
                results?.enumerateStatistics(from: start, to: end) { statistics, _ in
                    let quantity: HKQuantity?
                    if options.contains(.cumulativeSum) {
                        quantity = statistics.sumQuantity()
                    } else if options.contains(.discreteAverage) {
                        quantity = statistics.averageQuantity()
                    } else {
                        quantity = statistics.mostRecentQuantity()
                    }
                    if let quantity {
                        output[statistics.startDate] = quantity.doubleValue(for: unit)
                    }
                }
                continuation.resume(returning: output)
            }

            store.execute(query)
        }
    }

    // MARK: - (c) HKAnchoredObjectQuery

    public func fetchIncremental(
        type: HKSampleType,
        predicate: NSPredicate? = nil,
        anchor: HKQueryAnchor?,
        limit: Int = HKObjectQueryNoLimit
    ) async throws -> AnchoredFetchResult {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKAnchoredObjectQuery(
                type: type,
                predicate: predicate,
                anchor: anchor,
                limit: limit
            ) { _, added, deleted, newAnchor, error in
                if let error {
                    continuation.resume(throwing: HealthKitError.queryFailed(message: error.localizedDescription))
                    return
                }
                continuation.resume(returning: AnchoredFetchResult(
                    added: added ?? [],
                    deleted: deleted ?? [],
                    newAnchor: newAnchor
                ))
            }
            store.execute(query)
        }
    }
}
