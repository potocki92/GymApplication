import Foundation
import HealthKit

/// Obsługa observer queries + background delivery (sekcja 1.5 blueprintu).
///
/// Dwa współpracujące mechanizmy:
///  1. `HKObserverQuery` — system woła handler, gdy pojawią się nowe dane (budzik).
///  2. `enableBackgroundDelivery` — pozwala budzić aplikację także w tle/po zabiciu.
///
/// Reakcja na zdarzenie (delta-sync do lokalnej DB) jest wstrzykiwana jako
/// `onChange`, by warstwa obserwacji nie znała szczegółów synchronizacji
/// (to należy do sekcji 3 — `HealthSyncService`).
public final class HealthKitObservationService {
    /// Akcja wykonywana po wybudzeniu observera dla danego typu.
    /// Powinna wykonać przyrostowy sync i zwrócić się szybko (sekundy).
    public typealias OnChange = (HealthDataType) async -> Void

    private let store: HealthStore
    private let isAvailable: () -> Bool
    private let onChange: OnChange
    private var activeObservers: [HKObserverQuery] = []

    public init(
        store: HealthStore = HealthKitStoreProvider.shared.store,
        isAvailable: @escaping () -> Bool = { HKHealthStore.isHealthDataAvailable() },
        onChange: @escaping OnChange
    ) {
        self.store = store
        self.isAvailable = isAvailable
        self.onChange = onChange
    }

    /// Rejestruje observery i włącza background delivery dla podanych typów.
    ///
    /// Wywołuj wcześnie w cyklu życia procesu (App.init / didFinishLaunching),
    /// bo system wybudza proces i oczekuje, że observery już istnieją.
    public func startObserving(
        _ types: Set<HealthDataType>,
        frequency: HKUpdateFrequency = .hourly
    ) {
        guard isAvailable() else { return }

        for type in types {
            guard let sampleType = type.sampleType else { continue }

            let observer = HKObserverQuery(
                sampleType: sampleType,
                predicate: nil
            ) { [weak self] _, completionHandler, error in
                guard let self else {
                    completionHandler()
                    return
                }
                if error != nil {
                    // KRYTYCZNE: completion MUSI być wywołany nawet przy błędzie,
                    // inaczej iOS przestanie nas budzić (throttling).
                    completionHandler()
                    return
                }

                Task {
                    // defer gwarantuje wywołanie completion w każdej ścieżce.
                    defer { completionHandler() }
                    await self.onChange(type)
                }
            }

            store.execute(observer)
            activeObservers.append(observer)

            Task {
                // Błąd background delivery logujemy diagnostycznie, nie pokazujemy userowi.
                try? await store.enableBackgroundDelivery(for: sampleType, frequency: frequency)
            }
        }
    }

    /// Zatrzymuje wszystkie aktywne observery (np. przy wylogowaniu / czyszczeniu).
    public func stopObserving() {
        for observer in activeObservers {
            store.stop(observer)
        }
        activeObservers.removeAll()
    }
}
