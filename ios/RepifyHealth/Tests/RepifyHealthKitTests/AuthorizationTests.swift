import XCTest
import HealthKit
@testable import RepifyHealthKit

final class AuthorizationTests: XCTestCase {
    func testRequestAuthorizationThrowsWhenUnavailable() async {
        let store = InMemoryHealthStore()
        let service = HealthKitAuthorizationService(store: store, isAvailable: { false })

        do {
            try await service.requestAuthorization(read: [.steps], write: [])
            XCTFail("Powinno rzucić unavailableOnDevice")
        } catch {
            XCTAssertEqual(error as? HealthKitError, .unavailableOnDevice)
        }
    }

    func testRequestAuthorizationForwardsReadAndWriteTypes() async throws {
        let store = InMemoryHealthStore()
        let service = HealthKitAuthorizationService(store: store, isAvailable: { true })

        try await service.requestAuthorization(read: [.steps, .heartRate], write: [.bodyMass])

        XCTAssertTrue(store.requestedReadTypes.contains(HKQuantityType(.stepCount)))
        XCTAssertTrue(store.requestedReadTypes.contains(HKQuantityType(.heartRate)))
        XCTAssertEqual(store.requestedShareTypes, [HKQuantityType(.bodyMass)])
    }

    func testReadOnlyTypesAreNotRequestedForSharing() async throws {
        let store = InMemoryHealthStore()
        let service = HealthKitAuthorizationService(store: store, isAvailable: { true })

        // Tętno jest tylko-do-odczytu — nie powinno trafić do toShare.
        try await service.requestAuthorization(read: [.heartRate], write: [.heartRate])

        XCTAssertTrue(store.requestedShareTypes.isEmpty)
    }

    func testWriteAuthorizationStatusReturnsNotDeterminedForReadOnlyType() {
        let store = InMemoryHealthStore()
        let service = HealthKitAuthorizationService(store: store, isAvailable: { true })

        XCTAssertEqual(service.writeAuthorizationStatus(for: .heartRate), .notDetermined)
    }

    func testWriteAuthorizationStatusReflectsStore() {
        let store = InMemoryHealthStore()
        store.writeStatuses[HKQuantityType(.bodyMass)] = .sharingAuthorized
        let service = HealthKitAuthorizationService(store: store, isAvailable: { true })

        XCTAssertEqual(service.writeAuthorizationStatus(for: .bodyMass), .sharingAuthorized)
    }
}
