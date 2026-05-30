import Foundation

/// Composition root — lekki, konstruktorowy DI bez frameworka (sekcja 2.6 blueprintu).
///
/// Jedyne miejsce, które „wie", jak złożyć graf zależności: manager HealthKit (punkt 1),
/// źródło danych, repozytorium i use case'y. Prezentacja dostaje gotowe use case'y i
/// nie zna warstwy Data. `@MainActor`, bo kontener bywa tworzony i czytany z UI.
@MainActor
public final class AppContainer {
    public let healthKitManager: HealthKitManager

    public let healthRepository: HealthRepository

    public let getDailyDashboard: GetDailyDashboardUseCase
    public let syncHealth: SyncHealthUseCase
    public let saveBodyMass: SaveBodyMassUseCase

    public init(
        healthKitManager: HealthKitManager = HealthKitManager(),
        anchorStore: HealthAnchorStore = InMemoryAnchorStore()
    ) {
        self.healthKitManager = healthKitManager

        let dataSource = HealthKitDataSource(
            reader: healthKitManager.reader,
            writer: healthKitManager.writer,
            anchorStore: anchorStore
        )
        let repository = HealthRepositoryImpl(healthKit: dataSource)
        self.healthRepository = repository

        self.getDailyDashboard = GetDailyDashboardUseCase(repository: repository)
        self.syncHealth = SyncHealthUseCase(repository: repository)
        self.saveBodyMass = SaveBodyMassUseCase(repository: repository)
    }

    /// Czy HealthKit jest dostępny — proxy do managera (punkt 1.1).
    public var isHealthDataAvailable: Bool { healthKitManager.isHealthDataAvailable }

    /// Żądanie zgody na domyślne zestawy typów (read/write).
    public func requestAuthorization() async throws {
        try await healthKitManager.requestAuthorization()
    }
}
