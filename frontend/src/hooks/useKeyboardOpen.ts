import { useEffect, useState } from 'react';

/**
 * Pola, które na telefonie otwierają klawiaturę albo duży natywny wybierak
 * przy dolnej krawędzi. W obu przypadkach dolna nawigacja byłaby zasłonięta
 * lub przesunięta, więc na czas edycji ją chowamy.
 *
 * `checkbox`/`radio`/`range` zostają na ekranie — one nigdy nie zasłaniają
 * dołu i nie powiększają widoku.
 */
const KEYBOARD_INPUT_TYPES = new Set([
  'text', 'search', 'email', 'number', 'password', 'tel', 'url',
  'date', 'datetime-local', 'month', 'time', 'week',
]);

/**
 * Różnica wysokości mniejsza niż tyle pikseli to pasek adresu albo drobne
 * drgnięcie podczas przewijania — nie klawiatura. Typowa klawiatura zajmuje
 * 250–400 px, więc próg jest bezpiecznie pośrodku.
 */
const KEYBOARD_THRESHOLD_PX = 140;

function opensKeyboard(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'TEXTAREA') return true;
  if (element.tagName !== 'INPUT') return false;
  return KEYBOARD_INPUT_TYPES.has((element as HTMLInputElement).type);
}

/**
 * Czy na ekranie jest otwarta klawiatura (albo pole, które ją otworzy).
 *
 * Dlaczego nie wystarczy `position: fixed; bottom: 0`: na iOS klawiatura
 * zmniejsza wyłącznie visual viewport, a `fixed` dalej liczy się od layout
 * viewportu. Gdy przeglądarka dociąga pole do widoku, dolny pasek potrafi
 * wylądować w połowie ekranu. Ten hook pozwala schować go na czas pisania,
 * zamiast pozwalać mu „pływać”.
 *
 * Dwa sygnały są potrzebne, bo platformy różnią się zachowaniem:
 *  - fokus pola — natychmiastowy, działa też na Androidzie, gdzie klawiatura
 *    zmniejsza layout viewport i różnica wysokości bywa zerowa;
 *  - visual viewport — dokładny na iOS i pozwala wykryć zamknięcie klawiatury
 *    nawet wtedy, gdy fokus zostaje w polu (np. po „Gotowe”).
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const viewport = window.visualViewport;
    // Największa widziana wysokość visual viewportu. Służy jako punkt
    // odniesienia również wtedy, gdy przeglądarka zmniejsza layout viewport
    // razem z klawiaturą (Android) — wtedy `innerHeight` nie pokazuje różnicy.
    let baseline = viewport?.height ?? window.innerHeight;
    let portrait = window.innerHeight >= window.innerWidth;
    let frame = 0;

    const focusedInput = () => opensKeyboard(document.activeElement);

    /**
     * `focusout` odpala się przed `focusin` na następnym polu. Bez odroczenia
     * pasek mrugałby między dwoma inputami przy przechodzeniu „Tabem” albo
     * klikaniem w kolejne pole formularza.
     */
    const scheduleFocusUpdate = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        setOpen(focusedInput());
      });
    };

    const updateViewport = () => {
      const nowPortrait = window.innerHeight >= window.innerWidth;
      if (nowPortrait !== portrait) {
        // Obrót zmienia wysokość o kilkaset pikseli — to nie klawiatura.
        portrait = nowPortrait;
        baseline = viewport?.height ?? window.innerHeight;
        setOpen(false);
        return;
      }

      if (!viewport) return;

      // Pinch-zoom też zmniejsza visual viewport. Nie jest klawiaturą, więc
      // opieramy się wtedy tylko na fokusie — inaczej samo przybliżenie
      // obrazu chowałoby dolną nawigację.
      if (viewport.scale > 1.05) {
        setOpen(focusedInput());
        return;
      }

      if (viewport.height > baseline) baseline = viewport.height;

      const shrunk = baseline - viewport.height;
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setOpen(shrunk > KEYBOARD_THRESHOLD_PX || covered > KEYBOARD_THRESHOLD_PX);
    };

    document.addEventListener('focusin', scheduleFocusUpdate);
    document.addEventListener('focusout', scheduleFocusUpdate);
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('focusin', scheduleFocusUpdate);
      document.removeEventListener('focusout', scheduleFocusUpdate);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  return open;
}
