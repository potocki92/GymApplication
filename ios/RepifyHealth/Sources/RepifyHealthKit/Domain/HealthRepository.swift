import Foundation

/// Abstrakcja dostępu do danych zdrowotnych widziana przez domenę (sekcja 2.2 / 2.5).
///
/// Domena i prezentacja znają **wyłącznie** ten protokół — nie wiedzą, czy dane
/// pochodzą z HealthKit, lokalnej bazy czy backendu. Dzięki temu:
/// - ViewModel testujemy z `MockHealthRepository` bez urządzenia,
/// - w przyszłości można dołożyć Google Fit / Garmin za tą samą abstrakcją.
///
/// Implementacja produkcyjna: `HealthRepositoryImpl` (warstwa Data).
public protocol HealthRepository: AnyObject {
    /// Zbudowanie migawki pulpitu dla danego dnia (agregaty + sen + treningi).
    func dashboardSnapshot(for day: Date) async throws -> DashboardSnapshot

    /// Synchronizacja przyrostowa wskazanych metryk (delta przez anchory).
    func syncIncrementally(_ kinds: Set<MetricKind>) async throws -> SyncResult

    /// Zapis masy ciała do źródła danych (np. Apple Health).
    func saveBodyMass(_ kilograms: Double, at date: Date) async throws
}
