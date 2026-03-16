import { useMemo } from 'react';
import { CalendarDays, TrendingUp, Flame, Trophy, Zap, Target } from 'lucide-react';
import { RANKS, PODIUM, PODIUM_ORDER, getRank } from '../../constants';
import { calculatePlayerStats, assignRankingPlaces, groupSessionsByMonth, getPlayerBadge } from '../../utils/calculations';

// ─── Section Header ─────────────────────────────────────
function SectionHeader({ icon: Icon, title, accent = 'var(--cyber-accent)' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
      paddingBottom: 12, borderBottom: '1px solid #1a1a1a',
    }}>
      <div style={{
        padding: '6px 8px',
        background: `${accent}12`,
        border: `1px solid ${accent}30`,
        clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
      }}>
        <Icon size={14} style={{ color: accent, display: 'block' }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.7rem',
        letterSpacing: '0.2em', textTransform: 'uppercase', color: accent,
      }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}20, transparent)` }} />
    </div>
  );
}

// ─── Streak badge ────────────────────────────────────────
function StreakBadge({ streak }) {
  if (streak < 2) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px',
      background: 'rgba(255,100,0,0.1)',
      border: '1px solid rgba(255,100,0,0.4)',
      clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
    }}>
      <Flame size={9} style={{ color: '#ff6400' }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.12em', color: '#ff6400', fontWeight: 700 }}>
        SERIA {streak}
      </span>
    </div>
  );
}

// ─── Podium Card ─────────────────────────────────────────
function PodiumCard({ podiumEntry, totalWeeks }) {
  const pod = PODIUM[podiumEntry.place];
  const players = podiumEntry.players;
  const exAequo = players.length > 1;

  const PLACE_STYLES = {
    1: { border: 'var(--cyber-accent)', glow: 'rgba(129,140,248,0.4)', bg: 'rgba(129,140,248,0.04)', height: 120, label: '#1ST' },
    2: { border: '#888', glow: 'rgba(136,136,136,0.3)', bg: 'rgba(136,136,136,0.03)', height: 80, label: '#2ND' },
    3: { border: '#b87333', glow: 'rgba(184,115,51,0.3)', bg: 'rgba(184,115,51,0.03)', height: 55, label: '#3RD' },
  };
  const s = PLACE_STYLES[podiumEntry.place] || PLACE_STYLES[3];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 180 }}>
      {/* Player chips */}
      <div style={{ width: '100%', marginBottom: 0 }}>
        {players.map(player => {
          const rank = getRank(player.attendancePercentage);
          return (
            <div key={player.name} style={{
              width: '100%', padding: '10px 8px', textAlign: 'center',
              background: s.bg,
              border: `1px solid ${s.border}40`,
              marginBottom: 6,
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{rank.emoji}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: s.border, marginBottom: 2, textTransform: 'uppercase' }}>
                {player.name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: s.border, fontWeight: 400, textShadow: `0 0 10px ${s.glow}` }}>
                {player.attendancePercentage}%
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cyber-text-dim)', marginBottom: 4 }}>
                {player.attendanceCount}/{totalWeeks}
              </div>
              {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
            </div>
          );
        })}
        {exAequo && (
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--cyber-text-dim)' }}>
            EX AEQUO ×{players.length}
          </div>
        )}
      </div>

      {/* Podium plinth */}
      <div style={{
        width: '100%',
        height: s.height,
        background: s.bg,
        border: `1px solid ${s.border}50`,
        borderBottom: `2px solid ${s.border}`,
        boxShadow: `0 0 20px ${s.glow}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
      }}>
        <span style={{ fontSize: '1.8rem' }}>{pod.medal}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.15em', color: s.border, fontWeight: 700 }}>
          {s.label}
        </span>
      </div>
    </div>
  );
}

function Podium({ podiumPlayers, totalWeeks }) {
  if (podiumPlayers.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
      {PODIUM_ORDER.map((targetPlace) => {
        const entry = podiumPlayers.find(p => p.place === targetPlace);
        if (!entry) return <div key={targetPlace} style={{ flex: 1, maxWidth: 180 }} />;
        return <PodiumCard key={targetPlace} podiumEntry={entry} totalWeeks={totalWeeks} />;
      })}
    </div>
  );
}

// ─── Leaderboard row ─────────────────────────────────────
function LeaderboardRow({ player, totalWeeks, stats, place }) {
  const rank = getRank(player.attendancePercentage);
  const specialTitle = getPlayerBadge(player, stats);
  const isTop3 = place <= 3;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: isTop3 ? 'rgba(129,140,248,0.02)' : '#080808',
      border: `1px solid ${isTop3 ? 'rgba(129,140,248,0.15)' : '#161616'}`,
      marginBottom: 4,
      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      transition: 'border-color 0.2s',
    }}>
      {/* Place */}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: isTop3 ? 'var(--cyber-accent)' : 'var(--cyber-text-dim)',
        width: 24, flexShrink: 0, fontWeight: 400,
      }}>
        #{place}
      </span>
      {/* Emoji */}
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{rank.emoji}</span>
      {/* Name */}
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.7rem',
        letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1, minWidth: 0,
        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        color: isTop3 ? '#e8e8e8' : '#999',
      }}>{player.name}</span>
      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
        {specialTitle && (
          <span style={{
            display: 'none',
            fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.1em',
            padding: '2px 6px', border: `1px solid ${specialTitle.color || '#333'}`,
            color: '#888',
          }}
            className="sm:inline-flex items-center gap-1"
          >
            {specialTitle.icon} {specialTitle.label}
          </span>
        )}
        {player.multisportCount > 0 && (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--cyber-cyan)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Zap size={8} />⚡{player.multisportCount}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cyber-text-dim)' }}>
          {player.attendanceCount}/{totalWeeks}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 400,
          color: isTop3 ? 'var(--cyber-accent)' : '#666',
          width: 48, textAlign: 'right',
          textShadow: isTop3 ? '0 0 8px rgba(129,140,248,0.3)' : 'none',
        }}>
          {player.attendancePercentage}%
        </span>
      </div>
    </div>
  );
}

