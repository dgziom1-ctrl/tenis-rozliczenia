# Kompromis: powrót do Cyber‑Ponka

> Decyzja właściciela produktu po PR #14. Obowiązuje od tej gałęzi.

## Co się stało

PR #14 zrobił **pełny redesign**: płaski, cichy styl „editorial" — jeden krój
(Inter), papierowe tło, zero szkła, neonu, gradientów i ściętych narożników.
Technicznie wszystko się zgadzało (526 testów, kontrast AA, bramki czyste),
ale **wizualnie wyszło gorzej**. Zniknął klimat, za który ta aplikacja jest
lubiana.

Wniosek: reguły Hallmark/Taste/Impeccable są dobre jako **bramki jakości**,
ale zastosowane dosłownie jako styl zabiły tożsamość produktu. „Brief wins"
(Impeccable) działa w obie strony — właściciel zmienił zdanie, więc zmieniamy
też wykładnię.

## Decyzje (odpowiedzi na pytania)

| Pytanie | Wybór |
|---|---|
| Punkt wyjścia | **Kompromis** — baza = Cyber‑Ponk z PR #13, nie kopia editorialu |
| Co zostaje z eksperymentu | **Niewidzialne poprawki + zdania zamiast WERSALIKÓW** |
| Neon i ruch | **Pełny klimat**: cyan/rose/green, poświaty, canvas, skany, plamy, konfetti |
| Czcionki i kształty | **Oryginał**: trzy kroje, ścięte narożniki (później zmiany fontów, patrz niżej) |
| Sprzeczność (wersaliki) | **Zdania zostają, kroje i ścięcia wracają** |
| Dowiezienie | kod + dokumenty + testy + commit + push + PR |

## Co dokładnie wraca (100% klimatu)

- Paleta `#00E5FF` / `#FF2090` / `#00FF88` / `#F59E0B` na `#030508`.
- Szkło, blur, refleksy, ziarno, `--glass-*` i `--glow-*`.
- Gradienty w tle, przyciskach, liniach nagłówka, folii kart.
- `ArenaCanvas` z animowanym ping‑pongiem, skany, pulsujące plamy, konfetti,
  glitch wordmarku przy uderzeniu paletki.
- Ścięte narożniki (`CLIP.*`, `--clip-*`), `--modal-radius: 0`.
- Jasny motyw jako osobna paleta (ciemniejszy akcent `#0F766E` dla AA).

## Co zostaje z PR #13 i #14

