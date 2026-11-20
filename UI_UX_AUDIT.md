# UI/UX audyt — Cyber-Ponk (tenis-rozliczenia)

Data: 2026-11-08 · Zakres: `frontend/` (React 19 + Vite, PWA, 3 motywy) · Tryb: sam audyt, kod aplikacji nie był zmieniany.

Metoda: przegląd kodu (layout/PWA, formularze/modale/copy, a11y/ruch/wykresy), kontrakt `docs/DESIGN.md` jako punkt odniesienia, reguły skilla `ui-ux-pro-max` (zainstalowany w `.claude/skills/ui-ux-pro-max/`, zapytania domen `ux`, `chart`, `style`, `references/pro-rules.md`). Najważniejsze twierdzenia sprawdzone ręcznie w kodzie (m.in. brak `@keyframes`, brak `color-scheme` w CSS, obsługa Spacji w WrappedModal, `TARGET_LUMINANCE`). Aplikacji nie uruchamiałem, więc nie ma tu wniosków z działania w przeglądarce ani na iOS.

## 1. Obecny klimat aplikacji (do zachowania)

1. **Neonowe szkło na bardzo ciemnym tle** — `--co-void #030508`, panele szklane (blur, górny refleks, plama światła za kursorem), motyw OLED z czystą czernią.
2. **Ścięte narożniki** (`CLIP.panel/card/badge`) w ciemnym motywie; w jasnym promień 12 px bez ścięć. Te dwa kształty nie mieszają się w jednym komponencie.
3. **Jeden akcent** (cyan `#00E5FF`) + trzy kolory stanów: rose = zaległość, green = rozliczone, amber = ostrzeżenie.
4. **Typografia HUD-u**: Rajdhani (nagłówki i treść), Chakra Petch *Italic* tylko na liczby/kody/wordmark, Space Mono na drobne dane. Skala 12–40 px, podłoga 12 px.
5. **Etykiety zdaniami, nie wersalikami**, bez trackingu (świadomy kompromis, `DESIGN-COMPROMISE.md`).
6. **Animowany canvas areny** w tle + efekty „premium” (konfetti, Wrapped, replay rankingu, dźwięki).
7. **Ton copy**: polski, lekko techniczny/gamingowy (`SESSION_XXXX`, prefiksy `// …`, `OK/ERR/SYS` w toastach).
8. **Ruch tylko `transform`/`opacity`**, wejście 240–400 ms, wyjście modalu szybsze niż wejście, pełna obsługa `prefers-reduced-motion/transparency/contrast`.
9. **Wyłącznie ikony wektorowe** (Lucide + własne glyphy), emoji nigdy jako ikona UI.
10. **Kontrakt egzekwowany skryptami** (`audit:design`, `audit:a11y`, `audit:contrast`, `verify`) — to rzadkość i warto to zachować.

Filtr zgodności: poniższe rekomendacje nie zmieniają palety, fontów ani stylu. Tam, gdzie skill sugeruje coś odmiennego (np. blur 10–20 px dla glassmorphismu zamiast 26–30 px, `Continuous Animation: tylko dla loaderów`), proponuję wariant wewnątrz obecnego kierunku (zmniejszyć koszt, nie zmieniać wyglądu).

## 2. Podsumowanie — top 5

