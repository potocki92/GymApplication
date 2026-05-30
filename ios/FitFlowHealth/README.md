# FitFlowHealth — pakiet integracji Apple HealthKit

Swift Package realizujący **punkt 1** blueprintu
[`docs/healthkit-integration-design.md`](../../docs/healthkit-integration-design.md):
integrację z Apple Health / HealthKit (warstwa Data → HealthKit).

> `import HealthKit` jest celowo zamknięty w tym pakiecie (sekcja 2.2 blueprintu).
> Reszta aplikacji powinna konsumować ten moduł przez `HealthKitManager`.

## Status implementacji (punkt 1)

| Podsekcja | Element | Plik |
|---|---|---|
| 1.1 | Inicjalizacja `HKHealthStore` | `HealthKit/HealthKitStoreProvider.swift` |
| 1.2 | Katalog typów danych | `HealthKit/HealthDataType.swift` |
| 1.3 | Autoryzacja read/write | `Authorization/HealthKitAuthorizationService.swift` |
| 1.4a | `HKSampleQuery` | `Queries/HealthKitReader.swift` |
| 1.4b | `HKStatisticsCollectionQuery` | `Queries/HealthKitReader.swift` |
| 1.4c | `HKAnchoredObjectQuery` | `Queries/HealthKitReader.swift` |
| 1.5 | Observer + background delivery | `Observation/HealthKitObservationService.swift` |
| 1.6 | Deduplikacja | `Queries/HealthKitDeduplication.swift` + write filter |
| 1.7 | Empiryczny stan dostępu | `Authorization/HealthAccessResolver.swift` |
| — | Fasada warstwy | `HealthKit/HealthKitManager.swift` |
| — | Seam testowy nad `HKHealthStore` | `Core/HealthStore.swift` |

Pozostałe punkty blueprintu (2–7: domena, repozytorium, sync, backend) będą
dodawane w kolejnych etapach jako osobne moduły / targety.

## Konfiguracja aplikacji hosta (NIE da się tego wyrazić w Package.swift)

Aby pakiet działał, aplikacja iosowa osadzająca ten moduł musi mieć:

### Capability + entitlements
- Włączony **HealthKit** capability (dodaje `com.apple.developer.healthkit`).
- Dla background delivery: `com.apple.developer.healthkit.background-delivery`
  oraz background mode dla HealthKit.

### Info.plist (inaczej crash przy `requestAuthorization`)
```xml
<key>NSHealthShareUsageDescription</key>
<string>FitFlow odczytuje kroki, tętno, sen i kalorie, aby pokazać Twój pulpit zdrowotny i analizę trendów.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>FitFlow zapisuje ukończone treningi i aktywność do Apple Health, aby uzupełnić Twoją historię zdrowia.</string>
```

## Przykład użycia

```swift
let manager = HealthKitManager()

guard manager.isHealthDataAvailable else { /* tryb degradowany */ return }

try await manager.requestAuthorization(
    read: HealthDataType.dashboardReadSet,
    write: HealthDataType.defaultWriteSet
)

// Empiryczny stan dostępu (Apple ukrywa zgodę na odczyt):
switch await manager.accessState(for: .steps) {
case .grantedWithData: break          // czytamy normalnie
case .grantedNoData:   break          // pokaż „brak danych / sprawdź uprawnienia"
case .notRequested:    break          // poproś o zgodę
case .unavailable:     break          // tryb degradowany
}

// Agregaty dzienne kroków (auto-dedupe źródeł po stronie HealthKit):
let steps = try await manager.reader.fetchDailyStatistics(
    quantityType: HKQuantityType(.stepCount),
    unit: .count(),
    options: .cumulativeSum,
    start: Calendar.current.date(byAdding: .day, value: -7, to: .now)!,
    end: .now,
    calendar: .current
)
```

## Testy

```bash
cd ios/FitFlowHealth
swift test           # wymaga macOS z SDK HealthKit (Xcode)
```

Testy używają `InMemoryHealthStore` (mock seamu `HealthStore`) — `HKHealthStore`
jest `final` i niemockowalny wprost (sekcja 2.7 blueprintu). Uwaga: pełne
`swift test` wymaga środowiska Apple (macOS + Xcode); na Linux SDK HealthKit
jest niedostępny.
