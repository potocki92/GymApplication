import Foundation
import HealthKit

/// Empiryczny stan dostępu do danego typu danych (sekcja 1.7 blueprintu).
///
/// Ponieważ Apple ukrywa status zgody na ODCZYT, nie możemy zapytać systemu
/// „czy user się zgodził". Zamiast tego wnioskujemy ze stanu faktycznego.
public enum HealthAccessState: Equatable {
    /// Urządzenie nie wspiera HealthKit.
    case unavailable
    /// Jeszcze nie pytaliśmy o zgodę.
    case notRequested
    /// Pytaliśmy i są dane — odczyt na pewno działa.
    case grantedWithData
    /// Pytaliśmy, ale brak danych — może odmowa, może po prostu pusty zbiór.
    /// UX traktuje to jako „brak danych / sprawdź uprawnienia", NIE jako błąd.
    case grantedNoData
}

/// Persystencja flagi „czy już prosiliśmy o autoryzację".
///
/// Domyślnie `UserDefaults`; w testach wstrzykiwalny mock.
public protocol AuthorizationRequestFlagStore: AnyObject {
    func hasRequestedAuthorization(for type: HealthDataType) -> Bool
    func markAuthorizationRequested(for type: HealthDataType)
}

public final class UserDefaultsAuthorizationFlagStore: AuthorizationRequestFlagStore {
    private let defaults: UserDefaults
    private let keyPrefix = "fitflow.health.authRequested."

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    private func key(for type: HealthDataType) -> String { keyPrefix + type.rawValue }

    public func hasRequestedAuthorization(for type: HealthDataType) -> Bool {
        defaults.bool(forKey: key(for: type))
    }

    public func markAuthorizationRequested(for type: HealthDataType) {
        defaults.set(true, forKey: key(for: type))
    }
}

/// Ustala empiryczny stan dostępu do typu danych.
public final class HealthAccessResolver {
    private let reader: HealthReading
    private let flagStore: AuthorizationRequestFlagStore
    private let isAvailable: () -> Bool
    private let lookbackDays: Int

    public init(
        reader: HealthReading = HealthKitReader(),
        flagStore: AuthorizationRequestFlagStore = UserDefaultsAuthorizationFlagStore(),
        isAvailable: @escaping () -> Bool = { HKHealthStore.isHealthDataAvailable() },
        lookbackDays: Int = 30
    ) {
        self.reader = reader
        self.flagStore = flagStore
        self.isAvailable = isAvailable
        self.lookbackDays = lookbackDays
    }

    /// Ustala stan dostępu, próbując odczytać 1 najnowszą próbkę z ostatnich N dni.
    public func resolveAccessState(for type: HealthDataType) async -> HealthAccessState {
        guard isAvailable() else { return .unavailable }
        guard flagStore.hasRequestedAuthorization(for: type) else { return .notRequested }
        guard let sampleType = type.sampleType else { return .grantedNoData }

        let start = Date().addingTimeInterval(-Double(lookbackDays) * 86_400)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: [])

        let samples = try? await reader.fetchSamples(
            type: sampleType,
            predicate: predicate,
            limit: 1,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
        )

        return (samples?.isEmpty == false) ? .grantedWithData : .grantedNoData
    }
}
