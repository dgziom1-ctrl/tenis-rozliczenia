import { useState, useEffect } from 'react';
import { FONT, TEXT, TRACK, CLIP } from '../../constants/styles';
import StreakBadge from './StreakBadge';
import MedalGlyph from '../common/icons/MedalGlyph';
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
  cardHeight: number;
  label: string;
}

/**
 * Kolory medalów: złoto / srebro / brąz — nie cyan na pierwszym miejscu.
 */
const PLACE_STYLES: Record<number, PlaceStyle> = {
  1: { border: 'var(--co-gold)',    glow: 'var(--glow-box-gold)', bg: 'var(--co-gold-dim)',    height: 130, cardHeight: 146, label: '#1' },
  2: { border: 'var(--co-silver)',  glow: 'none',                 bg: 'var(--co-tint)',        height: 90,  cardHeight: 126, label: '#2' },
  3: { border: 'var(--co-bronze)',  glow: 'none',                 bg: 'var(--co-tint-bronze)', height: 62,  cardHeight: 112, label: '#3' },
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

  const openPlayer = (player: RankedPlayer) => {
    onSelect(player.name);
  };

  return (
    <div className="podium-column" data-podium-place={podiumEntry.place} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 'min(100%, 190px)', minWidth: 0 }}>
      <div style={{
        width: '100%', minHeight: s.cardHeight, padding: exAequo ? '10px 8px' : '14px 10px',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        background: s.bg,
        border: `1px solid ${s.border}`,
        marginBottom: 6,
        clipPath: CLIP.smallCard,
        position: 'relative', overflow: 'hidden',
        boxShadow: s.glow,
        // Bez remisu cała karta jest jednym przyciskiem otwierającym modal.
        // Przy remisie klikalne są poszczególne wiersze graczy.
        cursor: exAequo ? 'default' : 'pointer',
      }}
        role={exAequo ? undefined : 'button'}
        tabIndex={exAequo ? undefined : 0}
        aria-label={exAequo ? undefined : `${players[0].name}, ${players[0].attendancePercentage}% frekwencji, miejsce ${podiumEntry.place}`}
        onClick={exAequo ? undefined : () => openPlayer(players[0])}
        onKeyDown={exAequo ? undefined : e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPlayer(players[0]);
          }
        }}
      >
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

        {exAequo ? (
          // Remis: jeden blok na miejsce, gracze w zwartych wierszach. Wcześniej
          // każdy remisujący dostawał pełną kartę, więc kolumna #3 rosła wyżej
          // od #1 i nachodziła na dolną nawigację.
          <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', lineHeight: 1, marginBottom: 4 }}>
              <MedalGlyph place={podiumEntry.place} size={17} />
            </div>
            {players.map((player, index) => (
              <div
                key={player.name}
                role="button"
                tabIndex={0}
                aria-label={`${player.name}, ${player.attendancePercentage}% frekwencji, miejsce ${podiumEntry.place}`}
                onClick={() => openPlayer(player)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPlayer(player);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', minHeight: 44, padding: '3px 2px',
                  borderTop: index === 0 ? 'none' : '1px solid var(--co-separator)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    ...FONT.display(TEXT.small, TRACK.tight), color: s.border,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {player.name}
                  </div>
                  <div style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', lineHeight: 1.2 }}>
                    {player.attendanceCount}/{player.eligibleWeeks}
                  </div>
                </div>
                <span style={{ ...FONT.display(TEXT.lead, TRACK.tight), color: s.border, flexShrink: 0 }}>
                  {player.attendancePercentage}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <MedalGlyph place={podiumEntry.place} size={24} />
            </div>
            {/* Nazwa nie miała żadnego zabezpieczenia przed przepełnieniem, a
                karta ma `overflow: hidden` — dłuższe imię było ucinane
                w połowie znaku, zamiast dostać wielokropek. */}
            <div style={{
              ...FONT.display(TEXT.h3, TRACK.tight), color: s.border, marginBottom: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {players[0].name}
            </div>
            <div style={{
              ...FONT.display(TEXT.h2, TRACK.tight),
              color: s.border, lineHeight: 1,
              textShadow: podiumEntry.place === 1 ? 'var(--glow-gold-md)' : 'none',
            }}>
              {players[0].attendancePercentage}%
            </div>
            <div style={{ ...FONT.monoSmall, marginTop: 4, marginBottom: 6, letterSpacing: TRACK.normal }}>
              {players[0].attendanceCount}/{players[0].eligibleWeeks} sesji
            </div>
            {players[0].currentStreak >= 2 && <StreakBadge streak={players[0].currentStreak} />}
          </div>
        )}
      </div>
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
          textShadow: podiumEntry.place === 1 ? 'var(--glow-gold-md)' : 'none',
        }}>{s.label}</span>
        {/* Etykieta remisu siedziała między kartami a podestem, więc kolumna
            z remisem rosła wyżej od pierwszego miejsca i podium wizualnie się
            odwracało. Teraz jest w podeście, który ma stałą wysokość. */}
        {exAequo && (
          <span style={{
            ...FONT.monoSmall, fontSize: '0.75rem', letterSpacing: TRACK.tight,
            textAlign: 'center', whiteSpace: 'nowrap', lineHeight: 1.1,
          }}>
            remis ×{players.length}
          </span>
        )}
      </div>
    </div>
  );
}
