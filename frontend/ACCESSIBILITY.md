# Dostępność — checklista, której nie zastąpi axe

Automatyczny audyt (axe-core) nie widzi problemów typograficznych: tekst SVG
pomniejszony przez `viewBox`, 7-pikselowych podpisów osi ani przycisków, które
są czytelne tylko przy 100% zoomie. Poniższa lista jest uzupełnieniem testów —
przechodzimy ją przy zmianach w nagłówku, wykresach, historii i gestach.

`npm run audit:a11y` pilnuje dwóch regresji automatycznie:

1. żaden `font-size` w `src/index.css` nie schodzi poniżej 12 px,
2. `CHART_LABEL_SIZE >= 12`, a oba wykresy używają `useElementWidth`
   (viewBox 1:1 z kontenerem, bez skalowania tekstu).

## Typografia i wykresy

- [ ] Przy szerokości **390 px** etykiety osi wykresu mają **min. 12 px**
      (sprawdź w DevTools computed font-size lub linijką; nie ufaj samemu SVG).
- [ ] Wykres rankingu nie ma więcej niż ~6 podpisów miesięcy na telefonie;
      przy 8 graczach linie da się od siebie odróżnić, a legenda pozwala ukryć
      pojedynczą linię.
- [ ] Wykres trendu obecności pokazuje wartości tylko co drugi/drugi punkt,
      jeśli nachodzą na siebie.
- [ ] Żaden tekst nie jest mniejszy niż 12 px — także placeholdery, podpisy
      „OVR”, kod kreskowy i etykiety przycisków.
- [ ] Przy zoomie **200%** (Chrome DevTools → Rendering → Emulate CSS media)
      nic nie znika za dolną nawigacją i nie nachodzi na siebie.

## Telefon (iPhone / Android)

- [ ] Górny pasek to ok. **100 px**, a pierwsza karta jest w całości widoczna
      nad dolną nawigacją przy 390 × 844.
- [ ] Dolna nawigacja uwzględnia `safe-area-inset-bottom` (iPhone z paskiem
      gestów); ostatni element strony nie chowa się pod nią.
- [ ] Cel dotykowy ma min. **44 × 44 px** (przyciski nagłówka, „Pokaż więcej”,
      legenda wykresu, wiersze ex aequo).
- [ ] Przytrzymanie przycisku wpłaty nie zaznacza tekstu, nie otwiera menu
      kontekstowego i nie przewija strony po rozpoczęciu gestu.
- [ ] Przewinięcie rozpoczęte na przycisku wpłaty anuluje przytrzymanie.
- [ ] Po przytrzymaniu 0,8 s kwota schodzi płynnie do zera, a pieczątka
      „ROZLICZONY” pojawia się **po** animacji, nie zamiast niej.

## Klawiatura i czytnik ekranu

- [ ] Krótkie Enter/Space na przycisku wpłaty otwiera dialog potwierdzenia;
      przytrzymanie Enter/Space zapisuje wpłatę.
- [ ] Dialog potwierdzenia ma focus trap, Escape zamyka, a fokus wraca na
      przycisk.
- [ ] Legenda wykresu to przyciski z `aria-pressed`; ukrycie ostatniej linii
      jest zablokowane.
- [ ] Wiersze ex aequo na podium są osiągalne Tabem i mają opis
      „imię, procent frekwencji, miejsce”.
- [ ] Nowy użytkownik dostaje przewodnik „Jak to działa?” raz; wraca do niego
      przyciskiem „?” w nagłówku.

## Historia i wydajność

- [ ] Historia pokazuje na start **12 sesji**, nie 50; przy 57 sesjach strona
      ma ok. 1,8–2,2 tys. px, nie 17,8 tys.
- [ ] „Pokaż więcej” jest i nad listą (w liczniku), i pod listą; licznik
      „Pokazano X z Y” jest ogłaszany przez `aria-live`.
- [ ] Zmiana filtra gracza, sezonu lub sortowania wraca do pierwszych 12.

## Czego axe nie sprawdzi

- [ ] Kontrast **na szkle** (tło półprzezroczyste + animowany refleks) —
      sprawdź ręcznie w trybie jasnym i ciemnym.
- [ ] Czy animacja nie wywołuje choroby lokomocyjnej; przy
      `prefers-reduced-motion` licznik i pasek postępu nie animują się.
- [ ] Fizyczne iPhone/Android: klawiatura, safe-area, wibracje, przewijanie
      przy przytrzymaniu.
