# Design skills — co z listy 12 repozytoriów faktycznie użyliśmy

Stan na **2026-10-25**, gwiazdki zweryfikowane przez GitHub REST API
(`gh api repos/<owner>/<repo>`). Liczby z posta są w większości poprawne,
ale kilka jest uciętych do „87,” / „47,” / „16,”, a **Canvas UI ma 5 083 ★,
nie 53 501** (przekręcone cyfry). Nie traktuj listy jako rankingu jakości —
to dwanaście różnych narzędzi, z których część w ogóle nie dotyczy aplikacji
dashboardowej.

| # | Repozytorium | ★ w poście | ★ realne | Co z tego wzięliśmy |
|---|---|---:|---:|---|
| 1 | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 137 459 | 140 092 | Priorytety: dostępność → dotyk → wydajność → spójność. Już wdrożone w PR #11; teraz domknięte stany `aria-expanded`. |
| 2 | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | 122 227 | 123 390 | Wzorzec „jeden plik DESIGN.md jako pamięć agenta”. |
| 3 | [nexu-io/open-design](https://github.com/nexu-io/open-design) | 102 408 | 103 834 | Idea wspólnego kontekstu projektowego; samo narzędzie nie jest biblioteką UI. |
| 4 | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 99 143 | 102 189 | Zasada „brief wins” (przez Impeccable) i „look at screenshots before the linter decides”. |
| 5 | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 87, | 86 801 | Tryb **Operate**: skanowalność ponad ekspresję; refinement zachowuje markę, redesign wymaga zgody. |
| 6 | [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits) | 47, | 50 174 | Wzorce mikrointerakcji zaimplementowane własnymi hookami — bez dokładania zależności. |
| 7 | [emilkowalski/skills](https://github.com/emilkowalski/skills) | 47, | 49 463 | Dobieranie krzywej do kierunku ruchu, wyjście szybsze niż wejście, audyt animacji pod kątem ramek. |
| 8 | [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | 30 374 | 32 666 | „The Floor”: tokeny kolorów, zakaz `transition: all`, `overflow-x: clip`, focus-visible, reduced motion. |
| 9 | [google-labs-code/design.md](https://github.com/google-labs-code/design.md) | 28 421 | 28 522 | Format pliku z tokenami YAML + prozą; oficjalny linter. |
| 10 | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | 16, | 17 089 | Tylko `transform`/`opacity`, pauzowanie animacji poza ekranem i na hidden tab, `will-change` z umiarem. |
| 11 | [oso95/scroll-world](https://github.com/oso95/scroll-world) | 10 354 | 10 457 | Świadomie pominięty: scroll-driven 3D landing page nie pasuje do ekranu Operate. |
| 12 | [DavidHDev/canvas-ui](https://github.com/DavidHDev/canvas-ui) | 53 501 | 5 083 | Zasada „canvas jako warstwa nad prawdziwym HTML”; nasz `ArenaCanvas` został ztokenizowany. |

---

## Co zmieniliśmy w kodzie

### 1. `DESIGN.md` — zablokowany kontrakt (repo #2, #9)

Nowy plik w katalogu głównym, zgodny ze specyfikacją `google-labs-code/design.md`:
tokeny kolorów, typografii, promieni, odstępów i komponentów w YAML + uzasadnienie
w ośmiu sekcjach w wymaganej kolejności. Walidacja:

```bash
cd frontend && npm run design:lint
# { "errors": 0, "warnings": 0, "infos": 1 }
```

Szczegółowy opis (kontrast, rangi, easter egg) zostaje w
`frontend/DESIGN_SYSTEM.md`; `DESIGN.md` jest skrótem dla agentów kodujących.

### 2. `npm run audit:design` — bramka „design floor” (repo #8, #10, #7)

`frontend/scripts/audit-design.mjs`, wpięty do `npm run verify`. Pilnuje:

- braku `transition: all` i animowania `width/height/top/left/margin/padding`
  (także wewnątrz `@keyframes`),
- `overflow-x: clip` zamiast `hidden` na `html`/`body`, braku `100vw`,
- obecności `:focus-visible`, `prefers-reduced-motion`,
  `prefers-reduced-transparency`, `prefers-contrast`,
- kolorów i krojów w komponentach wyłącznie przez `var(--…)`.

Wyjątki są jawne w kodzie skryptu: `BrandMark` (zasób marki),
`constants/colors.ts` (warstwa prymitywów), `useTheme.ts` (meta theme-color),
blok fallbacków w `ArenaCanvas` oraz sam arkusz tokenów.

### 3. Ruch bez przeliczania layoutu (repo #7, #10, #8)

Pięć pasków i wskaźników animowało `width`, a `scan-sweep` animował `top`:

- `UndoBar`, `PlayerCard`, `PlayerSessionModal`, `WrappedModal` — stała
  szerokość + `transform: scaleX()` z `transform-origin: left`,
- `.mobile-nav-btn::before` — `scaleX()` zamiast `width: 0 → 24px`,
- `@keyframes scan-sweep` i `.scan-hover::before` — `translateY()` na pełnej
  wysokości karty zamiast `top`.

Efekt: przejścia trafiają na kompozytor, a przy zmianie zakładki nie ma
przeliczania layoutu. Wygląd (łącznie ze świetlną linią skanowania) zostaje
taki sam.

### 4. Canvas podłączony do tokenów i zatrzymywany poza ekranem (repo #12, #10)

`ArenaCanvas` miał ~40 literałów kolorów rozbitych na gałęzie `lightMode`.
Teraz czyta `--canvas-*` z `getComputedStyle(document.body)`; tryb jasny
dostaje własne wartości teal i jasny blat w jednym miejscu (`index.css`).
Dodatkowo `IntersectionObserver` zatrzymuje `requestAnimationFrame`, gdy
nagłówek zjedzie poza ekran, a `visibilitychange` — gdy karta jest w tle.
Po powrocie cykl startuje od początku, żeby piłeczka nie skoczyła.

### 5. Stany, których axe nie widzi (repo #1, #5)

- przycisk legendy rang ma `aria-expanded`, `aria-controls`, `type="button"`
  i cel 44 px; panel ma pasujące `id`,
- `ChevronDown` i ikona licznika sesji są `aria-hidden`,
- winieta tła w `CyberBackground` czyta `--bg-vignette`, więc jasny motyw nie
  dostaje czarnej ramki.

Nowe testy: `src/__tests__/designFloor.test.jsx` (stan panelu + pauzowanie
canvasu) oraz przypadek w `components.test.jsx` dla `scaleX` w `UndoBar`.

---

## Czego świadomie nie zrobiliśmy

- **Pełny redesign.** Hallmark i Impeccable wymagają pytania przed
  wymianą systemu, a Taste i Hallmark zakazują m.in. szkła, gradientów,
  wersalików i neonu — czyli całej tożsamości Cyber-Ponk. Zgodnie z zasadą
  „brief wins” zrobiliśmy *polish*, nie *replace*. Jeśli chcesz nowy kierunek,
  to osobna decyzja produktowa (i osobny `DESIGN.md`).
- **GSAP, React Bits, Canvas UI jako zależności.** Aplikacja ma już własne
  hooki ruchu, sprężynę w modalach i canvas 2D. Douczanie 3 bibliotek do
  bundle'a pogorszyłoby start aplikacji, który jest jednym z priorytetów
  UI/UX Pro Max. Wzięliśmy reguły, nie kod.
- **Scroll World / Open Design.** Pierwszy robi landingowe 3D ze
  scrolljackingu — w dashboardzie, gdzie ludzie szukają kwoty, to regresja.
  Drugi to narzędzie do pracy zespołowej, nie wzorzec komponentu.
- **Zmiana czcionek i palety.** Kontrast 300 par kolorów jest liczony przez
  `npm run audit:contrast`; bez przeliczenia nie ruszamy wartości w tokenach.

## Jak utrzymywać

1. Zmieniasz wygląd → najpierw `DESIGN.md` i `frontend/DESIGN_SYSTEM.md`,
   potem token w `index.css`, potem komponent.
2. Nowa animacja → tylko `transform`/`opacity`; dodaj fallback w bloku
   `prefers-reduced-motion`.
3. `cd frontend && npm run verify` musi być zielone. Opcjonalnie
   `npm run design:lint` sprawdza składnię `DESIGN.md`.
4. Nowy wyjątek w audycie dopisuj do `COLOR_ALLOWLIST` z komentarzem
   dlaczego — nie wyłączaj całej bramki.
