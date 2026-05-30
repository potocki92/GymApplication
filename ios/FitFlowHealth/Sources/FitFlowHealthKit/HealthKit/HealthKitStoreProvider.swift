import Foundation
import HealthKit

/// Dostawca pojedynczej instancji `HKHealthStore` na cały cykl życia aplikacji
/// (sekcja 1.1 blueprintu).
///
/// `HKHealthStore` jest kosztowny w utworzeniu i powinien istnieć jako jedna
/// długo żyjąca instancja — nie tworzymy go per-request. Background delivery
/// wymaga, by store istniał wcześnie w cyklu życia procesu.
public final class HealthKitStoreProvider {
    public static let shared = HealthKitStoreProvider()

    public let store: HKHealthStore

    private init() {
        self.store = HKHealthStore()
    }

    /// Czy HealthKit jest w ogóle dostępny na tym urządzeniu.
    ///
    /// Zwraca `false` na iPad (dla większości typów), Mac Catalyst itp.
    /// MUSI być sprawdzane przed każdą operacją HealthKit.
    public var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }
}