1. **A1 · Kolory graczy nie gwarantują AA na obu motywach** i nie są objęte `check-contrast`. Przy luminancji 0.16/0.18/0.20 (`constants/colors.ts:5`) kontrast na ciemnym panelu wychodzi ok. 3,8 / 4,2 / 4,6:1, a na białym ok. 5,0 / 4,6 / 4,2:1 (moje wyliczenie ze wzoru WCAG, nie pomiar w przeglądarce).
2. **A2 · WrappedModal: Spacja na „Wstecz”/„Zamknij” przechodzi dalej** zamiast aktywować przycisk (`WrappedModal.tsx:94-101`); brak przycisku „Dalej” i komunikatu o zmianie slajdu dla czytnika ekranu.
3. **A3 · Baner push zasłania ostatnią kartę** — `position: fixed`, a `.main-content` rezerwuje tylko wysokość nawigacji (`index.css:1679,1871`, `PushPermissionBanner.tsx:129`). Skill: „Focus Not Obscured”, „Content Jumping”.
4. **A4 · Koszt renderowania na słabszych telefonach** — blur 26–30 px na każdej karcie szklanej (`index.css:486,672,917`), canvas bez limitu klatek (`ArenaCanvas.tsx:274,366`), animacje dekoracyjne bez końca.
5. **A5 · Formularze tracą dane po cichu** — zmiana sportu czyści kwotę i rakiety (`AdminTab.tsx:226`), zła cena rakiety zamienia się w 0 (`AdminTab.tsx:363`, `EditSessionForm.tsx:310`), edycja jednej sesji nadpisuje niezapisaną drugą (`HistoryTab.tsx:193-229`), do tego brak `maxLength/autoCapitalize/enterKeyHint` (`PlayersTab.tsx:131-139`).

## 3. Znaleziska

Legenda: wpływ H/M/L · nakład S/M/L · zgodność: **tak** / **uwaga** (wymaga decyzji, bo dotyka charakteru).

### 3.1 Quick wins (S)

