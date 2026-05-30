import Foundation

/// Błędy domenowe warstwy HealthKit.
///
/// Świadomie NIE rozróżniamy „użytkownik odmówił odczytu" jako osobnego błędu —
/// Apple celowo ukrywa stan zgody na odczyt (privacy), więc odmowa odczytu
/// manifestuje się jako pusty wynik (`HealthKitError.noData`), nie jako błąd.
/// Patrz `HealthAccessState` oraz sekcja 1.7 blueprintu.
public enum HealthKitError: Error, Equatable {
    /// Urządzenie nie wspiera HealthKit (np. iPad dla większości typów, Mac Catalyst).
    case unavailableOnDevice

    /// Żądany typ nie jest obsługiwany / nie ma odpowiednika w HealthKit.
    case unsupportedType(String)

    /// Zapis odrzucony przez użytkownika (wiarygodne TYLKO dla typów do zapisu).
    case writeAuthorizationDenied

    /// Brak danych — może oznaczać odmowę odczytu albo po prostu pusty zbiór.
    case noData

    /// Zapytanie HealthKit zwróciło błąd.
    case queryFailed(message: String)

    public static func == (lhs: HealthKitError, rhs: HealthKitError) -> Bool {
        switch (lhs, rhs) {
        case (.unavailableOnDevice, .unavailableOnDevice),
             (.writeAuthorizationDenied, .writeAuthorizationDenied),
             (.noData, .noData):
            return true
        case let (.unsupportedType(a), .unsupportedType(b)):
            return a == b
        case let (.queryFailed(a), .queryFailed(b)):
            return a == b
        default:
            return false
        }
    }
}

extension HealthKitError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .unavailableOnDevice:
            return "HealthKit nie jest dostępny na tym urządzeniu."
        case let .unsupportedType(name):
            return "Typ danych nie jest obsługiwany: \(name)."
        case .writeAuthorizationDenied:
            return "Brak zgody na zapis danych do Apple Health."
        case .noData:
            return "Brak danych w Apple Health dla tego zakresu."
        case let .queryFailed(message):
            return "Zapytanie do Apple Health nie powiodło się: \(message)."
        }
    }
}
