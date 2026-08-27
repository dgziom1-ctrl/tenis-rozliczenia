import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { getRank } from '@/constants';
import { FONT, TEXT, TRACK, CLIP, PANEL } from '../../constants/styles';
import { SectionHeader } from '../common/SharedUI';
import StreakBadge from './StreakBadge';
import Podium from './Podium';
import type { PodiumEntry } from './PodiumCard';
import type { RankedPlayer } from '@/types/ui';

interface LeaderboardRowProps {
  player: RankedPlayer;
  place: number;
  onClick: () => void;
}

// ─── Leaderboard row ─────────────────────────────────────────────
function LeaderboardRow({ player, place, onClick }: LeaderboardRowProps) {
  const rank = getRank(player.attendancePercentage);
  const isTop3 = place <= 3;

  return (
    <div
      className={`leaderboard-row ${isTop3 ? 'top3' : 'rest'}`}
      // Tło żyje w `.leaderboard-row.top3` / `.rest` w index.css — inline
      // przegrywało z nadpisaniem `!important` dla trybu jasnego, które
      // zrównywało wszystkie wiersze i wyróżnienie podium znikało.
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 44, padding: '10px 14px',
        border: `1px solid ${isTop3 ? 'var(--co-tint-line)' : 'var(--co-border)'}`,
        marginBottom: 3,
        clipPath: CLIP.card,
        cursor: 'pointer',
      }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.8125rem',
        color: isTop3 ? 'var(--co-cyan)' : 'var(--co-text)',
        width: 28, flexShrink: 0,
      }}>
        {String(place).padStart(2, '0')}.
      </span>
      <span aria-hidden="true" style={{ fontSize: '1rem', flexShrink: 0 }}>{rank.emoji}</span>
      <span style={{
        ...FONT.display(TEXT.lead, TRACK.tight), flex: 1, minWidth: 0,
        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        color: isTop3 ? 'var(--co-text-hi)' : 'var(--co-text)',
      }}>{player.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
          {player.attendanceCount}/{player.eligibleWeeks}
        </span>
        {/* Frekwencja to najważniejsza liczba w rankingu — poza podium szła
            w --co-dim, który miał 2:1 kontrastu i był najmniej czytelnym
            elementem na ekranie. */}
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.25rem',
          color: isTop3 ? 'var(--co-cyan)' : 'var(--co-text-hi)',
          minWidth: 56, textAlign: 'right',
          textShadow: isTop3 ? 'var(--glow-cyan-md)' : 'none',
        }}>
          {player.attendancePercentage}%
        </span>
      </div>
    </div>
  );
}

interface LeaderboardProps {
  ranked: RankedPlayer[];
  podiumPlayers: PodiumEntry[];
  onSelect: (name: string) => void;
}

// ─── Full leaderboard ─────────────────────────────────────────────
export default function Leaderboard({ ranked, podiumPlayers, onSelect }: LeaderboardProps) {
  const theRest = useMemo(() => ranked.filter(p => p.place > 3), [ranked]);
  return (
    <div style={{
      ...PANEL.cyberCut,
      overflow: 'hidden',
    }}>
      {/* Background grid — siatka startowała od krawędzi panelu, a cała treść
          jest wcięta o 24px z PANEL.cyberCut, więc linie nigdy nie pokrywały
          się z żadną krawędzią i wyrównanie czytało się jak przypadek. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(var(--co-tint) 1px, transparent 1px), linear-gradient(90deg, var(--co-tint) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        backgroundPosition: '24px 24px',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SectionHeader icon={TrendingUp} title="RANKING" sub="frekwencja · wszystkie sesje" />
        <Podium podiumPlayers={podiumPlayers} onSelect={onSelect} />
        {theRest.length > 0 && (
          <div style={{ borderTop: '1px solid var(--co-border)', paddingTop: 14 }}>
            {theRest.map(player => (
              <LeaderboardRow key={player.name} player={player} place={player.place} onClick={() => onSelect(player.name)} />
            ))}
          </div>
        )}
        {ranked.length === 0 && (
          <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', textAlign: 'center', padding: '40px 0' }}>
            {'>'} BRAK DANYCH — dodaj sesje żeby zobaczyć ranking_
          </p>
        )}
      </div>
    </div>
  );
}
