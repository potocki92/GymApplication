# RepifyHealth — pakiet integracji Apple HealthKit

Swift Package realizujący **punkty 1–2** blueprintu
[`docs/healthkit-integration-design.md`](../../docs/healthkit-integration-design.md):
integrację z Apple Health / HealthKit (punkt 1) oraz warstwę domenową z repozytorium,
mapperem i kontenerem DI (punkt 2).

> `import HealthKit` jest celowo zamknięty w warstwach `HealthKit/` i `Data/` tego
> pakietu (sekcja 2.2 blueprintu). Domena (`Domain/`) i prezentacja konsumują tylko
> czyste typy oraz `HealthRepository` — nigdy `HKSample`/`HKUnit`.

## Status implementacji

### Punkt 1 — warstwa HealthKit (Data → HealthKit)

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

### Punkt 2 — architektura: domena, repozytorium, mapper, DI

| Podsekcja | Element | Plik |
|---|---|---|
| 2.3 | Modele domenowe (zero importu HealthKit) | `Domain/HealthMetric.swift`, `Domain/SleepSession.swift`, `Domain/WorkoutSummary.swift`, `Domain/DashboardSnapshot.swift` |
| 2.4 | Mapper HealthKit → Domain (granica anty-korupcyjna) | `Data/HealthKitMapper.swift` |
| 2.5 | Protokół `HealthRepository` + use case'y | `Domain/HealthRepository.swift`, `Domain/UseCases.swift` |
| 2.5 | Implementacja repozytorium | `Data/HealthRepositoryImpl.swift` |
| 2.6 | Kontener DI (composition root) | `DI/AppContainer.swift` |
| 2.7 | Testy domeny / use case'ów (mock repo) | `Tests/RepifyHealthKitTests/` |
| — | Źródło danych domenowych nad HealthKit | `Data/HealthKitDataSource.swift` |
| — | Seam anchorów delta-sync (in-memory) | `Data/HealthAnchorStore.swift` |

Punkt 3 (trwała persystencja lokalna + pełny pipeline sync) i dalsze (4–7: prywatność,
prezentacja, backend) będą dodawane w kolejnych etapach.

## Warstwy i reguła zależności (sekcja 2.2 blueprintu)

```
Domain/   czysty Swift — modele, HealthRepository (protokół), use case'y    ← zero HealthKit
   ▲
Data/     HealthKitMapper, HealthKitDataSource, HealthRepositoryImpl         ← jedyne import HealthKit (z HealthKit/)
   ▲
DI/       AppContainer — składa graf zależności i wystawia use case'y
```

**Twarda reguła:** poza warstwami `HealthKit/` i `Data/` nie ma `import HealthKit`.
`HealthRepositoryImpl` orkiestruje wyłącznie typy domenowe — dzięki temu domenę i
przyszłe ViewModel-e testujemy bez urządzenia (`MockHealthRepository`).

## Konfiguracja aplikacji hosta (NIE da się tego wyrazić w Package.swift)

Aby pakiet działał, aplikacja iosowa osadzająca ten moduł musi mieć:

### Capability + entitlements
- Włączony **HealthKit** capability (dodaje `com.apple.developer.healthkit`).
- Dla background delivery: `com.apple.developer.healthkit.background-delivery`
  oraz background mode dla HealthKit.

### Info.plist (inaczej crash przy `requestAuthorization`)
```xml
<key>NSHealthShareUsageDescription</key>
<string>Repify odczytuje kroki, tętno, sen i kalorie, aby pokazać Twój pulpit zdrowotny i analizę trendów.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Repify zapisuje ukończone treningi i aktywność do Apple Health, aby uzupełnić Twoją historię zdrowia.</string>
```

## Przykład użycia

### Wariant wysokopoziomowy (zalecany) — przez `AppContainer` i use case'y

```swift
@MainActor
func loadDashboard() async throws {
    let container = AppContainer()

    guard container.isHealthDataAvailable else { /* tryb degradowany */ return }
    try await container.requestAuthorization()

    // Use case zwraca gotowy, czysty model domenowy — bez żadnego typu HealthKit:
    let snapshot = try await container.getDailyDashboard(.now)
    print(snapshot.steps ?? 0, snapshot.sleep?.totalAsleep ?? 0)

    // Synchronizacja przyrostowa (delta przez anchory):
    let result = try await container.syncHealth()
    print("Dodano \(result.added), usunięto \(result.deleted)")

    // Zapis masy ciała do Apple Health:
    try await container.saveBodyMass(81.5)
}
```

### Wariant niskopoziomowy — bezpośrednio przez `HealthKitManager` (punkt 1)

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

### Testowanie domeny bez HealthKit

```swift
let repo = MockHealthRepository()
repo.snapshotToReturn = DashboardSnapshot(day: .now, steps: 8421)

let useCase = GetDailyDashboardUseCase(repository: repo)
let snapshot = try await useCase(.now)
// asercje na czystym modelu — zero urządzenia, zero HealthKit
```

## Testy

```bash
cd ios/RepifyHealth
swift test           # wymaga macOS z SDK HealthKit (Xcode)
```

Testy dzielą się na dwie grupy:
- **Domena / use case'y** (`DomainModelTests`, `UseCaseTests`) — czyste, wstrzykują
  `MockHealthRepository`, brak zależności od urządzenia (sekcja 2.7 blueprintu).
- **Warstwa HealthKit** (`HealthDataTypeTests`, `HealthKitMapperTests`, autoryzacja,
  obserwacja, dedupe) — używają `InMemoryHealthStore` (mock seamu `HealthStore`),
  bo `HKHealthStore` jest `final` i niemockowalny wprost.

Uwaga: pełne `swift test` wymaga środowiska Apple (macOS + Xcode); na Linux SDK
HealthKit jest niedostępny, więc pakiet nie kompiluje się w CI tego repo.
