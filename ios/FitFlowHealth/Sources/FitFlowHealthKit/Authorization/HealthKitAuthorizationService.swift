import Foundation
import HealthKit

/// Abstrakcja autoryzacji HealthKit (sekcja 1.3 blueprintu).
public protocol HealthAuthorizing: AnyObject {
    /// Żąda zgody na odczyt i/lub zapis podanych typów.
    ///
    /// UWAGA: nie rzuca błędu, gdy użytkownik odmówi — `HKHealthStore`
    /// zwraca sukces niezależnie od decyzji użytkownika (privacy). Stan zgody
    /// na odczyt stwierdzamy empirycznie (patrz `HealthAccessResolver`).
    func requestAuthorization(
        read: Set<HealthDataType>,
        write: Set<HealthDataType>
    ) async throws

    /// Stan zgody na ZAPIS danego typu.
    ///
    /// Wiarygodne TYLKO dla typów zapisywalnych. Dla typów tylko-do-odczytu
    /// zwraca `.notDetermined`, bo Apple ukrywa status odczytu.
    func writeAuthorizationStatus(for type: HealthDataType) -> HKAuthorizationStatus
}

public final class HealthKitAuthorizationService: HealthAuthorizing {
    private let store: HealthStore
    private let isAvailable: () -> Bool

    /// - Parameters:
    ///   - store: seam nad `HKHealthStore` (produkcja) lub mock (testy).
    ///   - isAvailable: zastrzyk dostępności HealthKit (domyślnie realny check).
    public init(
        store: HealthStore = HealthKitStoreProvider.shared.store,
        isAvailable: @escaping () -> Bool = { HKHealthStore.isHealthDataAvailable() }
    ) {
        self.store = store
        self.isAvailable = isAvailable
    }

    public func requestAuthorization(
        read: Set<HealthDataType>,
        write: Set<HealthDataType>
    ) async throws {
        guard isAvailable() else {
            throw HealthKitError.unavailableOnDevice
        }

        let readTypes = Set(read.compactMap { $0.readObjectType })
        let writeTypes = Set(write.compactMap { $0.writeSampleType })

        try await store.requestAuthorization(toShare: writeTypes, read: readTypes)
    }

    public func writeAuthorizationStatus(for type: HealthDataType) -> HKAuthorizationStatus {
        guard let writeType = type.writeSampleType else {
            // Typ tylko-do-odczytu — status zapisu nie ma sensu.
            return .notDetermined
        }
        return store.authorizationStatus(for: writeType)
    }
}
