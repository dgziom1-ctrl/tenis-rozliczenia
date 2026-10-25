---
version: "alpha"
name: Cyber-Ponk — Editorial
description: "Eksperymentalny pełny redesign: płaski, cichy system Operate. Jeden krój, jeden akcent,zero szkła i neonu. Zastępuje poprzedni system wizualny na tej gałęzi."
colors:
  primary: "#0E5A54"
  void: "#F5F5F1"
  dark: "#EDEDE8"
  panel: "#FFFFFF"
  raised: "#FFFFFF"
  border: "#D8DBD5"
  cyan: "#0E5A54"
  rose: "#9B2C2C"
  amber: "#7A5200"
  green: "#1B6E4A"
  text: "#2A312E"
  text-hi: "#141816"
  dim: "#4E5A55"
  light-void: "#F5F5F1"
  light-cyan: "#0E5A54"
  glass: "#FFFFFF"
  glass-hi: "#FFFFFF"
typography:
  display:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 600
    letterSpacing: 0
  mono:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
  body:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 500
    letterSpacing: 0
rounded:
  none: 0px
  badge: 2px
  light-modal: 0px
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
    textColor: "#FFFFFF"
    rounded: "{rounded.none}"
    padding: "11px 18px"
    height: 44px
  button-outline:
    backgroundColor: "{colors.panel}"
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
  meta:
    textColor: "{colors.dim}"
    typography: "{typography.body}"
  touch-target:
    height: 44px
    width: 44px
---

## Overview

To **pełny redesign**, nie polish. Powstał jako eksperyment na osobnej gałęzi:
zamiast rozwijać tożsamość Cyber‑Ponk (szkło, neon, wersaliki, ścięte
narożniki), przyjmujemy nowy, cichy świat wizualny w duchu Hallmark i Taste.
Tryb pozostaje **Operate** — użytkownik skanuje salda, dopisuje sesje i
oznacza wpłaty. Forma ma mu w tym nie przeszkadzać.

Kierunek: **utilitarian editorial**. Papierowe tło, głęboki teal jako jedyny
akcent, trzy kolory stanów, jeden krój (Inter) i hierarchia zbudowana z
rozmiaru i wagi, nie z koloru ani światła. Brak gradientów, poświaty,
przezroczystości, folii, siatek, canvasowej animacji i dekoracyjnego ruchu.

Zakres i powrót do poprzedniego wyglądu opisuje
[`REDESIGN-EXPERIMENT.md`](REDESIGN-EXPERIMENT.md). Szczegółowa historia
systemu z `main` zostaje w
[`frontend/DESIGN_SYSTEM.md`](frontend/DESIGN_SYSTEM.md) jako dokumentacja
poprzedniego wariantu.

Weryfikacja: `cd frontend && npm run verify`. Osobne bramki:
`npm run audit:design`, `npm run audit:contrast`, `npm run audit:a11y`,
`npm run design:lint`.

## Colors

Jeden akcent (`--co-cyan`, głęboki teal `#0E5A54` w motywie jasnym,
`#8FD6C6` w ciemnym). Trzy kolory stanów: `--co-rose` zaległość,
`--co-green` rozliczone, `--co-amber` ostrzeżenie. Powierzchnie są płaskie
i prawie identyczne (`--co-void`, `--co-panel`, `--co-raised`,
`--co-glass`), więc nie ma „głębi" z cieni i prześwitów.

Oba motywy to wariacje tego samego układu, nie odwrócenie neonu. Wszystkie
tokeny żyją w `frontend/src/index.css` w blokach `:root` i
`body.theme-light`. `npm run audit:contrast` sprawdza 300 par w obu motywach
(WCAG AA). `--co-dim2` jest tylko do dużych napisów (3:1), `--co-dim` do
treści (4,5:1). Rangi graczy mają osobne wartości na motyw.

## Typography

Jeden krój: **Inter** (fallback na system-ui). Koniec z Bebas Neue, Space
Mono i Rajdhani. Skala `TEXT` 12–40 px zostaje, ale etykiety nie są już
wersalikami z trackingiem: `text-transform: none`, `letter-spacing: normal`.
Hierarchia: waga 600 dla nagłówków, 500 dla etykiet, 400 dla treści. Pola
formularzy 16 px (iOS nie przybliża). Ikony: wyłącznie wektory Lucide,
 emoji tylko jako treść konfetti, nie jako ikona.

## Layout

Kontener `max-w-7xl`, dolna nawigacja 56 px + `safe-area-inset-bottom`.
`html` i `body` mają `overflow-x: clip`, zakaz `100vw`. Wszystkie cele
dotykowe min. 44 × 44 px. Informacja nigdy nie jest przekazywana samym
kolorem: status ma tekst, ikona ma `aria-label`, wykres ma alternatywę w
`.sr-only`. Lewy margines wyrównania dominuje; wyśrodkowane są tylko
puste stany i podium.

## Elevation & Depth

Szkło znika: `backdrop-filter`, `--glass-*`, refleksy `::after` i ziarno są
wyłączone. Cień w spoczynku nie istnieje — wyjątkiem jest dialog, który
naprawdę unosi się nad treścią (`--editorial-shadow`). Separacją powierzchni
jest krok w tonie tła albo 1‑px obramowanie w kolorze `--co-border`.

## Shapes

Prostokąty. `--clip-*` i `CLIP` w `constants/styles.ts` mają wartość `none`,
`--modal-radius: 0`. Nie ma ściętych narożników ani miękkich 9–16 px
promieni, które Taste nazywa domyślnym słabym wyborem. Okrągłe pozostają
tylko awatary i kropki danych.

## Components

- `Modal` — portal, focus trap, wyjście szybsze niż wejście, bez rozmycia
  scrimu.
- `PlayerCard` — płaska karta, pasek obecności przez `transform: scaleX()`.
- `UndoBar` — `role="status"`, `aria-atomic="false"`, pasek przez `scaleX`.
- `WrappedModal` — `role="progressbar"`, nawigacja klawiaturą, bez skanów
  i pulsów.
- Rozwijane panele: `aria-expanded` + `aria-controls`; filtry `aria-pressed`.

### Ruch

Tylko `transform` i `opacity`. Wejścia 240–400 ms, wciśnięcie 80–100 ms,
wyjście modalu 180 ms. Dekoracyjne pętle (`neon-*`, `wm-glow`, `fluid-float`,
`podium-scan`, `shimmer`, `confettiBurst`) są zredukowane do pustego
przebiegu — nazwy zostają, żeby komponenty i lint CSS widziały ten sam
kontrakt. `prefers-reduced-motion` nadal ma pierwszeństwo.

## Do's and Don'ts

**Rób:** nowy kolor w `:root` + `body.theme-light`, potem `var()` w
komponencie; zdanie zamiast wersalików; płaskie tło; test regresyjny dla
każdej zmiany; `npm run verify` przed wdrożeniem.

**Nie rób:** nie wracaj do szkła, neonu, gradientów, wersalików z
trackingiem ani ściętych narożników; nie dodawaj literału koloru w TSX;
nie animuj `width`/`height`/`top`/`left`; nie używaj `overflow-x: hidden`;
nie dokładaj GSAP/React Bits/Canvas UI bez powodu — wzorce są zaimplementowane
w istniejącym stacku.
