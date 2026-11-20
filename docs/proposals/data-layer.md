# Propozycja: bezpieczniejszy model danych

> Status: **propozycja do decyzji**. Nic z tego nie jest wdrożone, a baza i reguły
> zostały nietknięte. Dokument powstał przy okazji refaktoru warstwy mutacji
> (gałąź `refactor/cleanup`), który celowo nie zmienił kształtu danych.

## 1. Jak jest dziś

Cała aplikacja trzyma dane w jednym węźle `appData`:

| Pole | Co to |
|---|---|
| `weeks` | **tablica** sesji (id, data, koszt, obecni, karty, rakiety, `courtGross`…) |
| `payments/{imię}` | **tablica** wpłat gracza |
| `players`, `deletedPlayers`, `defaultMultiPlayers`, `singleScanPlayers` | cztery równoległe listy imion |
| `playerJoinDate/{imię}` | data dołączenia (plus zaszłościowy `playerJoinWeek`) |
| `lastAddedSession` | znacznik `{id, ts}`, po którym trigger wie, że doszła sesja |

Każda z 11 mutacji (`addSession`, `updateWeek`, `deleteWeekWithSnapshot`,
`restoreWeek`, `addPlayer`, `softDeletePlayer`, `restorePlayer`,
`permanentDeletePlayer`, `setPlayerCard`, `addPayment`, `removePayment`) robi
`runTransaction` na **całym** `appData` i zapisuje go z powrotem
(`lib/firebase/mutations/*`, `transaction.ts`).

## 2. Problemy, które to powoduje

1. **Jeden zły rekord blokuje wszystkie zapisy.** Reguły walidują cały węzeł. Jedno
   pole, którego reguły nie znają, albo wartość spoza zakresu odrzuca także wpłatę
   niezwiązaną z tym rekordem. `transaction.ts` ma osobny komunikat właśnie na to
   („Baza odrzuciła ten zapis…”). To najpoważniejszy problem: błąd w danych
   sesji potrafi zablokować rozliczanie wpłat.
2. **Rywalizacja o ten sam węzeł.** Dwie osoby zapisujące równocześnie (wpłata i
   edycja sesji) powtarzają transakcje, a każda niesie cały stan.
3. **Tablice jako klucze.** Indeks w tablicy przesuwa się po usunięciu sesji —
   stąd zaszłość `playerJoinWeek`, zastąpiona datą.
4. **Rozmiar.** Każdy snapshot i każdy trigger dostaje całe `appData`. Koszt rośnie
   z liczbą sesji, choć zmienia się zwykle jeden rekord.
5. **Pięć równoległych list graczy** trzeba zmieniać razem. Dziś pilnuje tego
   jedna transakcja; przy luźniejszym modelu rozjazd byłby możliwy.
6. **Triggery funkcji** (`onSessionAdded`, `onPlayerAdded`) słuchają `/appData` i
   odpalają przy *każdym* zapisie; nową sesję rozpoznają po `lastAddedSession`.

Czego to **nie** dotyczy: zapis ma zostać otwarty (decyzja właściciela), więc
żadna z opcji poniżej nie dodaje logowania ani blokady zapisu.

## 3. Opcja A — transakcje na poddrzewach (bez migracji)

Dane są już osobnymi kluczami tam, gdzie to najważniejsze. Zamiast przepisywać
całe `appData`, mutacje piszą tylko to, co zmieniają:

- `addPayment` / `removePayment` → `runTransaction(ref(db, 'appData/payments/' + imię))`.
  Idempotencja po `id` wpłaty zostaje taka sama, kształt danych — bez zmian.
- Analogicznie kolejne mutacje, które dotykają jednego klucza (`setPlayerCard`
  zmienia dwie listy, więc zostaje albo przechodzi na zapis wielościeżkowy).

**Zysk:** wpłaty (najczęstszy zapis i ten, który dotyczy pieniędzy) przestają
zależeć od tego, czy gdzieś w `weeks` leży niepoprawny rekord, i nie walczą z
edycją sesji. **Koszt:** 2–3 mutacje, testy, sprawdzenie reguł na emulatorze.
**Migracja:** żadna — stare i nowe wersje aplikacji zapisują ten sam kształt.

Do zweryfikowania na emulatorze reguł przed wdrożeniem (tego dokument nie
udowadnia): że zapis w głębi `payments/{imię}` przechodzi przez `.write` na
`appData`, że walidacje sąsiednich gałęzi nie są powtarzane oraz że usunięcie
ostatniej wpłaty gracza (pusta tablica = usunięcie klucza) przechodzi.
`rulesParity.test.js` trzeba rozszerzyć o zapisy częściowe.

