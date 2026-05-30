import Foundation

/// Migawka pulpitu zdrowotnego dla jednego dnia (sekcja 2.5 blueprintu).
///
/// To agregat, który prezentacja (ViewModel) konsumuje wprost — żadnych pól
/// opcjonalnych „na zapas". Pola są opcjonalne tylko tam, gdzie brak danych jest
/// poprawnym stanem (Apple ukrywa zgodę na odczyt → brak danych ≠ błąd, sekcja 1.7).
public struct DashboardSnapshot: Equatable, Codable, Sendable {
    public let day: Date
    public let steps: Double?
    public let activeEnergyKcal: Double?
    public let restingHeartRate: Double?
    public let heartRateVariabilityMs: Double?
    public let latestBodyMassKg: Double?
    public let sleep: SleepSession?
    public let workouts: [WorkoutSummary]

    public init(
        day: Date,
        steps: Double? = nil,
        activeEnergyKcal: Double? = nil,
        restingHeartRate: Double? = nil,
        heartRateVariabilityMs: Double? = nil,
        latestBodyMassKg: Double? = nil,
        sleep: SleepSession? = nil,
        workouts: [WorkoutSummary] = []
    ) {
        self.day = day
        self.steps = steps
        self.activeEnergyKcal = activeEnergyKcal
        self.restingHeartRate = restingHeartRate
        self.heartRateVariabilityMs = heartRateVariabilityMs
        self.latestBodyMassKg = latestBodyMassKg
        self.sleep = sleep
        self.workouts = workouts
    }

    /// Pusta migawka — używana, gdy HealthKit jest niedostępny lub nie ma żadnych danych.
    public static func empty(for day: Date) -> DashboardSnapshot {
        DashboardSnapshot(day: day)
    }
}

/// Wynik synchronizacji przyrostowej (sekcja 3.2 blueprintu).
public struct SyncResult: Equatable, Sendable {
    public let added: Int
    public let deleted: Int
    public let kinds: Set<MetricKind>

    public init(added: Int, deleted: Int, kinds: Set<MetricKind>) {
        self.added = added
        self.deleted = deleted
        self.kinds = kinds
    }

    public static var empty: SyncResult { SyncResult(added: 0, deleted: 0, kinds: []) }

    /// Suma dwóch wyników — wygodne przy agregacji synchronizacji wielu typów.
    public static func + (lhs: SyncResult, rhs: SyncResult) -> SyncResult {
        SyncResult(
            added: lhs.added + rhs.added,
            deleted: lhs.deleted + rhs.deleted,
            kinds: lhs.kinds.union(rhs.kinds)
        )
    }
}
