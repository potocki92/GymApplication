import XCTest
@testable import RepifyHealthKit

/// Testy czystej domeny — bez HealthKit (sekcja 2.7: Domain / UseCases = czyste testy).
final class DomainModelTests: XCTestCase {
    func testEmptyDashboardSnapshotHasNoData() {
        let day = Date(timeIntervalSince1970: 1_700_000_000)
        let snapshot = DashboardSnapshot.empty(for: day)

        XCTAssertEqual(snapshot.day, day)
        XCTAssertNil(snapshot.steps)
        XCTAssertNil(snapshot.sleep)
        XCTAssertTrue(snapshot.workouts.isEmpty)
    }

    func testSyncResultAdditionAggregatesCountsAndKinds() {
        let a = SyncResult(added: 3, deleted: 1, kinds: [.steps])
        let b = SyncResult(added: 2, deleted: 4, kinds: [.sleep, .steps])

        let sum = a + b

        XCTAssertEqual(sum.added, 5)
        XCTAssertEqual(sum.deleted, 5)
        XCTAssertEqual(sum.kinds, [.steps, .sleep])
    }

    func testSyncResultEmptyIsNeutralElement() {
        let result = SyncResult(added: 7, deleted: 2, kinds: [.workout])
        XCTAssertEqual(result + .empty, result)
    }

    func testSleepSessionTotalAsleepExcludesAwakeAndInBed() {
        let base = Date(timeIntervalSince1970: 1_700_000_000)
        func interval(_ from: Double, _ to: Double) -> DateInterval {
            DateInterval(start: base.addingTimeInterval(from), end: base.addingTimeInterval(to))
        }

        let session = SleepSession(
            id: UUID(),
            inBed: interval(0, 3600),
            asleep: interval(300, 3300),
            stages: [
                SleepStage(kind: .inBed, interval: interval(0, 3600)),   // ignorowane
                SleepStage(kind: .awake, interval: interval(0, 300)),    // ignorowane
                SleepStage(kind: .core, interval: interval(300, 1800)),  // 1500s
                SleepStage(kind: .deep, interval: interval(1800, 3300)), // 1500s
            ],
            timeZoneIdentifier: "Europe/Warsaw"
        )

        XCTAssertEqual(session.totalAsleep, 3000, accuracy: 0.001)
    }

    func testMetricKindSetsAreNonEmptyAndDashboardIsSubsetOfSyncable() {
        XCTAssertFalse(MetricKind.dashboardSet.isEmpty)
        XCTAssertTrue(MetricKind.dashboardSet.isSubset(of: MetricKind.syncableSet))
    }

    func testWorkoutSummaryDurationMatchesInterval() {
        let start = Date(timeIntervalSince1970: 1_700_000_000)
        let workout = WorkoutSummary(
            id: UUID(),
            activity: "running",
            start: start,
            end: start.addingTimeInterval(1800),
            activeEnergyKcal: 250,
            distanceMeters: 5000,
            source: "com.apple.health"
        )
        XCTAssertEqual(workout.duration, 1800, accuracy: 0.001)
    }
}
