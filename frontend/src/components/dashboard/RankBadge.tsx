import { useState, useRef, useEffect, useId, type MouseEvent } from 'react';
import { RANKS } from '@/constants';
import { FONT, CLIP, Z, TEXT, TRACK } from '../../constants/styles';
import type { Rank } from '@/types/ui';

/** Jak długo wisi dymek z progiem następnej rangi. */
const HINT_VISIBLE_MS = 2500;

interface RankBadgeProps {
  rank: Rank;
  pct: number;
  showHint?: boolean;
}

// ── Rank badge ───────────────────────────────────────────────────
export function RankBadge({ rank, pct, showHint = true }: RankBadgeProps) {
  // Bez zapasowego `var(--co-dim)`: `col` jedzie dalej jako `${col}30`, a token
  // z dopiskiem krycia daje `var(--co-dim)30` — deklarację nieprawidłową po
  // podstawieniu zmiennej. `hex` jest wymagane w typie i ustawione w każdej
  // randze, więc zapas był i tak martwy, a tylko czekał na wywrotkę.
  const col = rank.hex;
  const rankIdx = RANKS.findIndex(r => r.name === rank.name);
  const nextRank = rankIdx > 0 ? RANKS[rankIdx - 1] : null;
  const [visible, setVisible] = useState(false);
  const [tapped, setTapped] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const handleTap = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setTapped(true);
    clearTimeout(timerRef.current ?? undefined);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), HINT_VISIBLE_MS);
  };

  useEffect(() => () => clearTimeout(timerRef.current ?? undefined), []);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {/* <button>, a nie <div onClick> — dymek z progiem następnej rangi
          był wcześniej nieosiągalny z klawiatury. */}
      <button
        type="button"
        onClick={handleTap}
        aria-expanded={visible}
        aria-controls={visible ? tooltipId : undefined}
        aria-label={`Ranga ${rank.name}, ${pct}% frekwencji — pokaż próg następnej rangi`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 6px 2px 4px',
          background: `${col}10`, border: `1px solid ${col}30`,
          clipPath: CLIP.badge,
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: TEXT.tiny }}>{rank.emoji}</span>
        <span style={{ ...FONT.display(TEXT.tiny, TRACK.tight), color: col }}>
          {rank.name}
        </span>
        <span style={{ ...FONT.monoMicro, color: col, opacity: 0.75 }}>
          {pct}%
        </span>
      </button>
      {/* Tap hint — visible "?" label until first tap */}
      {showHint && !tapped && (
        <span aria-hidden="true" style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          color: col, opacity: 0.7,
          letterSpacing: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}>
          ?
        </span>
      )}
      {visible && (
        // W dół, nie w górę: odznaka siedzi ~60px od górnej krawędzi karty,
        // a karta ma `overflow: hidden` — dymek otwierany do góry nie miał
        // gdzie się zmieścić i był ucinany.
        <div id={tooltipId} role="status" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: 'var(--co-panel)',
          border: `1px solid ${col}50`,
          padding: '6px 10px',
          zIndex: Z.popover,
          whiteSpace: 'nowrap',
          clipPath: CLIP.tag,
          boxShadow: 'var(--glow-box-cyan)',
          animation: 'slide-in-up 0.15s ease-out',
        }}>
          <p style={{ ...FONT.display(TEXT.tiny, TRACK.tight), color: col, margin: 0 }}>
            {rank.emoji} {rank.name} · {rank.min}%+
          </p>
          {nextRank ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', margin: '3px 0 0' }}>
              do {nextRank.emoji} {nextRank.name}: <span style={{ color: nextRank.hex }}>+{Math.max(0, nextRank.min - pct)}%</span>
            </p>
          ) : (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: col, margin: '3px 0 0' }}>
              ★ to jest max ranga
            </p>
          )}
        </div>
      )}
    </div>
  );
}
