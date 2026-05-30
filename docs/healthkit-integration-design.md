# Apple HealthKit Integration — Blueprint produkcyjny

> Kompletna architektura i sposób implementacji integracji aplikacji mobilnej iOS (Swift / SwiftUI) z Apple Health / HealthKit.
> Dokument projektowy. Cel: gotowy do wdrożenia plan dla zespołu iOS/health-tech.

**Status:** Design / RFC
**Platforma docelowa:** iOS 17+ (z uwagami dla iOS 16)
**Język / UI:** Swift 5.9+, SwiftUI, async/await
**Persystencja lokalna:** SQLite via GRDB **lub** Core Data + SQLCipher (porównanie w sekcji 4)

---

## Spis treści

1. [Założenia i ograniczenia platformy](#0-założenia-i-ograniczenia-platformy)
2. [Integracja Apple Health / HealthKit](#1-integracja-apple-health--healthkit)
3. [Architektura systemu](#2-architektura-systemu)
4. [Synchronizacja danych](#3-synchronizacja-danych)
5. [Prywatność i compliance](#4-prywatność-i-compliance)
6. [Struktura kodu](#5-struktura-kodu)
7. [Edge cases](#6-edge-cases)
8. [API design (backend)](#7-api-design-backend)
9. [Diagram logiczny end-to-end](#8-diagram-logiczny-end-to-end)
10. [Checklist wdrożeniowy](#9-checklist-wdrożeniowy)

---

## 0. Założenia i ograniczenia platformy

Zanim cokolwiek zaprojektujemy, trzeba znać twarde ograniczenia HealthKit, bo wymuszają architekturę:

- **HealthKit nie istnieje na iPadzie** (poza nielicznymi typami) i **nie istnieje w macOS Catalyst**. Kod musi defensywnie sprawdzać `HKHealthStore.isHealthDataAvailable()`.
- **Symulator iOS** udostępnia HealthKit, ale danych jest mało/zero i część typów (np. niektóre workouty, ECG) nie działa. Realne testy = urządzenie fizyczne.
- **Brak „permission introspection" dla read.** Apple celowo nie pozwala sprawdzić, czy użytkownik dał zgodę na *odczyt* danego typu — żeby aplikacja nie wnioskowała o stanie zdrowia z faktu odmowy. `authorizationStatus(for:)` zwraca wiarygodną informację **tylko dla typów do zapisu**. Dla odczytu jedyny sposób stwierdzenia „czy mam dane" to **wykonać zapytanie i zobaczyć, czy coś wróciło**. To fundament całej obsługi edge case'ów.
- **Background delivery ma limity częstotliwości** zależne od typu danych (`HKUpdateFrequency`: `.immediate`, `.hourly`, `.daily`, `.weekly`). Kroki nie przyjdą „od razu" — system batchuje.
- **Wymagana zgoda Apple na entitlement HealthKit** i osobny, bardzo skrupulatny review App Store (sekcja 4).
- **Dane HealthKit nie mogą być wysyłane do iCloud, backupów, ani używane do reklam/data-mining** — to twarda reguła App Store, nie zalecenie.
- **HealthKit zwraca dane w `Date` (UTC pod spodem) + osobno metadanę strefy** dla snu/workoutów. DST i timezone trzeba traktować świadomie (sekcja 6).

---

## 1. Integracja Apple Health / HealthKit

### 1.1 Inicjalizacja `HKHealthStore`

`HKHealthStore` to centralny obiekt dostępu. Tworzymy **jedną instancję na cały cykl życia aplikacji** (kosztowny, nie tworzyć per-request).

```swift
import HealthKit

final class HealthKitStoreProvider {
    static let shared = HealthKitStoreProvider()
    let store = HKHealthStore()

    private init() {}

    var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }
}
```

**Entitlement i Info.plist (obowiązkowe, inaczej crash przy żądaniu zgody):**

- Włącz capability **HealthKit** w Xcode (dodaje `com.apple.developer.healthkit` do `.entitlements`).
- Jeśli używasz background delivery: dodaj `HKHealthStore` background mode + entitlement `com.apple.developer.healthkit.background-delivery`.
- `Info.plist`:
  - `NSHealthShareUsageDescription` — opis *po co czytamy* dane (string widziany przez użytkownika).
  - `NSHealthUpdateUsageDescription` — opis *po co zapisujemy* dane.

```xml
<key>NSHealthShareUsageDescription</key>
<string>FitFlow odczytuje kroki, tętno, sen i kalorie, aby pokazać Twój pulpit zdrowotny i analizę trendów.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>FitFlow zapisuje ukończone treningi i aktywność do Apple Health, aby uzupełnić Twoją historię zdrowia.</string>
```

> Brak tych kluczy = natychmiastowy crash przy `requestAuthorization`. Brak sensownego opisu = odrzucenie w App Store review.

### 1.2 Definicja obsługiwanych typów danych

Centralizujemy wszystkie typy w jednym miejscu (single source of truth). To upraszcza request, sync i testy.

```swift
enum HealthDataType: CaseIterable {
    case steps
    case heartRate
    case restingHeartRate
    case heartRateVariability
    case sleepAnalysis
    case activeEnergy
    case basalEnergy
    case bodyMass
    case workouts

    /// Typy które CZYTAMY z HealthKit.
    var readObjectType: HKObjectType? {
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

    /// Typy które ZAPISUJEMY do HealthKit (podzbiór — nie zapisujemy tętna itp.).
    var writeSampleType: HKSampleType? {
        switch self {
        case .bodyMass:     return HKQuantityType(.bodyMass)
        case .activeEnergy: return HKQuantityType(.activeEnergyBurned)
        case .workouts:     return HKObjectType.workoutType()
        default:            return nil // tylko odczyt
        }
    }
}
```

**Rekomendowany zestaw typów dla pulpitu zdrowotnego:**

| Domena UI | HealthKit type | Jednostka | Kierunek |
|---|---|---|---|
| Kroki | `stepCount` | `count()` | read |
| Tętno | `heartRate` | `count()/min` (bpm) | read |
| Tętno spoczynkowe | `restingHeartRate` | bpm | read |
| HRV | `heartRateVariabilitySDNN` | `ms` | read |
| Sen | `sleepAnalysis` (category) | stage | read |
| Kalorie aktywne | `activeEnergyBurned` | `kcal` | read + write |
| Kalorie spoczynkowe | `basalEnergyBurned` | `kcal` | read |
| Masa ciała | `bodyMass` | `kg` | read + write |
| Treningi | `HKWorkout` | — | read + write |

### 1.3 Read vs Write — różnica i jak żądać zgody

- **Read (`toRead`)** — czytanie danych zapisanych przez inne aplikacje/urządzenia (Apple Watch, iPhone, waga itd.). Apple **ukrywa** stan zgody na read (privacy).
- **Write/Share (`toShare`)** — pozwolenie aplikacji na *zapis* próbek. Stan zgody jest jawnie sprawdzalny przez `authorizationStatus(for:)`.

**Zasada minimalizacji:** żądamy tylko tych typów, których naprawdę używamy *w danym momencie* flow (sekcja 4). Nie ma sensu prosić o zapis tętna, jeśli nigdy go nie zapisujemy.

```swift
protocol HealthAuthorizing {
    func requestAuthorization(read: Set<HealthDataType>,
                              write: Set<HealthDataType>) async throws
    func writeAuthorizationStatus(for type: HealthDataType) -> HKAuthorizationStatus
}

final class HealthKitAuthorizationService: HealthAuthorizing {
    private let store: HKHealthStore

    init(store: HKHealthStore = HealthKitStoreProvider.shared.store) {
        self.store = store
    }

    func requestAuthorization(read: Set<HealthDataType>,
                              write: Set<HealthDataType>) async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.unavailableOnDevice
        }
        let readTypes  = Set(read.compactMap { $0.readObjectType })
        let writeTypes = Set(write.compactMap { $0.writeSampleType })

        // async/await wariant (iOS 15+)
        try await store.requestAuthorization(toShare: writeTypes, read: readTypes)
    }

    /// UWAGA: wiarygodne TYLKO dla write. Dla read zawsze .notDetermined-podobne.
    func writeAuthorizationStatus(for type: HealthDataType) -> HKAuthorizationStatus {
        guard let t = type.writeSampleType else { return .notDetermined }
        return store.authorizationStatus(for: t)
    }
}

enum HealthKitError: Error {
    case unavailableOnDevice
    case authorizationDenied
    case noData
    case queryFailed(underlying: Error)
}
```

> **Kluczowy fakt UX:** `requestAuthorization` **nie rzuca błędu, gdy użytkownik odmówi**. Zwraca sukces niezależnie od decyzji. Dlatego „czy user się zgodził na read" stwierdzamy *empirycznie* — przez próbę odczytu (patrz 1.7 i sekcja 6).

### 1.4 Zapytania odczytujące (queries)

Trzy główne rodzaje używane w tej aplikacji:

**a) `HKSampleQuery`** — jednorazowy odczyt surowych próbek (np. ostatnie pomiary tętna).

```swift
func fetchSamples(for type: HKSampleType,
                  predicate: NSPredicate,
                  limit: Int = HKObjectQueryNoLimit) async throws -> [HKSample] {
    try await withCheckedThrowingContinuation { continuation in
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
        let query = HKSampleQuery(sampleType: type,
                                  predicate: predicate,
                                  limit: limit,
                                  sortDescriptors: sort) { _, samples, error in
            if let error { continuation.resume(throwing: HealthKitError.queryFailed(underlying: error)) }
            else { continuation.resume(returning: samples ?? []) }
        }
        store.execute(query)
    }
}
```

**b) `HKStatisticsCollectionQuery`** — agregaty w oknach czasu (kroki/dzień, kalorie/dzień). **To jest właściwe narzędzie do pulpitu** — HealthKit sam sumuje i deduplikuje nakładające się źródła.

```swift
func dailyStepCount(from start: Date, to end: Date) async throws -> [Date: Double] {
    let type = HKQuantityType(.stepCount)
    var interval = DateComponents(); interval.day = 1
    let anchor = Calendar.current.startOfDay(for: start)

    return try await withCheckedThrowingContinuation { continuation in
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let q = HKStatisticsCollectionQuery(
            quantityType: type,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum,         // HealthKit dedupe across sources
            anchorDate: anchor,
            intervalComponents: interval)

        q.initialResultsHandler = { _, results, error in
            if let error { continuation.resume(throwing: HealthKitError.queryFailed(underlying: error)); return }
            var out: [Date: Double] = [:]
            results?.enumerateStatistics(from: start, to: end) { stat, _ in
                if let sum = stat.sumQuantity() {
                    out[stat.startDate] = sum.doubleValue(for: .count())
                }
            }
            continuation.resume(returning: out)
        }
        store.execute(q)
    }
}
```

**c) `HKAnchoredObjectQuery`** — **rdzeń synchronizacji incremental**. Zwraca tylko to, co się zmieniło od ostatniego „anchora", oraz listę usuniętych obiektów. To pozwala robić delta-sync bez ponownego ładowania wszystkiego (sekcja 3).

```swift
func incrementalFetch(type: HKSampleType,
                      anchor: HKQueryAnchor?) async throws
    -> (added: [HKSample], deleted: [HKDeletedObject], newAnchor: HKQueryAnchor?) {
    try await withCheckedThrowingContinuation { continuation in
        let q = HKAnchoredObjectQuery(
            type: type,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit) { _, added, deleted, newAnchor, error in
                if let error {
                    continuation.resume(throwing: HealthKitError.queryFailed(underlying: error)); return
                }
                continuation.resume(returning: (added ?? [], deleted ?? [], newAnchor))
        }
        store.execute(q)
    }
}
```

### 1.5 Background delivery + Observer queries

Dwa współpracujące mechanizmy:

1. **`HKObserverQuery`** — long-running query, którego handler wywołuje system, gdy *pojawią się nowe dane* danego typu. Sam w sobie nie daje danych — to budzik.
2. **`enableBackgroundDelivery(for:frequency:)`** — pozwala, by ten budzik dzwonił także, gdy aplikacja jest w tle/zabita (system ją wybudza).

Wzorzec produkcyjny: observer → wybudza → odpalamy `HKAnchoredObjectQuery` → zapis delty do lokalnej DB → **musimy wywołać completion handler**, inaczej iOS przestanie nas budzić i może ukarać throttlingiem.

```swift
final class HealthKitObservationService {
    private let store: HKHealthStore
    private var activeObservers: [HKObserverQuery] = []
    private let syncEngine: HealthSyncEngine

    init(store: HKHealthStore, syncEngine: HealthSyncEngine) {
        self.store = store
        self.syncEngine = syncEngine
    }

    func startObserving(_ types: Set<HealthDataType>) {
        for type in types {
            guard let sampleType = type.readObjectType as? HKSampleType else { continue }

            let observer = HKObserverQuery(sampleType: sampleType, predicate: nil) {
                [weak self] _, completionHandler, error in
                guard let self else { completionHandler(); return }
                if error != nil { completionHandler(); return }

                Task {
                    // KRYTYCZNE: completion MUSI być wywołany, nawet przy błędzie,
                    // i to w rozsądnym czasie (sekundy), inaczej iOS nas zablokuje.
                    defer { completionHandler() }
                    try? await self.syncEngine.syncIncrementally(type: type)
                }
            }
            store.execute(observer)
            activeObservers.append(observer)

            store.enableBackgroundDelivery(for: sampleType, frequency: .hourly) { success, error in
                if let error { /* log do diagnostyki, nie do usera */ }
            }
        }
    }
}
```

> Background delivery wymaga registracji observerów **wcześnie w cyklu życia** (np. w `application(_:didFinishLaunchingWithOptions:)` / `App.init`), bo system wybudza proces i oczekuje, że observery już istnieją.

### 1.6 Unikanie duplikacji danych

Trzy poziomy deduplikacji:

1. **Po stronie HealthKit (read):** dla agregatów używaj `HKStatisticsCollectionQuery` z `.cumulativeSum` / `.separateBySource`. HealthKit automatycznie godzi nakładające się źródła (iPhone vs Apple Watch liczące te same kroki) — nigdy nie sumuj sam surowych próbek z wielu źródeł.
2. **Po stronie zapisu (write):** **nie zapisuj do HealthKit danych, które sam z niego przeczytałeś.** Filtruj po `HKSource` / `bundleIdentifier` — zapisuj tylko próbki utworzone przez naszą aplikację. Inaczej powstanie pętla duplikatów.
3. **Po stronie lokalnej DB (sync):** każda próbka HealthKit ma stabilne `sample.uuid`. Używamy go jako **klucza idempotencji** (UNIQUE constraint). `HKAnchoredObjectQuery` dostarcza też listę `deletedObjects` (z `uuid`), więc usunięcia w Health odzwierciedlamy lokalnie.

```swift
// Filtr: tylko próbki nie-pochodzące z naszej aplikacji warto trzymać jako "external"
let ourBundleID = Bundle.main.bundleIdentifier!
let externalSamples = samples.filter { $0.sourceRevision.source.bundleIdentifier != ourBundleID }
```

### 1.7 Obsługa braku zgody

Ponieważ stan read jest nieujawniany, stosujemy **strategię empiryczną + heurystykę**:

```swift
enum HealthAccessState {
    case unavailable        // urządzenie bez HealthKit
    case notRequested       // jeszcze nie pytaliśmy
    case grantedWithData    // pytaliśmy, są dane
    case grantedNoData      // pytaliśmy, brak danych (może odmowa, może po prostu brak)
}

func resolveAccessState(for type: HealthDataType) async -> HealthAccessState {
    guard HKHealthStore.isHealthDataAvailable() else { return .unavailable }
    if !hasRequestedAuthorizationFlag { return .notRequested } // flaga w UserDefaults
    let recent = try? await healthReader.fetchSamples(
        for: type.readObjectType as! HKSampleType,
        predicate: HKQuery.predicateForSamples(withStart: .now.addingTimeInterval(-30*86400), end: .now),
        limit: 1)
    return (recent?.isEmpty == false) ? .grantedWithData : .grantedNoData
}
```

UX-owo `grantedNoData` traktujemy **nie jako błąd**, lecz jako stan „brak danych / sprawdź uprawnienia", z głębokim linkiem do Ustawień (sekcja 6).

---

## 2. Architektura systemu

### 2.1 Wybór: Clean Architecture + MVVM + modularny monolit

Rekomendacja: **Clean Architecture (warstwy Domain / Data / Presentation) z MVVM w warstwie prezentacji**, spakowane jako **modularny monolit** (Swift Package z lokalnymi targetami). Powody:

- HealthKit jest „brudnym" detalem infrastruktury — musi być za granicą abstrakcji, żeby domena i UI były testowalne bez urządzenia.
- MVVM gra naturalnie z SwiftUI (`@Observable` / `ObservableObject`).
- Modularny monolit (zamiast wielu osobnych repo) = szybki build, jasne granice, łatwy DI, bez narzutu mikro-frameworków.

### 2.2 Warstwy i zależności (reguła zależności skierowana do środka)

```
┌───────────────────────────────────────────────────────────┐
│ Presentation (SwiftUI Views + ViewModels)                  │
│   DashboardView / DashboardViewModel                       │  ← zależy w dół
├───────────────────────────────────────────────────────────┤
│ Domain (czysty Swift, ZERO importu HealthKit/SwiftUI)      │
│   Entities: HealthMetric, SleepSession, WorkoutSummary     │
│   UseCases: GetDailyDashboardUseCase, SyncHealthUseCase    │
│   Repository PROTOCOLS: HealthRepository (abstrakcja)      │
├───────────────────────────────────────────────────────────┤
│ Data (implementacje protokołów domeny)                     │
│   HealthRepositoryImpl                                     │
│   ├── HealthKitDataSource  (HKHealthStore)  ← jedyne miejsce z importem HealthKit
│   ├── LocalHealthDataSource (GRDB/SQLCipher)              │
│   └── RemoteHealthDataSource (backend API, opcjonalny)    │
└───────────────────────────────────────────────────────────┘
```

**Twarda reguła:** `import HealthKit` pojawia się **wyłącznie** w `HealthKitDataSource` (+ mapper). Reszta aplikacji zna tylko czyste typy domenowe. To umożliwia:
- testy domeny/VM bez urządzenia,
- ewentualną przyszłą obsługę Google Fit / Garmin za tym samym `HealthRepository`.

### 2.3 Modele domenowe (niezależne od HealthKit)

```swift
struct HealthMetric: Identifiable, Equatable {
    let id: UUID                 // == HKSample.uuid (idempotencja)
    let kind: MetricKind         // .steps, .heartRate, ...
    let value: Double
    let unit: MetricUnit
    let start: Date
    let end: Date
    let source: String           // bundleId źródła
}

enum MetricKind: String, Codable { case steps, heartRate, restingHeartRate,
    hrv, activeEnergy, basalEnergy, bodyMass, sleep, workout }

struct SleepSession: Identifiable, Equatable {
    let id: UUID
    let inBed: DateInterval
    let asleep: DateInterval?
    let stages: [SleepStage]     // core/deep/rem/awake
    let timeZoneIdentifier: String
}
```

### 2.4 Mapper HealthKit → Domain (granica anty-korupcyjna)

```swift
struct HealthKitMapper {
    func metric(from q: HKQuantitySample, kind: MetricKind, unit: HKUnit, dUnit: MetricUnit) -> HealthMetric {
        HealthMetric(id: q.uuid, kind: kind,
                     value: q.quantity.doubleValue(for: unit),
                     unit: dUnit, start: q.startDate, end: q.endDate,
                     source: q.sourceRevision.source.bundleIdentifier)
    }
}
```

### 2.5 Use cases

```swift
protocol HealthRepository {
    func dashboardSnapshot(for day: Date) async throws -> DashboardSnapshot
    func syncIncrementally(_ kinds: Set<MetricKind>) async throws -> SyncResult
    func saveBodyMass(_ kg: Double, at date: Date) async throws
}

struct GetDailyDashboardUseCase {
    let repo: HealthRepository
    func callAsItem(_ day: Date) async throws -> DashboardSnapshot {
        try await repo.dashboardSnapshot(for: day)
    }
}
```

### 2.6 Dependency Injection

Lekki DI bez frameworka — **konstruktorowy** + jeden kontener composition root. To trzyma granice czyste i jest w pełni testowalne.

```swift
@MainActor
final class AppContainer {
    let store = HealthKitStoreProvider.shared.store
    lazy var localDB = LocalHealthDataSource(...)
    lazy var hkDataSource = HealthKitDataSource(store: store, mapper: HealthKitMapper())
    lazy var healthRepository: HealthRepository =
        HealthRepositoryImpl(hk: hkDataSource, local: localDB, remote: remote)
    lazy var dashboardVM = DashboardViewModel(
        getDashboard: GetDailyDashboardUseCase(repo: healthRepository),
        syncHealth:   SyncHealthUseCase(repo: healthRepository))
}
```

### 2.7 Strategia testowania

| Warstwa | Jak testujemy |
|---|---|
| Domain / UseCases | czyste testy jednostkowe, zero HealthKit |
| ViewModel | wstrzykujemy `MockHealthRepository`, asercje na stanie publikowanym |
| Data → HealthKitDataSource | **protokół `HealthQuerying` jako seam** + mocki; realny `HKHealthStore` nie jest mockowalny wprost |
| Local DB | testy in-memory (GRDB `DatabaseQueue` in-memory) |
| Integracja | XCUITest na **fizycznym urządzeniu** z zasianymi danymi (Health app / `HKHealthStore` save w buildzie debug) |

Kluczowe: **nie próbujemy mockować `HKHealthStore` bezpośrednio** (final, nie-protokołowy). Zamiast tego cały dostęp idzie przez własny protokół:

```swift
protocol HealthQuerying {
    func execute<Result>(_ descriptor: HealthQueryDescriptor) async throws -> Result
}
// produkcja: HKHealthStoreAdapter ; testy: InMemoryHealthStore z deterministycznymi próbkami
```

W testach symulujemy też scenariusze: brak zgody, pusty zbiór, usunięte obiekty, duplikaty wielo-źródłowe.

---

## 3. Synchronizacja danych

### 3.1 Pipeline: HealthKit → Local DB → Backend

Architektura **offline-first**: lokalna SQLite jest **źródłem prawdy dla UI**. HealthKit jest źródłem surowych danych, backend (opcjonalny) jest celem replikacji.

```
HealthKit ──(anchored delta)──► Local DB (truth for UI) ──(batched push)──► Backend
   ▲                                  │
   └────── observer wybudza ──────────┘
UI czyta WYŁĄCZNIE z Local DB (nigdy bezpośrednio z HealthKit w hot-path renderu).
```

Dlaczego UI nie czyta z HealthKit bezpośrednio: zapytania HK są asynchroniczne i wolne, a pulpit ma być natychmiastowy. HK → DB raz, UI ↔ DB wielokrotnie.

### 3.2 Incremental sync przez anchory

Dla **każdego typu** trzymamy `HKQueryAnchor` (serializowany do `Data`) w bezpiecznym storze (Keychain lub szyfrowana DB — anchor nie jest wrażliwy, ale trzymamy spójnie). Cykl:

```swift
final class HealthSyncEngine {
    func syncIncrementally(type: HealthDataType) async throws {
        let savedAnchor = anchorStore.anchor(for: type)        // może być nil za 1. razem
        let (added, deleted, newAnchor) = try await hk.incrementalFetch(
            type: type.readObjectType as! HKSampleType, anchor: savedAnchor)

        try await localDB.transaction { db in
            for sample in added   { try localDB.upsert(mapper.map(sample), in: db) } // UNIQUE(uuid)
            for d in deleted      { try localDB.delete(uuid: d.uuid, in: db) }
        }
        if let newAnchor { anchorStore.save(newAnchor, for: type) }
        syncQueue.enqueueDirtyRows(for: type)                  // do pushu na backend
    }
}
```

Pierwszy sync (anchor == nil) zwraca *wszystko* — robimy go w tle z paskiem postępu i `limit` batchowanym, by nie zatkać pamięci dużą historią.

### 3.3 Event-driven vs polling

- **Foreground:** event-driven via `HKObserverQuery` (natychmiastowa reakcja, gdy user jest w apce).
- **Background:** `enableBackgroundDelivery` (`.hourly` dla większości metryk, `.immediate` tylko gdy realnie potrzebne — kosztuje baterię i bywa throttlowane).
- **Polling jako fallback:** lekki sync przy `scenePhase == .active` (foreground enter) — łapie zmiany, które ominęły background. **Nie** robimy timer-pollingu w tle (bateria + zbędzie zabity przez system).

### 3.4 Rozwiązywanie konfliktów

Konflikty występują na styku Local DB ↔ Backend (HealthKit sam jest immutable-append + delete, więc HK→Local nie ma „konfliktu", jest tylko upsert/delete po uuid).

Strategia: **per-pole + last-writer-wins z origin-priority**.

- Dane pochodzące z HealthKit (`origin = .healthKit`) mają **priorytet nad edycjami serwera** dla pól pomiarowych — bo Health to faktyczne pomiary z urządzeń. Serwer nie nadpisuje pomiaru.
- Dane utworzone przez użytkownika w naszej apce (`origin = .user`, np. ręcznie wpisana waga) → LWW po `updatedAt` z wektorem `(deviceId, lamportClock)` do remisów.
- Każdy rekord: `uuid`, `origin`, `updatedAt`, `deletedAt?`, `syncState (clean|dirty|deleted)`.

```swift
enum RecordOrigin: String { case healthKit, user, backend }

func resolve(local: HealthRecord, remote: HealthRecord) -> HealthRecord {
    if local.origin == .healthKit { return local }            // pomiar wygrywa
    return local.updatedAt >= remote.updatedAt ? local : remote
}
```

### 3.5 Push do backendu (jeśli istnieje)

- Kolejka `dirty` rekordów, batchowana (np. 500/req), wysyłana, gdy jest sieć.
- **Idempotencja:** payload kluczowany `uuid` + `Idempotency-Key` nagłówek → retry bez duplikatów.
- Backoff wykładniczy + retry on 5xx/network; 4xx → dead-letter + log.
- Kursor `serverSyncToken` do pull delty z backendu (multi-device).

---

## 4. Prywatność i compliance

### 4.1 App Store Review Guidelines dla HealthKit (twarde reguły)

- **§5.1.3** Dane HealthKit **nie mogą** być używane do reklam, marketingu, data-mining ani sprzedaży osobom trzecim.
- Dane HealthKit **nie mogą trafiać do iCloud** ani do backupu (`HKHealthStore` danych nie backupuje — nasza kopia w Local DB **musi** mieć wyłączony backup: `URLResourceValues.isExcludedFromBackup = true` + przechowywanie w katalogu nieobjętym iCloud).
- Musi istnieć **Privacy Policy** (link w App Store i w aplikacji), jasno opisująca użycie danych zdrowotnych.
- Opisy `NSHealth*UsageDescription` muszą realnie tłumaczyć cel.
- Nie wolno żądać uprawnień, których aplikacja nie wykorzystuje (reviewerzy testują).

### 4.2 Minimalizacja danych

- Żądamy zgody **kontekstowo i stopniowo** (progressive disclosure): przy pierwszym wejściu na pulpit prosimy o read kroków/tętna/snu/kalorii; o write masy ciała dopiero, gdy user chce ją zapisać.
- Czytamy **tylko potrzebne okno czasu** (np. 90 dni do dashboardu, nie całe życie).
- Do backendu wysyłamy **agregaty/pochodne**, nie surowe wysokoczęstotliwościowe próbki, jeśli funkcja tego nie wymaga.

### 4.3 Brak wysyłania danych wrażliwych bez zgody

- **Osobny, jawny opt-in na sync z chmurą**, niezależny od zgody HealthKit. Domyślnie: dane zostają **tylko na urządzeniu**.
- Toggle „Synchronizuj z chmurą" w ustawieniach; wyłączenie → stop pushu + opcja „usuń moje dane z serwera" (right-to-erasure / GDPR).

### 4.4 Szyfrowanie

- **Lokalnie:** dane zdrowotne w **szyfrowanej DB** — SQLCipher (GRDB + SQLCipher) z kluczem w **Keychain** (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, flaga `ThisDeviceOnly` = brak migracji do innego urządzenia). Plus iOS Data Protection class `.completeUntilFirstUserAuthentication`/`.complete` na pliku DB.
- **W tranzycie:** TLS 1.2+ wymuszony, **certificate pinning** (ATS + pinned public key) dla endpointów zdrowotnych.
- **Na backendzie (poza zakresem iOS, ale wymóg projektu):** szyfrowanie at-rest, izolacja PII, dostęp role-based, audyt.

### 4.5 Transparentność dla użytkownika

- Ekran „Twoje dane": co czytamy, co zapisujemy, co synchronizujemy, kiedy był ostatni sync.
- Deep-link do `x-apple-health://` / Ustawień, by user mógł zmienić uprawnienia.
- Eksport własnych danych (JSON) i twarde „usuń wszystko".

---

## 5. Struktura kodu

Modularny monolit jako Swift Package z targetami odpowiadającymi warstwom:

```
FitFlowHealth/
├── App/
│   ├── FitFlowApp.swift                 # @main, scenePhase, AppContainer
│   └── AppContainer.swift               # composition root / DI
│
├── Presentation/
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── DashboardViewModel.swift     # @Observable, stan UI
│   │   └── Components/ (StepsCard, HeartRateChart, SleepRing...)
│   ├── Permissions/
│   │   ├── HealthPermissionView.swift   # priming + request
│   │   └── HealthPermissionViewModel.swift
│   └── Settings/PrivacySettingsView.swift
│
├── Domain/                              # ZERO importu HealthKit / SwiftUI
│   ├── Entities/ (HealthMetric, SleepSession, WorkoutSummary, DashboardSnapshot)
│   ├── Repositories/ HealthRepository.swift   # protokoły
│   └── UseCases/
│       ├── GetDailyDashboardUseCase.swift
│       ├── SyncHealthUseCase.swift
│       └── SaveBodyMassUseCase.swift
│
├── Data/
│   ├── HealthKit/
│   │   ├── HealthKitManager.swift       # fasada: auth + queries + observers
│   │   ├── HealthKitDataSource.swift    # jedyne miejsce z import HealthKit (+ adapter)
│   │   ├── HealthKitAuthorizationService.swift
│   │   ├── HealthKitObservationService.swift
│   │   ├── HealthKitMapper.swift        # HK <-> Domain
│   │   └── HealthDataType.swift
│   ├── Local/
│   │   ├── LocalHealthDataSource.swift  # GRDB + SQLCipher
│   │   ├── Migrations/
│   │   └── AnchorStore.swift            # HKQueryAnchor persist
│   ├── Remote/
│   │   ├── RemoteHealthDataSource.swift # API client
│   │   └── DTO/ (HealthSamplePayload...)
│   ├── Repository/
│   │   └── HealthDataRepository.swift   # HealthRepositoryImpl: orkiestracja HK+Local+Remote
│   └── Sync/
│       ├── HealthSyncService.swift      # engine: incremental + conflict + push
│       └── SyncQueue.swift
│
├── Core/
│   ├── Security/ (KeychainStore, Crypto, CertificatePinning)
│   ├── DI/ (protokoły seamy)
│   └── Extensions/
│
└── Tests/
    ├── DomainTests/
    ├── ViewModelTests/ (MockHealthRepository)
    ├── DataTests/ (InMemoryHealthStore, in-memory GRDB)
    └── IntegrationTests/ (na device)
```

Mapowanie na wymagane komponenty z zadania:
- **HealthKitManager** → `Data/HealthKit/HealthKitManager.swift`
- **HealthDataRepository** → `Data/Repository/HealthDataRepository.swift`
- **HealthMetricsUseCase** → `Domain/UseCases/GetDailyDashboardUseCase.swift` (+ rodzina)
- **DashboardViewModel** → `Presentation/Dashboard/DashboardViewModel.swift`
- **HealthSyncService** → `Data/Sync/HealthSyncService.swift`

Szkic ViewModelu (SwiftUI, iOS 17 `@Observable`):

```swift
@Observable @MainActor
final class DashboardViewModel {
    enum State { case loading, ready(DashboardSnapshot), empty, needsPermission, error(String) }
    private(set) var state: State = .loading

    private let getDashboard: GetDailyDashboardUseCase
    private let syncHealth: SyncHealthUseCase

    init(getDashboard: GetDailyDashboardUseCase, syncHealth: SyncHealthUseCase) {
        self.getDashboard = getDashboard; self.syncHealth = syncHealth
    }

    func onAppear() async {
        do {
            try await syncHealth.run(.dashboardSet)        // delta z HK -> local
            let snapshot = try await getDashboard.callAsItem(.now)
            state = snapshot.isEmpty ? .empty : .ready(snapshot)
        } catch HealthKitError.unavailableOnDevice {
            state = .error("HealthKit niedostępny na tym urządzeniu")
        } catch {
            state = .error(error.localizedDescription)
        }
    }
}
```

---

## 6. Edge cases

| Edge case | Zachowanie / implementacja |
|---|---|
| **User odrzuca permissions** | `requestAuthorization` zwraca sukces mimo to. Wykrywamy empirycznie (`grantedNoData`). Pokazujemy non-blocking banner „Włącz dostęp w Ustawieniach" + przycisk deep-link. **Nie** blokujemy całej apki, nie spamujemy promptem (system i tak nie pokaże go drugi raz). |
| **Brak danych w HealthKit** | Stan `.empty` z pustym stanem UI („Brak danych — sparuj Apple Watch / dodaj pomiar"). Odróżniamy od błędu. |
| **Zmiana uprawnień w Settings** | Nie ma callbacku „permissions changed". Re-sprawdzamy stan przy `scenePhase` → `.active` i odpalamy lekki sync. Anchory radzą sobie z nowo-odkrytymi danymi. |
| **Częściowy dostęp (np. tylko steps)** | Architektura per-typ: każdy typ ma własny anchor i własny stan. Pulpit renderuje karty selektywnie — brak tętna ≠ zepsuty kroki. Karty bez danych: placeholder zamiast crashu. |
| **Duże opóźnienia w synchronizacji** | UI zawsze z Local DB (instant). Sync w tle, znacznik „ostatnia aktualizacja: X". Background delivery `.hourly` + foreground catch-up. Pierwszy (pełny) sync batchowany z progresem. |
| **Timezone / DST w danych snu** | HK próbka ma `startDate/endDate` w absolutnym czasie (UTC). Dla snu/workoutów odczytujemy metadanę strefy (`HKMetadataKeyTimeZone`) jeśli jest; przy jej braku zapisujemy `TimeZone.current.identifier` w momencie importu. Agregację „doby snu" liczymy w strefie sesji, nie urządzenia, by sen przez północ/DST nie był liczony podwójnie ani gubiony. Granice dnia (`startOfDay`) liczymy `Calendar` z tą strefą. |
| **Duplikaty wielo-źródłowe** | `HKStatisticsCollectionQuery` + dedupe po `uuid` w DB (sekcja 1.6). Nigdy ręczne sumowanie surowych próbek. |
| **HealthKit niedostępny (iPad/symulator)** | `isHealthDataAvailable()` na starcie → tryb degradowany: ręczne wprowadzanie + sync backend bez HK. |
| **Usunięcie danych w Health** | `HKAnchoredObjectQuery.deletedObjects` → kasujemy lokalnie po `uuid` i oznaczamy `deleted` do pushu. |
| **App zabita w tle, dane napływają** | `enableBackgroundDelivery` wybudza proces; observer odpala delta-sync; **completion handler wywołany w kilka sek**, inaczej throttling. |

Deep-link do ustawień:

```swift
// iOS nie ma pewnego deep-linku do konkretnego ekranu Health danej app,
// najpewniejszy uniwersalny:
if let url = URL(string: UIApplication.openSettingsURLString) {
    await UIApplication.shared.open(url)
}
```

---

## 7. API design (backend)

Backend jest **opcjonalny** i służy do multi-device sync + analiz AI. Domyślnie wyłączony (opt-in).

### 7.1 Mapowanie HealthKit → payload

Wysyłamy **znormalizowane, jednostkowo-spójne** metryki (SI/kanoniczne jednostki), bez surowych obiektów HK:

```jsonc
// POST /v1/health/samples  (batch, idempotent)
{
  "deviceId": "ABCD-1234",
  "samples": [
    {
      "uuid": "9F2A...-...",          // == HKSample.uuid (klucz idempotencji)
      "kind": "steps",                // enum kanoniczny
      "value": 842,
      "unit": "count",
      "start": "2026-05-30T08:00:00Z",
      "end":   "2026-05-30T09:00:00Z",
      "tz": "Europe/Warsaw",
      "origin": "healthKit",
      "sourceBundleId": "com.apple.health"
    }
  ]
}
```

Sen jako osobny, bogatszy zasób (etapy):

```jsonc
// POST /v1/health/sleep-sessions
{ "uuid":"...", "inBedStart":"...Z","inBedEnd":"...Z","tz":"Europe/Warsaw",
  "stages":[{"stage":"deep","start":"...Z","end":"...Z"}, ...] }
```

### 7.2 Endpointy

| Metoda | Endpoint | Cel |
|---|---|---|
| `POST` | `/v1/health/samples` | batch upsert metryk (idempotent po `uuid`) |
| `POST` | `/v1/health/sleep-sessions` | batch upsert sesji snu |
| `POST` | `/v1/health/workouts` | batch upsert treningów |
| `GET`  | `/v1/health/changes?since=<token>` | **delta pull** dla multi-device |
| `GET`  | `/v1/health/summary?from&to&kinds` | gotowe agregaty do pulpitu (gdy device offline-cold) |
| `POST` | `/v1/insights/analyze` | trigger analizy AI trendów (na agregatach, nie surowych) |
| `DELETE` | `/v1/health/me` | right-to-erasure (GDPR) |

### 7.3 Unikanie nadmiarowego transferu

- **Delta sync w obie strony**: device wysyła tylko `dirty` (anchor-based), pull tylko `since=serverSyncToken`.
- **Batching + kompresja** (`Content-Encoding: gzip`).
- **Agregaty zamiast surowych** dla AI/analiz: serwer dostaje np. dzienne sumy kroków/kalorie, średnie tętno, fazy snu — nie 86 400 próbek tętna na dobę.
- **Idempotency-Key** + `uuid` → bezpieczny retry bez duplikatów.
- **Conditional GET** (`ETag`/`If-None-Match`) na `/summary`.
- **Sampling/downsampling** wysokoczęstotliwościowych serii przed wysyłką, jeśli funkcja nie wymaga rozdzielczości pełnej.

---

## 8. Diagram logiczny end-to-end

```
                      ┌──────────────────────────────────────────────┐
                      │                  iOS APP                       │
                      │                                               │
  ┌────────────┐      │  ┌───────────────┐     ┌──────────────────┐  │
  │ Apple      │      │  │ Presentation  │     │  Domain          │  │
  │ Health DB  │      │  │ DashboardView │◄────│  UseCases        │  │
  │ (HealthKit)│      │  │ + ViewModel   │     │  Entities        │  │
  └─────┬──────┘      │  └───────▲───────┘     │  Repo (protocol) │  │
        │             │          │ reads        └────────▲─────────┘  │
  read/ │ observer    │          │ (instant)             │            │
  write │ background  │  ┌───────┴────────────────────────┴───────┐  │
        │  delivery   │  │                Data                     │  │
        ▼             │  │  ┌──────────────┐   ┌────────────────┐ │  │
  ┌────────────┐      │  │  │HealthKit     │   │ Local DB       │ │  │
  │HKObserver  │──────┼──┼─►│DataSource    │──►│ (SQLCipher)    │ │  │
  │+Anchored   │      │  │  │(import HK)   │   │ SOURCE OF TRUTH│ │  │
  │  Query     │      │  │  └──────────────┘   └───────┬────────┘ │  │
  └────────────┘      │  │       │ delta(anchor)       │ dirty    │  │
                      │  │       └─ dedupe by uuid ─────┤ queue    │  │
                      │  │                       ┌──────▼───────┐  │  │
                      │  │   HealthSyncService──►│RemoteDataSrc │  │  │
                      │  └───────────────────────┴──────┬───────┘  │  │
                      └─────────────────────────────────┼──────────┘  │
                                                         │ TLS + pin    │
                              opt-in sync                ▼              │
                                              ┌────────────────────────┐
                                              │   Backend (opcjonalny)  │
                                              │  /samples /changes      │
                                              │  /summary /insights     │
                                              │  AI trend analysis      │
                                              │  (na agregatach)        │
                                              └────────────────────────┘

Przepływ zdarzeniowy:
 1. Nowe dane w Health  ─► HKObserverQuery (foreground) / background delivery (zabita app)
 2. Wybudzenie          ─► HKAnchoredObjectQuery(anchor) ─► delta (added/deleted)
 3. Mapper HK→Domain    ─► upsert/delete po uuid w Local DB (idempotent)
 4. completion()        ─► WYWOŁANE w kilka sekund (inaczej throttling)
 5. UI                  ─► czyta Local DB (natychmiast, offline-first)
 6. SyncQueue (opt-in)  ─► batch push dirty ─► backend (delta, gzip, idempotency-key)
```

---

## 9. Checklist wdrożeniowy

**Setup**
- [ ] HealthKit capability + entitlements (w tym background-delivery)
- [ ] `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription` (sensowne, PL)
- [ ] `isHealthDataAvailable()` guard wszędzie

**Dostęp do danych**
- [ ] Centralny `HealthDataType` (read/write rozdzielone)
- [ ] Progressive, kontekstowe żądanie zgody (minimalizacja)
- [ ] Empiryczne wykrywanie braku danych/zgody (read nie ujawnia statusu)
- [ ] `HKStatisticsCollectionQuery` do agregatów (auto-dedupe)
- [ ] `HKAnchoredObjectQuery` + persist anchorów do delty
- [ ] Observer + background delivery z gwarantowanym `completion()`
- [ ] Filtr własnego `bundleId` przy zapisie (no echo-loop)

**Architektura / jakość**
- [ ] `import HealthKit` tylko w `HealthKitDataSource`
- [ ] Domain bez zależności platformowych
- [ ] DI konstruktorowy + protokoły-seamy
- [ ] Mock `HealthRepository` + in-memory store + in-memory GRDB w testach
- [ ] Integracyjne XCUITest na fizycznym urządzeniu

**Sync**
- [ ] Offline-first: UI czyta tylko Local DB
- [ ] Incremental (anchor) zamiast full reload
- [ ] Idempotencja po `uuid` (+ Idempotency-Key na backend)
- [ ] Conflict resolution: HealthKit-origin priority + LWW
- [ ] Obsługa `deletedObjects`

**Prywatność / compliance**
- [ ] DB szyfrowana (SQLCipher) + klucz w Keychain (ThisDeviceOnly)
- [ ] Local DB wykluczona z iCloud/backup
- [ ] TLS + certificate pinning
- [ ] Osobny opt-in na cloud sync (domyślnie off)
- [ ] Privacy Policy + ekran transparentności + eksport + delete-all
- [ ] Brak HealthKit w reklamach/marketingu (App Store §5.1.3)

**Edge cases**
- [ ] Odmowa / brak danych / częściowy dostęp obsłużone per-typ
- [ ] Re-check uprawnień przy powrocie do foreground
- [ ] Timezone/DST dla snu (strefa sesji, nie urządzenia)
- [ ] Tryb degradowany przy braku HealthKit (iPad/symulator)
