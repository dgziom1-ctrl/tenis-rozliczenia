import { useRef, useCallback } from 'react';
import { SOUND_TYPES } from '../constants';

export function useAudio(isMuted, theme = 'cyber') {
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

  // ─── CYBER PUNK ────────────────────────────────────────────────────────────
  const playCyber = useCallback((ctx, type) => {
    const osc = ctx.createOscillator();
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
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case SOUND_TYPES.CLICK:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
        break;

      case SOUND_TYPES.SUCCESS:
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;

      case SOUND_TYPES.DELETE:
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case SOUND_TYPES.COIN: {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(987, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1318, now + 0.12);
        gain2.gain.setValueAtTime(0.14, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.35);
        break;
      }
      default:
        console.warn(`Unknown sound type: ${type}`);
    }
  }, []);

  // ─── ARCANE RETRO (chiptune / old-school arcade) ───────────────────────────
  const playArcade = useCallback((ctx, type) => {
    const now = ctx.currentTime;

    switch (type) {
      case SOUND_TYPES.TAB: {
        // Retro two-blip "bloop bloop"
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.connect(g1); g1.connect(ctx.destination);
        o1.type = 'triangle';
        o1.frequency.setValueAtTime(523, now);
        g1.gain.setValueAtTime(0.08, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        o1.start(now); o1.stop(now + 0.06);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(698, now + 0.07);
        g2.gain.setValueAtTime(0.08, now + 0.07);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        o2.start(now + 0.07); o2.stop(now + 0.13);
        break;
      }

      case SOUND_TYPES.CLICK: {
        // Short punchy triangle click
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(1046, now);
        o.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        g.gain.setValueAtTime(0.07, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        o.start(now); o.stop(now + 0.04);
        break;
      }

      case SOUND_TYPES.SUCCESS: {
        // Classic "level up" chiptune fanfare C5-E5-G5-C6
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle';
          const t = now + i * 0.1;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.1, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          o.start(t); o.stop(t + 0.12);
        });
        break;
      }

      case SOUND_TYPES.DELETE: {
        // "Game over" descending bloop
        const notes = [392, 330, 262, 196];
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle';
          const t = now + i * 0.09;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.09, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          o.start(t); o.stop(t + 0.1);
        });
        break;
      }

      case SOUND_TYPES.COIN: {
        // Classic coin pickup — two ascending triangle tones
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.connect(g1); g1.connect(ctx.destination);
        o1.type = 'triangle';
        o1.frequency.setValueAtTime(1047, now);
        g1.gain.setValueAtTime(0.12, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        o1.start(now); o1.stop(now + 0.12);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(1319, now + 0.1);
        g2.gain.setValueAtTime(0.14, now + 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        o2.start(now + 0.1); o2.stop(now + 0.3);
        break;
      }

      default:
        console.warn(`Unknown sound type: ${type}`);
    }
  }, []);

  // ─── ZEN (soft, calming, bell / marimba-like) ──────────────────────────────
  const playZen = useCallback((ctx, type) => {
    const now = ctx.currentTime;

    // Soft sine bell: quick attack, long smooth decay
    const bell = (freq, gainVal, startAt, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(gainVal, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.05);
    };

    switch (type) {
      case SOUND_TYPES.TAB:
        // Single soft singing-bowl tone
        bell(528, 0.07, now, 0.6);
        break;

      case SOUND_TYPES.CLICK:
        // Gentle high-pitched tap
        bell(1320, 0.05, now, 0.25);
        break;

      case SOUND_TYPES.SUCCESS:
        // Peaceful ascending pentatonic chime (C D E G A)
        [528, 660, 792, 880, 1056].forEach((freq, i) => {
          bell(freq, 0.08, now + i * 0.14, 0.55);
        });
        break;

      case SOUND_TYPES.DELETE:
        // Soft low descending — gentle gong fade
        bell(330, 0.07, now, 0.8);
        bell(247, 0.05, now + 0.22, 0.9);
        break;

      case SOUND_TYPES.COIN:
        // Marimba-like two-note ding
        bell(880, 0.09, now, 0.5);
        bell(1108, 0.09, now + 0.16, 0.6);
        break;

      default:
        console.warn(`Unknown sound type: ${type}`);
    }
  }, []);

  // ─── HAPTIC FEEDBACK ───────────────────────────────────────────────────────
  const vibrate = useCallback((type) => {
    if (!navigator.vibrate) return;
    switch (type) {
      case SOUND_TYPES.COIN:
        // Radosne podwójne uderzenie — "zapłacił!"
        navigator.vibrate([60, 40, 120]);
        break;
      case SOUND_TYPES.SUCCESS:
        // Trzy krótkie — "sukces"
        navigator.vibrate([50, 30, 50, 30, 100]);
        break;
      case SOUND_TYPES.DELETE:
        // Jedno długie — "ostrzeżenie"
        navigator.vibrate([180]);
        break;
      case SOUND_TYPES.CLICK:
        // Ledwo wyczuwalne — subtelny tap
        navigator.vibrate([20]);
        break;
      case SOUND_TYPES.TAB:
        // Bardzo krótki tick przy zmianie taba
        navigator.vibrate([15]);
        break;
      default:
        break;
    }
  }, []);

  // ─── DISPATCHER ────────────────────────────────────────────────────────────
  const playSound = useCallback(async (type) => {
    if (isMuted) return;

    // Haptic feedback niezależny od wyciszenia dźwięku
    vibrate(type);

    try {
      const ctx = await initAudioContext();

      if (theme === 'arcade') {
        playArcade(ctx, type);
      } else if (theme === 'zen') {
        playZen(ctx, type);
      } else {
        playCyber(ctx, type);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [isMuted, theme, initAudioContext, playCyber, playArcade, playZen, vibrate]);

  return { playSound };
}
