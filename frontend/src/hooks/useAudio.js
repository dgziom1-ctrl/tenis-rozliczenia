import { useRef, useCallback } from 'react';
import { SOUND_TYPES } from '../constants';

// iOS Safari wymaga że AudioContext zostanie stworzony/zresumed
// BEZPOŚREDNIO w synchronicznym event handlerze (np. onClick).
// Przez to nie możemy używać `await` przed ctx.resume() —
// iOS blokuje audio jeśli pomiędzy gestem użytkownika a wywołaniem
// jest jakakolwiek asynchroniczna przerwa.
//
// Rozwiązanie: resume() wywołujemy synchronicznie, a samo granie
// odkładamy na minimalny setTimeout żeby dać czas na resume.

export function useAudio(isMuted) {
  const audioContextRef = useRef(null);

  const getOrCreateContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    return audioContextRef.current;
  }, []);

  const playCyber = useCallback((ctx, type) => {
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      switch (type) {
        case SOUND_TYPES.TAB:
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now); osc.stop(now + 0.05);
          break;

        case SOUND_TYPES.CLICK:
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.start(now); osc.stop(now + 0.03);
          break;

        case SOUND_TYPES.SUCCESS:
          osc.type = 'square';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(554.37, now + 0.1);
          osc.frequency.setValueAtTime(659.25, now + 0.2);
          osc.frequency.setValueAtTime(880, now + 0.3);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.4);
          osc.start(now); osc.stop(now + 0.4);
          break;

        case SOUND_TYPES.DELETE:
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now); osc.stop(now + 0.3);
          break;

        case SOUND_TYPES.COIN: {
          const osc2  = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2); gain2.connect(ctx.destination);

          osc.type = 'square';
          osc.frequency.setValueAtTime(987, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now); osc.stop(now + 0.15);

          osc2.type = 'square';
          osc2.frequency.setValueAtTime(1318, now + 0.12);
          gain2.gain.setValueAtTime(0.14, now + 0.12);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc2.start(now + 0.12); osc2.stop(now + 0.35);
          break;
        }

        case SOUND_TYPES.RANK1: {
          const freqs = [523, 659, 784, 1047];
          freqs.forEach((freq, i) => {
            const o  = ctx.createOscillator();
            const g2 = ctx.createGain();
            o.connect(g2); g2.connect(ctx.destination);
            o.type = 'square';
            o.frequency.setValueAtTime(freq, now + i * 0.1);
            g2.gain.setValueAtTime(0.12, now + i * 0.1);
            g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.18);
            o.start(now + i * 0.1);
            o.stop(now + i * 0.1 + 0.18);
          });
          break;
        }

        case SOUND_TYPES.ERROR: {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.25);
          osc.start(now); osc.stop(now + 0.25);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      // Ciche porzucenie — audio to feature enhancement, nie krytyczna funkcja
      console.warn('Audio playback failed:', err);
    }
  }, []);

  const vibrate = useCallback((type) => {
    // navigator.vibrate nie istnieje na iOS — sprawdzamy przed wywołaniem
    if (!navigator.vibrate) return;
    switch (type) {
      case SOUND_TYPES.COIN:    navigator.vibrate([60, 40, 120]);         break;
      case SOUND_TYPES.SUCCESS: navigator.vibrate([50, 30, 50, 30, 100]); break;
      case SOUND_TYPES.DELETE:  navigator.vibrate([180]);                 break;
      case SOUND_TYPES.CLICK:   navigator.vibrate([20]);                  break;
      case SOUND_TYPES.TAB:     navigator.vibrate([15]);                  break;
      default: break;
    }
  }, []);

  const playSound = useCallback((type) => {
    if (isMuted) return;
    vibrate(type);

    const ctx = getOrCreateContext();
    if (!ctx) return;

    // iOS: resume() musi być wywołane synchronicznie podczas event handlera.
    // Jeśli kontekst jest suspended (typowe na iOS przed pierwszym gestem),
    // wznawiamy synchronicznie i gramy po minimalnym opóźnieniu.
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        // Po resume gramy z małym offsetem żeby currentTime zdążył się zaktualizować
        setTimeout(() => playCyber(ctx, type), 20);
      }).catch(() => {});
    } else {
      playCyber(ctx, type);
    }
  }, [isMuted, getOrCreateContext, playCyber, vibrate]);

  return { playSound };
}
