import type { CSSProperties } from 'react';

export const CLIP = {
  panel: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
  card: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
  badge: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
  smallCard: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
  tag: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
} as const;

/**
 * Skala typograficzna.
 *
 * Wcześniej w kodzie krążyły 33 różne rozmiary, w tym jedenaście w pasmie
 * 0.58–0.72rem — różnice rzędu 0,3 piksela, których nikt nie widzi, a każda
 * była osobną decyzją do utrzymania. `micro` to podłoga czytelności: niżej
 * schodzą już tylko elementy dekoracyjne (kod kreskowy, znaczniki osi).
 */
export const TEXT = {
  micro: '0.75rem',   // 12px — etykiety pól, znaczniki (podłoga czytelności)
  tiny: '0.75rem',    // 12px — alias dla czytelności wywołań
  small: '0.8125rem', // 13px — treść drugorzędna
  base: '0.875rem',   // 14px — treść podstawowa
  lead: '1rem',       // 16px — wyróżnienie, tytuł sekcji
  h3: '1.25rem',      // 20px
  h2: '1.5rem',       // 24px
  h1: '2rem',         // 32px
  hero: '2.5rem',     // 40px — kwoty i liczby-bohaterowie
} as const;

/**
 * KOMPROMIS: koniec z rozstrzelonymi wersalikami. Trzy stopnie skali
 * zostają jako nazwy (komponenty ich używają), ale wszystkie dają naturalny
 * odstęp — hierarchię buduje rozmiar i waga, nie tracking liter.
 */
export const TRACK = {
  tight: 'normal',
  normal: 'normal',
  wide: 'normal',
} as const;

/**
 * Szerokości kolumny treści.
 *
 * Zakładki rozjeżdżały się na desktopie: „Dodaj" i „Gracze" miały wpisane
 * `maxWidth: 680` niezależnie od siebie, a pozostałe trzy rozciągały się na
 * pełne 1280px kontenera — przy przełączaniu zakładki treść widocznie
 * przeskakiwała z szerokiej na wąską.
 *
 * `form` jest węższe świadomie: pola formularza czyta się lepiej w jednej
 * kolumnie niż rozciągnięte na całą szerokość ekranu.
 */
export const CONTENT_WIDTH = {
  /** Ekrany formularzowe — jedna kolumna pól. */
  form: 680,
} as const;

/**
 * Wysokość dolnej nawigacji żyje w CSS jako `--nav-height` (index.css), bo
 * korzystają z niej wyłącznie reguły CSS i style inline, które potrafią czytać
 * `var()`. Trzymanie jej również tutaj dawałoby drugie źródło prawdy —
 * a właśnie z tego wzięło się nachodzenie toasta na baner (56 vs 72px).
 */

/**
 * Punkty załamania. W kodzie krążyły cztery, każdy wpisany osobno i żaden
 * współdzielony: 639 (useIsMobile), 640 (nawigacja w CSS), 480 (siatka wpisu
 * historii) i 768 (ziarno filmowe). Te wartości muszą odpowiadać zapytaniom
 * medialnym w index.css.
 */
export const BREAKPOINT = {
  /** Poniżej tej wartości układ jest mobilny (nawigacja na dole). */
  mobile: 639,
  /** Wąskie telefony — jedna kolumna zamiast dwóch. */
  narrow: 480,
  /** Desktop — ziarno filmowe i efekty hover. */
  desktop: 768,
} as const;

/**
 * Warstwy. Musi odpowiadać zmiennym `--z-*` w index.css — typ `zIndex` w React
 * nie przyjmuje `var()`, więc wartości liczbowe muszą żyć również tutaj.
 * Wcześniej w kodzie krążyła drabinka 38/39/40/45/49/50/70/100/200/1000/1001/9000,
 * w której ziarno filmowe malowało się nad każdym dialogiem.
 */
export const Z = {
  header: 39,
  nav: 40,
  banner: 45,
  grain: 50,
  popover: 60,
  modal: 100,
  /** Cząsteczki nad modalem, pod toastem — `pointer-events: none`. */
  confetti: 110,
  boot: 1000,
  toast: 9000,
} as const;

function displayTracking(): string {
  // Zdania bez trackingu. Parametr `size` pozostaje w sygnaturze, żeby
  // wszystkie wywołania FONT.display(size) dalej się kompilowały.
  return 'normal';
}

export const FONT = {
  display: (size: string = TEXT.lead, spacing?: string): CSSProperties => ({
    fontFamily: 'var(--font-display)',
    fontSize: size,
    letterSpacing: spacing ?? displayTracking(),
    textTransform: 'none',
  }),
  mono: (size: string = TEXT.small): CSSProperties => ({
    fontFamily: 'var(--font-mono)',
    fontSize: size,
  }),
  /**
   * Dane techniczne z HUD-u Cyberpunk 2077 (Orbitron): liczby, kody, salda.
   * TYLKO ASCII/cyfry — krój nie ma podzbioru latin-ext, więc polskie zdania
   * i waluta „zł" muszą zostać przy --font-display / --font-mono.
   */
  tech: (size: string = TEXT.base, weight: number = 600): CSSProperties => ({
    fontFamily: 'var(--font-tech)',
    fontSize: size,
    fontWeight: weight,
    letterSpacing: 'normal',
    textTransform: 'none',
  }),
  /**
   * Krój dla danych, które MOGĄ nie być liczbą. Orbitron nie ma polskich
   * znaków, więc nieskonfigurowany BLIK („SKONFIGURUJ .ENV") składałby się
   * z dwóch krojów w jednym słowie. Wtedy wracamy do Space Mono.
   */
  data: (text: string, size: string = TEXT.base): CSSProperties => (
    /^[\d\s]+$/.test(text)
      ? FONT.tech(size, 500)
      : FONT.mono(size)
  ),
  /** Etykieta nad wartością — zdanie, bez wersalików. */
  monoLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: TEXT.tiny,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: 'var(--co-dim)',
  } as CSSProperties,
  /** Treść drugorzędna: daty, liczniki, opisy. */
  monoSmall: {
    fontFamily: 'var(--font-mono)',
    fontSize: TEXT.small,
    color: 'var(--co-dim)',
  } as CSSProperties,
  /** Najmniejszy czytelny stopień — tylko dane techniczne. */
  monoMicro: {
    fontFamily: 'var(--font-mono)',
    fontSize: TEXT.micro,
    color: 'var(--co-dim)',
  } as CSSProperties,
};

export const PANEL = {
  cyberCut: {
    background: 'var(--co-panel)',
    border: '1px solid var(--co-border)',
    clipPath: CLIP.panel,
    padding: 24,
    position: 'relative',
  } as CSSProperties,
};
