import XCTest
import HealthKit
@testable import FitFlowHealthKit

final class WriterTests: XCTestCase {
    func testSaveQuantityThrowsWhenUnavailable() async {
        let store = InMemoryHealthStore()
        let writer = HealthKitWriter(
            store: store,
            authorization: HealthKitAuthorizationService(store: store, isAvailable: { true }),
            isAvailable: { false }
        )
        do {
            try await writer.saveQuantity(70, type: .bodyMass, start: Date(), end: Date())
            XCTFail("Powinno rzucić unavailableOnDevice")
        } catch {
            XCTAssertEqual(error as? HealthKitError, .unavailableOnDevice)
        }
    }

    func testSaveQuantityThrowsForUnsupportedType() async {
        let store = InMemoryHealthStore()
        let writer = HealthKitWriter(store: store, isAvailable: { true })
        do {
            try await writer.saveQuantity(60, type: .heartRate, start: Date(), end: Date())
            XCTFail("heartRate nie jest zapisywalny")
        } catch {
            XCTAssertEqual(error as? HealthKitError, .unsupportedType("heartRate"))
        }
    }

    func testSaveQuantityThrowsWhenWriteNotAuthorized() async {
        let store = InMemoryHealthStore()
        // Brak wpisu => .notDetermined => odmowa zapisu.
        let writer = HealthKitWriter(
            store: store,
            authorization: HealthKitAuthorizationService(store: store, isAvailable: { true }),
            isAvailable: { true }
        )
        do {
            try await writer.saveQuantity(70, type: .bodyMass, start: Date(), end: Date())
            XCTFail("Powinno rzucić writeAuthorizationDenied")
        } catch {
            XCTAssertEqual(error as? HealthKitError, .writeAuthorizationDenied)
        }
    }

    func testSaveQuantitySucceedsWhenAuthorized() async throws {
        let store = InMemoryHealthStore()
        store.writeStatuses[HKQuantityType(.bodyMass)] = .sharingAuthorized
        let writer = HealthKitWriter(
            store: store,
            authorization: HealthKitAuthorizationService(store: store, isAvailable: { true }),
            isAvailable: { true }
        )

        try await writer.saveQuantity(72.5, type: .bodyMass, start: Date(), end: Date())

        XCTAssertEqual(store.savedObjects.count, 1)
        let saved = try XCTUnwrap(store.savedObjects.first as? HKQuantitySample)
        XCTAssertEqual(saved.quantity.doubleValue(for: .gramUnit(with: .kilo)), 72.5, accuracy: 0.001)
    }
}

final class DeduplicationTests: XCTestCase {
    func testDeduplicatedByUUIDKeepsFirst() {
        let s1 = HKQuantitySample(
            type: HKQuantityType(.stepCount),
            quantity: HKQuantity(unit: .count(), doubleValue: 100),
            start: Date(), end: Date()
        )
        let s2 = HKQuantitySample(
            type: HKQuantityType(.stepCount),
            quantity: HKQuantity(unit: .count(), doubleValue: 200),
            start: Date(), end: Date()
        )
        // Dwie różne próbki mają różne uuid — obie powinny przetrwać.
        let result = HealthKitDeduplication.deduplicatedByUUID([s1, s2, s1])
        XCTAssertEqual(result.count, 2)
    }
}
