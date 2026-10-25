---
version: "alpha"
name: Cyber-Ponk
description: "Cyber-Ponk po kompromisie: pełny klimat neonowego szkła, ale etykiety zdaniami zamiast wersalików. Tryb Operate: skanowanie danych ważniejsze niż ekspresja."
colors:
  primary: "#00E5FF"
  void: "#030508"
  dark: "#060C12"
  panel: "#090F18"
  raised: "#0C1420"
  border: "#122034"
  cyan: "#00E5FF"
  rose: "#FF2090"
  amber: "#F59E0B"
  green: "#00FF88"
  text: "#A8C4D4"
  text-hi: "#D0E8F5"
  dim: "#64869F"
  light-void: "#F8FAFC"
  light-cyan: "#0F766E"
  glass: "rgba(6,12,20,0.56)"
  glass-hi: "rgba(6,12,20,0.78)"
typography:
  display:
    fontFamily: "Rajdhani"
    fontSize: 2rem
    fontWeight: 600
    letterSpacing: 0
  mono:
    fontFamily: "Space Mono"
    fontSize: 0.875rem
    fontWeight: 400
  tech:
    fontFamily: "Chakra Petch Italic"
    fontSize: 2rem
    fontWeight: 700
    letterSpacing: 0
  body:
    fontFamily: Rajdhani
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Rajdhani"
    fontSize: 0.8125rem
    fontWeight: 500
    letterSpacing: 0
rounded:
  none: 0px
  badge: 4px
  light-modal: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 20px
  xl: 24px
  nav: 56px
components:
  page-background:
    backgroundColor: "{colors.void}"
  page-background-light:
    backgroundColor: "{colors.light-void}"
  panel-dark:
    backgroundColor: "{colors.dark}"
  card-raised:
    backgroundColor: "{colors.raised}"
  hairline:
    backgroundColor: "{colors.border}"
  glass-panel:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.none}"
    padding: "{spacing.xl}"
  modal-panel:
    backgroundColor: "{colors.glass-hi}"
    rounded: "{rounded.light-modal}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#030508"
    rounded: "{rounded.none}"
    padding: "11px 18px"
    height: 44px
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.cyan}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
    height: 44px
  button-light-accent:
    backgroundColor: "{colors.light-cyan}"
    textColor: "#FFFFFF"
  status-chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.mono}"
    rounded: "{rounded.badge}"
    height: 44px
  status-debt:
    textColor: "{colors.rose}"
    typography: "{typography.label}"
  status-paid:
    textColor: "{colors.green}"
  status-warning:
    textColor: "{colors.amber}"
  heading:
    textColor: "{colors.text-hi}"
    typography: "{typography.display}"
  data-value:
    textColor: "{colors.cyan}"
    typography: "{typography.tech}"
  meta:
    textColor: "{colors.dim}"
    typography: "{typography.body}"
  touch-target:
    height: 44px
    width: 44px
---

## Overview

Cyber-Ponk to narzędzie do rozliczania kortu, wpłat i frekwencji grupy
tenisowej. To ekran **Operate** w sense Impeccable: użytkownik przychodzi
odczytać saldo, dopisać sesję i oznaczyć wpłatę. Skanowalność, powtarzalność
i przewidywalność są ważniejsze niż dekoracja. Marka (neonowe szkło,
ścięte narożniki, animowany canvas) jest wybrana i zablokowana — „brief
wins”. Nowe ekrany dokładają się do niej, nie zastępują jej nowym,
„czystszym” stylem.

