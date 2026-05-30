import Foundation
import HealthKit

/// Centralny, jedyny katalog typów danych zdrowotnych obsługiwanych przez aplikację
/// (single source of truth — sekcja 1.2 blueprintu).
///
/// Trzymanie wszystkich typów w jednym miejscu upraszcza:
/// - żądanie autoryzacji (read/write rozdzielone),
/// - synchronizację (każdy typ ma własny anchor),
/// - testy (deterministyczna iteracja po `allCases`).
public enum HealthDataType: String, CaseIterable, Sendable {
    case steps
    case heartRate
    case restingHeartRate
    case heartRateVariability
    case sleepAnalysis
    case activeEnergy
    case basalEnergy
    case bodyMass
    case workouts

    /// Typ obiektu, który CZYTAMY z HealthKit.
    ///
    /// Zwraca `nil` tylko teoretycznie — wszystkie obecne typy są odczytywalne.
    public var readObjectType: HKObjectType? {
        switch self {
        case .steps:                return HKQuantityType(.stepCount)
        case .heartRate:            return HKQuantityType(.heartRate)
        case .restingHeartRate:     return HKQuantityType(.restingHeartRate)
        case .heartRateVariability: return HKQuantityType(.heartRateVariabilitySDNN)
        case .sleepAnalysis:        return HKCategoryType(.sleepAnalysis)
        case .activeEnergy:         return HKQuantityType(.activeEnergyBurned)
        case .basalEnergy:          return HKQuantityType(.basalEnergyBurned)
        case .bodyMass:             return HKQuantityType(.bodyMass)
        case .workouts:             return HKObjectType.workoutType()
        }
    }

    /// Typ próbki, który ZAPISUJEMY do HealthKit.
    ///
    /// Tylko podzbiór typów jest zapisywalny — nie zapisujemy np. tętna czy snu,
    /// bo to pomiary pochodzące z urządzeń (Apple Watch). `nil` => tylko odczyt.
    public var writeSampleType: HKSampleType? {
        switch self {
        case .bodyMass:     return HKQuantityType(.bodyMass)
        case .activeEnergy: return HKQuantityType(.activeEnergyBurned)
        case .workouts:     return HKObjectType.workoutType()
        default:            return nil
        }
    }

    /// Czy ten typ jest typem próbki (`HKSampleType`) — wymagane dla observer/anchored query.
    public var sampleType: HKSampleType? {
        readObjectType as? HKSampleType
    }

    /// Kanoniczna jednostka HealthKit dla typów ilościowych.
    ///
    /// Dla typów nie-ilościowych (sen, treningi) zwraca `nil` — ich wartości
    /// reprezentujemy inaczej (kategorie / agregaty czasu).
    public var canonicalUnit: HKUnit? {
        switch self {
        case .steps:                return .count()
        case .heartRate:            return HKUnit.count().unitDivided(by: .minute()) // bpm
        case .restingHeartRate:     return HKUnit.count().unitDivided(by: .minute()) // bpm
        case .heartRateVariability: return .secondUnit(with: .milli)                 // ms
        case .activeEnergy:         return .kilocalorie()
        case .basalEnergy:          return .kilocalorie()
        case .bodyMass:             return .gramUnit(with: .kilo)                     // kg
        case .sleepAnalysis, .workouts:
            return nil
        }
    }

    /// Domyślny zestaw typów potrzebnych do pulpitu zdrowotnego (read).
    public static var dashboardReadSet: Set<HealthDataType> {
        [.steps, .heartRate, .restingHeartRate, .heartRateVariability,
         .sleepAnalysis, .activeEnergy, .basalEnergy, .bodyMass, .workouts]
    }

    /// Domyślny zestaw typów, które aplikacja może zapisywać (write).
    public static var defaultWriteSet: Set<HealthDataType> {
        [.bodyMass, .activeEnergy, .workouts]
    }
}
