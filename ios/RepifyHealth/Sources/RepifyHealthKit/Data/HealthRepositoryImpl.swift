import Foundation

/// Produkcyjna implementacja `HealthRepository` (sekcja 2.2 blueprintu).
///
/// Celowo **nie importuje HealthKit** — całość pracy z `HKSample`/`HKUnit` jest
/// zamknięta w `HealthKitDataSource` i `HealthKitMapper`. Repozytorium tylko
/// orkiestruje źródło danych i składa migawkę pulpitu z równoległych odczytów.
public final class HealthRepositoryImpl: HealthRepository {
    private let healthKit: HealthKitDataSource

    public init(healthKit: HealthKitDataSource = HealthKitDataSource()) {
        self.healthKit = healthKit
    }

    public func dashboardSnapshot(for day: Date) async throws -> DashboardSnapshot {
        // Odczyty są niezależne → uruchamiamy je równolegle przez async let.
        async let steps = healthKit.dailySum(for: .steps, on: day)
        async let activeEnergy = healthKit.dailySum(for: .activeEnergy, on: day)
        async let restingHR = healthKit.dailyAverage(for: .restingHeartRate, on: day)
        async let hrv = healthKit.dailyAverage(for: .hrv, on: day)
        async let bodyMass = healthKit.latestValue(for: .bodyMass)
        async let sleep = healthKit.sleepSession(on: day)
        async let workouts = healthKit.workouts(on: day)

        return DashboardSnapshot(
            day: day,
            steps: try await steps,
            activeEnergyKcal: try await activeEnergy,
            restingHeartRate: try await restingHR,
            heartRateVariabilityMs: try await hrv,
            latestBodyMassKg: try await bodyMass,
            sleep: try await sleep,
            workouts: try await workouts
        )
    }

    public func syncIncrementally(_ kinds: Set<MetricKind>) async throws -> SyncResult {
        let result = try await healthKit.sync(kinds)
        return SyncResult(added: result.added, deleted: result.deleted, kinds: result.kinds)
    }

    public func saveBodyMass(_ kilograms: Double, at date: Date) async throws {
        try await healthKit.saveBodyMass(kilograms, at: date)
    }
}
