import XCTest
@testable import RepifyHealthKit

/// Testy use case'ów na mocku repozytorium (sekcja 2.7 blueprintu).
final class UseCaseTests: XCTestCase {
    func testGetDailyDashboardDelegatesToRepository() async throws {
        let repo = MockHealthRepository()
        let day = Date(timeIntervalSince1970: 1_700_000_000)
        repo.snapshotToReturn = DashboardSnapshot(day: day, steps: 8421)

        let useCase = GetDailyDashboardUseCase(repository: repo)
        let snapshot = try await useCase(day)

        XCTAssertEqual(snapshot.steps, 8421)
        XCTAssertEqual(repo.requestedDays, [day])
    }

    func testSyncHealthUsesSyncableSetByDefault() async throws {
        let repo = MockHealthRepository()
        repo.syncResultToReturn = SyncResult(added: 12, deleted: 3, kinds: MetricKind.syncableSet)

        let useCase = SyncHealthUseCase(repository: repo)
        let result = try await useCase()

        XCTAssertEqual(result.added, 12)
        XCTAssertEqual(repo.requestedSyncKinds, [MetricKind.syncableSet])
    }

    func testSyncHealthForwardsExplicitKinds() async throws {
        let repo = MockHealthRepository()
        let useCase = SyncHealthUseCase(repository: repo)

        _ = try await useCase([.steps, .bodyMass])

        XCTAssertEqual(repo.requestedSyncKinds, [[.steps, .bodyMass]])
    }

    func testSaveBodyMassForwardsValueAndDate() async throws {
        let repo = MockHealthRepository()
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let useCase = SaveBodyMassUseCase(repository: repo)

        try await useCase(81.5, at: date)

        XCTAssertEqual(repo.savedBodyMass.count, 1)
        XCTAssertEqual(repo.savedBodyMass.first?.kg, 81.5)
        XCTAssertEqual(repo.savedBodyMass.first?.date, date)
    }

    func testUseCasePropagatesRepositoryError() async {
        let repo = MockHealthRepository()
        repo.errorToThrow = HealthKitError.unavailableOnDevice
        let useCase = GetDailyDashboardUseCase(repository: repo)

        do {
            _ = try await useCase(.now)
            XCTFail("Oczekiwano błędu")
        } catch {
            XCTAssertEqual(error as? HealthKitError, .unavailableOnDevice)
        }
    }
}
