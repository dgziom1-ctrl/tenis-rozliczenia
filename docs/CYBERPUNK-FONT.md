# Czcionka z Cyberpunka

> Decyzja: **Rajdhani** na tekst, **Chakra Petch Italic** na dane.
> Obowiązuje od PR #17. Zmienia poprzedni wybór (Orbitron), który był
> „zbyt kwadratowy".

## Skąd ten wybór

Właściciel produktu wskazał stronę
[FontSwan — Cyberpunk Font](https://fontswan.com/cyberpunk-font/) jako
kierunek: litery **ostre, pochyłe, poszarpane**, bliżej liternictwa z logo
Cyberpunk 2077 niż geometryczny, kwadratowy HUD-owy krój.

Plik z FontSwan to **nieoficjalna kopia liternictwa CD Projektu**,
udostępniana jako „free for personal use", bez zgody właściciela znaku.
Nie wolno go wstawiać do publicznej aplikacji (PWA, komercyjny projekt,
repozytorium). Zamiast tego użyliśmy wolnego kroju o tym samym charakterze:

- **Chakra Petch Italic** — ścięte narożniki, wyraźny pochył, techniczny
  rysunek. Licencja **SIL Open Font License 1.1**, dostępny w Google Fonts
  i jako `@fontsource/chakra-petch`.
- **Rajdhani** zostaje na tekście — to autentyczny główny krój interfejsu
  Cyberpunk 2077 ([Fonts In Use](https://fontsinuse.com/uses/60926/cyberpunk-2077-video-game)).
- **Space Mono** zostaje na drobnych danych, datach i terminalu.

Wybór poprzedziło porównanie dziesięciu wolnych krojów (Quantico Italic,
Exo 2 Italic, Saira Italic, Black Ops One, Iceberg, Bruno Ace, Rationale,
Oxanium oraz poprzednie Bebas Neue i Orbitron) na arkuszu z prawdziwymi
próbkami. Chakra Petch wygrał, bo łączy pochył i ostre cięcia z **pełnym
polskim zestawem znaków**.

## Co się zmieniło względem Orbitrona

| | Orbitron (PR #16) | Chakra Petch Italic (teraz) |
|---|---|---|
| Charakter | geometryczny, kwadratowy, okrągłe „O" | ostre ścięcia, wyraźny pochył |
| Pochył | brak | naturalny (`font-style: italic`) |
| Polskie znaki | **brak** (`latin` only) | **pełny `latin-ext`** |
| Wagi | zmienne 400–900, jeden plik | statyczne 400/500/600/700 |
| Pliki w cache | 15 / ~252 KB | 22 / ~336 KB |

`--font-stencil` nadal jest aliasem `--font-tech` — wordmark, liczby OVR,
wielkie kwoty, numer BLIK, kody `SESSION_…` i liczniki Wrapped nie musiały
zmieniać nazwy tokenu.

**Kursywa jest jawna.** Reguły `@font-face` deklarują `font-style: italic`,
a `FONT.tech()` i style wordmarków proszą o `fontStyle: 'italic'`. Bez tego
przeglądarka dobrałaby plik italic i dołożyła do niego **sztuczne** pochylenie,
psując rysunek liter. Reguła 6 w audycie pilnuje obu stron tej umowy.

**Polszczyzna jest teraz bezpieczna.** Chakra Petch ma `latin-ext`, więc
nie ma już pułapki z „ZŁ" czy „SKONFIGURUJ .ENV". Mimo to zachowaliśmy dwa
świadome rozdzielenia, bo poprawiają czytelność, a nie ratują brakujący znak:

- `ZŁ` w wielkich kwotach ma jawny `--font-display` w osobnym `<span>`
  — waluta nie jest liczbą, nie powinna być pochyła;
- `FONT.data()` wraca do Space Mono, gdy wartość nie jest czystą liczbą
  (np. nieskonfigurowany BLIK pokazuje komunikat „SKONFIGURUJ .ENV").

Zdania — w tym `.matchday-kicker` — zostają w **Rajdhani**. Niezależnie od
możliwości kroju, dane i zdania to dwa różne zadania typograficzne.

## Self-hosting i PWA

Paczki w `frontend/package.json`: `@fontsource/rajdhani` (wagi 400/500/600/700),
`@fontsource/space-mono` (400, 400-italic, 700) i
`@fontsource/chakra-petch` (400/500/600/700 italic).

**Własny arkusz `frontend/src/fonts.css`** (importowany w `main.tsx`)
deklaruje 22 reguły `@font-face` — każda z `unicode-range` — wskazujących
prosto na pliki `woff2` w `node_modules`. Dlaczego nie gotowe arkusze z paczek:

- `400.css` ładuje też **devanagari**, **tajski** i **wietnamski** oraz
  przestarzałe `.woff` obok `.woff2` — Vite kopiuje to wszystko do `/assets/`,
  a service worker cache'uje cały katalog: ponad 1 MB przy każdym wydaniu.
- `latin-400.css` nie ma `unicode-range`; załadowany obok `latin-ext-400.css`
  nadpisałby go i polskie znaki zniknęłyby.

Efekt: **22 pliki, ~336 KB**, same `woff2`, oba potrzebne podzbiory, brak
CDN. Vite kopiuje je do `/assets/`, skąd `firebase-messaging-sw.js` dodaje je
do `ASSET_CACHE` razem z resztą wydania — apka wygląda tak samo offline.

## Blokady anty-regresji

1. `frontend/scripts/audit-design.mjs`, **reguła 6** — odrzuca linki do
   `fonts.googleapis.com` / `gstatic` w `index.html`, wymaga importu
   `fonts.css`, obecności trzech paczek, `--font-tech` wskazującego na
   Chakra Petch, `font-style: italic` w arkuszach i `fontStyle: 'italic'`
   w `FONT.tech()`, pliku `latin-ext-700-italic` oraz braku Orbitrona.
   Pilnuje też, by każda reguła miała `unicode-range` i by nie wróciły
   zbędne podzbiory ani `.woff`. Uruchamiane przez `npm run verify`.
2. `frontend/src/__tests__/designFloor.test.jsx` — 6 testów sprawdza helpery
   `FONT.tech()` / `FONT.data()`, brak CDN, importy, podzbiory, kursywę
   i tokeny.
3. `tailwind.config.js` (`font-cyber`, `font-tech`) wskazuje na nowy krój.

## Gdyby jednak wrócić do innego kroju

To jedna decyzja, nie revert całego PR:

1. Zainstalować paczkę `@fontsource/…` i odinstalować `chakra-petch`.
2. `src/fonts.css` — podmienić sekcję Chakra Petch na reguły nowego kroju
   (z `unicode-range` dla `latin` i `latin-ext`!).
3. `src/index.css` — `--font-tech` i `font-style` w `.card-ovr` /
   `.header-wordmark`; `constants/styles.ts` — `fontStyle` w `FONT.tech()`;
   `Header.tsx` / `App.tsx` — `fontStyle` wordmarków.
4. Zaktualizować regułę 6, testy, `DESIGN.md`, `frontend/DESIGN_SYSTEM.md`
   i ten plik.

Uwaga: powrót do **Bebas Neue** oznacza też powrót wersalików — ten krój
nie ma małych liter i nie złoży zdania.
