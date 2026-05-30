import Foundation
import HealthKit
@testable import RepifyHealthKit

/// Deterministyczny mock seamu `HealthStore` do testów (sekcja 2.7 blueprintu).
///
/// `HKHealthStore` jest `final` i niemockowalny — testujemy przez nasz protokół.
final class InMemoryHealthStore: HealthStore {
    // Konfiguracja zachowania
    var requestAuthorizationError: Error?
    var saveError: Error?
    var enableBackgroundDeliveryError: Error?
    var writeStatuses: [HKObjectType: HKAuthorizationStatus] = [:]

    // Rejestr wywołań (asercje w testach)
    private(set) var requestedShareTypes: Set<HKSampleType> = []
    private(set) var requestedReadTypes: Set<HKObjectType> = []
    private(set) var savedObjects: [HKObject] = []
    private(set) var executedQueries: [HKQuery] = []
    private(set) var stoppedQueries: [HKQuery] = []
    private(set) var backgroundDeliveryEnabledFor: [HKObjectType] = []

    func requestAuthorization(
        toShare typesToShare: Set<HKSampleType>,
        read typesToRead: Set<HKObjectType>
    ) async throws {
        if let requestAuthorizationError { throw requestAuthorizationError }
        requestedShareTypes = typesToShare
        requestedReadTypes = typesToRead
    }

    func authorizationStatus(for type: HKObjectType) -> HKAuthorizationStatus {
        writeStatuses[type] ?? .notDetermined
    }

    func execute(_ query: HKQuery) {
        executedQueries.append(query)
    }

    func stop(_ query: HKQuery) {
        stoppedQueries.append(query)
    }

    func enableBackgroundDelivery(
        for type: HKObjectType,
        frequency: HKUpdateFrequency
    ) async throws {
        if let enableBackgroundDeliveryError { throw enableBackgroundDeliveryError }
        backgroundDeliveryEnabledFor.append(type)
    }

    func save(_ objects: [HKObject]) async throws {
        if let saveError { throw saveError }
        savedObjects.append(contentsOf: objects)
    }
}

/// Mock czytnika — pozwala sterować wynikami bez realnego HealthKit.
final class StubHealthReader: HealthReading {
    var samplesToReturn: [HKSample] = []
    var statisticsToReturn: [Date: Double] = [:]
    var incrementalToReturn = AnchoredFetchResult(added: [], deleted: [], newAnchor: nil)
    var fetchSamplesError: Error?

    private(set) var fetchSamplesCallCount = 0

    func fetchSamples(
        type: HKSampleType,
        predicate: NSPredicate?,
        limit: Int,
        sortDescriptors: [NSSortDescriptor]
    ) async throws -> [HKSample] {
        fetchSamplesCallCount += 1
        if let fetchSamplesError { throw fetchSamplesError }
        return samplesToReturn
    }

    func fetchDailyStatistics(
        quantityType: HKQuantityType,
        unit: HKUnit,
        options: HKStatisticsOptions,
        start: Date,
        end: Date,
        calendar: Calendar
    ) async throws -> [Date: Double] {
        statisticsToReturn
    }

    func fetchIncremental(
        type: HKSampleType,
        predicate: NSPredicate?,
        anchor: HKQueryAnchor?,
        limit: Int
    ) async throws -> AnchoredFetchResult {
        incrementalToReturn
    }
}

/// Mock flagi „czy pytaliśmy o autoryzację".
final class InMemoryFlagStore: AuthorizationRequestFlagStore {
    private var requested: Set<HealthDataType> = []

    func hasRequestedAuthorization(for type: HealthDataType) -> Bool {
        requested.contains(type)
    }

    func markAuthorizationRequested(for type: HealthDataType) {
        requested.insert(type)
    }
}
