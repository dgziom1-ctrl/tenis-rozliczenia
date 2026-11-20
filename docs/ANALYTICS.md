# Statystyki użycia aplikacji

Prywatny podgląd: kto, kiedy i jak używa aplikacji. Widoczny wyłącznie dla właściciela,
bez logowania i bez kont w aplikacji.

## Jak to działa

```
przeglądarka gracza ──zapis zdarzeń──▶ RTDB: analytics/events   (odczyt zablokowany w regułach)
                                              │
panel właściciela ──POST /__stats + klucz──▶ funkcja `stats` (Admin SDK) ──▶ zagregowany JSON
```

- **Zbieranie** (`frontend/src/lib/analytics/`): zdarzenia trafiają do kolejki i jadą do bazy
  wsadowo (co ~5 s i przy ukryciu karty). Aktywne tylko w buildzie produkcyjnym, poza trybem demo,
  poza panelem statystyk i poza przeglądarkami sterowanymi automatem. Błąd zapisu nigdy nie psuje aplikacji.
- **Reguły** (`database.rules.json`, węzeł `analytics`): każdy może *dopisać* zdarzenie o ścisłym
  kształcie, nikt nie może go odczytać, nadpisać ani skasować.
- **Odczyt**: wyłącznie funkcja `stats` (`functions/stats.js`), chroniona sekretem `STATS_KEY`.
  Hosting kieruje `/__stats` na tę funkcję (`firebase.json`) — ten sam adres co aplikacja, bez CORS.
- **Panel** (`frontend/src/features/stats/`): ukryta ścieżka `/x/<slug>`, poza nawigacją, osobna paczka JS.
- **Retencja**: funkcja `pruneAnalytics` co noc kasuje zdarzenia starsze niż 180 dni.

## Co jest zbierane

| Obszar | Zdarzenia |
|---|---|
| Kto | losowe ID urządzenia; imię gracza tylko jeśli sam je podał przy rejestracji powiadomień |
| Urządzenie | system, przeglądarka, model telefonu (Android), PWA/przeglądarka, ekran, język, strefa czasowa, jakość sieci, wersja aplikacji |
| Sesje | start, czas aktywności, ukrycie/powrót do karty, puls co 60 s, koniec sesji |
| Nawigacja | wejścia w zakładki, otwarcia okien |
| Akcje | dodanie/edycja/usunięcie sesji, wpłaty i cofnięcia, gracze, eksport CSV, kopiowanie BLIK/wiadomości, motyw, kod admina (trafił/nie), easter egg |
| Błędy i wydajność | błędy JS, awarie widoku, problemy z połączeniem, czasy ładowania, twarde resety |
| Push | zgoda, rejestracja, błędy, otwarcia z powiadomienia, instalacja PWA |

**Nie jest zbierane:** kwoty, salda, imiona innych graczy, treść pól, adres IP (poza tym, co
widzi sama infrastruktura Google).

> RODO: ID urządzenia i imię są danymi osobowymi. Warto krótko poinformować graczy, że apka
> zbiera anonimowe statystyki użycia.

## Uruchomienie (jednorazowo)

1. Wygeneruj klucz i slug (np. `openssl rand -hex 24` oraz `openssl rand -hex 8`).
2. Ustaw sekret funkcji: `firebase functions:secrets:set STATS_KEY`.
3. Slug jako sekret repozytorium GitHub `VITE_STATS_PATH` (do lokalnego builda: `frontend/.env.local`).
4. Wdróż: `firebase deploy --only database,functions:stats,functions:pruneAnalytics,hosting`.
5. Zapisz w zakładkach link: `https://<domena>/x/<slug>#k=<KLUCZ>`.
   Klucz po pierwszym wejściu ląduje w pamięci przeglądarki i znika z paska adresu; na nowym
   urządzeniu otwórz link ponownie. Bez ważnego klucza ścieżka przekierowuje na stronę główną.

Rotacja klucza: ustaw nowy `STATS_KEY`, wdróż funkcję, otwórz nowy link.

## Własne wejścia

Na dole panelu jest przełącznik „Nie zbieraj statystyk z tego urządzenia" — wyklucza Twoje
wizyty z danych (dotyczy też zwykłej aplikacji na tym urządzeniu).

## Podgląd lokalny

`frontend/.env.development.local` z `VITE_STATS_PATH=devstats-preview`, potem `npm run dev`
i `http://localhost:5173/x/devstats-preview#k=demo` — panel na danych przykładowych (tylko dev).

## Ograniczenia

- Zapis jest publiczny (aplikacja nie ma logowania), więc ktoś znający adres bazy mógłby wysyłać
  fałszywe zdarzenia. Reguły pilnują kształtu i rozmiaru, klient limituje do 1500 zdarzeń na sesję.
- Odczyt limitowany do 30 000 najnowszych zdarzeń z ostatnich 90 dni.
- Slug w bundlu to ukrycie, nie zabezpieczenie. Zabezpieczeniem jest klucz.
