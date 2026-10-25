# Eksperyment: pełny redesign (Editorial)

> Gałąź: `arena/acbffafb-tenis-rozliczenia`. To **eksperyment wizualny**,
> nie nowa specyfikacja produktu. Jeśli się nie podoba — revert jest prosty.

## Dlaczego

W poprzedniej rundzie świadomie zrobiliśmy tylko *polish*, bo Hallmark/Taste
zakazują dokładnie tego, czym była tożsamość Cyber‑Ponk: szkła, neonu,
wersalików z trackingiem, gradientów i ściętych narożników. Impeccable nazywa
to zasadą „brief wins” — dopóki właściciel nie zmieni briefu, nie wolno
wymieniać systemu.

Ten brief właśnie został zmieniony. Zrobiłem **full redesign w nowym świecie**,
zostawiając nienaruszone: logikę rozliczeń, Firebase, routing, dane, stany
ładowania/błędu, dostępność i wszystkie testy.

## Kierunek

**Utilitarian editorial.** Jeden krój (Inter), jedno płaskie tło, jeden akcent
(głęboki teal). Hierarchia z rozmiaru i wagi, nie ze światła. Oba motywy to
wariacje tego samego układu — jasny to papier `#F5F5F1`, ciemny to grafit
`#101413`.

| Było (Cyber‑Ponk) | Jest (Editorial) |
|---|---|
| Bebas Neue + Space Mono + Rajdhani | tylko Inter |
| wersaliki + tracking 0.06/0.1/0.18em | zdanie, `letter-spacing: normal` |
| szkło, blur, refleksy, ziarno | płaskie `--co-panel` |
| neon cyan/rose/green + poświaty | teal, cegła, zieleń, ochra; `--glow-*: none` |
| gradienty w tle i przyciskach | brak gradientów |
| ścięte narożniki (`clip-path`) | prostokąty (`CLIP.* = 'none'`) |
| animowany canvas, plamy, skany | dekoracja ukryta, ruch zredukowany |
| hazardowe paski, folia kart | płaskie karty graczy |

## Co zostało zmienione

**Tokeny i style**
- `frontend/src/index.css` — nowe bloki `:root` i `body.theme-light` (pełna
  paleta, `--canvas-*`, `--bg-vignette`, wyłączone `--glow-*` i `--glass-*`)
  oraz sekcja `EDITORIAL RESTYLE` na końcu arkusza z nadpisaniami
  `!important`. To jedyne miejsce, które „przełącza" wygląd.
- `frontend/src/constants/styles.ts` — `CLIP.* = 'none'`, `TRACK.* = 'normal'`,
  `FONT.*` bez uppercase, `PANEL` bez clip-path.
- `frontend/index.html` — jeden link do Inter, nowy `theme-color`.

**Komponenty (36 plików TSX)**
- usunięte inline gradienty → płaskie `var(--co-*)`,
- usunięte `textTransform: 'uppercase'`, tracking i `.toUpperCase()` w
  widocznych etykietach,
- wersalikowe stringi w JSX/propach zamienione na zdania,
- komunikaty terminala na ekranach startu/błędu po polsku, bez prefiksu `>`,
- `Navigation` pokazuje „Start / Ranking / Dodaj / Historia / Gracze”.

**Dokumenty**
- `DESIGN.md` — nowy, spec-zgodny kontrakt (0 błędów, 0 ostrzeżeń w
  `npm run design:lint`),
- `DESIGN-SKILLS.md` — dopisana sekcja o eksperymencie,
- `frontend/DESIGN_SYSTEM.md` i `README.md` — adnotacja, że opisują system
  z `main`.

**Testy**
- 7 asercji oczekujących wersalików (`START`, `CYBER-PONK`, `RANKING`,
  `PODSUMOWANIE ROKU` itd.) dostało matchery niewrażliwe na wielkość liter
  (`/^start$/i`, `/cyber-ponk/i`, `/podsumowanie roku/i`). Nadal sprawdzają
  obecność i działanie elementu — nie zostały osłabione, tylko przestały
  wiązać test z kapitalizacją copy.

## Wyniki

- `npm run verify` → **33 pliki, 526 testów, zielone**.
- `npm run audit:contrast` → 300 par w obu motywach spełnia WCAG AA.
- `npm run audit:design` → brak animacji layoutu, tokeny kolorów, focus,
  reduced motion.
- `npm run design:lint` → `errors: 0, warnings: 0`.
- `npm run build` → produkcyjny build przechodzi.

## Jak zobaczyć

```bash
cd frontend
npm ci
VITE_DEMO_DATA=1 npm run dev -- --host 0.0.0.0
```

Dane demo (8 graczy, 22 sesje) pokazują dług, nadpłatę, remis na podium,
historię i Wrapped bez konfiguracji Firebase. Przełącznik motywu w nagłówku
pokazuje oba warianty palety.

## Jak wrócić

Najprościej: `git revert <commit>` na tej gałęzi albo checkout plików z `main`:

```bash
git checkout main -- frontend/src/index.css frontend/src/constants/styles.ts \
  frontend/index.html DESIGN.md DESIGN-SKILLS.md README.md \
  frontend/DESIGN_SYSTEM.md frontend/src/__tests__/components.test.jsx \
  frontend/src/__tests__/holdToSettle.test.jsx \
  frontend/src/__tests__/wrappedModal.render.test.jsx
git checkout main -- frontend/src/app frontend/src/components
rm REDESIGN-EXPERIMENT.md
```

Albo po prostu zostaw tę gałąź i wróć do `main` — eksperyment nie dotyka
historii już zmergowanego PR #13.

## Czego nie zrobiłem

- Nie usuwałem komponentów dekoracyjnych z drzewa DOM — są tylko ukryte w CSS,
  żeby `lint:css` i testy easter egga nadal widziały te same nazwy klas.
- Nie zmieniałem logiki finansowej, bazy, reguł bezpieczeństwa ani PWA.
- Nie podmieniałem favicony / `brand-mark.svg` — to jedyny pozostały neonowy
  artefakt, widoczny tylko w karcie przeglądarki.