| ID | Ekran/komponent (plik:linia) | Problem | Wpływ | Proponowana poprawka | Nakład | Zgodność |
|---|---|---|---|---|---|---|
| Q1 | `Modal`/`WrappedModal.tsx:94-101` | Spacja bąbelkuje z przycisków do `handleKey` → `advance()`; „Wstecz” nie da się aktywować Spacją | H | Ignorować klawisze, gdy `e.target` ≠ powłoka; dodać przycisk „Dalej” i polite live region z tytułem slajdu | S | tak |
| Q2 | `index.css:1784,1875,1895` | `body.keyboard-open` ukrywa tylko nawigację; `.bottom-banner` i `.toast-stack` zostają nad klawiaturą | M | `body.keyboard-open .bottom-banner{display:none}`, toast `bottom:12px` | S | tak |
| Q3 | `index.html:15`, `index.css` (`.app-shell`, `.mobile-nav`, `.compact-header`) | `viewport-fit=cover`, ale brak `env(safe-area-inset-left/right)`; w poziomie na telefonie z notchem elementy wchodzą pod wycięcie | M | `padding-inline: max(Xpx, env(safe-area-inset-left/right))` | S | tak |
| Q4 | `index.css:1614-1621`, `Header.tsx:219,228,239` | 44 px dla przycisków nagłówka tylko poniżej 640 px; tablet/duży telefon ma 36 px | M | Zmienić warunek na `(pointer: coarse)` albo ustawić 44 px w bazie | S | tak |
| Q5 | `Header.tsx:315-357`, `index.css:1933` | Schowany compact header (`transform`+`opacity`) nadal przyjmuje focus; przyciski 40×44 | M | `visibility:hidden`/`inert` na `.hidden-bar`, szerokość 44 px z CSS | S | tak |
| Q6 | `EditSessionForm.tsx:196-209,225-238,335-352` | Ręcznie klonowane chipy kort/godzina/rakieta: ok. 8 px padding, bez `minHeight:44`, bez `aria-pressed` (poza rakietami) | M | Zastąpić `ToggleChip` (jak w `AdminTab`) | S | tak |
| Q7 | `AdminTab.tsx:373-383`, `EditSessionForm.tsx:317-327` | „Przywróć 5 zł” ma ok. 22 px wysokości | L–M | `minHeight:44` | S | tak |
| Q8 | `HistoryTab.tsx:378-396`, `ErrorBoundary.tsx:130` | Filtr graczy (mobile) i „Wyczyść cache” poniżej 44 px | L–M | `minHeight:44` | S | tak |
| Q9 | `AdminTab.tsx:363`, `EditSessionForm.tsx:310` | Cena rakiety: `parseAmount(...) \|\| 0` — „abc” po cichu = 0, brak `aria-invalid` | M | Błąd inline + blokada zapisu przy NaN/ujemnej | S | tak |
| Q10 | `AdminTab.tsx:226` | Zmiana sportu cicho czyści kwotę, rakiety i własną rakietę | M | Zachować kwotę albo toast „Zmieniono sport — wyczyszczono kwotę” | S | tak |
| Q11 | `PlayersTab.tsx:131-139,58` | Brak `maxLength` (stała = 40), `autoCapitalize="words"`, `autoComplete="off"`, `enterKeyHint`; `required` przepuszcza „   ” i jest ignorowane bez komunikatu; brak informacji o duplikacie | M | Atrybuty + inline błąd (puste/za długie/duplikat) | S | tak |
| Q12 | `HistoryTab.tsx:141,193-227` | Po modalu hasła focus wraca na przycisk wiersza, który zastępuje formularz → fokus ląduje na `<body>` | M | `autoFocus` pierwszego pola po otwarciu edycji | S | tak |
| Q13 | `SessionSummaryModal.tsx:110` | `presentCount === 1 ? 'gracz' : 'graczy'` — „2 gracze”, nie „2 graczy” | M (copy) | `plural(n,'gracz','gracze','graczy')` (helper już jest w `AdminTab`/`HistoryTab`) | S | tak |
| Q14 | `SharedUI.tsx:53,74`, `HistoryTab.tsx:312` | „hasło admina” vs „kod dostępu”; angielski placeholder „Access code…” | L | Jedno słowo („hasło”), polski placeholder; prefiks `//` zostaje | S | tak |
| Q15 | `AdminTab.tsx:83`, `HistoryTab.tsx:71` | „Koszt musi być liczbą >= 0” (zapis kodowy); różne komunikaty i etykiety („Koszt kortu” / „Zapłacone za kort”) | L | „Koszt nie może być ujemny”; jedna wspólna stała | S | tak |
| Q16 | `HistoryTab.tsx:334`, `PlayerCard.tsx:~530` | `UndoBar buttonLabel="cofnij"` małą literą (domyślnie „Cofnij”) | L | Usunąć nadpisanie | S | tak |
| Q17 | `PlayersTab.tsx:66,132` | Toast sukcesu z „✓” mimo odznaki i ikony; „...” zamiast „…” | L | Usunąć „✓”, ujednolicić wielokropek | S | tak |
| Q18 | `PlayerSessionModal.tsx:122,229` | „Opuszczone” vs „nieobecne” | L | Jedno słowo („Nieobecne”) | S | tak |
| Q19 | `HoldToSettleButton.tsx:36,152-153` | Etykieta w `aria-label` i `aria-describedby` → czytnik czyta dwa razy; etykieta zmienia się w trakcie przytrzymania | L–M | Statyczny `aria-label` („{kwota} zł — zapisz wpłatę”), podpowiedź tylko w `describedby` | S | tak |
| Q20 | `PlayerCard.tsx:603` | `aria-label` „+ Inna kwota — wpłać dowolną kwotę” dubluje widoczny tekst, czyta „plus” | L | Usunąć `aria-label` | S | tak |
| Q21 | `index.html:10`, `index.css` | Brak własności CSS `color-scheme`; w jasnym motywie przy ciemnym systemie (i odwrotnie) natywne kontrolki/scrollbary/suwak w `RankingReplay` mają zły schemat | M | `:root{color-scheme:dark}` i `body.theme-light{color-scheme:light}` | S | tak |
| Q22 | `Toast.tsx:131-156` | Każdy toast ma `role="alert"` (assertive), także sukces/info; błąd znika po 5 s | L–M | `role="status"` dla nie-błędów; wstrzymanie licznika przy hover/focus (skill: auto-dismiss 3–5 s jest OK, więc bez „nigdy nie znika”) | S | tak |
| Q23 | `RankBadge.tsx:30,100` | Tooltip znika po 2,5 s, nie zamyka się Escape | L–M | Trzymać do blur/tapu poza/Escape; timer tylko na dotyku | S | tak |
| Q24 | `AttendanceTrendChart.tsx` | `aria-label` bez danych (w odróżnieniu od `RankingHistoryChart`); `valueLabels` to martwy kod; gdy wszystkie wartości równe, każdy punkt jest „rekordem” | M | `sr-only` podsumowanie (średnia, max, liczba sesji); usunąć `valueLabels`; marker rekordu tylko gdy `max > min` | S | tak |
| Q25 | `SeasonSelector.tsx:28-46` | Brak `role="group"` / etykiety dla przycisków sezonu, brak `type="button"` | L | `role="group" aria-label="Sezon"` | S | tak |
| Q26 | `CyberDateInput.tsx:34-47` | Natywny input ma `opacity:0.01` nad dekoracyjnym `div`; focus ring trafia w niewidoczny element; brak `max` (przyszłe daty) | L–M | Styl `:focus-within` na wrapperze, `max={today}` lub ostrzeżenie | S | tak |
| Q27 | `index.css:2436,2443,2444,2509` | `blob-drift`, `fluid-float`, `neon-pulse`, `shimmer` są używane, ale **nie mają `@keyframes`** (sprawdzone grepem) — plamy i `.glass-shine-overlay` nigdy się nie animują, a warstwa z `mix-blend-mode` kosztuje bez efektu | M | Usunąć martwe deklaracje (najtańsze) albo zdefiniować z `transform`/`opacity` i zostawić wyłączenie na mobile | S | tak |
| Q28 | `ArenaCanvas.tsx:195-218,274,366` | Pełna częstotliwość odświeżania (120 Hz), `shadowBlur` do 20 i gradienty radialne na klatkę | M | Limit ok. 30–40 fps przez pomijanie klatek po `ts`; `shadowBlur=0` na `pointer: coarse` | S | tak |
| Q29 | `AttendanceGrid.tsx:44-55`, `PodiumCard.tsx:~150` | Nieskończone pulsowanie ostatniej komórki i skan na podium (skill: ciągła animacja tylko dla loaderów) | L–M | Pulsowanie ×3; skan tylko przy `paddleHit` | S | tak |
| Q30 | `AttendanceGrid.tsx:44-55` | Stan (obecny/nieobecny/brak) tylko kolorem i przezroczystością; `title` działa tylko myszą | M | Dodatkowy znak (kropka/kreskowanie) w komórkach | S | tak |
| Q31 | `HistoryTab.tsx:505-513,581-589,367-493` | „Pokaż więcej” zdublowane u góry i u dołu; pasek filtrów znika, gdy `playerNames.length === 0` | L | Jedno „Pokaż więcej”; warunek po `history.length` | S | tak |
| Q32 | `LogEntry.tsx:45` | `SESSION_XXXX` czytane jako angielski tekst; karta ma `tap-press`, ale nie jest interaktywna | L | `aria-hidden`/polski `sr-only`; zdjąć `tap-press` | S | tak |
| Q33 | `index.css:1679` | Fallback `env(safe-area-inset-bottom, 16px)` dodaje 16 px tylko do `.main-content`, nie do nawigacji | L | Fallback `0px` jak w pozostałych miejscach | S | tak |
| Q34 | `Header.tsx:250`, `index.css:1646-1649` | `.header-blik-mobile` nigdy nie jest widoczny (`display:none !important`) — martwy kod | L | Usunąć | S | tak |
| Q35 | `constants/styles.ts`, `useTheme.ts:15`, `index.css` (`neon-status-*`) | Martwe abstrakcje: `TRACK.*` zawsze `'normal'`, `displayTracking()` ignoruje argument, `TEXT.micro = TEXT.tiny`; `THEME_COLOR` duplikuje `--co-void`; `neon-status-*` prawdopodobnie nieużywane | L | Usunąć/zredukować; sprawdzić `lint:css` | S | tak |
| Q36 | `docs/DESIGN.md` vs `index.html:5` | Favicon to emoji 🕹️ w data-URI, a kontrakt zabrania emoji jako ikon (skill: „No Emoji as Structural Icons”). Dotyczy karty przeglądarki, nie interfejsu | L | Podmienić na SVG z `BrandMark` | S | tak |

