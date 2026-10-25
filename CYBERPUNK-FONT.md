# Czcionka z Cyberpunka

> Decyzja: interfejs używa **tego samego duetu krojów co Cyberpunk 2077** —
> Rajdhani dla tekstu, Orbitron dla danych. Obowiązuje od tej gałęzi.

## Skąd ten wybór

Prośba brzmiała „daj czcionkę z cyberpunka". Zamiast szukać dowolnego
„techno" kroju, sprawdziliśmy, czego **naprawdę** używa gra. Według
[Fonts In Use — Cyberpunk 2077](https://fontsinuse.com/uses/60926/cyberpunk-2077-video-game)
większość interfejsu gry (HUD, menu, dziennik zadań) jest złożona w
**Rajdhani**, a **Orbitron** jest tam krojem drugorzędnym na mniej ważne
dane techniczne. Potwierdzają to też zestawienia fontów gry i dyskusje
społeczności.

Aplikacja miała już Rajdhani jako `--font-display` i `--font-body` — czyli
**główny krój z gry był na miejscu**. Brakowało tylko tego drugiego,
charakterystycznego kroju na liczby. Dokładamy więc **Orbitron Variable**
jako `--font-tech`.

Nie kopiujemy liternictwa z logo gry: jest własne, nieudostępniane na wolnej
licencji. Rajdhani i Orbitron to fonty **SIL Open Font License**, dostępne w
Google Fonts — można je legalnie hostować razem z aplikacją.

## Co się zmieniło

| | Przed | Po |
|---|---|---|
| Tekst, nagłówki, zdania | Rajdhani | Rajdhani (bez zmian) |
| Wordmark `CYBER-PONK`, liczby OVR | Bebas Neue | **Orbitron Variable** |
| Wielkie kwoty, numer BLIK, kody `SESSION_…`, liczniki Wrapped | Rajdhani / Space Mono | **Orbitron Variable** |
| Drobne dane, daty, terminal | Space Mono | Space Mono (bez zmian) |
| Skąd się biorą pliki | Google Fonts CDN | **własny bundel (`@fontsource`)** |

`Bebas Neue` znika. Był krojem **wyłącznie wielkoliterowym** — nie potrafił
złożyć zdania, co gryzło się z kompromisem „zdania zamiast wersalików"
(`DESIGN-COMPROMISE.md`). Orbitron ma małe litery, więc nie ma tego problemu,
a przy okazji jest bliżej oryginału z Night City.

`--font-stencil` zostaje w kodzie jako **alias `--font-tech`** — istniejące
style wordmarku i liczby OVR nie musiały znać nowej nazwy tokenu.

## Dlaczego Orbitron nie jest wszędzie

Orbitron ma **tylko podzbiór `latin`** — nie zawiera polskich znaków
(ą/ć/ę/ł/ń/ó/ś/ź/ż). Gdyby złożyć w nim zdanie, litery po prostu wskoczyłyby
z fallbacku i tekst wyglądałby na posklejany z dwóch krojów. Dlatego:

- `FONT.tech()` / `--font-tech` → **tylko liczby, kody i ASCII**
  (wordmark, OVR, kwoty, BLIK, `SESSION_…`, liczniki),
- zdania, nazwy graczy, daty, waluta `ZŁ` → **Rajdhani / Space Mono**.

W `PlayerCard` każda wielka kwota ma `ZŁ` w osobnym `<span>` z jawnym
`--font-display` — inaczej polskie „Ł" też dostałoby Orbitrona. Numer BLIK
używa `FONT.data()`: gdy konfiguracja jest pusta i wyświetla się fallback
„SKONFIGURUJ .ENV" (polskie „Ó"), helper wraca do Space Mono zamiast składać
jedno słowo z dwóch krojów.

## Self-hosting i PWA

Paczki w `frontend/package.json`: `@fontsource/rajdhani` (wagi 400/500/600/700),
`@fontsource/space-mono` (400, 400-italic, 700) i
`@fontsource-variable/orbitron` (jeden plik zmienny, wagi 400–900).

**Własny arkusz `frontend/src/fonts.css`** (importowany w `main.tsx`) deklaruje
15 reguł `@font-face` — każda z `unicode-range` — wskazujących prosto na pliki
`woff2` w `node_modules`. Dlaczego nie gotowe arkusze z paczek:

- `400.css` ładuje też **devanagari** i **wietnamski** oraz przestarzałe
  `.woff` obok `.woff2` — Vite kopiuje to wszystko do `/assets/`, a service
  worker cache'uje cały katalog: **43 pliki, ~1 MB** przy każdym wydaniu.
- `latin-400.css` nie ma `unicode-range`; załadowany obok `latin-ext-400.css`
  nadpisałby go i polskie znaki zniknęłyby.

Efekt: **15 plików, ~252 KB**, same `woff2`, oba potrzebne podzbiory. Vite
kopiuje je do `/assets/`, skąd `firebase-messaging-sw.js` dodaje je do
`ASSET_CACHE` razem z resztą wydania.

Korzyści względem CDN:

- apka wygląda identycznie **offline**,
- brak dodatkowego połączenia do trzeciej strony (prywatność),
- brak migotania fontu przy zablokowanym Google Fonts,
- kroje mają hash treści i unieważniają się razem z wydaniem.

## Blokady anty-regresji

1. `frontend/scripts/audit-design.mjs`, **reguła 6** — odrzuca linki do
   `fonts.googleapis.com` / `fonts.gstatic.com` w `index.html`, wymaga importów
   trzech pakietów `@fontsource` w `main.tsx`, pilnuje `--font-tech` i braku
   `Bebas Neue`. Uruchamiane przez `npm run audit:design` w `npm run verify`.
2. `frontend/src/__tests__/designFloor.test.jsx` — testy sprawdzają
   `FONT.tech()`, brak CDN w `index.html`, obecność importów i tokenów.
3. `tailwind.config.js` (`font-cyber`, `font-tech`) wskazuje na nowy krój.
4. Reguła 6 pilnuje też, że `fonts.css` ma `unicode-range` przy każdej regule,
   nie używa `.woff` ani zbędnych podzbiorów — inaczej cicho wraca ~1 MB
   albo giną polskie znaki.

## Gdyby jednak wrócić do Bebas Neue

To jedna decyzja, nie revert:

1. `index.html` — dodać `<link>` do Google Fonts (albo `@fontsource/bebas-neue`).
2. `src/fonts.css` — usunąć regułę Orbitrona (i dostosować audyt).
3. `src/index.css` — `--font-tech: 'Bebas Neue', monospace`.
4. `PlayerCard.tsx`, `WrappedModal.tsx` — zmniejszyć rozmiar wielkich liczb
   (Bebas jest węższy) i zdjąć `fontWeight: 700/800`.
5. Usunąć regułę 6 z audytu i sekcję testów o krojach, zaktualizować
   `DESIGN.md`, `frontend/DESIGN_SYSTEM.md` i ten plik.

Uwaga: Bebas Neue nie złoży zdania — powrót oznacza też powrót do wersalików
w miejscach, gdzie dziś są zdania.
