import Foundation
import HealthKit

/// Pomocnicze narzędzia deduplikacji (sekcja 1.6 blueprintu).
///
/// Trzy poziomy deduplikacji:
///  1. Read agregatów — `HKStatisticsCollectionQuery` (HealthKit godzi źródła sam).
///  2. Write — nie zapisujemy danych, które sami przeczytaliśmy (filtr bundleId).
///  3. Local DB — `sample.uuid` jako klucz idempotencji (UNIQUE).
public enum HealthKitDeduplication {
    /// Odfiltrowuje próbki pochodzące z NASZEJ aplikacji.
    ///
    /// Używane przy imporcie, by nie traktować własnych zapisów jako „danych
    /// zewnętrznych" i nie tworzyć pętli echo (zapis tego, co właśnie przeczytaliśmy).
    public static func externalSamples(
        _ samples: [HKSample],
        ownBundleIdentifier: String
    ) -> [HKSample] {
        samples.filter { $0.sourceRevision.source.bundleIdentifier != ownBundleIdentifier }
    }

    /// Deduplikacja po `uuid` (klucz idempotencji warstwy lokalnej).
    ///
    /// Zachowuje pierwszy napotkany egzemplarz dla danego `uuid`.
    public static func deduplicatedByUUID(_ samples: [HKSample]) -> [HKSample] {
        var seen = Set<UUID>()
        var result: [HKSample] = []
        result.reserveCapacity(samples.count)
        for sample in samples where seen.insert(sample.uuid).inserted {
            result.append(sample)
        }
        return result
    }
}