### 3.2 Średnie (M)

| ID | Ekran/komponent (plik:linia) | Problem | Wpływ | Proponowana poprawka | Nakład | Zgodność |
|---|---|---|---|---|---|---|
| M1 | `PushPermissionBanner.tsx:129`, `index.css:1679,1871` | Patrz A3: wysoki baner (chipy graczy + 2 przyciski) przykrywa listę wpłat, brak `max-height` | H | Zmierzyć wysokość → `--banner-h` na `body`, dodać do `padding-bottom` i `scroll-padding-bottom`; alternatywnie wyrenderować w przepływie na górze Startu | M | tak |
| M2 | `Layout.tsx:257-259`, `index.css:1706` | `OfflineBanner` wchodzi w przepływ 4 s po utracie sieci i przesuwa treść w trakcie pracy | M | Zarezerwować slot albo `position: sticky` / pasek stały | M | tak |
| M3 | `LazyPage.tsx:11-13`, `LoadingSkeleton.tsx` | Fallback to pusty `minHeight:70vh`; `LoadingSkeleton` to w praktyce spinner | M | Szkielet 2–3 kart ze shimmerem na istniejących tokenach szkła | M | tak |
| M4 | `PaymentModal.tsx:46,100` | Własny `role="dialog"` bez backdropu, blokady scrolla i `inert`; focus ucieka na stronę, Escape działa tylko w środku | M | Przenieść na `<Modal align="bottom">` (już ma focus trap, scroll lock, Escape, safe-area) | M | tak |
| M5 | `PlayerCard.tsx:140-143,462-469` | Tryb edycji wpłat włącza się 5-krotnym kliknięciem kwoty długu; z klawiatury wystarczy 5× Enter; brak afordancji | M | Widoczny przycisk „Edytuj” (ikona 44 px) lub potwierdzenie | M | tak |
| M6 | `HistoryTab.tsx:144-158`, `useUndoTimer` | Drugie usunięcie sesji w oknie cofania nadpisuje pierwsze — nie da się go już cofnąć | M | Kolejka wpisów cofania albo komunikat | M | tak |
| M7 | `HistoryTab.tsx:193-229` | Klik „Edytuj” w innym wierszu lub „Anuluj” na zmienionym formularzu kasuje zmiany bez pytania | M | Dirty-check + „Odrzucić zmiany?” albo blokada drugiej edycji | M | tak |
| M8 | `RankingHistoryChart.tsx:119-131` | Serie odróżnia tylko odcień (jednakowa luminancja, jednakowa grubość, bez markerów i etykiet); `<title>` punktów nieosiągalny na dotyku | M | Wzory linii (ciągła/kreskowana/kropkowana) lub etykieta na końcu linii; legenda z `aria-pressed` zostaje (skill: line styles + direct labels) | M | tak |
| M9 | `index.css:486,672,917,938,1548,1563,1721,1767,2534` | Blur 26–30 px na każdej karcie + blur nagłówka i nawigacji; mobilny blok obniża tylko do 18 px (skill: glassmorphism 10–20 px) | H przy słabym GPU | Na `pointer: coarse`/wąskim ekranie zdjąć `backdrop-filter` z kart (zostawić header/nav), tło `--co-glass-hi`; fallback `@supports not` już istnieje (`index.css:1525`) | M | **uwaga** — lekko zmienia głębię kart na telefonie; sprawdzić wizualnie |
| M10 | `WrappedModal.tsx:124,139,263,388,395`, `index.css:869` | `wm-glow` animuje `text-shadow` (repaint co klatkę), do tego nieskończone `wm-float`/`wm-pulse`, brak pauzy | M | Poświatę przez `opacity` pseudo-elementu; float jednorazowo lub N iteracji | S–M | tak |
| M11 | `Layout.tsx:166-169` | `scrollRestoration='manual'` + reset do 0 przy każdej zmianie ścieżki; Wstecz zawsze na górze | L | Zapamiętywać `scrollY` per ścieżka (np. dla Historii) | M | tak |
| M12 | `public/manifest.json` | Brak `id`, `shortcuts`; jedna ikona z `"purpose":"any maskable"` (wymaga osobnej grafiki maskable) | L | Rozdzielić `any`/`maskable`, dodać `id` i skróty „Dodaj sesję”/„Historia” | S–M | tak |
| M13 | `PWAInstallBanner.tsx:146` | `pwa-dismissed` w `localStorage` na zawsze; tekst iOS „na dole Safari” nie pasuje do iPada | L | Wejście „Zainstaluj” w przewodniku „?”; poprawić treść dla iPada | S–M | tak |
| M14 | `BootSequence.tsx:26-50`, `Layout.tsx:244` | Boot ok. 1,7 s przy każdym zimnym starcie sesji; `FirstRunGuide` otwiera się po 700 ms, gdy boot jeszcze gaśnie | L | Skrócić do ok. 1 s lub pomijać w trybie standalone po pierwszym uruchomieniu | S | **uwaga** — boot to element klimatu; skracamy, nie usuwamy |
| M15 | `Leaderboard.tsx:30-52`, `PodiumCard.tsx` | Wiersze to `div role="button"` bez semantyki listy; fokus clip-path oparty na kruchym selektorze `[style*="clip-path"]`; kolejność DOM podium 2-1-3 | L–M | `ul/li` + prawdziwe `button`, klasa zamiast selektora atrybutu; DOM 1-2-3 i `order` w CSS | M | tak |
| M16 | `index.css` (poza `:root`, ok. 171 `rgba(`) | `audit-design.mjs` pomija `.css`: stałe kolory poza `:root` (np. `.neon-status-*`, `fluid-blob-*`, `.glass-shine-overlay`) nie zmieniają się w jasnym motywie | L | Przenieść do tokenów `--glow-*`; rozszerzyć audyt o CSS | M | tak |

