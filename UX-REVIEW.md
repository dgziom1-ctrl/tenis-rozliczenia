# Cyber-Ponk — przegląd UX i projektu produktu

**Zakres:** aplikacja do rozliczania tenisa i frekwencji (frontend React + Firebase Realtime Database).
**Wersja:** commit `4b2a536`, przegląd z 21.10.2026.
**Charakter:** przegląd niezależny, oparty na uruchomionej aplikacji i kodzie źródłowym. Bez zmian w kodzie produkcyjnym.

---

## 1. Założenia

### Co i jak było testowane

- Przeszedłem aplikację jako nowy użytkownik: dashboard, ranking, dodawanie sesji, historia, zawodnicy, panel skarbnika, modal płatności, Wrapped.
- Testy na dwóch szerokościach: **1440×900** (desktop) i **390×844** (mobile, emulacja).
- Sprawdziłem stan początkowy, formularze, stany po zapisie, usuwanie i przywracanie danych, skróty płatności, obsługę błędów i zachowanie przy dużej liczbie rekordów.
- Wykonałem automatyczny audyt dostępności **axe-core 4.10.2** (WCAG A/AA) na pięciu zakładkach w motywie ciemnym i jasnym oraz na mobile.
- Sprawdziłem konsolę przeglądarki (brak błędów w testowanym buildzie) i mierzyłem realne wymiary layoutu w DOM.

### Ważne zastrzeżenie metodologiczne

Repozytorium nie ma działającej konfiguracji Firebase ani danych dostępowych, a istniejący `frontend/dist` był nieaktualny i kończył się błędem `FIREBASE FATAL ERROR: Can't determine Firebase Database URL`. Dlatego testy UI prowadziłem na **kopii przeglądowej** w `%LOCALAPPDATA%\Temp\opencode\frontend-review`, w której wyłącznie warstwa `firebase/database` została podmieniona na magazyn in-memory/localStorage z 8 zawodnikami i 57 sesjami. **Kod ekranów, stylów i logiki biznesowej pozostał niezmieniony.**

Wnioski dotyczą więc realnego zachowania interfejsu, ale nie potwierdzają zachowania produkcyjnej bazy, synchronizacji między urządzeniami ani reguł bezpieczeństwa.

### Definicje istotności

| Poziom | Znaczenie |
|---|---|
| **krytyczna** | Błąd podważa poprawność rozliczeń lub bezpieczeństwo danych finansowych. |
| **wysoka** | Realnie utrudnia wykonanie głównego zadania albo psuje układ na typowym urządzeniu. |
| **średnia** | Zwiększa tarcie, ryzyko pomyłki lub utrudnia zrozumienie funkcji. |
| **niska** | Kosmetyka lub niespójność bez wpływu na wynik. |

### Materiały

