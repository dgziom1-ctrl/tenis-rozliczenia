import { useMemo } from 'react';
import { CalendarDays, TrendingUp, Flame, Trophy, Zap, Target, Award, ChevronRight } from 'lucide-react';
import { RANKS, PODIUM, PODIUM_ORDER, getRank } from '../../constants';
import { calculatePlayerStats, assignRankingPlaces, groupSessionsByMonth, getPlayerBadge } from '../../utils/calculations';

// ─── Section Header ──────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, accent = 'var(--cz-orange)', sub }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          padding: '5px 7px',
          background: `${accent}10`,
          border: `1px solid ${accent}28`,
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
        }}>
          <Icon size={13} style={{ color: accent, display: 'block' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: accent,
        }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}22, transparent)` }} />
      </div>
      {sub && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cz-dim)', letterSpacing: '0.1em', paddingLeft: 34 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Streak badge ────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (streak < 2) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px',
      background: 'rgba(232,89,10,0.1)',
      border: '1px solid rgba(232,89,10,0.4)',
      clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
    }}>
      <Flame size={9} style={{ color: 'var(--cz-orange)' }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--cz-orange)' }}>
        SERIA {streak}
      </span>
    </div>
  );
}

// ─── Podium Card ─────────────────────────────────────────────────
function PodiumCard({ podiumEntry, totalWeeks }) {
  const pod = PODIUM[podiumEntry.place];
  const players = podiumEntry.players;
  const exAequo = players.length > 1;

  const PLACE_STYLES = {
    1: { border: 'var(--cz-orange)',  glow: 'rgba(232,89,10,0.45)', bg: 'rgba(232,89,10,0.05)', height: 120, label: '01ST', topLabel: '● GOLD' },
    2: { border: '#8A8880',           glow: 'rgba(138,136,128,0.3)', bg: 'rgba(138,136,128,0.03)', height: 84, label: '02ND', topLabel: '● SILVER' },
    3: { border: '#B87340',           glow: 'rgba(184,115,64,0.3)', bg: 'rgba(184,115,64,0.03)', height: 56, label: '03RD', topLabel: '● BRONZE' },
  };
  const s = PLACE_STYLES[podiumEntry.place] || PLACE_STYLES[3];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 190 }}>
      {players.map(player => {
        const rank = getRank(player.attendancePercentage);
        return (
          <div key={player.name} style={{
            width: '100%', padding: '12px 10px', textAlign: 'center',
            background: s.bg, border: `1px solid ${s.border}45`,
            marginBottom: 6,
            clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Top classification stripe */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: s.border, boxShadow: `0 0 8px ${s.glow}`,
            }} />
            <div style={{ fontSize: '1.4rem', marginBottom: 5 }}>{rank.emoji}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.1rem',
              letterSpacing: '0.06em', color: s.border, marginBottom: 2, textTransform: 'uppercase',
            }}>
              {player.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.8rem',
              color: s.border, lineHeight: 1,
              textShadow: `0 0 12px ${s.glow}`,
            }}>
              {player.attendancePercentage}%
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cz-dim)', marginTop: 2, marginBottom: 5 }}>
              {player.attendanceCount}/{totalWeeks} SESJI
            </div>
            {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
          </div>
        );
      })}
      {exAequo && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'var(--cz-dim)', marginBottom: 4 }}>
          EX AEQUO ×{players.length}
        </div>
      )}

      {/* Podium plinth */}
      <div style={{
        width: '100%', height: s.height,
        background: `linear-gradient(to bottom, ${s.bg}, transparent)`,
        border: `1px solid ${s.border}40`,
        borderBottom: `3px solid ${s.border}`,
        boxShadow: `0 8px 24px ${s.glow}, inset 0 0 20px ${s.glow}30`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <span style={{ fontSize: '2rem' }}>{pod.medal}</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.9rem',
          letterSpacing: '0.2em', color: s.border,
        }}>{s.label}</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
          letterSpacing: '0.15em', color: `${s.border}80`,
        }}>{s.topLabel}</span>
      </div>
    </div>
  );
}

function Podium({ podiumPlayers, totalWeeks }) {
  if (podiumPlayers.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
      {PODIUM_ORDER.map((targetPlace) => {
        const entry = podiumPlayers.find(p => p.place === targetPlace);
        if (!entry) return <div key={targetPlace} style={{ flex: 1, maxWidth: 190 }} />;
        return <PodiumCard key={targetPlace} podiumEntry={entry} totalWeeks={totalWeeks} />;
      })}
    </div>
  );
}

// ─── Leaderboard row ─────────────────────────────────────────────
function LeaderboardRow({ player, totalWeeks, stats, place }) {
  const rank = getRank(player.attendancePercentage);
  const specialTitle = getPlayerBadge(player, stats);
  const isTop3 = place <= 3;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px',
      background: isTop3 ? 'rgba(232,89,10,0.025)' : 'rgba(255,255,255,0.01)',
      border: `1px solid ${isTop3 ? 'rgba(232,89,10,0.18)' : 'var(--cz-border)'}`,
      marginBottom: 3,
      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
        color: isTop3 ? 'var(--cz-orange)' : 'var(--cz-dim)',
        width: 28, flexShrink: 0,
      }}>
        {String(place).padStart(2, '0')}.
      </span>
      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{rank.emoji}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '0.85rem',
        letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1, minWidth: 0,
        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        color: isTop3 ? 'var(--cz-text-hi, #E8E4DA)' : 'var(--cz-text)',
      }}>{player.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
        {player.multisportCount > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cz-teal)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Zap size={8} />{player.multisportCount}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cz-dim)' }}>
          {player.attendanceCount}/{totalWeeks}
        </span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.05rem',
          color: isTop3 ? 'var(--cz-orange)' : '#666',
          width: 50, textAlign: 'right',
          textShadow: isTop3 ? '0 0 8px rgba(232,89,10,0.35)' : 'none',
        }}>
          {player.attendancePercentage}%
        </span>
      </div>
    </div>
  );
}

// ─── Full leaderboard ─────────────────────────────────────────────
function Leaderboard({ ranked, podiumPlayers, totalWeeks, stats }) {
  const theRest = ranked.filter(p => p.place > 3);
  return (
    <div style={{
      background: 'var(--cz-panel)',
      border: '1px solid var(--cz-border)',
      clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
      padding: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(232,89,10,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(232,89,10,0.025) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SectionHeader icon={TrendingUp} title="RANKING — Street Cred" sub="// FREKWENCJA SESJI PING PONG" />
        <Podium podiumPlayers={podiumPlayers} totalWeeks={totalWeeks} />
        {theRest.length > 0 && (
          <div style={{ borderTop: '1px solid var(--cz-border)', paddingTop: 14 }}>
            {theRest.map(player => (
              <LeaderboardRow key={player.name} player={player} totalWeeks={totalWeeks} stats={stats} place={player.place} />
            ))}
          </div>
        )}
        {ranked.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--cz-dim)', textAlign: 'center', padding: '40px 0', fontSize: '0.8rem' }}>
            {'>'} BRAK DANYCH — dodaj sesje żeby zobaczyć ranking_
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Monthly report ────────────────────────────────────────────────
function MonthlyReport({ monthlyStats, players }) {
  return (
    <div style={{
      background: 'var(--cz-panel)',
      border: '1px solid var(--cz-border)',
      clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
      padding: 24, overflowX: 'auto',
    }}>
      <SectionHeader icon={CalendarDays} title="DANE MIESIĘCZNE" sub="// ATTENDANCE LOG BY PERIOD" />
      {monthlyStats.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--cz-dim)', textAlign: 'center', padding: '40px 0', fontSize: '0.8rem' }}>
          {'>'} BRAK DANYCH — Dodaj pierwszy tydzień_
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400, fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cz-border-hi, #2E2E28)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--cz-orange)', fontWeight: 400, textTransform: 'uppercase' }}>
                  MIESIĄC
                </th>
                <th style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--cz-orange)', fontWeight: 400, textTransform: 'uppercase' }}>
                  SESJE
                </th>
                {players?.map(p => (
                  <th key={p.name} style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--cz-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 400 }}>
                    {p.name.length > 5 ? p.name.slice(0, 5) + '.' : p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map(([month, rowData]) => (
                <tr key={month} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--cz-text)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>{month}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--cz-orange)', textAlign: 'center' }}>{rowData.total}</td>
                  {players?.map(p => {
                    const presence = rowData.players[p.name] || 0;
                    const isMax = presence === rowData.total;
                    return (
                      <td key={p.name} style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 7px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                          ...(isMax ? {
                            background: 'rgba(127,255,0,0.08)',
                            border: '1px solid rgba(127,255,0,0.3)',
                            color: 'var(--cz-acid)',
                          } : presence > 0 ? {
                            color: 'var(--cz-orange)',
                          } : {
                            color: 'var(--cz-dim2, #2A2A26)',
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

// ─── Rank guide ──────────────────────────────────────────────────
function RankGuide() {
  const rankColors = ['#FFB800', '#FF8C00', '#9B59B6', '#E8590A', '#4A4640', '#2E2E28'];
  return (
    <div style={{
      background: 'var(--cz-panel)',
      border: '1px solid var(--cz-border)',
      clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
      padding: 24,
    }}>
      <SectionHeader icon={Award} title="TABELA RANG" sub="// CLEARANCE LEVEL BY ATTENDANCE" accent="var(--cz-teal)" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
        {RANKS.map((r, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px',
            background: `${rankColors[i]}08`,
            border: `1px solid ${rankColors[i]}25`,
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: rankColors[i], opacity: 0.6,
            }} />
            <span style={{ fontSize: '1.5rem', marginBottom: 7 }}>{r.emoji}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em', color: rankColors[i], marginBottom: 4, textTransform: 'uppercase' }}>
              {r.name}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--cz-dim)' }}>
              {i === RANKS.length - 1 ? '<20%' : `${r.min}%+`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-in-up 0.3s ease-out' }}>
      <Leaderboard ranked={ranked} podiumPlayers={podiumPlayers} totalWeeks={totalWeeks} stats={stats} />
      <MonthlyReport monthlyStats={monthlyStats} players={players} />
      <RankGuide />
    </div>
  );
}
