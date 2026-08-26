import { useState, useRef, useEffect, useId, type MouseEvent } from 'react';
import { RANKS } from '@/constants';
import { FONT, CLIP } from '../../constants/styles';
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
  const col = rank.hex || 'var(--co-dim)';
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
          padding: '2px 7px 2px 4px',
          background: `${col}10`, border: `1px solid ${col}30`,
          clipPath: CLIP.badge,
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '0.65rem' }}>{rank.emoji}</span>
        <span style={{ ...FONT.display('0.75rem', '0.08em'), color: col }}>
          {rank.name}
        </span>
        <span style={{ ...FONT.monoTiny, color: col, opacity: 0.55 }}>
          {pct}%
        </span>
      </button>
      {/* Tap hint — visible "?" label until first tap */}
      {showHint && !tapped && (
        <span aria-hidden="true" style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          color: col, opacity: 0.7,
          letterSpacing: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}>
          ?
        </span>
      )}
      {visible && (
        <div id={tooltipId} role="status" style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
          background: 'var(--co-void)',
          border: `1px solid ${col}50`,
          padding: '6px 10px',
          zIndex: 50,
          whiteSpace: 'nowrap',
          clipPath: CLIP.tag,
          boxShadow: `0 0 12px ${col}30`,
          animation: 'slide-in-up 0.15s ease-out',
        }}>
          <p style={{ ...FONT.display('0.72rem', '0.08em'), color: col, margin: 0 }}>
            {rank.emoji} {rank.name} · {rank.min}%+
          </p>
          {nextRank ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', margin: '3px 0 0' }}>
              do {nextRank.emoji} {nextRank.name}: <span style={{ color: nextRank.hex }}>+{Math.max(0, nextRank.min - pct)}%</span>
            </p>
          ) : (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: col, margin: '3px 0 0' }}>
              ★ to jest max ranga
            </p>
          )}
        </div>
      )}
    </div>
  );
}
