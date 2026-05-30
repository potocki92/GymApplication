import Foundation
import HealthKit

/// Pamięć anchorów synchronizacji przyrostowej, per `MetricKind` (sekcja 3.2).
///
/// `HKQueryAnchor` to typ HealthKit, dlatego ten seam żyje w warstwie Data, nie w
/// domenie. Trwała implementacja (UserDefaults / baza) przyjdzie z punktem 3;
/// na etapie punktu 2 dostarczamy wariant in-memory jako wstrzykiwalny seam.
public protocol HealthAnchorStore: AnyObject {
    func anchor(for kind: MetricKind) -> HKQueryAnchor?
    func setAnchor(_ anchor: HKQueryAnchor?, for kind: MetricKind)
}

/// Domyślna, ulotna implementacja — wystarczająca do testów i jednej sesji.
public final class InMemoryAnchorStore: HealthAnchorStore {
    private var anchors: [MetricKind: HKQueryAnchor] = [:]

    public init() {}

    public func anchor(for kind: MetricKind) -> HKQueryAnchor? {
        anchors[kind]
    }

    public func setAnchor(_ anchor: HKQueryAnchor?, for kind: MetricKind) {
        anchors[kind] = anchor
    }
}
