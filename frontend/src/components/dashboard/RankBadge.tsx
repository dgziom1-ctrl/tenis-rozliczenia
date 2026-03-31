import { useState, useRef, useEffect } from 'react';
import { RANKS } from '@/constants';
import { FONT, CLIP } from '../../constants/styles';

// ── Rank badge ───────────────────────────────────────────────────
export function RankBadge({ rank, pct, showHint = true }) {
  const col = rank.hex || 'var(--co-dim)';
  const rankIdx = RANKS.findIndex(r => r.name === rank.name);
  const nextRank = rankIdx > 0 ? RANKS[rankIdx - 1] : null;
  const [visible, setVisible] = useState(false);
  const [tapped, setTapped] = useState(false);
  const timerRef = useRef(null);

  const handleTap = (e) => {
    e.stopPropagation();
    setTapped(true);
    clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2500);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <div
        onClick={handleTap}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px 2px 4px',
          background: `${col}10`, border: `1px solid ${col}30`,
          clipPath: CLIP.badge,
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '0.65rem' }}>{rank.emoji}</span>
        <span style={{ ...FONT.display('0.75rem', '0.08em'), color: col }}>
          {rank.name}
        </span>
        <span style={{ ...FONT.monoTiny, color: col, opacity: 0.55 }}>
          {pct}%
        </span>
      </div>
      {/* Tap hint — visible "?" label until first tap */}
      {showHint && !tapped && (
        <span style={{
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
        <div style={{
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
