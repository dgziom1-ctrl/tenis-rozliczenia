import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FONT, TEXT, TRACK } from '@/constants/styles';

const BOOT_KEY = 'cyberponk.boot.v1';
const LINE_MS = 280;
const FADE_MS = 320;

const LINES = [
  'łączenie z bazą…',
  'wczytywanie graczy',
  'liczenie sald',
  'synchronizacja rankingu',
  'system gotowy',
];

/** Raz na sesję przeglądarki. Brak storage (tryb prywatny) = pokaż, nic nie psuje. */
function alreadyBooted(): boolean {
  try { return sessionStorage.getItem(BOOT_KEY) === '1'; } catch { return false; }
}

// ─── Sekwencja startowa ───────────────────────────────────────────
// Czysta dekoracja: nie czeka na dane i nie blokuje ich ładowania.
// Dotknięcie lub klawisz pomija ją natychmiast.
export default function BootSequence() {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(() => import.meta.env.MODE !== 'test' && !alreadyBooted());
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const active = visible && !reducedMotion;

  useEffect(() => {
    if (!active) return undefined;
    try { sessionStorage.setItem(BOOT_KEY, '1'); } catch { /* bez zapisu pokaże się ponownie */ }
    const timers: number[] = [];
    LINES.forEach((_, i) => timers.push(window.setTimeout(() => setCount(i + 1), LINE_MS * (i + 1))));
    timers.push(window.setTimeout(() => setLeaving(true), LINE_MS * (LINES.length + 1)));
    timers.push(window.setTimeout(() => setVisible(false), LINE_MS * (LINES.length + 1) + FADE_MS));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    const skip = () => { setLeaving(true); window.setTimeout(() => setVisible(false), FADE_MS); };
    window.addEventListener('keydown', skip, { once: true });
    return () => window.removeEventListener('keydown', skip);
  }, [active]);

  if (!active) return null;

  const skip = () => { setLeaving(true); window.setTimeout(() => setVisible(false), FADE_MS); };

  // Portal do <body>: `.app-shell` tworzy własny kontekst warstw (z-10), więc
  // bez tego dolny pasek, który też jest portalowany, rysował się nad ekranem.
  return createPortal(
    <div
      className={leaving ? 'boot-overlay boot-overlay-leaving' : 'boot-overlay'}
      aria-hidden="true"
      onPointerDown={skip}
    >
      <div className="boot-scan" />
      <div style={{ position: 'relative', width: 'min(86vw, 360px)' }}>
        <p className="glitch-text" data-text="Cyber-Ponk" style={{ ...FONT.tech(TEXT.hero), color: 'var(--co-cyan)', margin: '0 0 18px' }}>
          Cyber-Ponk
        </p>
        {LINES.slice(0, count).map((line, i) => (
          <p key={line} style={{ ...FONT.mono(TEXT.small), letterSpacing: TRACK.tight, margin: '0 0 6px', color: i === LINES.length - 1 ? 'var(--co-green)' : 'var(--co-text)' }}>
            <span style={{ color: 'var(--co-dim)' }}>&gt; </span>{line}
          </p>
        ))}
        <span className="boot-cursor" />
        <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '22px 0 0' }}>Dotknij, aby pominąć</p>
      </div>
    </div>,
    document.body,
  );
}
