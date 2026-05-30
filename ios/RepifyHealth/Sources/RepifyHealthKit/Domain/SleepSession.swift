import Foundation

/// Faza snu w domenie — odpowiednik wartości `HKCategoryValueSleepAnalysis`,
/// ale bez zależności od HealthKit.
public enum SleepStageKind: String, Codable, Sendable {
    case inBed
    case awake
    case asleepUnspecified
    case core
    case deep
    case rem
}

/// Pojedynczy odcinek snu o znanej fazie.
public struct SleepStage: Equatable, Codable, Sendable {
    public let kind: SleepStageKind
    public let interval: DateInterval

    public init(kind: SleepStageKind, interval: DateInterval) {
        self.kind = kind
        self.interval = interval
    }
}

/// Sesja snu złożona z faz (sekcja 2.3 blueprintu).
///
/// HealthKit reprezentuje sen jako wiele próbek kategorii; domena scala je w jedną
/// sesję z wyliczonym oknem „w łóżku" i (opcjonalnie) oknem faktycznego snu.
public struct SleepSession: Identifiable, Equatable, Codable, Sendable {
    public let id: UUID
    public let inBed: DateInterval
    public let asleep: DateInterval?
    public let stages: [SleepStage]
    public let timeZoneIdentifier: String

    public init(
        id: UUID,
        inBed: DateInterval,
        asleep: DateInterval?,
        stages: [SleepStage],
        timeZoneIdentifier: String
    ) {
        self.id = id
        self.inBed = inBed
        self.asleep = asleep
        self.stages = stages
        self.timeZoneIdentifier = timeZoneIdentifier
    }

    /// Łączny czas faktycznego snu (suma faz innych niż `inBed`/`awake`).
    public var totalAsleep: TimeInterval {
        stages
            .filter { $0.kind != .inBed && $0.kind != .awake }
            .reduce(0) { $0 + $1.interval.duration }
    }
}