**Wyjątek od „brief wins” (PR #14 + kompromis):** pełny redesign na płaski
styl editorial okazał się gorszy — bez neonu aplikacja straciła ducha.
Wracamy do Cyber-Ponka w 100%, ale zatrzymujemy jedną rzecz z eksperymentu:
**etykiety są zdaniami, nie wersalikami**. Decyzja i jej granice:
[`DESIGN-COMPROMISE.md`](DESIGN-COMPROMISE.md).

Ten plik jest skróconym, maszynowo czytelnym kontraktem dla agentów
(format `google-labs-code/design.md`). Szczegółowe uzasadnienie, macierz
kontrastu i lista komponentów są w [`frontend/DESIGN_SYSTEM.md`](frontend/DESIGN_SYSTEM.md),
a źródłem wartości jest `frontend/src/index.css` (bloki `:root` i
`body.theme-light`) oraz `frontend/src/constants/styles.ts`.

Weryfikacja: `cd frontend && npm run verify`. Osobne bramki:
`npm run audit:design` (ruch, tokeny, stany, fonty), `npm run audit:contrast`
(WCAG AA w obu motywach), `npm run audit:a11y` (podłoga 12 px, wykresy).

## Colors

Jeden akcent (`--co-cyan`), trzy kolory stanów: `--co-rose` zaległość,
`--co-green` rozliczone, `--co-amber` ostrzeżenie. `--co-dim2` jest tylko
do dużych napisów i dekoracji — nie przechodzi 4,5:1. Rangi graczy mają
osobne wartości na motyw (`--rank-*`), bo jeden kolor nie da AA jednocześnie
na `#030508` i `#F8FAFC`.

Tryb jasny nie jest odwróceniem ciemnego: akcenty tam są ciemniejsze
(`#0F766E` zamiast `#00E5FF`), inaczej etykiety 12–14 px spadają do 3–3,9:1.
Kolory tożsamości graczy (`constants/colors.ts`) są paskiem, obramowaniem
i awatarem; nazwa zawsze jedzie `--co-text-hi`.

**Canvas:** `ArenaCanvas` czyta tokeny `--canvas-*` przez `getComputedStyle`,
bo API 2D nie rozumie `var()`. Nie wolno dopisywać tam literałów kolorów.

## Typography

Skala `TEXT`: 12 / 13 / 14 / 16 / 20 / 24 / 32 / 40 px. Podłoga 12 px jest
sprawdzana automatycznie. Kroje: `Rajdhani` (główny krój HUD-u Cyberpunk
2077 — tu display **i** treść, waga 600 dla nagłówków, 400 dla treści),
**`Chakra Petch` Italic** (`--font-tech`, ostre ścięte narożniki i pochył na
dane techniczne) i `Space Mono` (drobne dane, daty, terminal).
Źródło: [Fonts In Use — Cyberpunk 2077](https://fontsinuse.com/uses/60926/cyberpunk-2077-video-game).
Liternictwo logo gry jest własnością CD Projektu — zamiast kopiować pliki
„free for personal use" z serwisów typu FontSwan, używamy wolnego kroju (SIL
OFL) o tym samym ostrym, pochyłym charakterze. Szczegóły i porównanie
kandydatów: [`CYBERPUNK-FONT.md`](CYBERPUNK-FONT.md).

Wszystkie trzy kroje są **self-hosted przez `@fontsource`** — własny arkusz
`frontend/src/fonts.css` (importowany w `main.tsx`) wybiera tylko podzbiory
`latin` i `latin-ext` i tylko `woff2`, więc do `/assets/` i do cache service
workera trafia 22 pliki / ~336 KB zamiast ponad 1 MB gotowych paczek
(zbędne devanagari, tajski, wietnamski i stare `.woff`). Każda reguła ma
`unicode-range`, więc polszczyzna pobiera `latin-ext` (ą/ę/ż/ł/ś/ź/ć/ń).
`index.html` nie ładuje niczego z `fonts.googleapis.com` — apka wygląda
identycznie offline i nie wysyła odwiedzin do trzeciej strony.

**Pochyły krój tylko na dane.** `FONT.tech()` w `constants/styles.ts` i token
`--font-tech` są przeznaczone wyłącznie dla liczb, kodów (`SESSION_…`), numeru
BLIK, wielkich kwot i wordmarku `CYBER-PONK`. Zdania, nazwy graczy i waluta
`ZŁ` zostają przy `--font-display`. Chakra Petch ma pełny `latin-ext`, więc
polskie znaki nie są już problemem — rozdzielenie wynika z czytelności, nie
z brakujących glifów. `--font-stencil` jest aliasem `--font-tech`.
`FONT.data()` wybiera krój danych tylko dla czysto numerycznych wartości —
inaczej wraca do Space Mono (fallback BLIK to komunikat, nie numer).

**Kursywa jest jawna.** Reguły `@font-face` mają `font-style: italic`, a
`FONT.tech()` i wordmarki proszą o `fontStyle: 'italic'`. Bez tego przeglądarka
nałożyłaby na pochyły krój drugie, sztuczne pochylenie.

**Zdania, nie wersaliki.** Zakaz `text-transform: uppercase` i trackingu
etykiet (`TRACK.* = 'normal'`). Hierarchię buduje rozmiar i waga, nie
rozstrzelone litery. Wyjątek: wielkie litery w logo wynikają z treści znaku
`CYBER-PONK`, nie ze stylu tekstu. Regułę egzekwuje `audit:design` (reguła 5)
i test w `designFloor.test.jsx`; brak CDN i obecność krojów sprawdza reguła 6.

Pola formularzy mają 16 px, żeby iOS nie przybliżał widoku. Etykiety osi
wykresów: minimum 12 px w jednostkach `viewBox`, mierzonego kontenera
(`useElementWidth`).

Ikony: wyłącznie wektory (Lucide + własne glyphy). Emoji są treścią tylko
w wiadomości do czatu i w konfetti — nigdy ikoną w interfejsie.

## Layout

Kontener `max-w-7xl`, górny margines 8–32 px, dolna nawigacja 56 px +
`safe-area-inset-bottom`; treść ma `padding-bottom` o tej samej wysokości.
Breakpointy 639 / 480 / 768 px są w jednym miejscu (`BREAKPOINT`).
`html` i `body` mają `overflow-x: clip` — `hidden` tworzył kontener
przewijania i psuł pozycjonowanie banerów. Zakaz `100vw`.

Wszystkie cele dotykowe: min. 44 × 44 px. Informacja nigdy nie jest
przekazywana samym kolorem: status ma tekst, ikona ma `aria-label`,
a wykres ma tekstową alternatywę w `.sr-only`.

## Elevation & Depth

Szkło to cztery warstwa: rozmycie, górny refleks, plama światła podążająca
za kursorem, krawędziowy specular. Wszystko przez tokeny `--glass-*`.
`prefers-reduced-transparency: reduce` zamienia szkło na pełny `--co-panel`;
`prefers-contrast: more` podnosi obramowania i kolor etykiet. Cienie na
elementach w spoczynku są wyłączone — wyjątkiem jest dialog i toast.

## Shapes

Ciemny motyw: ścięte narożniki (`CLIP.panel`, `CLIP.card`, `CLIP.badge`).
Jasny motyw: promień 12 px na dialogach, bez ścięć. Te dwa kształty nie
mieszają się w jednym komponencie. Elementy z `clip-path` dostają pierścień
fokusa przez `drop-shadow`, bo zwykły `outline` jest obcinany.

## Components

- `Modal` — portal do `body`, focus trap, wyjście szybsze niż wejście,
  dolny arkusz z gestem przeciągnięcia i sprężyną.
- `PlayerCard` — nazwa, kwota, status; pasek obecności skaluje się przez
  `transform`, nie przez `width`.
- `UndoBar` — pasek cofania z licznikiem, `role="status"` i
  `aria-atomic="false"`, żeby czytnik nie czytał całości co sekundę.
- `WrappedModal` — `role="progressbar"`, nawigacja klawiaturą, widoczny
  przycisk „Wstecz”.
- Rozwijane panele mają `aria-expanded` + `aria-controls`; przełączane
  filtry mają `aria-pressed`.

### Ruch

Animujemy wyłącznie `transform` i `opacity` (oraz kolor w krótkich
przejściach). Zakaz `transition: all`, zakaz animowania `width`, `height`,
`top`, `left`, `margin`, `padding`. Wejście 240–400 ms z
`cubic-bezier(.22,1,.36,1)`, wciśnięcie 80–100 ms, wyjście modalu 180 ms.
`prefers-reduced-motion` zostawia crossfade, wyłącza rAF w hookach i
canvasie. Animacje poza ekranem są zatrzymywane (`IntersectionObserver`),
na hidden tab zawsze (`visibilitychange`).

## Do's and Don'ts

**Rób:** nowy kolor najpierw w `:root` + `body.theme-light`, potem w
komponencie przez `var()`; nowy ruch przez `transform`/`opacity`; nowy
komponent z `aria-expanded`/`aria-pressed`, jeśli zmienia stan; test
regresyjny dla każdej poprawki; `npm run verify` przed wdrożeniem.

**Nie rób:** nie wpisuj `transition: all` ani animacji layoutu; nie używaj
`text-transform: uppercase` ani trackingu do etykiet; nie używaj
`overflow-x: hidden` na `html`/`body`; nie dodawaj literału koloru ani kroju
w TSX (wyjątki: `BrandMark` jako zasób marki, paleta graczy, meta
theme-color — opisane w `scripts/audit-design.mjs`); nie zamieniaj emoji
w ikonę; nie ładuj fontów z CDN (używaj `@fontsource`); nie dodawaj
GSAP/React Bits/Canvas UI jako zależności bez potrzeby — wzorce z tych bibliotek są tu zaimplementowane w istniejącym
stacku; nie rób pełnego redesignu bez pytania — to system zablokowany,
a zmiana marki wymaga decyzji właściciela produktu (PR #14 był tą decyzją
i został świadomie wycofany — patrz `DESIGN-COMPROMISE.md`).
