/**
 * Blokada przewijania strony pod dialogiem.
 *
 * Dlaczego nie `document.body.style.overflow = 'hidden'` w każdym modalu:
 * przy dwóch otwartych oknach każde zapisuje „poprzedni" stan. Gdy pierwsze
 * się zamyka, przywraca pusty string i odblokowuje stronę, choć drugie okno
 * wciąż wisi. Efekt: „nieraz scroll ucieka w tło". Stąd licznik odwołań
 * współdzielony przez wszystkie modale.
 *
 * Blokujemy też `<html>`: to na nim w trybie standards żyje główny scroll,
 * a `html { overflow-x: clip }` z arkusza nie powstrzyma przewijania w pionie.
 *
 * Safari na iOS potrafi zignorować `overflow: hidden` na html/body. Dlatego
 * dochodzi strażnik `touchmove` (passive: false): przepuszcza gest tylko wtedy,
 * gdy trafia w oznaczony, przewijalny kontener okna, który ma jeszcze miejsce
 * w kierunku ruchu palca. Reszta — scrim, nagłówek, stopka — jest zablokowana.
 */

interface SavedStyles {
  htmlOverflow: string;
  htmlOverscroll: string;
  htmlPaddingRight: string;
  bodyOverflow: string;
  bodyOverscroll: string;
  bodyPaddingRight: string;
}

let activeLocks = 0;
let saved: SavedStyles | null = null;
let lastTouchY = 0;

/** Czy element (lub któryś z przodków w obrębie okna) może przejąć gest. */
function findScroller(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const overlay = target.closest('.modal-overlay');
  if (!overlay) return null;

  let node: Element | null = target;
  while (node && node !== overlay) {
    if (node instanceof HTMLElement && node.hasAttribute('data-modal-scroll')) return node;
    node = node.parentElement;
  }
  return null;
}

function onTouchStart(event: TouchEvent) {
  lastTouchY = event.touches[0]?.clientY ?? 0;
}

function onTouchMove(event: TouchEvent) {
  const scroller = findScroller(event.target);
  const y = event.touches[0]?.clientY ?? lastTouchY;
  // Dodatnie = palec jedzie w górę = treść ma jechać w dół.
  const goingDown = y < lastTouchY;
  lastTouchY = y;

  if (!scroller) {
    event.preventDefault();
    return;
  }

  const maxScroll = scroller.scrollHeight - scroller.clientHeight;
  const atTop = scroller.scrollTop <= 0;
  const atBottom = scroller.scrollTop >= maxScroll - 1;
  // Na krawędzi gest oddałby się stronie (scroll chaining), więc go tniemy.
  if ((goingDown && atBottom) || (!goingDown && atTop) || maxScroll <= 0) {
    event.preventDefault();
  }
}

/** Zablokuj tło. Każde wywołanie musi mieć parę `unlockScroll`. */
export function lockScroll(): void {
  activeLocks += 1;
  if (activeLocks > 1) return;

  const html = document.documentElement;
  const body = document.body;
  saved = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    htmlPaddingRight: html.style.paddingRight,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyPaddingRight: body.style.paddingRight,
  };

  // Zniknięcie paska przewijania nie może przesunąć całej strony w prawo.
  // W środowisku bez layoutu (jsdom) clientWidth wynosi 0 — nie dokładamy
  // wtedy fikcyjnego marginesu równego szerokości okna.
  const viewportWidth = html.clientWidth;
  const scrollbarWidth = viewportWidth > 0
    ? Math.min(Math.max(0, window.innerWidth - viewportWidth), 40)
    : 0;
  const gutter = scrollbarWidth > 0 ? `${scrollbarWidth}px` : '';

  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
  body.style.paddingRight = gutter;

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
}

/** Zdejmij blokadę — strona ruszy dopiero po ostatnim otwartym oknie. */
export function unlockScroll(): void {
  if (activeLocks === 0) return;
  activeLocks -= 1;
  if (activeLocks > 0 || !saved) return;

  document.removeEventListener('touchstart', onTouchStart);
  document.removeEventListener('touchmove', onTouchMove);

  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = saved.htmlOverflow;
  html.style.overscrollBehavior = saved.htmlOverscroll;
  html.style.paddingRight = saved.htmlPaddingRight;
  body.style.overflow = saved.bodyOverflow;
  body.style.overscrollBehavior = saved.bodyOverscroll;
  body.style.paddingRight = saved.bodyPaddingRight;
  saved = null;
}

/** Tylko do testów: ile okien trzyma blokadę. */
export function scrollLockCount(): number {
  return activeLocks;
}
