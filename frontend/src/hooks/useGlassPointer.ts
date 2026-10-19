import { useEffect } from 'react';

/** Powierzchnie, po których ślizga się refleks szkła. */
const GLASS_SELECTOR = [
  '.glass-card',
  '.glass-panel',
  '.glass-surface',
  '.cyber-box',
  '.modal-panel',
  '.glass-header',
  '.desktop-nav-inner',
].join(',');

/**
 * Refleks światła podążający za kursorem po szklanych powierzchniach.
 *
 * Jeden nasłuch na `document` zamiast po jednym na komponent: powierzchni
 * szkła są dziesiątki (każda karta gracza, każdy panel), a `pointermove`
 * odpalający się w każdym z nich z osobna mnożyłby pracę przez ich liczbę.
 * Delegacja pozwala też objąć panele w portalach (modale), których nie ma
 * w drzewie układu strony.
 *
 * Na dotyku i przy `prefers-reduced-motion` hook nic nie robi — refleks
 * zostaje statyczny w domyślnym punkcie (50% / 0%), bez kosztu na klatkę.
 */
export function useGlassPointer(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    if (typeof window.matchMedia !== 'function') return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame: number | null = null;
    let pending: { el: HTMLElement; clientX: number; clientY: number } | null = null;

    const paint = () => {
      frame = null;
      if (!pending) return;
      const { el, clientX, clientY } = pending;
      pending = null;

      // Pomiar dopiero w klatce animacji: `getBoundingClientRect` w handlerze
      // `pointermove` wymuszałby synchroniczny layout przy każdej próbce myszy.
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--glass-x', `${x.toFixed(1)}%`);
      el.style.setProperty('--glass-y', `${y.toFixed(1)}%`);
    };

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>(GLASS_SELECTOR);
      if (!el) return;

      pending = { el, clientX: event.clientX, clientY: event.clientY };
      if (frame === null) frame = requestAnimationFrame(paint);
    };

    // `passive` — nasłuch nigdy nie blokuje przewijania ani gestów.
    document.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', handleMove);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);
}
