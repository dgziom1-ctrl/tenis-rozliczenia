# Cyber-Ponk

[English](README.md) · [Polski](README.pl.md)

Aplikacja webowa do zapisywania obecności i kosztów kortu w grupie sportowej. Obsługuje ping-ponga, squasha, badmintona i padla. Na podstawie zapisanych sesji oraz wpłat oblicza saldo każdego gracza. Interfejs jest obecnie po polsku.

## Co robi aplikacja

- Zapisuje sesje, uczestników, liczbę kortów i czas gry, karty MultiSport oraz — w obsługiwanych dyscyplinach — wypożyczenie rakiet. Przed zapisem pokazuje podział kosztów i pozwala skopiować podsumowanie na grupę.
- Prowadzi saldo gracza z rozbiciem na sesje i wpłaty. Wpłatę zapisuje się w aplikacji ręcznie; przelew bankowy lub BLIK wykonuje się osobno.
- Udostępnia historię z wyszukiwaniem i filtrami po graczu, sporcie i roku, a także edycję, usuwanie oraz eksport do CSV.
- Pokazuje ranking frekwencji, raporty miesięczne, historię miejsc w rankingu, serie i osiągnięcia. Statystyki można przeglądać według roku.
- Pozwala zarządzać składem, przenosić graczy do rezerwy i ustawiać domyślną listę osób z kartą MultiSport.
- Obsługuje opcjonalne powiadomienia web push o nowych sesjach, kamieniach milowych serii i nowych graczach. Aplikację można też zainstalować jako PWA.

## Jak liczone są koszty

W formularzu wpisuje się kwotę faktycznie zapłaconą za kort, już po odliczeniu zniżek MultiSport. Podział uwzględnia nominalną zniżkę 15 zł za każdą kartę MultiSport. Jeśli w sesji zapisano liczbę kortów i czas trwania, limit kart zależy od dyscypliny; po jego przekroczeniu dostępna zniżka jest proporcjonalnie dzielona między posiadaczy kart. W squashu, badmintonie i padlu koszt wypożyczenia rakiet jest doliczany osobno i dzielony między uczestników bez własnej rakietki. Obliczenia są prowadzone w groszach.

## Technologie

| Obszar | Technologia |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Routing | React Router |
| Dane | Firebase Realtime Database |
| Powiadomienia i backend | Firebase Cloud Messaging, Cloud Functions (Node.js 22) |
| Hosting | Firebase Hosting |
| Testy | Vitest, Testing Library |

## Uruchomienie lokalne

Wymagany Node.js 22 lub nowszy.

```bash
git clone https://github.com/dgziom1-ctrl/tenis-rozliczenia.git
cd tenis-rozliczenia/frontend
npm ci
npm run dev
```

Domyślnie `npm run dev` korzysta z przykładowych danych ustawionych w `frontend/.env.development`. Nagłówek oznacza tryb demo, a wprowadzone zmiany nie są zapisywane.

Aby połączyć aplikację deweloperską z własnym projektem Firebase, w katalogu `frontend/` uruchom `cp .env.example .env.development.local`, uzupełnij konfigurację Firebase, włącz Realtime Database i ustaw `VITE_DEMO_DATA=0`. Do testowania powiadomień push skonfiguruj też Firebase Cloud Messaging i dodaj klucz VAPID dla przeglądarki. Plik `.env.development.local` jest ignorowany przez Git.

Wszystkie zmienne `VITE_` trafiają do kodu wysyłanego do przeglądarki. Nie umieszczaj w nich kluczy kont serwisowych ani innych prywatnych danych. Przed podłączeniem prawdziwej bazy przeczytaj sekcję [Bezpieczeństwo i dane](#bezpieczeństwo-i-dane).

Repozytorium zawiera ustawienia dla jednej grupy. Przed użyciem w innym składzie sprawdź `ORGANIZER_NAME`, zniżkę i limity MultiSport oraz domyślną cenę wypożyczenia rakiet w `frontend/src/constants/index.ts`. Numer BLIK ustawia się zmienną `VITE_BLIK_NUMBER`.

## Kontrole

Polecenia uruchamiaj w katalogu `frontend/`:

```bash
npm test          # uruchomienie testów
npm run test:watch
npm run verify    # sprawdzenie typów, lint, audyty i testy
npm run build
```

## Układ repozytorium

| Ścieżka | Zawartość |
| --- | --- |
| `frontend/` | Aplikacja React i jej testy |
| `functions/` | Cloud Functions wysyłające powiadomienia o sesjach i graczach oraz serwerowa implementacja podziału kosztów |
| `database.rules.json` | Reguły dostępu do Realtime Database i walidacja danych |
| `firebase.json` | Konfiguracja Firebase Hosting, bazy i Functions |
| `.github/workflows/` | Kontrole, podglądy Hosting, wdrożenie i kopia bazy |

## Wdrożenie i kopie bazy

GitHub Actions uruchamia kontrole dla pull requestów, a po pushu do `main` wdraża aplikację. Wdrożenie publikuje frontend w Firebase Hosting, reguły Realtime Database oraz dwie funkcje z `functions/index.js` (`onSessionAdded` i `onPlayerAdded`). Wymaga sekretów Firebase skonfigurowanych w repozytorium.

Zaplanowany workflow uruchamia się w niedzielę o 00:00 UTC i zapisuje kopię Realtime Database jako artefakt GitHub Actions z 90-dniowym okresem przechowywania. Z kopii usuwane są `fcmTokens`, ale pozostają w niej nazwiska graczy, sesje i wpłaty — traktuj ją jako dane wrażliwe.

## Bezpieczeństwo i dane

**Reguły zapisane w tym repozytorium nie ograniczają dostępu.** Aplikacja nie korzysta z Firebase Authentication. `database.rules.json` pozwala niezalogowanym użytkownikom odczytywać `appData` i przyjmuje zapisy przechodzące walidację struktury. Walidacja określa kształt danych, ale nie ogranicza tego, kto może uzyskać do nich dostęp; adres bazy znajduje się w konfiguracji frontendu. Jeśli te reguły są wdrożone, rozliczenia są publicznie dostępne. Traktuj dane graczy i wpłat jako publiczne, dopóki nie zostaną zmienione i zweryfikowane reguły wdrożone w Firebase.

`VITE_ADMIN_PASSWORD`, jeśli jest ustawione, trafia do paczki frontendowej. Blokuje wybrane akcje w interfejsie, ale nie jest zabezpieczeniem bazy. Nie traktuj danych jako prywatnych ani nie polegaj na tym haśle przy ochronie prawdziwych danych graczy i wpłat. Do skutecznej ochrony potrzebne jest uwierzytelnianie i bardziej restrykcyjne reguły bazy.

## Praca bez internetu

Jeśli aplikacja była wcześniej uruchomiona online, może wyświetlić zapisane pliki aplikacji i ostatni snapshot danych z tego urządzenia. Zmiany nie są kolejkowane do późniejszej synchronizacji — dodanie sesji lub zapisanie wpłaty wymaga połączenia z internetem.