**Niewidzialne poprawki (z PR #13, przywrócone wraz z bazą):**

- `aria-expanded` / `aria-controls` w legendzie rang, `aria-pressed` w filtrach,
  `role="progressbar"` w Wrapped.
- Ruch tylko na `transform` / `opacity` — paski przez `scaleX`, żadnego
  animowania `width`.
- `IntersectionObserver` zatrzymuje rAF canvasu poza ekranem.
- `overflow-x: clip`, focus-visible, `prefers-reduced-motion` /
  `-transparency` / `-contrast`.
- Kontrast 300 par w obu motywach, audyt typografii (podłoga 12 px), bramka
  `audit:design` w `npm run verify`.

**Jedyna widoczna zmiana (z PR #14): zdania zamiast wersalików.**

- Koniec z `text-transform: uppercase` w całym CSS i TSX.
- `TRACK.* = 'normal'`, `FONT.display()` i `FONT.monoLabel` bez trackingu.
- Wersalikowe stringi w copy → zdania (`START` → `Start`,
  `PODSUMOWANIE ROKU` → `Podsumowanie roku`, `PRZYTRZYMAJ DŁUŻEJ` →
  `Przytrzymaj dłużej`).
- `.toUpperCase()` znika z widocznych etykiet; zostaje wyłącznie w
  identyfikatorach technicznych (ID sesji, kod kreskowy gracza, inicjały).

## Dlaczego Bebas Neue ustąpił (stan PR #15)

Poniższy opis dotyczy stanu po PR #15 — później Bebas Neue zastąpiono
najpierw Orbitronem, a potem Chakra Petch Italic (sekcja „Aktualizacja"
wyżej). Bebas Neue to krój **wyłącznie
wielkoliterowy** — nie potrafi złożyć zdania.
Gdyby został jako `--font-display`, „zdania" i tak wyglądałyby jak
WIELKIE LITERY. Dlatego:

- `--font-display` i `--font-body` → **Rajdhani** (ma małe litery; waga 600
  dla nagłówków, 400 dla treści),
- `--font-mono` → **Space Mono** bez zmian (dane techniczne),
- `--font-stencil` (nowy token) → **Bebas Neue**, używany **tylko** w
  wordmarku `CYBER-PONK` i w liczbie OVR na karcie gracza. Tam wielkie litery
  są naturą znaku, nie stylem tekstu — logo zostaje logo.

Efekt: oryginalne trzy kroje wciąż są w aplikacji, ale czyta się ją łatwiej.

## Aktualizacja: prawdziwa czcionka z Cyberpunka

Właściciel poprosił później o „czcionkę z cyberpunka". **Rajdhani jest
głównym krojem interfejsu Cyberpunk 2077**, więc został na tekście; na dane
trafił wpierw **Orbitron Variable** (PR #16), potem — po uwadze, że jest
„zbyt kwadratowy" — **Chakra Petch Italic** (PR #17), ostre ścięte narożniki
i wyraźny pochył, bliżej klimatu liternictwa z logo gry. **Bebas Neue znika**
— był krojem tylko wielkoliterowym, więc gryzł się ze zdaniami.

Wszystkie trzy kroje (Rajdhani, Space Mono, Chakra Petch) przeszły z Google
Fonts CDN na **self-hosting przez `@fontsource`**: działają offline, razem z
cache service workera. Chakra Petch ma pełny `latin-ext`, więc polszczyzna
jest bezpieczna; mimo to zdania zostają w Rajdhani, a krój danych na liczbach.

Pełne uzasadnienie, licencja, porównanie kandydatów i instrukcja powrotu:
[`CYBERPUNK-FONT.md`](CYBERPUNK-FONT.md). Ta zmiana **nie cofa kompromisu** —
klimat Cyber-Ponk i zdania zamiast wersalików zostają.

## Egzekwowanie kompromisu

Zmiana nie jest tylko kosmetycznym „na razie tak". Ma dwie blokady:

1. **`scripts/audit-design.mjs`, reguła 5** — odrzuca dowolny
   `text-transform: uppercase` / `textTransform: 'uppercase'` w plikach
   CSS/TS/TSX. Uruchamiane przez `npm run verify` → `audit:design`.
2. **`src/__tests__/designFloor.test.jsx`** — test regresyjny sprawdza, że
   `FONT.display()` dla każdego rozmiaru ma `textTransform: 'none'`,
   `letterSpacing: 'normal'`, a wszystkie wartości `TRACK` są `'normal'`.

Reguła **6** w tym samym audycie pilnuje krojów z Cyberpunka (brak CDN,
wymagane importy `@fontsource`, obecność `--font-tech`).

Asercje w 3 plikach testowych, które oczekiwały wersalików, dostały matchery
niewrażliwe na wielkość liter (`/^start$/i` itd.). Nadal sprawdzają obecność
i działanie elementów — przestały tylko wiązać test z kapitalizacją copy.

## Jak wrócić do wersalików (jeśli jednak)

To jedna decyzja, nie revert całego PR:

1. `index.css`: `text-transform: none` → `uppercase` w 7 regułach,
   `letter-spacing: normal` → dawne wartości, `--font-display` → Bebas Neue
   (trzeba go wtedy z powrotem zainstalować — patrz `CYBERPUNK-FONT.md`).
2. `constants/styles.ts`: przywrócić `TRACK` i `displayTracking()`.
3. Usunąć regułę 5 z `audit-design.mjs` i test z `designFloor.test.jsx`.
4. Zaktualizować `DESIGN.md` i ten plik.

Pełny powrót do **editorialu** z PR #14 to z kolei `git revert` commita
tego PR-a na `main` — ale wtedy wracają też WERSALIKI i znika neon. Tego
właśnie nie chcemy.

## Zakres

Zmiana dotyczy wyłącznie warstwy prezentacji. Logika rozliczeń, Firebase,
routing, reguły bezpieczeństwa, dane, PWA, stany ładowania/błędu i wszystkie
testy (526) pozostają nietknięte.
