# CYBER PONK — system projektowy

> Dokument jest źródłem prawdy dla wyglądu i zachowania interfejsu. Zmieniasz
> kolor, ikonę albo ruch — zmieniasz najpierw ten plik, potem token.
>
> Skrócona, maszynowo czytelna wersja dla agentów AI leży w [`../DESIGN.md`](../DESIGN.md)
> (format `google-labs-code/design.md`). Mapowanie 12 repozytoriów design
> skills na konkretne zmiany: [`../DESIGN-SKILLS.md`](../DESIGN-SKILLS.md).

## Skąd się wziął ten kierunek

Przegląd wykonany narzędziem **UI/UX Pro Max** dla profilu „sports analytics
dashboard, dark, neon” wskazał na **Glassmorphism** z gęstością dashboardu
(8/10) i standardową dynamiką (5/10). Aplikacja już mówiła językiem szkła
(iOS 18 / visionOS), więc z rekomendacji wzięliśmy nie nową paletę, a reguły,
które w tym stylu najczęściej się psują: kontrast na przezroczystym tle,
spójność ikon, budżet animacji i czytelność na telefonie.

| Priorytet (UI/UX Pro Max) | Co z tego wdrożono |
|---|---|
| 1. Dostępność | bramka kontrastu WCAG AA, tytuły stron, region `aria-live` |
| 2. Dotyk i interakcja | cele ≥ 44 px, widoczny stan wciśnięcia, `cursor: pointer` globalnie |
| 3. Wydajność | podział paczek (react/firebase), lżejsze szkło i statyczne plamy na telefonie |
| 4. Spójność stylu | ikony wektorowe zamiast emoji w całym interfejsie |
| 6. Typografia i kolor | skala 12/13/14/16/20/24/32/40 px, tokeny zamiast wartości wpisanych inline |
| 7. Animacja | ruch zgodny z `prefers-reduced-motion`, znaczenie zamiast ozdoby |

## 1. Warstwy tokenów

```
prymityw   --co-cyan: #00E5FF
     ↓
semantyka  --co-cyan to akcent, --co-rose to zaległość, --co-green to rozliczenie
     ↓
komponent  .cyber-button-yellow, .status-chip, .neon-status-debt
```

Tokeny żyją w `src/index.css` w `:root` (ciemny) i `body.theme-light` (jasny).
**Nie wpisujemy kolorów w komponentach.** Wyjątki (jawnie wypisane w
`scripts/audit-design.mjs`): gradient logo w `BrandMark`, paleta tożsamości
graczy w `constants/colors.ts`, kolor `<meta name="theme-color">` w `useTheme`
oraz fallbacki w `ArenaCanvas`.

Canvas nagłówka rysuje API 2D, które nie rozumie `var()`. Dlatego czyta
`--canvas-*` przez `getComputedStyle(document.body)`, a `--bg-vignette`
zasila ostatnią warstwę tła. Zmiana motywu nie wymaga grzebania w TSX.

### Co znaczy który kolor

| Token | Znaczenie | Dark | Light |
|---|---|---|---|
| `--co-cyan` | akcent, akcja główna, informacja | `#00E5FF` | `#0F766E` |
| `--co-rose` | zaległość, destrukcyjne | `#FF2090` | `#BE185D` |
| `--co-green` | rozliczone, nadpłata | `#00FF88` | `#15803D` |
| `--co-amber` | ostrożenie, limit kart | `#F59E0B` | `#B45309` |
| `--co-gold` / `silver` / `bronze` | podium 1 / 2 / 3 | `#B8860B` / `#C0C8D4` / `#CD7F32` | `#7A5A07` / `#5B6B80` / `#8C5A2B` |
| `--rank-*` | rangi frekwencji (tekst + ikona + pasek) | `#D4A017` … `#7C93A6` | `#7A5A07` … `#566B80` |
| `--co-text` / `text-hi` | treść / nagłówki | `#A8C4D4` / `#D0E8F5` | `#475569` / `#0F172A` |
| `--co-dim` | etykiety, daty, liczby pomocnicze | `#64869F` | `#5B6B80` |
| `--co-dim2` | **tylko duże napisy i dekoracje** | `#4B6E8C` | `#6B7F94` |

## 2. Kontrast i motywy

Tryb jasny nie jest odwróceniem ciemnego: ten sam neon, który świeci na czerni,
na bieli daje 3,0–3,9:1 i łamie AA dla etykiet 12–14 px. Dlatego akcenty
w jasnym motywie są ciemniejsze, a nie „te same, tylko jaśniejsze”.

Bramka `npm run audit:contrast` (w `verify` i CI) czyta tokeny z CSS, składa
półprzezroczyste szkło na realnym tle i sprawdza **300 par**:

- 4,5:1 — tekst zwykły (`--co-text`, `--co-dim`, wszystkie akcenty) na
  `void`/`dark`/`panel`/`raised`/`surface-2`/dwóch wariantach szkła,
