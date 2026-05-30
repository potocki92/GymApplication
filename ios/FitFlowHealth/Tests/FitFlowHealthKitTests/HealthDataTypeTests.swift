import XCTest
import HealthKit
@testable import FitFlowHealthKit

final class HealthDataTypeTests: XCTestCase {
    func testEveryTypeHasReadObjectType() {
        for type in HealthDataType.allCases {
            XCTAssertNotNil(type.readObjectType, "\(type) powinien mieć typ do odczytu")
        }
    }

    func testOnlyExpectedTypesAreWritable() {
        let writable = HealthDataType.allCases.filter { $0.writeSampleType != nil }
        XCTAssertEqual(Set(writable), [.bodyMass, .activeEnergy, .workouts])
    }

    func testReadOnlyTypesHaveNoWriteType() {
        XCTAssertNil(HealthDataType.heartRate.writeSampleType)
        XCTAssertNil(HealthDataType.sleepAnalysis.writeSampleType)
        XCTAssertNil(HealthDataType.restingHeartRate.writeSampleType)
    }

    func testCanonicalUnitsForQuantityTypes() {
        XCTAssertEqual(HealthDataType.steps.canonicalUnit, .count())
        XCTAssertEqual(HealthDataType.bodyMass.canonicalUnit, .gramUnit(with: .kilo))
        XCTAssertEqual(HealthDataType.activeEnergy.canonicalUnit, .kilocalorie())
        XCTAssertEqual(
            HealthDataType.heartRate.canonicalUnit,
            HKUnit.count().unitDivided(by: .minute())
        )
    }

    func testNonQuantityTypesHaveNoCanonicalUnit() {
        XCTAssertNil(HealthDataType.sleepAnalysis.canonicalUnit)
        XCTAssertNil(HealthDataType.workouts.canonicalUnit)
    }

    func testSampleTypeBridging() {
        // Quantity i category są sample types; workout też.
        XCTAssertNotNil(HealthDataType.steps.sampleType)
        XCTAssertNotNil(HealthDataType.sleepAnalysis.sampleType)
        XCTAssertNotNil(HealthDataType.workouts.sampleType)
    }
}
