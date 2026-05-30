import XCTest
import HealthKit
@testable import RepifyHealthKit

final class AccessResolverTests: XCTestCase {
    func testUnavailableDevice() async {
        let resolver = HealthAccessResolver(
            reader: StubHealthReader(),
            flagStore: InMemoryFlagStore(),
            isAvailable: { false }
        )
        let state = await resolver.resolveAccessState(for: .steps)
        XCTAssertEqual(state, .unavailable)
    }

    func testNotRequestedWhenFlagAbsent() async {
        let resolver = HealthAccessResolver(
            reader: StubHealthReader(),
            flagStore: InMemoryFlagStore(),
            isAvailable: { true }
        )
        let state = await resolver.resolveAccessState(for: .steps)
        XCTAssertEqual(state, .notRequested)
    }

    func testGrantedWithDataWhenSamplesExist() async {
        let flags = InMemoryFlagStore()
        flags.markAuthorizationRequested(for: .bodyMass)

        let reader = StubHealthReader()
        let sample = HKQuantitySample(
            type: HKQuantityType(.bodyMass),
            quantity: HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: 70),
            start: Date(),
            end: Date()
        )
        reader.samplesToReturn = [sample]

        let resolver = HealthAccessResolver(reader: reader, flagStore: flags, isAvailable: { true })
        let state = await resolver.resolveAccessState(for: .bodyMass)
        XCTAssertEqual(state, .grantedWithData)
    }

    func testGrantedNoDataWhenEmpty() async {
        let flags = InMemoryFlagStore()
        flags.markAuthorizationRequested(for: .steps)

        let resolver = HealthAccessResolver(
            reader: StubHealthReader(), // zwraca pustą listę
            flagStore: flags,
            isAvailable: { true }
        )
        let state = await resolver.resolveAccessState(for: .steps)
        XCTAssertEqual(state, .grantedNoData)
    }

    func testGrantedNoDataWhenReadThrows() async {
        let flags = InMemoryFlagStore()
        flags.markAuthorizationRequested(for: .steps)

        let reader = StubHealthReader()
        reader.fetchSamplesError = HealthKitError.queryFailed(message: "boom")

        let resolver = HealthAccessResolver(reader: reader, flagStore: flags, isAvailable: { true })
        let state = await resolver.resolveAccessState(for: .steps)
        // Błąd odczytu traktujemy jak brak danych, nie jak twardy błąd.
        XCTAssertEqual(state, .grantedNoData)
    }
}