## 4. Opcja B — pełna normalizacja (z migracją)

Docelowy kształt:

```
appData/
  weeks/{weekId}                  # mapa zamiast tablicy; id = klucz
  payments/{playerKey}/{paymentId}
  players/{playerKey}             # { joinDate, card: 'none'|'multi'|'single', deleted: bool }
  slots/{date}_{sport} = weekId   # blokada unikalności daty i sportu
```

- Pięć list graczy zastępuje jeden rekord gracza (`card` zastępuje parę
  `defaultMultiPlayers` + `singleScanPlayers`, `deleted` — `deletedPlayers`).
- Zapisy wielościeżkowe `update(ref(db), { 'weeks/<id>': …, 'slots/<d_s>': <id> })`
  są atomowe, a wpłata to zwykłe `set` pod kluczem `paymentId`, czyli idempotentne
  z natury.
- Unikalność daty i sportu (dziś sprawdzana przy odczycie całej tablicy) staje się
  warunkiem zapisu klucza w `slots`.
- Reguły walidują pojedynczy rekord, więc awaria jednego nie blokuje reszty;
  `$other: false` zostaje.
- Triggery: nowa sesja to `onValueCreated('/appData/weeks/{id}')`, nowy gracz —
  `onValueCreated('/appData/players/{key}')`. Znika `lastAddedSession` i
  porównywanie całych snapshotów.

### Plan migracji

1. **Kopia.** Nocny backup RTDB już istnieje (`firebase_backup.yml`, artefakt 90
   dni); przed migracją wymusić świeży (`workflow_dispatch`).
2. **Odczyt obu kształtów.** `normalizeRawData` jest jedyną bramą danych do
   aplikacji, więc uczymy ją czytać stary i nowy kształt do tego samego
   `NormalizedData`. Silnik rozliczeń i UI się nie zmieniają.
3. **Skrypt jednorazowy** (admin SDK): najpierw `--dry-run`, który zapisuje nowy
   kształt do kopii i **liczy salda silnikiem na obu kształtach** — raport musi
   pokazać zero różnic co do grosza.
4. **Przełączenie zapisów** (flaga w buildzie), nowe reguły i triggery,
   usunięcie `lastAddedSession`.
5. **Okres karencji**, potem usunięcie pól legacy (`playerJoinWeek`,
   `paidUntilWeek`, `overtimeCost`, `overtimePlayers`) i ich reguł — dopiero po
   audycie, że kopia ich już nie zawiera.

### Koszty i ryzyka

- Przepisanie reguł i `rulesParity.test.js`, 11 mutacji, `normalizeRawData`,
  triggery, skrypt migracji; 2–3 wdrożenia. Rząd wielkości: tydzień–dwa pracy z
  testami, wobec dnia–dwóch dla opcji A.
- **Najgroźniejsze: stare klienty PWA.** Urządzenie, które jeszcze nie pobrało
  nowej wersji, zapisze starym kształtem. Zabezpieczenia: `checkAppVersion`
  wymusza aktualizację przy otwarciu i co 30 min, a — ważniejsze — **nowe reguły
  odrzucą zapis w starym kształcie** (użytkownik zobaczy komunikat zamiast cichego
  rozjazdu). Urządzenia offline przez dłuższy czas to ryzyko resztkowe.
- Dane pod kluczami `weeks/{id}` zmieniają kolejność odczytu: sortowanie po
  dacie zostaje w `sortWeeksByDate`.
- Cache offline (`snapshotCache`) trzyma `NormalizedData`, więc kształt bazy go
  nie dotyka, ale wersję cache trzeba podbić przy każdej zmianie normalizacji.

## 5. Rekomendacja

1. **Teraz, jako osobne zadanie: opcja A dla wpłat.** Najmniejsza zmiana, bez
   migracji, usuwa główny scenariusz awarii (zły rekord sesji blokuje wpłaty).
2. **Opcję B rozważyć dopiero**, jeśli grupa urośnie (setki sesji i wpłat) albo
   pojawią się kolejne rodzaje danych. Zanim ruszy, zrobić audyt kopii pod kątem
   pól legacy — to ten sam krok, który odblokuje ich usunięcie.
3. W żadnej opcji nie zmieniać silnika rozliczeń: siatka sesji z `T1` i
   `normalizeRawData` jako jedyna brama danych wystarczają, by dowieść zgodności
   sald po migracji.