### 3.3 Większe zmiany (L)

| ID | Ekran/komponent (plik:linia) | Problem | Wpływ | Proponowana poprawka | Nakład | Zgodność |
|---|---|---|---|---|---|---|
| L1 | `constants/colors.ts:5,43-66`, ~41 użyć `color.text`/`color.border` w komponentach | Stała luminancja nie zmieści się w AA jednocześnie na `#090F18` i na białym; nazwy graczy częściowo jadą kolorem tożsamości (np. `PodiumCard`) | H | Paleta zależna od motywu (`createPlayerColorMap(names, theme)`, ok. 0.30 ciemny / 0.12 jasny) lub nazwa zawsze `--co-text-hi` z kolorem tylko na pasku/awatarze; pętla po palecie w `check-contrast.mjs` | M–L | tak (tożsamość zostaje, zmienia się jasność) |
| L2 | `components/**` (128 inline `fontSize`, 136 inline `fontFamily`, 73 `letterSpacing:'normal'`, np. `PlayerCard.tsx:351-673`) | Inline powielanie zamiast helperów `FONT.*`/`TEXT.*` — dryf od własnego systemu | L (utrzymanie) | Codemod na `FONT.mono(TEXT.tiny)` itd.; po nim reguła w `audit-design` | M–L | tak |
| L3 | `AttendanceTrendChart.tsx` | Dwie niezależne osie Y (cyan lewa, rose prawa), słaba siatka (4 %) i przerywana linia 0,7 — łatwo źle odczytać | M | Dwa małe wykresy jeden pod drugim (small multiples) albo wyraźne podpisy osi | M | tak |
| L4 | `HistoryTab.tsx`, `EditSessionForm.tsx` | Edycja inline w liście + hasło modalne + cofanie to złożony przepływ; sporo stanu (patrz M6, M7, Q12) | M | Po M6/M7 rozważyć edycję w `Modal align="bottom"` z jednym punktem zapisu/odrzucenia | L | tak |

