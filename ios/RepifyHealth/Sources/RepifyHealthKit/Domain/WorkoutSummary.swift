import Foundation

/// Podsumowanie treningu w domenie (sekcja 2.3 blueprintu).
///
/// Świadomie nie modelujemy całej taksonomii `HKWorkoutActivityType` — przechowujemy
/// czytelny identyfikator aktywności (string) oraz agregaty potrzebne pulpitowi.
public struct WorkoutSummary: Identifiable, Equatable, Codable, Sendable {
    public let id: UUID
    /// Surowa nazwa aktywności (np. "running", "traditionalStrengthTraining").
    public let activity: String
    public let start: Date
    public let end: Date
    public let activeEnergyKcal: Double?
    public let distanceMeters: Double?
    public let source: String

    public init(
        id: UUID,
        activity: String,
        start: Date,
        end: Date,
        activeEnergyKcal: Double?,
        distanceMeters: Double?,
        source: String
    ) {
        self.id = id
        self.activity = activity
        self.start = start
        self.end = end
        self.activeEnergyKcal = activeEnergyKcal
        self.distanceMeters = distanceMeters
        self.source = source
    }

    /// Czas trwania treningu.
    public var duration: TimeInterval { end.timeIntervalSince(start) }
}