- 4,5:1 — akcent na własnym tle tintowanym (chipy statusów) i kolor tekstu
  na wypełnieniu przycisku,
- 4,5:1 — sześć kolorów rang (`--rank-*`) na każdej powierzchni,
- 3:1 — `--co-dim2` (tylko duże napisy) i pierścień fokusu.

`--co-dim2` nie nadaje się do treści — w obu motywach ma 3,4–4,0:1. Do opisu
używaj `--co-dim`.

Rangi mają **osobne wartości na motyw** (`--rank-legenda`, `--rank-mistrz`, …).
Jeden kolor nie może przejść 4,5:1 jednocześnie na `#030508` i `#F8FAFC`:
wymagana luminancja leży w przedziale 0,183–0,199, a to wąska szara smuga,
nie barwa. Dlatego `RANKS[n].hex` to `var(--rank-*)`, a przezroczyste tła
liczy `rankTint()` (`color-mix`).

Kolory tożsamości graczy (paleta `constants/colors.ts`) mają tony środkowe,
które w jednym z motywów schodzą do 3,2–4,1:1. Dlatego kolor gracza jest
**paskiem, obramowaniem i awatarem**, a nazwa w tabeli jedzie `--co-text-hi`.
Kolory rang są wyjątkiem — mają osobne tokeny na motyw, bo są treścią.

Kolejne poziomy preferencji użytkownika:

- `prefers-reduced-motion` — ruch przestrzenny wyłączony, zostaje crossfade,
- `prefers-reduced-transparency` — szkło staje się pełnym `--co-panel`,
- `prefers-contrast: more` — mocniejsze obramowania i `--co-dim` podniesiony
  do koloru treści.

## 3. Typografia

Skala żyje w `src/constants/styles.ts` jako `TEXT`. Podłoga czytelności to
**12 px** — pilnuje jej `npm run audit:a11y`.

| Stopień | Rozmiar | Zastosowanie |
|---|---|---|
| `micro`/`tiny` | 12 px | etykiety pól, znaczniki, podpisy osi |
| `small` | 13 px | treść drugorzędna |
| `base` | 14 px | treść podstawowa |
| `lead` | 16 px | wyróżnienie, tytuł sekcji |
| `h3`–`h1` | 20–32 px | nagłówki |
| `hero` | 40 px | kwoty i liczby-bohaterowie |

Kroje: `Bebas Neue` (display), `Space Mono` (dane i terminal), `Rajdhani`
(treść). Pola formularzy mają 16 px, żeby iOS nie przybliżał strony przy
dotknięciu.

## 4. Ikony — wektor, nie emoji

Emoji jako ikona jest zależne od fontu systemowego: ten sam 🏓 wygląda inaczej
na Windowsie, iOS i Androidzie, nie przyjmuje koloru tokenu, a w trybie
wysokiego kontrastu bywa zastępowane znakiem zapytania. W interfejsie używamy
wyłącznie wektorów (Lucide + własne glyphy w `src/components/common/icons`).

| Ikona | Gdzie | Uwagi |
|---|---|---|
| `SportGlyph` | selektor dyscypliny, historia, podsumowanie sesji, Wrapped | 4 własne ścieżki: ping-pong, squash, badminton, padel |
| `RankGlyph` | karta zawodnika, ranking, okno gracza, legenda rang | kolor z `rank.hex`, ikona z nazwy rangi |
| `MedalGlyph` | podium (także remisy), Wrapped | złoto/srebro/brąz z tokenów |
| `AchievementGlyph` | odznaki gracza | mapowanie po `id`, nie po emoji |
| `BrandMark` | ekran startowy, pusty stan, favikona, baner PWA | ten sam kształt co `public/brand-mark.svg` |

**Emoji zostają tylko tam, gdzie są treścią, nie ikoną:** w wiadomości
kopiowanej do czatu (`utils/message.ts`) i w konfetti po pięciu kliknięciach
w tytuł. Ikona obok widocznego tekstu jest `aria-hidden`; ikona samodzielna ma
nazwę w `aria-label`. Informacja nigdy nie może być przekazana samym kolorem
ani samą ikoną — np. chip „Ada, karta MultiSport, własna rakietka” ma pełny
`aria-label`.

## 5. Układ i dotyk

- Breakpointy: **639 px** (mobile, dolna nawigacja), **480 px** (wąski
  telefon), **768 px** (desktop, ziarno filmowe). Wszystkie w jednym miejscu:
  `BREAKPOINT`.
- Dolna nawigacja ma wysokość `--nav-height` (56 px) + `safe-area-inset-bottom`;
  treść dostaje `padding-bottom` o tej samej wysokości.
- Każdy element dotykowy ma **min. 44 × 44 px** (przyciski nagłówka, edycja
  i usunięcie w historii, sezony, „odnów” w pasku cofania).