// ─── Full leaderboard ─────────────────────────────────────
function Leaderboard({ ranked, podiumPlayers, totalWeeks, stats }) {
  const theRest = ranked.filter(p => p.place > 3);
  return (
    <div className="cyber-box" style={{ clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)', padding: 24 }}>
      <SectionHeader icon={TrendingUp} title="Ranking frekwencji" />
      <Podium podiumPlayers={podiumPlayers} totalWeeks={totalWeeks} />
      {theRest.length > 0 && (
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 16 }}>
          {theRest.map(player => (
            <LeaderboardRow key={player.name} player={player} totalWeeks={totalWeeks} stats={stats} place={player.place} />
          ))}
        </div>
      )}
      {ranked.length === 0 && (
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyber-text-dim)', textAlign: 'center', padding: '40px 0', fontSize: '0.8rem' }}>
          {'>'} Dodaj sesje żeby zobaczyć ranking...
        </p>
      )}
    </div>
  );
}

// ─── Monthly report ───────────────────────────────────────
function MonthlyReport({ monthlyStats, players }) {
  return (
    <div className="cyber-box" style={{ clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)', padding: 24, overflowX: 'auto' }}>
      <SectionHeader icon={CalendarDays} title="Raport miesięczny" />
      {monthlyStats.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyber-text-dim)', textAlign: 'center', padding: '40px 0', fontSize: '0.8rem' }}>
          {'>'} Brak danych. Dodaj pierwszy tydzień_
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400, fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '0.68rem', letterSpacing: '0.15em', color: 'var(--cyber-accent)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Miesiąc
                </th>
                <th style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '0.68rem', letterSpacing: '0.15em', color: 'var(--cyber-accent)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Gier
                </th>
                {players?.map(p => (
                  <th key={p.name} style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.68rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                    {p.name.length > 5 ? p.name.slice(0, 5) + '.' : p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map(([month, rowData]) => (
                <tr key={month} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#c8c8c8', fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.08em' }}>{month}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyber-accent)', textAlign: 'center' }}>{rowData.total}</td>
                  {players?.map(p => {
                    const presence = rowData.players[p.name] || 0;
                    const isMax = presence === rowData.total;
                    return (
                      <td key={p.name} style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                          ...(isMax ? {
                            background: 'rgba(0,255,65,0.08)',
                            border: '1px solid rgba(0,255,65,0.3)',
                            color: 'var(--cyber-green)',
                          } : presence > 0 ? {
                            color: 'var(--cyber-accent)',
                          } : {
                            color: '#2a2a2a',
                          }),
                        }}>
                          {presence}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Rank guide ───────────────────────────────────────────
function RankGuide() {
  return (
    <div className="cyber-box" style={{ clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)', padding: 24 }}>
      <SectionHeader icon={Trophy} title="Rangi gracza" accent="var(--cyber-accent)" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {RANKS.map((r, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px',
            background: '#080808', border: '1px solid #1a1a1a',
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
            transition: 'border-color 0.2s',
          }}>
            <span style={{ fontSize: '1.4rem', marginBottom: 6 }}>{r.emoji}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.12em', color: '#999', marginBottom: 4, textTransform: 'uppercase' }}>
              {r.name}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyber-text-dim)' }}>
              {i === RANKS.length - 1 ? '<20%' : `${r.min}%+`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function AttendanceTab({ players, history, summary }) {
  const totalWeeks = summary?.totalWeeks || 0;
  const stats      = useMemo(() => calculatePlayerStats(players, history, totalWeeks), [players, history, totalWeeks]);

  const ranked = useMemo(() => {
    const sorted = [...stats].sort((a, b) => {
      if (b.attendancePercentage !== a.attendancePercentage) return b.attendancePercentage - a.attendancePercentage;
      if (b.attendanceCount !== a.attendanceCount) return b.attendanceCount - a.attendanceCount;
      return a.name.localeCompare(b.name, 'pl');
    });
    return assignRankingPlaces(sorted);
  }, [stats]);

  const podiumPlayers = useMemo(() => {
    const byPlace = {};
    ranked.forEach(p => { if (!byPlace[p.place]) byPlace[p.place] = []; byPlace[p.place].push(p); });
    return [1, 2, 3].filter(place => byPlace[place]?.length > 0).map(place => ({ place, players: byPlace[place] }));
  }, [ranked]);

  const monthlyStats = useMemo(() => groupSessionsByMonth(history), [history]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'slide-in-up 0.3s ease-out' }}>
      <Leaderboard ranked={ranked} podiumPlayers={podiumPlayers} totalWeeks={totalWeeks} stats={stats} />
      <MonthlyReport monthlyStats={monthlyStats} players={players} />
      <RankGuide />
    </div>
  );
}
