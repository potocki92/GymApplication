import Foundation
import HealthKit

/// Abstrakcja zapisu do HealthKit (sekcja 1.3 — strona write).
public protocol HealthWriting: AnyObject {
    /// Zapisuje pojedynczy pomiar ilościowy (np. masa ciała, kalorie aktywne).
    func saveQuantity(
        _ value: Double,
        type: HealthDataType,
        start: Date,
        end: Date,
        metadata: [String: Any]?
    ) async throws
}

public final class HealthKitWriter: HealthWriting {
    private let store: HealthStore
    private let authorization: HealthAuthorizing
    private let isAvailable: () -> Bool

    public init(
        store: HealthStore = HealthKitStoreProvider.shared.store,
        authorization: HealthAuthorizing = HealthKitAuthorizationService(),
        isAvailable: @escaping () -> Bool = { HKHealthStore.isHealthDataAvailable() }
    ) {
        self.store = store
        self.authorization = authorization
        self.isAvailable = isAvailable
    }

    public func saveQuantity(
        _ value: Double,
        type: HealthDataType,
        start: Date,
        end: Date,
        metadata: [String: Any]? = nil
    ) async throws {
        guard isAvailable() else { throw HealthKitError.unavailableOnDevice }

        guard
            let sampleType = type.writeSampleType,
            let quantityType = sampleType as? HKQuantityType,
            let unit = type.canonicalUnit
        else {
            throw HealthKitError.unsupportedType(type.rawValue)
        }

        // Stan zgody na zapis jest wiarygodny — sprawdzamy go zanim spróbujemy.
        guard authorization.writeAuthorizationStatus(for: type) == .sharingAuthorized else {
            throw HealthKitError.writeAuthorizationDenied
        }

        let quantity = HKQuantity(unit: unit, doubleValue: value)
        let sample = HKQuantitySample(
            type: quantityType,
            quantity: quantity,
            start: start,
            end: end,
            metadata: metadata
        )

        try await store.save([sample])
    }
}
