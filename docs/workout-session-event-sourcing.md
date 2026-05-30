# Event sourcing aktywnej sesji treningowej

Ten dokument opisuje produkcyjny przepływ aktywnej sesji treningowej w FitFlow. Źródłem prawdy jest append-only log w `workout_session_events`; `workout_sessions.current_state` jest cachem, który musi dać się odtworzyć przez replay zdarzeń.

## Tabele Supabase

### `workout_sessions`

Nagłówek sesji i cache aktualnego stanu:

- `id` — stabilny identyfikator sesji generowany po stronie klienta.
- `user_id`, `workout_id`, `workout_name` — właściciel i plan treningowy.
- `status` — `active`, `paused` albo `completed`.
- `current_state` — ostatni zaakceptowany snapshot `ActiveSession`; cache do szybkiej hydracji.
- `version` — ostatni zaakceptowany numer sekwencji.
- `last_event_id` — FK do ostatniego zdarzenia.
- `device_id` — urządzenie, które utworzyło sesję.

Unikalny indeks `workout_sessions_one_active_or_paused_uidx` wymusza jedną aktywną/wstrzymaną sesję na użytkownika.

### `workout_session_events`

Append-only dziennik komend:

- `sequence_number` rośnie o 1 w obrębie sesji i odpowiada `workout_sessions.version`.
- `client_event_id` jest idempotency key i ma unikalny indeks per użytkownik.
- `payload` przechowuje tylko komendę; wyjątkiem jest `WORKOUT_STARTED`, które zawiera `nextState`, aby pełny replay mógł odtworzyć bazowy snapshot planu.
- RLS pozwala użytkownikowi czytać i dopisywać tylko własne zdarzenia.

## RPC

### `start_workout_session`

1. Wymaga zalogowanego użytkownika i niepustego `client_event_id`.
2. Najpierw sprawdza, czy ten `client_event_id` został już przyjęty — retry zwraca istniejącą sesję.
3. Blokuje drugą aktywną sesję tego samego użytkownika.
4. Tworzy `workout_sessions` z `version = 1`.
5. Dopisuje `WORKOUT_STARTED` z `sequence_number = 1` i snapshotem startowym.

### `append_workout_session_event`

1. Pobiera sesję `for update`.
2. Jeśli `client_event_id` już istnieje dla tej sesji, zwraca istniejące zdarzenie bez podbijania wersji.
3. Wymaga `p_expected_version = workout_sessions.version`; konflikt zgłasza błąd `version conflict`.
4. Dopisuje zdarzenie z `sequence_number = expected + 1`.
5. Aktualizuje `current_state`, `status`, `version`, `last_event_id` i pola zakończenia.

## Reducer i replay

Reducer w `lib/workout-session-event-reducer.ts` jest deterministyczny:

- używa timestampów ze zdarzeń (`occurredAt`, `startedAt`, `completedAt`, `pausedAt`, `resumedAt`), nie lokalnych timerów;
- sortuje zdarzenia po `sequenceNumber`, a następnie `createdAt`;
- pomija duplikaty `client_event_id`;
- w trybie nieprodukcyjnym wykonuje replay dwa razy i porównuje stabilny JSON;
- zwraca `appliedClientEventIds`, `duplicateClientEventIds` i `skippedEventIds` do diagnostyki konfliktów.

Pełny rebuild wygląda tak:

1. Pobierz `workout_session_events` od sekwencji `0`.
2. Zainicjuj sesję ze `WORKOUT_STARTED.payload.nextState`.
3. Zastosuj kolejne komendy reducerem.
4. Wynik musi być równoważny `workout_sessions.current_state` dla tej samej wersji.

## Hydration flow

1. IndexedDB jest ładowane jako pierwsze, aby refresh nie resetował aktywnej sesji.
2. Snapshot lokalny pozostaje widoczny podczas pobierania Supabase.
3. Nowszy event log z Supabase wygrywa, jeśli nie ma lokalnych brudnych zdarzeń.
4. Dirty local snapshot wygrywa przy braku sieci albo przy braku aktywnej sesji na serwerze.
5. Starsze odpowiedzi hydracji są ignorowane przez licznik `hydrationRun`.
6. Po błędzie sieci store przechodzi w `ready` z `pendingSync = true`, więc UI może kontynuować trening offline.

## Offline outbox i IndexedDB

Outbox `workout-session-outbox` zapisuje każde lokalne zdarzenie z:

- payloadem komendy,
- lokalnym snapshotem `nextState`,
- `baseVersion`,
- `localSequenceNumber`,
- statusem `pending`, `syncing`, `synced`, `failed` albo `conflict`.

Zabezpieczenia produkcyjne:

- rekordy są sortowane po `sessionId`, `localSequenceNumber`, `createdAt`;
- retry jest deduplikowany przez `clientEventId`;
- nieznane typy zdarzeń i nieznane statusy sync są ignorowane jako korupcja;
- stare `syncing` locki wracają do `pending` po crashu;
- retry timery są pojedyncze per sesja i czyszczone przed ręcznym sync;
- automatyczne retry jest limitowane, ale ręczny/online sync nadal może ponowić wysyłkę;
- jeśli IndexedDB jest chwilowo zablokowane albo uszkodzone, runtime używa pamięciowego outboxa, aby akcja użytkownika nie przerwała treningu.

## Realtime i multi-device

Realtime jest wyłącznie niskolatencyjnym sygnałem, nie źródłem prawdy:

