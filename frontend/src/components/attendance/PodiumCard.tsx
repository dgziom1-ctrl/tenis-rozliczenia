import { useState, useEffect } from 'react';
import { FONT, TEXT, TRACK, CLIP } from '../../constants/styles';
import StreakBadge from './StreakBadge';
import type { RankedPlayer } from '@/types/ui';

/** Jedno miejsce na podium — kilku graczy, gdy remis (ex aequo). */
export interface PodiumEntry {
  place: number;
  players: RankedPlayer[];
}

interface PlaceStyle {
  border: string;
  glow: string;
  bg: string;
  height: number;
  label: string;
  medal: string;
}

/**
 * Podium czytało z własnej palety neonów (`#00FFFF` — nawet nie z tego samego
 * cyanu co marka, bo ten to `#00E5FF`), więc w trybie jasnym wszystkie trzy
 * miejsca zostawały jaskrawe na białym tle. Teraz jadą tokenami, a kolejność
 * niesie znaczenie medalu: akcent → neutralne srebro → brąz.
 */
const PLACE_STYLES: Record<number, PlaceStyle> = {
  1: { border: 'var(--co-cyan)',    glow: 'var(--glow-box-cyan)', bg: 'var(--co-tint-hi)', height: 130, label: '#1', medal: '🥇' },
  2: { border: 'var(--co-text-hi)', glow: 'none',                 bg: 'var(--co-tint)',    height: 90,  label: '#2', medal: '🥈' },
  3: { border: 'var(--co-amber)',   glow: 'none',                 bg: 'var(--co-amber-dim)', height: 62, label: '#3', medal: '🥉' },
};

interface PodiumCardProps {
  podiumEntry: PodiumEntry;
  onSelect: (name: string) => void;
}

// ─── Podium Card ─────────────────────────────────────────────────
export default function PodiumCard({ podiumEntry, onSelect }: PodiumCardProps) {
  const players = podiumEntry.players;
  const exAequo = players.length > 1;
  const [shimmerKey, setShimmerKey] = useState(0);

  const s = PLACE_STYLES[podiumEntry.place] || PLACE_STYLES[3];

  useEffect(() => {
    const hitCount = { n: 0 };
    const onHit = () => {
      hitCount.n += 1;
      if (hitCount.n % 2 === 0) setShimmerKey(k => k + 1);
    };
    window.addEventListener('paddleHit', onHit);
    return () => window.removeEventListener('paddleHit', onHit);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 'min(100%, 190px)', minWidth: 0 }}>
      {players.map(player => (
          <div key={player.name} role="button" tabIndex={0} onClick={() => onSelect(player.name)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(player.name); } }} style={{
            width: '100%', padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
            background: s.bg,
            border: `1px solid ${s.border}`,
            marginBottom: 6,
            clipPath: CLIP.smallCard,
            position: 'relative', overflow: 'hidden',
            boxShadow: s.glow,
          }}>
            {/* Top stripe */}
            <div aria-hidden="true" style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: s.border,
            }} />
            {/* Shimmer — synced to paddle hit for all 3 places */}
            <div
              key={shimmerKey}
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(105deg, transparent 20%, var(--co-tint-hi) 50%, transparent 80%)',
                animation: shimmerKey > 0 ? 'gold-shimmer 3s ease-out forwards' : 'none',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div aria-hidden="true" style={{ fontSize: TEXT.h2, marginBottom: 6 }}>{s.medal}</div>
              {/* Nazwa nie miała żadnego zabezpieczenia przed przepełnieniem, a
                  karta ma `overflow: hidden` — dłuższe imię było ucinane
                  w połowie znaku, zamiast dostać wielokropek. */}
              <div style={{
                ...FONT.display(TEXT.h3, TRACK.tight), color: s.border, marginBottom: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {player.name}
              </div>
              <div style={{
                ...FONT.display(TEXT.h2, TRACK.tight),
                color: s.border, lineHeight: 1,
                textShadow: 'var(--glow-cyan-md)',
              }}>
                {player.attendancePercentage}%
              </div>
              <div style={{ ...FONT.monoSmall, marginTop: 4, marginBottom: 6, letterSpacing: TRACK.normal }}>
                {player.attendanceCount}/{player.eligibleWeeks} SESJI
              </div>
              {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
            </div>
          </div>
      ))}
      {/* Podium plinth */}
      <div style={{
        width: '100%', height: s.height,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderBottom: `3px solid ${s.border}`,
        boxShadow: s.glow,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient scan */}
        {podiumEntry.place === 1 && <div aria-hidden="true" style={{
          position: 'absolute', left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent, ${s.border}, transparent)`,
          animation: 'podium-scan 2.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />}
        <span style={{
          ...FONT.display(TEXT.h2, TRACK.wide), color: s.border,
          textShadow: 'var(--glow-cyan-md)',
        }}>{s.label}</span>
        {/* Etykieta remisu siedziała między kartami a podestem, więc kolumna
            z remisem rosła wyżej od pierwszego miejsca i podium wizualnie się
            odwracało. Teraz jest w podeście, który ma stałą wysokość. */}
        {exAequo && (
          <span style={{ ...FONT.monoSmall, letterSpacing: TRACK.wide, textAlign: 'center' }}>
            EX AEQUO ×{players.length}
          </span>
        )}
      </div>
    </div>
  );
}
