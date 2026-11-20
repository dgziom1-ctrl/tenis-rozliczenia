import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PointerEvent, PointerEventHandler } from 'react';

interface CardTiltOptions {
  /** Przy ograniczonym ruchu karta się nie przechyla, a trwający przechył jest zdejmowany. */
  reducedMotion: boolean;
  /** Ramka w trakcie przechyłu (karta „pod kursorem”). */
  activeBorder: string;
  /** Ramka, do której karta wraca po zejściu kursora. */
  restBorder: string;
  /** Poświata w trakcie przechyłu. */
  activeShadow: string;
  /** Poświata, do której karta wraca po zejściu kursora. */
  restShadow: string;
}

interface CardTiltHandlers {
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  onPointerLeave: () => void;
}

/**
 * Przechył karty 3D i odblask folii podążający za kursorem (lub palcem).
 *
 * Styl ustawiamy wprost na węźle, a pozycję wskaźnika zbieramy do jednej klatki
 * `requestAnimationFrame` — przy setkach `pointermove` na sekundę stan Reacta
 * renderowałby kartę przy każdym ruchu. Na dotyku przechył działa tylko
 * w trakcie przytrzymania, żeby przewijanie listy nie przechylało kart.
 */
export function useCardTilt({
  reducedMotion, activeBorder, restBorder, activeShadow, restShadow,
}: CardTiltOptions) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const foilRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const touchActiveRef = useRef(false);

  const scheduleTilt = useCallback((clientX: number, clientY: number) => {
    if (reducedMotion) return;
    pendingPointerRef.current = { x: clientX, y: clientY };
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const point = pendingPointerRef.current;
      const card = cardRef.current;
      if (!point || !card) return;

      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = Math.max(0, Math.min(1, (point.x - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (point.y - rect.top) / rect.height));

      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
      card.style.transition = 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0s';
      card.style.transform = `perspective(920px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg)`;
      card.style.borderColor = activeBorder;
      card.style.boxShadow = activeShadow;
      foilRef.current?.style.setProperty('--foil-x', `${x * 100}%`);
      foilRef.current?.style.setProperty('--foil-y', `${y * 100}%`);
    });
  }, [activeBorder, activeShadow, reducedMotion]);

  const resetTilt = useCallback(() => {
    touchActiveRef.current = false;
    pendingPointerRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);

    const card = cardRef.current;
    if (!card) return;
    foilRef.current?.style.setProperty('--foil-x', '50%');
    foilRef.current?.style.setProperty('--foil-y', '22%');

    const clearInlineTilt = () => {
      card.style.removeProperty('transition');
      card.style.removeProperty('transform');
      card.style.removeProperty('border-color');
      card.style.removeProperty('box-shadow');
    };

    if (reducedMotion) {
      // Przy zmianie preferencji resetuj bez animacji i bez pozostawiania timera.
      clearInlineTilt();
      return;
    }

    card.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms ease, box-shadow 200ms ease';
    card.style.transform = 'none';
    card.style.borderColor = restBorder;
    card.style.boxShadow = restShadow;

    releaseTimerRef.current = setTimeout(() => {
      clearInlineTilt();
      releaseTimerRef.current = null;
    }, 300);
  }, [reducedMotion, restBorder, restShadow]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && !touchActiveRef.current) return;
    scheduleTilt(event.clientX, event.clientY);
  }, [scheduleTilt]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || reducedMotion) return;
    touchActiveRef.current = true;
    scheduleTilt(event.clientX, event.clientY);
  }, [reducedMotion, scheduleTilt]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') resetTilt();
  }, [resetTilt]);

  useEffect(() => {
    if (reducedMotion) resetTilt();
  }, [reducedMotion, resetTilt]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
  }, []);

  const handlers = useMemo<CardTiltHandlers>(() => ({
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onPointerLeave: resetTilt,
  }), [onPointerMove, onPointerDown, onPointerUp, resetTilt]);

  return { cardRef, foilRef, handlers };
}
