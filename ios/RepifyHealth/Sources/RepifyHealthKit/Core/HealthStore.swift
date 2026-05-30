import Foundation
import HealthKit

/// Cienki protokół-seam nad `HKHealthStore`.
///
/// `HKHealthStore` jest klasą `final`, której nie da się wprost zamockować,
/// dlatego cały dostęp przechodzi przez ten protokół (sekcja 2.7 blueprintu).
/// Produkcja: `HKHealthStore` zgodny z protokołem przez extension poniżej.
/// Testy: `InMemoryHealthStore` z deterministycznymi próbkami.
public protocol HealthStore: AnyObject {
    func requestAuthorization(
        toShare typesToShare: Set<HKSampleType>,
        read typesToRead: Set<HKObjectType>
    ) async throws

    func authorizationStatus(for type: HKObjectType) -> HKAuthorizationStatus

    func execute(_ query: HKQuery)

    func stop(_ query: HKQuery)

    func enableBackgroundDelivery(
        for type: HKObjectType,
        frequency: HKUpdateFrequency
    ) async throws

    func save(_ objects: [HKObject]) async throws
}

/// Produkcyjna zgodność `HKHealthStore` z naszym seamem.
///
/// Część metod `HKHealthStore` ma już warianty async/await (iOS 15+);
/// dla pozostałych owijamy callbacki w continuation.
extension HKHealthStore: HealthStore {
    public func enableBackgroundDelivery(
        for type: HKObjectType,
        frequency: HKUpdateFrequency
    ) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            self.enableBackgroundDelivery(for: type, frequency: frequency) { _, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: ())
                }
            }
        }
    }
}