1. Subskrypcja słucha insertów `workout_session_events` dla jednej sesji.
2. Własne zdarzenia są ignorowane po `deviceId` i `clientEventId`.
3. Luka sekwencji lub reconnect uruchamia recovery przez `getWorkoutSessionEventsAfter`.
4. Po `online`, `focus` i `visibilitychange` wykonywany jest sync outboxa oraz recovery event logu.
5. Jeśli lokalny outbox ma pending events, zdalny event wywołuje conflict recovery zamiast nadpisywać lokalny stan.

## Conflict resolution

Konflikt wersji oznacza, że inne urządzenie zaakceptowało zdarzenia wcześniej. Recovery:

1. Pobiera pełny event log sesji.
2. Rebuilduje canonical remote state.
3. Oznacza lokalne zdarzenia już przyjęte po `clientEventId` jako `synced`.
4. Reaplikuje pozostałe lokalne zdarzenia na remote state.
5. Aktualizuje ich `baseVersion`, `localSequenceNumber` i `nextState`.
6. Zdarzenia nieaplikowalne po zmianach remote zostają jako `conflict`, nie są usuwane.

## Lifecycle sesji

- **Start online**: local session + outbox `WORKOUT_STARTED`, następnie RPC start i wersja `1`.
- **Start offline**: local session + outbox; sync nastąpi po reconnect.
- **Set started/completed**: UI aktualizuje się lokalnie natychmiast, outbox synchronizuje sekwencyjnie.
- **Pause/resume**: zegary przesuwane są na podstawie timestampów zdarzeń.
- **Finish offline**: `WORKOUT_FINISHED` trafia do outboxa; po reconnect status Supabase staje się `completed`.
- **Refresh/crash/reopen**: IndexedDB snapshot i outbox przywracają trening przed kontaktem z siecią.

## Scenariusze E2E/manual production readiness

1. Start treningu online — sesja powstaje lokalnie i w Supabase, `version = 1`.
2. Start treningu offline — UI przechodzi do aktywnego treningu, outbox ma `WORKOUT_STARTED`.
3. Complete set offline — set jest completed lokalnie, zdarzenie czeka w outboxie.
4. Refresh podczas treningu — IndexedDB przywraca sesję przed remote hydration.
5. Zamknięcie przeglądarki — snapshot i outbox zostają w IndexedDB.
6. Reopen po kilku godzinach — timery liczą elapsed z absolutnych timestampów.
7. Multi-device live sync — remote insert aktualizuje drugi ekran albo uruchamia recovery przy luce.
8. Finish workout offline — stan `finished` i zdarzenie terminalne są lokalnie trwałe.
9. Reconnect po finish offline — outbox dopisuje finish, Supabase ustawia `completed`.
10. Conflict na dwóch urządzeniach — nowszy remote log jest replayowany, lokalne pending events są rebase’owane.
11. Browser sleep/wake — `visibilitychange`/`focus` uruchamia sync i event recovery.
12. Mobile background/foreground — ten sam flow co sleep/wake.
13. Multiple tabs — duplicate sync jest ograniczony lockiem runtime i idempotency key w RPC.
14. Replay 1000+ events — reducer sortuje i replayuje deterministycznie; testy powinny monitorować czas i zgodność stanu.
15. Restore po crashu aplikacji — stale `syncing` wraca do `pending`, event nie jest usuwany.

## Debugging guide

- Porównaj `workout_sessions.version` z maksymalnym `workout_session_events.sequence_number`.
- Szukaj duplikatów po `client_event_id`; RPC powinno zwracać istniejący event.
- Jeśli UI stoi na `pendingSync`, sprawdź outbox: `failed` oznacza retry, `conflict` wymaga decyzji użytkownika lub narzędzia admina.
- Jeśli realtime nie działa, wywołaj manualnie recovery przez `getWorkoutSessionEventsAfter(sessionId, serverVersion)`.
- Jeśli po crashu nic się nie synchronizuje, sprawdź `syncStartedAt`; lock starszy niż 2 minuty powinien wrócić do `pending`.

## Common failure scenarios

- **Supabase offline przy refreshu**: lokalny snapshot pozostaje aktywny i dirty.
- **Duplicate click / retry**: ten sam `clientEventId` jest deduplikowany w IndexedDB i RPC.
- **Version conflict**: outbox jest rebase’owany na canonical remote log.
- **Corrupted outbox record**: rekord jest ignorowany, nie blokuje listowania pozostałych eventów.
- **Realtime missed event**: luka sekwencji uruchamia pełne recovery po event logu.

## Znane ograniczenia

- Nie ma jeszcze UI do ręcznego rozstrzygania `conflict` eventów; obecnie są zachowywane diagnostycznie.
- Wielotabowość korzysta z idempotencji RPC i lokalnych locków w runtime, ale nie ma jeszcze cross-tab Web Lock/BroadcastChannel.
- Pamięciowy fallback outbox chroni bieżący runtime, ale nie przetrwa pełnego restartu przeglądarki, jeśli IndexedDB jest trwale niedostępne.

## Przyszłe usprawnienia

- Dodać cykliczny job porównujący `current_state` z replayem event logu.
- Dodać UI „resolve conflict” dla zdarzeń oznaczonych `conflict`.
- Dodać BroadcastChannel/Web Locks do koordynacji wielu tabów.
- Dodać metryki observability: liczba retry, konfliktów, stale locks, czas replayu 1000+ eventów.
