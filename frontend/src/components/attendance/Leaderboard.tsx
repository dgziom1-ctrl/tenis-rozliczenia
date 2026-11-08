import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { getRank } from '@/constants';
import { FONT, TEXT, CLIP, PANEL } from '../../constants/styles';
import { SectionHeader } from '../common/SharedUI';
import StreakBadge from './StreakBadge';
import RankGlyph from '../common/icons/RankGlyph';
import Podium from './Podium';
import type { PodiumEntry } from './PodiumCard';
import type { RankedPlayer } from '@/types/ui';

interface LeaderboardRowProps {
  player: RankedPlayer;
  place: number;
  onClick: () => void;
}

// ─── Leaderboard row ─────────────────────────────────────────────
function placeAccent(place: number): { color: string; glow: string } {
  if (place === 1) return { color: 'var(--co-gold)', glow: 'var(--glow-gold-md)' };
  if (place === 2) return { color: 'var(--co-silver)', glow: 'none' };
  if (place === 3) return { color: 'var(--co-bronze)', glow: 'none' };
  return { color: 'var(--co-text)', glow: 'none' };
}

function LeaderboardRow({ player, place, onClick }: LeaderboardRowProps) {
  const rank = getRank(player.attendancePercentage);
  const isTop3 = place <= 3;
  const accent = placeAccent(place);

  return (
    <li style={{ listStyle: 'none', marginBottom: 3 }}>
    <button
      type="button"
      className={`leaderboard-row ${isTop3 ? 'top3' : 'rest'}`}
      // Tło żyje w `.leaderboard-row.top3` / `.rest` w index.css — inline
      // przegrywało z nadpisaniem `!important` dla trybu jasnego, które
      // zrównywało wszystkie wiersze i wyróżnienie podium znikało.
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 44, padding: '10px 14px',
        border: `1px solid ${isTop3 ? 'var(--co-tint-line)' : 'var(--co-border)'}`,
        width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', margin: 0,
        clipPath: CLIP.card,
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <span style={{
        ...FONT.mono(TEXT.small),
        color: isTop3 ? accent.color : 'var(--co-text)',
        width: 28, flexShrink: 0,
      }}>
        {String(place).padStart(2, '0')}.
      </span>
      <RankGlyph rank={rank} size={16} />
      <span style={{
        ...FONT.display(TEXT.lead), flex: 1, minWidth: 0,
        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        color: isTop3 ? 'var(--co-text-hi)' : 'var(--co-text)',
      }}>{player.name}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
        <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>
          {player.attendanceCount}/{player.eligibleWeeks}
        </span>
        {/* Frekwencja to najważniejsza liczba w rankingu — poza podium szła
            w --co-dim, który miał 2:1 kontrastu i był najmniej czytelnym
            elementem na ekranie. */}
        <span style={{
          ...FONT.display(TEXT.h3),
          color: isTop3 ? accent.color : 'var(--co-text-hi)',
          minWidth: 56, textAlign: 'right',
          textShadow: isTop3 ? accent.glow : 'none',
        }}>
          {player.attendancePercentage}%
        </span>
      </span>
    </button>
    </li>
  );
}

interface LeaderboardProps {
  ranked: RankedPlayer[];
  podiumPlayers: PodiumEntry[];
  onSelect: (name: string) => void;
  /** Wybrany sezon (np. „2026") albo `null` dla wszystkich sesji. */
  seasonLabel?: string | null;
}

// ─── Full leaderboard ─────────────────────────────────────────────
export default function Leaderboard({ ranked, podiumPlayers, onSelect, seasonLabel = null }: LeaderboardProps) {
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
        <SectionHeader icon={TrendingUp} title="Ranking" sub={seasonLabel ? `frekwencja · sezon ${seasonLabel}` : 'frekwencja · wszystkie sesje'} />
        <Podium podiumPlayers={podiumPlayers} onSelect={onSelect} />
        {theRest.length > 0 && (
          <ul aria-label="Pozostali gracze w rankingu" style={{ listStyle: 'none', margin: 0, padding: '14px 0 0', borderTop: '1px solid var(--co-border)' }}>
            {theRest.map(player => (
              <LeaderboardRow key={player.name} player={player} place={player.place} onClick={() => onSelect(player.name)} />
            ))}
          </ul>
        )}
        {ranked.length === 0 && (
          <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', textAlign: 'center', padding: '40px 0' }}>
            Brak danych — dodaj sesję, żeby zobaczyć ranking.
          </p>
        )}
      </div>
    </div>
  );
}
