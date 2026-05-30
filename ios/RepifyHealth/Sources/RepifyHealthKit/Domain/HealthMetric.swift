import Foundation

/// Rodzaj metryki zdrowotnej w czystej domenie (sekcja 2.3 blueprintu).
///
/// To domenowy odpowiednik `HealthDataType` — różnica jest celowa: `HealthDataType`
/// żyje w warstwie HealthKit i zna `HKObjectType`, a `MetricKind` jest niezależny od
/// platformy. Most między nimi mieszka w `HealthKitMapper` (granica anty-korupcyjna),
/// dzięki czemu domena i UI nie importują HealthKit.
public enum MetricKind: String, Codable, Sendable, CaseIterable {
    case steps
    case heartRate
    case restingHeartRate
    case hrv
    case activeEnergy
    case basalEnergy
    case bodyMass
    case sleep
    case workout

    /// Metryki domyślnie pokazywane na pulpicie zdrowotnym.
    public static var dashboardSet: Set<MetricKind> {
        [.steps, .activeEnergy, .restingHeartRate, .hrv, .bodyMass, .sleep, .workout]
    }

    /// Metryki objęte synchronizacją przyrostową (delta przez anchory — sekcja 3.2).
    public static var syncableSet: Set<MetricKind> {
        [.steps, .heartRate, .restingHeartRate, .hrv, .activeEnergy, .basalEnergy, .bodyMass, .sleep, .workout]
    }
}

/// Jednostka domenowa metryki — niezależna od `HKUnit`.
///
/// Trzymamy wąski, zamknięty zbiór jednostek faktycznie używanych przez aplikację;
/// konwersja z/do `HKUnit` jest odpowiedzialnością mappera w warstwie Data.
public enum MetricUnit: String, Codable, Sendable {
    case count          // kroki
    case bpm            // tętno / tętno spoczynkowe
    case millisecond    // HRV (SDNN)
    case kilocalorie    // energia aktywna / podstawowa
    case kilogram       // masa ciała
    case minute         // czas (sen / trening)
}

/// Pojedynczy pomiar zdrowotny w domenie (sekcja 2.3 blueprintu).
///
/// `id` jest równe `HKSample.uuid`, co daje idempotencję przy synchronizacji:
/// ten sam pomiar nigdy nie zostanie zapisany dwa razy (sekcja 1.6 / 3.4).
public struct HealthMetric: Identifiable, Equatable, Codable, Sendable {
    public let id: UUID
    public let kind: MetricKind
    public let value: Double
    public let unit: MetricUnit
    public let start: Date
    public let end: Date
    /// `bundleIdentifier` źródła próbki (np. zegarek vs telefon) — przydatne do audytu.
    public let source: String

    public init(
        id: UUID,
        kind: MetricKind,
        value: Double,
        unit: MetricUnit,
        start: Date,
        end: Date,
        source: String
    ) {
        self.id = id
        self.kind = kind
        self.value = value
        self.unit = unit
        self.start = start
        self.end = end
        self.source = source
    }
}
