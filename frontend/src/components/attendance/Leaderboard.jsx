import { TrendingUp } from 'lucide-react';
import { getRank } from '../../constants';
import { FONT, CLIP, PANEL } from '../../constants/styles';
import { SectionHeader } from '../common/SharedUI';
import StreakBadge from './StreakBadge';
import Podium from './Podium';

// ─── Leaderboard row ─────────────────────────────────────────────
function LeaderboardRow({ player, totalWeeks, place, onClick }) {
  const rank = getRank(player.attendancePercentage);
  const isTop3 = place <= 3;

  return (
    <div
      className={`leaderboard-row ${isTop3 ? 'top3' : 'rest'}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: isTop3 ? 'rgba(0,229,255,0.025)' : 'transparent',
        border: `1px solid ${isTop3 ? 'rgba(0,229,255,0.18)' : 'var(--co-border)'}`,
        marginBottom: 3,
        clipPath: CLIP.card,
      }}
      onClick={onClick}
    >
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
        color: isTop3 ? 'var(--co-cyan)' : 'var(--co-text)',
        width: 28, flexShrink: 0,
      }}>
        {String(place).padStart(2, '0')}.
      </span>
      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{rank.emoji}</span>
      <span style={{
        ...FONT.display('0.95rem', '0.05em'), flex: 1, minWidth: 0,
        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        color: isTop3 ? 'var(--co-text-hi)' : 'var(--co-text)',
      }}>{player.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)' }}>
          {player.attendanceCount}/{totalWeeks}
        </span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.2rem',
          color: isTop3 ? 'var(--co-cyan)' : 'var(--co-dim)',
          width: 52, textAlign: 'right',
          textShadow: isTop3 ? '0 0 10px rgba(0,229,255,0.4)' : 'none',
        }}>
          {player.attendancePercentage}%
        </span>
      </div>
    </div>
  );
}

// ─── Full leaderboard ─────────────────────────────────────────────
export default function Leaderboard({ ranked, podiumPlayers, totalWeeks, stats, onSelect }) {
  const theRest = ranked.filter(p => p.place > 3);
  return (
    <div style={{
      ...PANEL.cyberCut,
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SectionHeader icon={TrendingUp} title="RANKING" sub="frekwencja · wszystkie sesje" />
        <Podium podiumPlayers={podiumPlayers} totalWeeks={totalWeeks} onSelect={onSelect} />
        {theRest.length > 0 && (
          <div style={{ borderTop: '1px solid var(--co-border)', paddingTop: 14 }}>
            {theRest.map(player => (
              <LeaderboardRow key={player.name} player={player} totalWeeks={totalWeeks} place={player.place} onClick={() => onSelect(player.name)} />
            ))}
          </div>
        )}
        {ranked.length === 0 && (
          <p style={{ ...FONT.mono('0.8rem'), color: 'var(--co-dim)', textAlign: 'center', padding: '40px 0' }}>
            {'>'} BRAK DANYCH — dodaj sesje żeby zobaczyć ranking_
          </p>
        )}
      </div>
    </div>
  );
}
