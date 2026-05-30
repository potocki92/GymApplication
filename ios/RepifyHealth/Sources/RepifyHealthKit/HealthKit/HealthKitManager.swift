import Foundation
import HealthKit

/// Fasada warstwy HealthKit (sekcja 5 blueprintu — `HealthKitManager`).
///
/// Spina elementy punktu 1: dostępność (1.1), autoryzację (1.3), odczyt (1.4),
/// obserwację/background delivery (1.5) i empiryczny stan dostępu (1.7).
/// To jedyny punkt wejścia, którego potrzebuje warstwa Data (repozytorium);
/// `import HealthKit` pozostaje zamknięty w tej warstwie (sekcja 2.2).
public final class HealthKitManager {
    public let authorization: HealthAuthorizing
    public let reader: HealthReading
    public let writer: HealthWriting
    public let accessResolver: HealthAccessResolver

    private let flagStore: AuthorizationRequestFlagStore
    private let isAvailable: () -> Bool

    public init(
        authorization: HealthAuthorizing = HealthKitAuthorizationService(),
        reader: HealthReading = HealthKitReader(),
        writer: HealthWriting = HealthKitWriter(),
        accessResolver: HealthAccessResolver = HealthAccessResolver(),
        flagStore: AuthorizationRequestFlagStore = UserDefaultsAuthorizationFlagStore(),
        isAvailable: @escaping () -> Bool = { HKHealthStore.isHealthDataAvailable() }
    ) {
        self.authorization = authorization
        self.reader = reader
        self.writer = writer
        self.accessResolver = accessResolver
        self.flagStore = flagStore
        self.isAvailable = isAvailable
    }

    /// Czy HealthKit jest dostępny na tym urządzeniu (1.1).
    public var isHealthDataAvailable: Bool { isAvailable() }

    /// Żąda zgody i zapamiętuje fakt zapytania (potrzebne do empirycznego 1.7).
    public func requestAuthorization(
        read: Set<HealthDataType> = HealthDataType.dashboardReadSet,
        write: Set<HealthDataType> = HealthDataType.defaultWriteSet
    ) async throws {
        try await authorization.requestAuthorization(read: read, write: write)
        for type in read.union(write) {
            flagStore.markAuthorizationRequested(for: type)
        }
    }

    /// Empiryczny stan dostępu do typu (1.7).
    public func accessState(for type: HealthDataType) async -> HealthAccessState {
        await accessResolver.resolveAccessState(for: type)
    }
}