Zrzuty ekranu: `%LOCALAPPDATA%\Temp\opencode\shots\` (m.in. `01-dashboard-dark-desktop.png`, `11-dashboard-mobile-top.png`, `12-ranking-mobile-full.png`, `23-after-quick-blik-desktop.png`, `35-dashboard-audit-after-delete-ania.png`, `push-banner-desktop.png`, `push-banner-mobile.png`).

---

## 2. Najważniejsze wnioski

1. **Aplikacja potrafi zaksięgować pieniądze, których nikt nie przelał.** Jedno dotknięcie przycisku `11,22 ZŁ ⚡ BLIK` natychmiast oznacza dług jako rozliczony. Nie ma potwierdzenia, nie ma weryfikacji przelewu, a jedynym mechanizmem cofnięcia jest pasek znikający po 8 sekundach. To najpoważniejszy problem produktu.
2. **Księgowość nie domyka się przy usuwaniu zawodnika.** Miękkie usunięcie Ani (dług 415,37 zł) zabrało jej dług z sum na dashboardzie, ale historia nadal ją pokazuje. Saldo Kamila spadło z +685,96 zł do +270,59 zł bez żadnej adnotacji o korekcie.
3. **Formularz sesji jest ustawiony na „wszyscy i maksimum kart”, a nie na rzeczywistość.** Domyślnie zaznaczonych jest 8/8 osób i 3 karty MultiSport, przez co ostrzeżenie o limicie pojawia się jeszcze przed pierwszym kliknięciem. W 57 sesjach historycznych tylko jedna miała wszystkich ośmiu zawodników.
4. **Mobile jest zaprojektowany jak desktop w węższym oknie.** Nagłówek zajmuje 327,8 z 844 px (39% ekranu), pierwsza karta wchodzi pod dolną nawigację, a strona historii ma 17 863 px. Ranking na 390 px pokazuje wykres z etykietami ok. 7–8 px, a podium przy ex-aequo rozjeżdża się wizualnie.
5. **Onboarding istnieje tylko w kodzie.** Baner zgody na powiadomienia jest pozycjonowany względem kontenera z animacją `transform`, więc ląduje na 1487 px (desktop) i 3709 px (mobile) — poza ekranem. Jednocześnie ukrywa standardowy baner PWA. Nowy użytkownik nie dostaje żadnego wprowadzenia.

---

## 3. Szczegółowa lista problemów

### 3.1. Pieniądze i zaufanie do danych

#### P-01. Jedno dotknięcie „BLIK” natychmiast rozlicza dług — bez potwierdzenia i bez przelewu
**Co się dzieje:** Na karcie Oli (dług 11,22 zł) dotknięcie przycisku `11,22 ZŁ ⚡ BLIK` od razu zmienia status karty na `ROZLICZONY`, przenosi kartę na początek siatki i pokazuje pasek „Cofnij” na 8 sekund. Żaden modal nie pyta o potwierdzenie, nie następuje żadna operacja bankowa — zapis idzie prosto do bazy.
**Dlaczego to ważne:** Przycisk znajduje się w obszarze przewijania listy zawodników. Przypadkowy dotknięcie podczas scrollowania trwale fałszuje rozliczenie. Po 8 sekundach nie ma oczywistej ścieżki naprawy — trzeba wiedzieć, że płatność usuwa się w ukrytym trybie administratora. Nazwa „BLIK” sugeruje realną płatność, której produkt nie wykonuje.
**Istotność:** krytyczna
**Naprawa:** Rozdzielić „oznacz jako zapłacone” od „zapłać BLIK”. Dodać potwierdzenie z kwotą i nazwą (albo przytrzymanie 600–800 ms z wyraźnym progresem). Wprowadzić trwałą historię korekt z autorem i znacznikiem „ręczne”. Skrócić lub wydłużyć undo do sensownego okna i dać alternatywę w panelu płatności.
**Dowód:** `frontend/src/components/dashboard/PlayerCard.tsx` (linie 119–154, 494–506: `savePayment(debt)` bezpośrednio z `onClick`), `23-after-quick-blik-desktop.png`, `22-payment-modal-desktop.png`.

#### P-02. Miękkie usunięcie zawodnika usuwa jego dług z sum, ale nie z historii
**Co się dzieje:** Po usunięciu Ani (dług 415,37 zł) liczba aktywnych kart spada z 8 do 7, a „do otrzymania” Kamila spada z **+685,96 zł** do **+270,59 zł**. Historia nadal zawiera sesje Ani, a jej profil można przywrócić z kosza. Saldo nie zawiera żadnej informacji o różnicy.
**Dlaczego to ważne:** To błąd księgowy, nie kosmetyczny. Skarbnik widzi, że pieniądze „zniknęły”, choć dług nadal istnieje — tylko poza aktywną listą. Użytkownik nie ma jak odróżnić korekty od błędu. W połączeniu z P-01 daje to system, w którym sumy nie są wiarygodne.
**Istotność:** krytyczna
**Naprawa:** Zablokować miękkie usunięcie, gdy saldo ≠ 0 (analogicznie do blokady usunięcia trwałego przy historii sesji). Jeśli usunięcie jest konieczne, przenieść saldo do osobnej kategorii „nieaktywni” i pokazać je w sumach z jawną etykietą. Dodać test regresyjny: suma sald przed usunięciem = suma sald po usunięciu.
**Dowód:** `frontend/src/lib/firebase/mutations/players.ts` (`softDeletePlayer` bez sprawdzania salda; `permanentDeletePlayer` blokuje przy historii), `frontend/src/lib/firebase/transforms.ts` (sumy tylko dla aktywnych `players`), `35-dashboard-audit-after-delete-ania.png`, `34-trash-desktop.png`.

#### P-03. Kopiowanie „przelewu BLIK” sugeruje transakcję, której nie ma
**Co się dzieje:** Modal płatności ma nagłówek „Kwota przelewu BLIK”, a po zapisie dług jest określany jako `ROZLICZONY`. Aplikacja nie integruje się z BLIK-iem; jedyne, co robi, to zapis w bazie.
**Dlaczego to ważne:** Użytkownik może uznać, że pieniądze zostały przelane, i nie wykonać przelewu ręcznie. To ryzyko finansowe wynikające wprost z copy.
**Istotność:** wysoka
**Naprawa:** Zmienić język na „Zapisz płatność” / „Oznacz jako opłacone” i wyraźnie pokazać numer BLIK do ręcznego przelewu oraz krok potwierdzenia. Status `ROZLICZONY` zastąpić czymś w rodzaju `OPŁACONE (ręcznie)`.
**Dowód:** `frontend/src/components/dashboard/PaymentModal.tsx`, `frontend/src/components/dashboard/PlayerCard.tsx`, `22b-payment-modal-filled.png`, `23-after-quick-blik-desktop.png`.

#### P-04. Ukryty tryb administratora i „hasło” po stronie klienta
**Co się dzieje:** Wejście w tryb usuwania płatności wymaga pięciu dotknięć w panel rozliczenia. Nie ma żadnego widocznego punktu wejścia ani wyjaśnienia. Ochrona opiera się na haśle w zmiennej `VITE_ADMIN_PASSWORD`, czyli w kodzie dostarczanym do przeglądarki.
**Dlaczego to ważne:** Uprawnienia do kasowania wpisów finansowych są zarówno trudne do odkrycia dla uprawnionych, jak i nietrudne do obejrzenia dla każdego, kto otworzy bundle. To problem zaufania do danych i realna luka bezpieczeństwa, nie tylko UX.
**Istotność:** wysoka
**Naprawa:** Przenieść autoryzację do Firebase Auth + reguł bazy lub funkcji chmurowej. W UI dać jawny, ale chroniony punkt wejścia („Tryb skarbnika”) z widocznym stanem aktywności i logiem operacji.
**Dowód:** `frontend/src/components/dashboard/BreakdownPanel.tsx` (warunkowe renderowanie usuwania tylko w `adminMode`), `frontend/.env*`, `24-treasurer-desktop.png`.

### 3.2. Wprowadzanie danych

#### P-05. Domyślne „wszyscy + 3 karty” generuje ostrzeżenie przed pierwszym kliknięciem
**Co się dzieje:** Formularz nowej sesji startuje z **8/8 zaznaczonymi zawodnikami** i **3 kartami MultiSport**. Od razu widoczne jest: „Limit 2 kart przekroczony — zniżka zostanie proporcjonalnie podzielona na 3 osób (10 zł/os. zamiast 15 zł)”. Zapis nie jest blokowany — ostrzeżenie można zignorować.
**Dlaczego to ważne:** W 57 sesjach historycznych 27 miało 5 osób, 16 miało 6, a tylko **1** miała wszystkich 8. Domyślne wartości niemal nigdy nie odpowiadają rzeczywistości, więc użytkownik musi aktywnie odznaczać większość listy przy każdym wpisie. Ostrzeżenie pokazane na starcie staje się tłem, które uczy ignorowania komunikatów. Zapis mimo ostrzeżenia pozwala utrwalić błędne koszty.
**Istotność:** wysoka
**Naprawa:** Domyślnie zaznaczać skład ostatniej sesji (albo pusty formularz z wyraźnym „wybierz skład”). Karty ustawiać na podstawie faktycznych deklaracji, nie na sztywno 3. Ostrzeżenie o limicie zamienić w blokadę zapisu z konkretnym wskazaniem, które karty nadmiarowe usunąć.
**Dowód:** `frontend/src/components/admin/AdminTab.tsx`, `13-add-mobile-full.png`, `30-add-empty-desktop.png`, `30b-add-cost-preview-desktop.png`.

#### P-06. Data sesji domyślnie z UTC, nie z czasu lokalnego
**Co się dzieje:** Domyślna data to `new Date().toISOString().split('T')[0]`. Między północą a 01:00/02:00 czasu polskiego (zależnie od strefy) pole pokazuje **wczoraj**.
**Dlaczego to ważne:** Sesje tenisowe są rozliczane datą lokalną. Wieczorne wpisy po północy trafią do złego miesiąca lub sezonu, co psuje statystyki i rozliczenia.
**Istotność:** średnia
**Naprawa:** Używać lokalnego formattera (`Intl.DateTimeFormat('sv-SE')` lub analogicznego) i pokazywać nazwę dnia przy dacie. Dodać walidację daty przyszłej.
**Dowód:** `frontend/src/components/admin/AdminTab.tsx`, `03-add-desktop.png`.

#### P-07. Brak wyjaśnienia pojęć i ról przy pierwszym uruchomieniu
**Co się dzieje:** Etykiety `ROZLICZONY`, `ZALEGŁOŚĆ`, „skarbnik”, „tydzień” pojawiają się bez legendy. Jedyne wprowadzenie (baner powiadomień) jest niewidoczne (P-09). Nie ma pustego stanu z podpowiedzią „dodaj pierwszą sesję”.
**Dlaczego to ważne:** Nowy użytkownik widzi kwoty i kolory, ale nie wie, kto jest kim i co ma zrobić. Szczególnie mylące jest to, że „rozliczony” oznacza zapis w aplikacji, a nie potwierdzony przelew (P-03).
**Istotność:** średnia
**Naprawa:** Krótki onboarding (3 ekrany lub inline tips) wyjaśniający role, statusy i sposób działania BLIK. Przy pustych danych CTA „Dodaj pierwszą sesję”.
**Dowód:** brak komponentu help/legendy w `frontend/src/components/layout/`, `11-dashboard-mobile-top.png`.

### 3.3. Mobile i układ

#### P-08. Nagłówek zjada 39% ekranu mobile, a pierwsza karta wchodzi pod dolną nawigację
**Co się dzieje:** Na 390×844 nagłówek ma **327,8 px**, pierwsza karta rozciąga się od **385,8 px** do **841,0 px**, a górna krawędź dolnej nawigacji to **788 px**. Karta jest więc częściowo zasłonięta. Dashboard ma **4130 px** wysokości. Na desktopie nagłówek ma 435 px przy 900 px wysokości (48%), a pierwsza karta zaczyna się na 587 px.
**Dlaczego to ważne:** W pierwszym ekranie widać głównie dekoracyjny nagłówek, a nie najważniejszą informację (saldo, dług). Zasłonięta karta utrudnia odczyt i dotknięcie akcji przy dolnej krawędzi.
**Istotność:** wysoka
**Naprawa:** Skompensować wysokość nagłówka na mobile (mniejszy hero, sticky compact bar po scrollu), dodać `padding-bottom` równy wysokości nawigacji + safe-area, a saldo wynieść nad zagięcie. Zmierzyć ponownie: pierwsza karta w całości widoczna bez scrolla.
**Dowód:** `frontend/src/components/layout/Header.tsx`, `frontend/src/index.css` (reguły dla `.bottom-banner` i paddingu mobile), `11-dashboard-mobile-top.png`, `11b-dashboard-mobile-full.png`.

#### P-09. Podium przy ex-aequo rozjeżdża się i nachodzi na nawigację
**Co się dzieje:** Marek i Tomek mają po 88% i obaj dostają pełną kartę brązową. Kolumna miejsca #3 jest wyższa niż #1, a na mobile treść nachodzi na dolną nawigację.
**Dlaczego to ważne:** Ranking to ekran motywacyjny i społeczny. Zepsuty układ przy remisie — sytuacji normalnej w tej grupie — wygląda jak błąd i utrudnia odczyt.
**Istotność:** wysoka
**Naprawa:** Jeden blok podium na miejsce z listą ex-aequo w środku albo wspólna wysokość kolumn z `align-items: stretch` i wewnętrznym scrollem. Dodać test dla 2–3 remisujących.
**Dowód:** `frontend/src/components/attendance/PodiumCard.tsx`, `12-ranking-mobile-full.png`.

#### P-10. Wykres rankingu jest nieczytelny na telefonie
**Co się dzieje:** SVG ma stałe **560×200** i 8 serii. Na ekranie 390 px jest skalowany do ok. 70%, więc etykiety mają **7–8 px**. Legenda i kolory nie wystarczają do rozróżnienia linii.
**Dlaczego to ważne:** Wykres jest głównym elementem analitycznym rankingu, a na telefonie nie da się z niego odczytać ani wartości, ani trendu. To nie jest kwestia estetyki, tylko utraty funkcji.
**Istotność:** wysoka
**Naprawa:** Responsywny SVG (`viewBox` + `preserveAspectRatio`), ograniczenie liczby serii z przełącznikiem zawodników, etykiety osi min. 12 px, legenda z tap-to-highlight. Alternatywnie lista trendów zamiast wykresu na małych ekranach.
**Dowód:** `frontend/src/components/attendance/RankingHistoryChart.tsx`, `12-ranking-mobile-full.png`, `02-ranking-desktop.png`.

#### P-11. Historia: 50 sesji renderowanych naraz i 17 863 px strony
**Co się dzieje:** Na starcie renderuje się 50 z 57 sesji (`INITIAL_VISIBLE_SESSIONS = 50`). Strona ma **12 499 px** na desktopie i **17 863 px** na mobile. Przycisk „POKAŻ WSZYSTKIE (57 SESJI)” jest na samym dole, po przewinięciu całej listy. Brak filtrów po zawodniku, miesiącu i typie.
**Dlaczego to ważne:** Znalezienie konkretnej sesji wymaga długiego scrollowania, a „pokaż wszystkie” jest praktycznie nieosiągalne bez przejechania całej historii. To ekran, do którego użytkownik wraca najczęściej po pieniądze.
**Istotność:** średnia
**Naprawa:** Paginacja lub infinite scroll z virtualizacją, sticky filtry (miesiąc, zawodnik, „tylko nieopłacone”) i skok do miesiąca. Przycisk „pokaż więcej” także nad listą.
**Dowód:** `frontend/src/components/history/HistoryTab.tsx`, `14-history-mobile-full.png`, `04-history-desktop.png`.

### 3.4. Dostępność i spójność

#### P-12. Wrapped 2025 nie da się przewinąć klawiaturą
**Co się dzieje:** Pierwszy slajd mówi „Dotknij aby kontynuować →”, ale nie ma przycisku „dalej”. Kontener przechwytuje kliknięcie i ma `role="presentation"` oraz brak `tabIndex`, gdy nie jest osadzony. Klawiatura i czytnik ekranu nie mają jak przejść dalej.
**Dlaczego to ważne:** To naruszenie WCAG 2.1.1 (obsługa klawiatury). Użytkownik bez myszy lub z ograniczeniami motorycznymi zostaje zablokowany na pierwszym ekranie.
**Istotność:** wysoka
**Naprawa:** Dodać realny przycisk „Dalej” z fokusem, obsługę strzałek/Enter/Space, `role="dialog"`, `aria-live` dla slajdów i widoczny wskaźnik postępu. Zapewnić wyjście klawiszem Esc.
**Dowód:** `frontend/src/components/attendance/WrappedModal.tsx` (linie 430–433: `onClick={advance}`, `role="presentation"`, `tabIndex` tylko gdy `embedded`), `26-wrapped-desktop.png`.

#### P-13. Baner powiadomień renderuje się poza ekranem i blokuje baner PWA
**Co się dzieje:** `.push-banner-sheet` jest `position: fixed`, ale `.main-content` zachowuje `transform: matrix(1,0,0,1,0,0)` z animacji `page-enter`. Fixed pozycjonuje się względem rodzica z transformem, więc górna krawędź banera wypada na **1486,97 px** przy viewportcie 900 px i **3709,16 px** przy 844 px. Jednocześnie `body.has-push-banner` ukrywa standardowy baner PWA. W pierwszym ekranie banera nie widać.
**Dlaczego to ważne:** Prośba o zgodę na powiadomienia nigdy nie dociera do użytkownika, a aplikacja traci też alternatywną instalację PWA. To cicha awaria całego onboardingu uprawnień.
**Istotność:** wysoka
**Naprawa:** Renderować baner przez portal do `document.body`, usunąć `transform` z kontenera po animacji (`animation-fill-mode` + `will-change`), a `body.has-push-banner` ustawiać dopiero po faktycznym pokazaniu banera. Dodać test pozycji w viewportcie.
**Dowód:** `frontend/src/components/common/PushPermissionBanner.tsx`, `frontend/src/index.css` (`.bottom-banner`, `page-enter`), `push-banner-desktop.png`, `push-banner-mobile.png`.

#### P-14. „HOME” w polskiej nawigacji
**Co się dzieje:** Dolna nawigacja miesza języki: `HOME`, `RANKING`, `DODAJ`, `HISTORIA`, `GRACZE`.
**Dlaczego to ważne:** Drobna niespójność, ale widoczna na każdym ekranie i obniża poczucie dopracowania.
**Istotność:** niska
**Naprawa:** `PULPIT` lub `START`; ujednolicić wielkość liter i słownik pojęć (`GRACZE` vs `zawodnicy` w treści).
**Dowód:** `frontend/src/components/layout/Navigation.tsx`, `11-dashboard-mobile-top.png`.

#### P-15. Automatyczny audyt nie wyłapuje problemów typograficznych
**Co się dzieje:** axe-core 4.10.2 nie zgłosił **żadnych naruszeń WCAG A/AA** na pięciu zakładkach (ciemny i jasny motyw) ani na mobile. Jednocześnie ręcznie potwierdziłem etykiety wykresu 7–8 px i blokadę klawiatury w Wrapped.
**Dlaczego to ważne:** „Zero błędów w axe” nie oznacza dostępności. Zespół może uznać temat za zamknięty, podczas gdy użytkownicy z ograniczeniami wzroku i motoryki nadal mają problemy.
**Istotność:** średnia (ryzyko procesowe)
**Naprawa:** Uzupełnić axe o testy manualne: nawigacja klawiaturą, powiększenie 200%, kontrast w stanach hover/disabled, sensowna kolejność fokusu. Wpisać to do definition of done.
**Dowód:** wyniki axe (0 naruszeń), `12-ranking-mobile-full.png`, `26-wrapped-desktop.png`.

---

## 4. Co działa dobrze

1. **Hierarchia karty zawodnika jest czytelna.** Nazwa, kwota i status są widoczne bez wchodzenia w szczegóły, a kolor stopnia ułatwia skanowanie listy. Na desktopie siatka dobrze wykorzystuje szerokość (`01-dashboard-dark-desktop.png`).
2. **Podgląd kosztów przed zapisem jest konkretny.** Dla 123 zł pokazuje 19,12 zł na osobę bez karnetu i 9,13 zł z kartą, wraz z ostrzeżeniem o podziale zniżki. To dobra decyzja: użytkownik widzi skutek finansowy przed zatwierdzeniem (`30b-add-cost-preview-desktop.png`, `31-session-summary-desktop.png`).
3. **Trwałe usunięcie zawodnika z historią jest zablokowane.** System odmawia i kieruje do archiwizacji — to poprawna ochrona integralności danych, której brakuje tylko przy usunięciu miękkim (P-02). Kosz z przywracaniem działa (`34-trash-desktop.png`).
4. **Cofnięcie płatności istnieje i jest widoczne.** Pasek undo z odliczaniem daje szybką naprawę tuż po pomyłce — szkoda, że okno jest krótkie i nie ma alternatywnej ścieżki (P-01).
5. **Panel skarbnika spina dane spójnie w stanie bazowym.** Sumy „do otrzymania” i „do zapłaty” zgadzają się z kartami zawodników przed modyfikacjami; Kamil jako organizator jest czytelnie wyróżniony (`24-treasurer-desktop.png`).
6. **Fundament dostępności jest niezły.** Przyciski mają etykiety `aria-label`, kontrast w obu motywach przechodzi axe, a aplikacja nie generuje błędów w konsoli w testowanym buildzie.
7. **Ranking pokazuje pełny kontekst.** Procent frekwencji, liczba obecności i remisy są liczone poprawnie (Kamil 41/41 = 100%, Piotr 93%, Marek i Tomek po 88%), a przełączanie lat działa (`25-ranking-base.png`, `25b-ranking-2025.png`).

---

## 5. Czego nie dało się zweryfikować

- **Prawdziwego Firebase:** odczytu, zapisu, reguł `database.rules.json`, autoryzacji, rozstrzygania konfliktów i zachowania offline. Testy szły na mocku; nie potwierdzam, że produkcja zapisuje tak samo.
- **Synchronizacji między urządzeniami i pracy wielu użytkowników jednocześnie.** Nie sprawdziłem, co się stanie, gdy dwóch skarbników edytuje tę samą sesję.
- **Pushy i PWA:** rejestracji service workera, FCM, uprawnień przeglądarki, instalacji i trybu offline. Potwierdziłem tylko błąd pozycjonowania banera w DOM.
- **Realnej płatności BLIK.** Integracji nie ma w kodzie, więc weryfikowałem wyłącznie zapis w bazie i copy.
- **Fizycznych urządzeń:** iPhone/Android, klawiatury ekranowej, safe-area, gestów i przewijania przy 120 Hz. Mobile to emulacja 390×844 w Chromium.
- **Czytników ekranu** (VoiceOver/TalkBack/NVDA) i realnych użytkowników z ograniczeniami. Audyt axe i testy klawiatury to nie to samo.
- **Wydajności przy realnym wolumenie:** wiele sezonów, setki sesji, wolna sieć. Zmierzyłem tylko 57 sesji na mocku.
- **Bezpieczeństwa „hasła” administratora** w praktyce produkcyjnej — potwierdziłem jedynie, że jest zmienną klientową.
- **Spójności numeru BLIK:** w testach `.env.development` nadpisywał `.env.local`, więc UI pokazywał `600 000 000` zamiast `600 123 456`. To artefakt konfiguracji testowej, nie wniosek o produkcie.

---

## 6. Proponowana kolejność wdrażania

### Etap 0 — zatrzymać błędy finansowe (P-01, P-02, P-03)
Najpierw potwierdzenie płatności, blokada usunięcia z długiem i uczciwe copy. Do tego testy regresyjne sum sald i historii płatności. **Kryterium akceptacji:** suma sald przed i po usunięciu zawodnika jest identyczna; żadna płatność nie powstaje bez jawnego potwierdzenia.

### Etap 1 — naprawić wprowadzanie danych (P-05, P-06, P-07)
Domyślny skład z ostatniej sesji, karty z deklaracji, blokada zapisu przy przekroczonym limicie, data lokalna. **Kryterium:** typowa sesja pięcioosobowa wymaga maksymalnie jednego odznaczenia, a ostrzeżenie o kartach nie pojawia się bez przyczyny.

### Etap 2 — doprowadzić mobile do używalności (P-08, P-09, P-10, P-11)
Kompaktowy nagłówek, poprawne `padding-bottom`, naprawa podium, responsywny wykres, paginacja i filtry historii. **Kryterium:** pierwsza karta w pełni widoczna na 390×844; brak nachodzenia na nawigację przy remisie; etykiety wykresu ≥12 px.

### Etap 3 — onboarding i zaufanie (P-04, P-13)
Naprawa portalu banera, pierwsze wprowadzenie, jawny tryb skarbnika z logiem operacji i autoryzacją po stronie serwera. **Kryterium:** baner widoczny w pierwszym viewportcie; każda operacja kasowania ma autora i timestamp.

### Etap 4 — dostępność (P-12, P-15)
Klawiatura w Wrapped, focus management, alternatywa tekstowa dla wykresu, ręczne testy dostępności w definition of done. **Kryterium:** cały przepływ Wrapped przechodzi klawiaturą; test 200% zoomu bez utraty funkcji.

### Etap 5 — porządki (P-14)
Ujednolicenie języka nawigacji i słownika pojęć, przegląd mikrocopy. Tanie, ale widoczne na każdym ekranie.

---

**Podsumowanie:** produkt ma dobry fundament wizualny i sensowną logikę podziału kosztów, ale w obecnym stanie **nie jest gotowy do codziennego rozliczania prawdziwych pieniędzy**. Dwa błędy krytyczne (natychmiastowe rozliczenie jednym dotknięciem i znikający dług przy usunięciu zawodnika) trzeba naprawić przed każdym kolejnym usprawnieniem UI. Dopiero potem warto inwestować w mobile, onboarding i dopracowanie.
