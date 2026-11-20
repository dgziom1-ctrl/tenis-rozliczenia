import { useState, useRef, useEffect, useId, type MouseEvent } from 'react';
import { RANKS, rankTint } from '@/constants';
import { FONT, CLIP, Z, TEXT } from '../../constants/styles';
import RankGlyph from '../common/icons/RankGlyph';
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
  // `hex` to token motywu (`var(--rank-*)`) — dlatego krycie liczy `rankTint`,
  // a nie dopisek alfy. Zapasowy kolor nie istnieje: `hex` jest wymagane
  // w typie i ustawione w każdej randze.
  const col = rank.hex;
  const rankIdx = RANKS.findIndex(r => r.name === rank.name);
  const nextRank = rankIdx > 0 ? RANKS[rankIdx - 1] : null;
  const [visible, setVisible] = useState(false);
  const [tapped, setTapped] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const handleTap = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setTapped(true);
    clearTimeout(timerRef.current ?? undefined);
    setVisible(true);
    // Dymek zamyka się sam tylko na dotyku; mysz i klawiatura trzymają go do
    // blur / Escape / kliknięcia poza (WCAG 1.4.13 — odrzucalny i trwały).
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (touch) timerRef.current = setTimeout(() => setVisible(false), HINT_VISIBLE_MS);
  };

  useEffect(() => () => clearTimeout(timerRef.current ?? undefined), []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !rootRef.current?.contains(e.target)) setVisible(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [visible]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {/* <button>, a nie <div onClick> — dymek z progiem następnej rangi
          był wcześniej nieosiągalny z klawiatury. */}
      <button
        type="button"
        onClick={handleTap}
        aria-expanded={visible}
        aria-controls={visible ? tooltipId : undefined}
        aria-label={`${rank.name} ${pct}% — ranga, ${nextRank ? 'pokaż próg następnej rangi' : 'najwyższa ranga'}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 6px 2px 4px',
          background: rankTint(rank, 6), border: `1px solid ${rankTint(rank, 19)}`,
          clipPath: CLIP.badge,
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <RankGlyph rank={rank} size={13} />
        <span style={{ ...FONT.display(TEXT.tiny), color: col }}>
          {rank.name}
        </span>
        {/* Bez `opacity`: procent to treść, a półprzezroczysty tekst na szkle
            schodził poniżej 4,5:1 (w jasnym motywie nawet do 3,6:1). */}
        <span style={{ ...FONT.monoMicro, color: col }}>
          {pct}%
        </span>
      </button>
      {/* Tap hint — visible "?" label until first tap */}
      {showHint && !tapped && (
        <span aria-hidden="true" style={{
          ...FONT.mono(TEXT.tiny),
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
          border: `1px solid ${rankTint(rank, 31)}`,
          padding: '6px 10px',
          zIndex: Z.popover,
          whiteSpace: 'nowrap',
          clipPath: CLIP.tag,
          boxShadow: 'var(--glow-box-cyan)',
          animation: 'slide-in-up 0.15s ease-out',
        }}>
          <p style={{ ...FONT.display(TEXT.tiny), color: col, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RankGlyph rank={rank} size={12} /> {rank.name} · {rank.min}%+
          </p>
          {nextRank ? (
            <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
              do <RankGlyph rank={nextRank} size={11} /> {nextRank.name}: <span style={{ color: nextRank.hex }}>+{Math.max(0, nextRank.min - pct)}%</span>
            </p>
          ) : (
            <p style={{ ...FONT.mono(TEXT.tiny), color: col, margin: '3px 0 0' }}>
              ★ to jest max ranga
            </p>
          )}
        </div>
      )}
    </div>
  );
}