- Kompaktowy nagłówek po przewinięciu zabiera 0 miejsca w układzie treści
  (jest `position: fixed`), więc pierwsza karta jest widoczna bez przewijania
  hero.

## 6. Ruch

| Element | Czas | Krzywa |
|---|---|---|
| wciśnięcie | 80–100 ms | `ease-out` |
| hover / kolor | 150–200 ms | `ease` |
| wejście karty | 400 ms | `cubic-bezier(.22,1,.36,1)` |
| przejście zakładki | 240 ms | `cubic-bezier(.22,1,.36,1)` |
| modal | 280 ms wejście / 180 ms wyjście | `ease-out` |

Zasady: animujemy `transform` i `opacity`, nie `width`/`height`; każda
animacja ma stan końcowy także przy `prefers-reduced-motion`; ruch nigdy nie
przesuwa sąsiednich elementów (brak layout shiftu w stanie wciśnięcia).

`npm run audit:design` (w `verify`) egzekwuje to statycznie: zakaz
`transition: all`, zakaz animowania `width/height/top/left/margin/padding`
również w `@keyframes`, `overflow-x: clip` zamiast `hidden` na `html`/`body`
(`hidden` psuł kotwiczenie banerów), brak `100vw`, obecność
`:focus-visible` i trzech preferencji systemowych. Paski postępu
(`UndoBar`, `PlayerCard`, `PlayerSessionModal`, kroki Wrapped, wskaźnik
nawigacji) mają stałą szerokość i rosną przez `scaleX`; skan kart jedzie
`translateY` po pełnej wysokości, nie `top`. `ArenaCanvas` zatrzymuje rAF
przez `IntersectionObserver`, gdy nagłówek znika z ekranu.

### Easter egg

Pięć kliknięć w tytuł „CYBER-PONK” wysypuje konfetti (44 kawałki) i rozjaśnia
tło na 0,6 s. Szczegóły, które łatwo zepsuć:

- animacja `confettiBurst` **musi** istnieć w `index.css` — komponent podaje
  tylko nazwę; brak reguły oznacza, że przeglądarka odrzuca deklarację
  i elementy stoją w miejscu,
- obrót i dryf jadą zmiennymi `--spin` i `--drift`, bo `transform`
  z animacji nadpisuje styl inline,
- cała warstwa to jeden `.chaos-layer` (`position: fixed`, `overflow: hidden`,
  `z-index: var(--z-confetti)`) — pojedyncze `fixed` na każdy kawałek
  wywoływało poziome przewijanie,
- klucz Reacta zawiera numer uruchomienia (`chaosRun`), inaczej powtórne
  odpalenie w trakcie trwania efektu nie restartuje animacji,
- przy `prefers-reduced-motion` nie ma ruchu: statyczna posypka na 4 s,
  bez błysku tła.

## 7. Wydajność

- `vite build` dzieli zależności: `vendor-react` (~49 kB) i `vendor-firebase`
  (~181 kB) mają własny hash, więc nie pobierają się od nowa przy każdym
  wydaniu aplikacji.
- Każda zakładka jest `lazy()` — pierwszy render ładuje tylko pulpit.
- Na telefonie (≤ 639 px) plamy tła przestają dryfować, a `--glass-blur`
  spada z 26 do 18 px: ten sam obraz, mniej pracy co klatkę.
- Efekty szkła mają fallback `@supports not (backdrop-filter)`.

## 8. Nawigacja i orientacja

- Nie ma linku „Przejdź do treści”. Był, ale został usunięty decyzją
  produktową: przy pięciu pozycjach nawigacji dodatkowy element wyskakujący
  nad nagłówkiem przeszkadzał bardziej, niż pomagał. `layoutA11y.test.jsx`
  pilnuje, żeby nie wrócił przez przypadek.
- Każda zakładka ustawia `document.title` (`Ranking · Cyber-Ponk`).
- Zmiana trasy trafia do regionu `aria-live="polite"` — czytnik ekranu wie,
  że treść się wymieniła, mimo braku przeładowania.
- Aktywna zakładka ma `aria-current="page"` i widoczny wskaźnik, nie tylko
  kolor.

## 9. Checklist przed wdrożeniem

- [ ] `npm run verify` zielone (typy, lint, martwy CSS, sieroty, typografia,
      kontrast, design floor, testy); opcjonalnie `npm run design:lint`
      waliduje składnię `DESIGN.md`.
- [ ] Easter egg: pięć kliknięć w tytuł wysypuje konfetti, drugie odpalenie
      w trakcie pierwszego też startuje od nowa.
- [ ] Sprawdzone 375 px i 390 × 844: pierwsza karta nad dolną nawigacją.
- [ ] Oba motywy: kontrast i widoczność obramowań.
- [ ] `prefers-reduced-motion` i zoom 200%.
- [ ] Nowe elementy dotykowe ≥ 44 px, nowe ikony wektorowe z etykietą.
- [ ] Żaden nowy kolor nie jest wpisany inline.
