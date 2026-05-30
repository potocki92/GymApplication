import XCTest
import HealthKit
@testable import RepifyHealthKit

/// Testy mappera — granica HealthKit ↔ domena (sekcja 2.4).
///
/// Most enumów i mapowanie faz snu nie wymagają urządzenia (czyste wartości),
/// więc działają na każdym hoście z SDK HealthKit (macOS / Xcode).
final class HealthKitMapperTests: XCTestCase {
    private let mapper = HealthKitMapper()

    func testEnumBridgeRoundTripsForEveryType() {
        for type in HealthDataType.allCases {
            let kind = mapper.metricKind(for: type)
            XCTAssertEqual(
                mapper.healthDataType(for: kind),
                type,
                "Most enumów powinien być odwracalny dla \(type)"
            )
        }
    }

    func testEveryMetricKindMapsToAHealthDataType() {
        for kind in MetricKind.allCases {
            let type = mapper.healthDataType(for: kind)
            XCTAssertEqual(mapper.metricKind(for: type), kind)
        }
    }

    func testSleepStageMappingForKnownValues() {
        XCTAssertEqual(mapper.sleepStageKind(from: HKCategoryValueSleepAnalysis.inBed.rawValue), .inBed)
        XCTAssertEqual(mapper.sleepStageKind(from: HKCategoryValueSleepAnalysis.awake.rawValue), .awake)
        XCTAssertEqual(mapper.sleepStageKind(from: HKCategoryValueSleepAnalysis.asleepCore.rawValue), .core)
        XCTAssertEqual(mapper.sleepStageKind(from: HKCategoryValueSleepAnalysis.asleepDeep.rawValue), .deep)
        XCTAssertEqual(mapper.sleepStageKind(from: HKCategoryValueSleepAnalysis.asleepREM.rawValue), .rem)
    }

    func testSleepStageMappingFallsBackForUnknownValue() {
        XCTAssertEqual(mapper.sleepStageKind(from: 9999), .asleepUnspecified)
    }

    func testEmptySleepSamplesYieldNilSession() {
        XCTAssertNil(mapper.sleepSession(from: []))
    }
}
