import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Zamyka Tab w obrębie okna modalnego i po jego zamknięciu oddaje fokus
 * elementowi, z którego okno otwarto.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const opener = document.activeElement;

    // `autoFocus` na polu w środku okna zdąży ustawić fokus, zanim ten efekt
    // się wykona. Przeniesienie go wtedy na kontener zabierało fokus polu:
    // nie dało się nic wpisać, a na telefonie nie otwierała się klawiatura.
    // Dlatego kontener przejmuje fokus tylko wtedy, gdy nic w środku go nie ma.
    if (!el.contains(document.activeElement)) {
      const firstFocusable = el.querySelector<HTMLElement>(FOCUSABLE);
      (firstFocusable ?? el).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      // Bez tego po zamknięciu okna fokus ląduje na <body> i nawigacja
      // klawiaturą zaczyna się od nowa od góry strony.
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) {
        opener.focus();
      }
    };
  }, [ref, active]);
}
