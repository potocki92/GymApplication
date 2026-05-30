import Foundation
@testable import RepifyHealthKit

/// Mock repozytorium domenowego — pozwala testować use case'y / ViewModel bez HealthKit
/// (sekcja 2.7 blueprintu: wstrzykujemy `MockHealthRepository`, asercje na stanie).
final class MockHealthRepository: HealthRepository {
    var snapshotToReturn: DashboardSnapshot?
    var syncResultToReturn: SyncResult = .empty
    var errorToThrow: Error?

    private(set) var requestedDays: [Date] = []
    private(set) var requestedSyncKinds: [Set<MetricKind>] = []
    private(set) var savedBodyMass: [(kg: Double, date: Date)] = []

    func dashboardSnapshot(for day: Date) async throws -> DashboardSnapshot {
        if let errorToThrow { throw errorToThrow }
        requestedDays.append(day)
        return snapshotToReturn ?? .empty(for: day)
    }

    func syncIncrementally(_ kinds: Set<MetricKind>) async throws -> SyncResult {
        if let errorToThrow { throw errorToThrow }
        requestedSyncKinds.append(kinds)
        return syncResultToReturn
    }

    func saveBodyMass(_ kilograms: Double, at date: Date) async throws {
        if let errorToThrow { throw errorToThrow }
        savedBodyMass.append((kilograms, date))
    }
}