## 4. Co działa dobrze i warto zachować

- **Kontrakt i bramki jakości**: `DESIGN.md`, `DESIGN_SYSTEM.md`, `audit:design/a11y/contrast`, testy regresyjne.
- **Modal**: portal, licznik blokady scrolla, focus trap z powrotem do otwierającego, Escape, safe-area, wyjście szybsze niż wejście.
- **Pole kwoty w `PaymentModal`**: `inputMode="decimal"`, 16 px (bez zoomu iOS), `aria-invalid`, `role="alert"`, formatowanie na blur, zablokowany zapis przy błędzie.
- **Formularz sesji**: walidacja po blur, powód przy zablokowanym przycisku, „Zapisuję…” ze spinnerem, podgląd kosztu na żywo.
- **Przytrzymaj-aby-rozliczyć**: stała podpowiedź, krótkie stuknięcie daje informację, ścieżka klawiaturowa, anulowanie przy scrollu.
- **UndoBar**, potwierdzenia destrukcyjne (hasło + cofnięcie przy sesji, potwierdzenie przy graczu), komunikaty offline od razu przy zapisie.
- **Nawigacja**: 56 px, 5 zakładek mieści się na 320 px, portal do `body`, spójne z-indeksy; Start = saldo bez kliknięcia, dodanie sesji = 1 tap.
- **`useKeyboardOpen`**, `overflow-x: clip`, `100svh`, `scroll-padding` (`index.css:1684-1685`), `aria-live` przy zmianie trasy, `theme-color` zgodny z motywem.
- **Ruch i dostępność**: reduced-motion w trzech warstwach (CSS, hook, canvas), `prefers-reduced-transparency` i `prefers-contrast: more` z realnymi fallbackami, canvas zatrzymywany poza ekranem i na ukrytej karcie, DPR ≤ 2.
- **Wykresy**: pomiar kontenera, etykiety ≥ 12 px, `role="img"`; ranking ma `sr-only` podsumowanie i legendę z `aria-pressed`; replay animuje `scaleX`.
- **Self-hosted fonty** (offline wygląda tak samo), zero CDN.

## 5. Zalecana kolejność wdrażania

1. **Błędy funkcjonalne i dostępność (1 PR)**: Q1, Q12, Q19, Q21, Q22, Q23, Q25, Q26, Q13.
2. **Dotyk i bezpieczne strefy (1 PR)**: Q2–Q8, Q33, Q34, a zaraz potem M1 (baner push) i M2 (offline).
3. **Formularze i dane (1 PR)**: Q9–Q11, Q14–Q18, Q20, Q31; potem M7, M6, M4, M5.
4. **Wydajność bez zmiany wyglądu (1 PR)**: Q27, Q28, Q29, M10; dopiero po obejrzeniu na telefonie M9.
5. **Kolory graczy i kontrast**: L1 razem z rozszerzeniem `check-contrast.mjs`.
6. **Wykresy i siatka frekwencji**: Q24, Q30, M8, potem L3.
7. **Stany ładowania i PWA**: M3, M12, M13, M14, M11.
8. **Porządki i spójność**: Q35, Q36, M15, M16, na końcu L2 (codemod) i ewentualnie L4.

Każdy PR: `cd frontend && npm run verify` + test regresyjny dla poprawki (zgodnie z `DESIGN.md`).
