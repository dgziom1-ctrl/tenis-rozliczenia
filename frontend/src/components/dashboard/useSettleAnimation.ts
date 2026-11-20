import { useState, useRef, useEffect, useCallback } from 'react';
import { SETTLED_THRESHOLD } from '@/constants';

/**
 * Stany animacji karty wokół zmiany salda: błysk przy zmianie kwoty, „rozliczanie"
 * po wpłacie domykającej dług i pieczątka „rozliczony" po jego domknięciu.
 */
export function useSettleAnimation(debt: number, reducedMotion: boolean) {
  const [flash, setFlash] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [settling, setSettling] = useState(false);
  const prevDebt = useRef(debt);

  useEffect(() => {
    if (prevDebt.current === debt) return undefined;
    setFlash(true);
    prevDebt.current = debt;
    const t = setTimeout(() => setFlash(false), 750);
    return () => clearTimeout(t);
  }, [debt]);

  useEffect(() => {
    if (!justCleared) return undefined;
    const t = setTimeout(() => setJustCleared(false), 2800);
    return () => clearTimeout(t);
  }, [justCleared]);

  // Pieczątka pojawia się dopiero, gdy licznik naprawdę dojechał do zera.
  // Wcześniej timer startował w momencie zapisu i po 850 ms nakładał
  // „ROZLICZONY” na jeszcze animującą się kwotę (0,07 zł).
  useEffect(() => {
    if (!settling || debt > SETTLED_THRESHOLD) return undefined;
    const t = setTimeout(() => {
      setSettling(false);
      setJustCleared(true);
      // Dźwięk przy płatności gra już wcześniej (COIN) — drugi byłby nadmiarowy.
    }, reducedMotion ? 0 : 900);
    return () => clearTimeout(t);
  }, [settling, debt, reducedMotion]);

  /** Wpłata domknęła dług: licznik zjeżdża do zera, pieczątka czeka na efekt wyżej. */
  const startSettling = useCallback(() => {
    setJustCleared(false);
    setSettling(true);
  }, []);

  /** Cofnięcie wpłaty zrywa animację rozliczenia. */
  const resetSettling = useCallback(() => {
    setSettling(false);
    setJustCleared(false);
  }, []);

  return { flash, settling, justCleared, startSettling, resetSettling };
}
