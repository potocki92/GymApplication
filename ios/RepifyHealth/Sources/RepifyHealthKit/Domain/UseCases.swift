import Foundation

/// Use case: pobranie migawki pulpitu na dany dzień (sekcja 2.5 blueprintu).
///
/// Use case'y są cienkie celowo — enkapsulują intencję i izolują ViewModel od
/// konkretnej metody repozytorium. `callAsFunction` pozwala wołać je jak funkcję:
/// `let snapshot = try await getDashboard(today)`.
public struct GetDailyDashboardUseCase {
    private let repository: HealthRepository

    public init(repository: HealthRepository) {
        self.repository = repository
    }

    public func callAsFunction(_ day: Date = .now) async throws -> DashboardSnapshot {
        try await repository.dashboardSnapshot(for: day)
    }
}

/// Use case: synchronizacja przyrostowa danych zdrowotnych (sekcja 3 blueprintu).
public struct SyncHealthUseCase {
    private let repository: HealthRepository

    public init(repository: HealthRepository) {
        self.repository = repository
    }

    public func callAsFunction(
        _ kinds: Set<MetricKind> = MetricKind.syncableSet
    ) async throws -> SyncResult {
        try await repository.syncIncrementally(kinds)
    }
}

/// Use case: zapis masy ciała do Apple Health (sekcja 1.3 — strona write).
public struct SaveBodyMassUseCase {
    private let repository: HealthRepository

    public init(repository: HealthRepository) {
        self.repository = repository
    }

    public func callAsFunction(_ kilograms: Double, at date: Date = .now) async throws {
        try await repository.saveBodyMass(kilograms, at: date)
    }
}
