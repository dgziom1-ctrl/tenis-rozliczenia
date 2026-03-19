import { useRef, useCallback } from 'react';
import { SOUND_TYPES } from '../constants';

export function useAudio(isMuted) {
  const audioContextRef = useRef(null);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playCyber = useCallback((ctx, type) => {
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
        // Fanfare — rising 4-note arpeggio
        const freqs = [523, 659, 784, 1047];
        freqs.forEach((freq, i) => {
          const o = ctx.createOscillator();
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
        // Descending buzz — bad password
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
  }, []);

  const vibrate = useCallback((type) => {
    if (!navigator.vibrate) return;
    switch (type) {
      case SOUND_TYPES.COIN:    navigator.vibrate([60, 40, 120]);        break;
      case SOUND_TYPES.SUCCESS: navigator.vibrate([50, 30, 50, 30, 100]); break;
      case SOUND_TYPES.DELETE:  navigator.vibrate([180]);                break;
      case SOUND_TYPES.CLICK:   navigator.vibrate([20]);                 break;
      case SOUND_TYPES.TAB:     navigator.vibrate([15]);                 break;
      default: break;
    }
  }, []);

  const playSound = useCallback(async (type) => {
    if (isMuted) return;
    vibrate(type);
    try {
      const ctx = await initAudioContext();
      playCyber(ctx, type);
    } catch (err) {
      console.error('Audio error:', err);
    }
  }, [isMuted, initAudioContext, playCyber, vibrate]);

  return { playSound };
}
