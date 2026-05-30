import XCTest
import HealthKit
@testable import FitFlowHealthKit

final class ObservationTests: XCTestCase {
    func testStartObservingRegistersObserverAndBackgroundDelivery() async {
        let store = InMemoryHealthStore()
        let service = HealthKitObservationService(
            store: store,
            isAvailable: { true },
            onChange: { _ in }
        )

        service.startObserving([.steps])

        XCTAssertEqual(store.executedQueries.count, 1)
        XCTAssertTrue(store.executedQueries.first is HKObserverQuery)

        // Background delivery jest włączane w Tasku — dajemy mu chwilę.
        try? await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertTrue(store.backgroundDeliveryEnabledFor.contains(HKQuantityType(.stepCount)))
    }

    func testStartObservingNoopWhenUnavailable() {
        let store = InMemoryHealthStore()
        let service = HealthKitObservationService(
            store: store,
            isAvailable: { false },
            onChange: { _ in }
        )
        service.startObserving([.steps, .heartRate])
        XCTAssertTrue(store.executedQueries.isEmpty)
    }

    func testStopObservingStopsAllQueries() {
        let store = InMemoryHealthStore()
        let service = HealthKitObservationService(
            store: store,
            isAvailable: { true },
            onChange: { _ in }
        )
        service.startObserving([.steps, .heartRate])
        service.stopObserving()
        XCTAssertEqual(store.stoppedQueries.count, 2)
    }
}
