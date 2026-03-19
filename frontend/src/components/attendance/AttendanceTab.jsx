import { useMemo, useState, useCallback } from 'react';
import { Award, CalendarDays, Flame, Target, TrendingUp, X } from 'lucide-react';
import { RANKS, PODIUM, PODIUM_ORDER, getRank } from '../../constants';
import { formatDate } from '../../utils/format';
import { getPlayerColor } from '../../constants/playerColors';
import { calculatePlayerStats, assignRankingPlaces, groupSessionsByMonth, getPlayerBadge } from '../../utils/calculations';

// ─── Section Header ──────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, accent = 'var(--co-cyan)', sub }) {
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
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', letterSpacing: '0.1em', paddingLeft: 34 }}>
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
      background: 'rgba(0,229,255,0.1)',
      border: '1px solid rgba(0,229,255,0.4)',
      clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
    }}>
      <Flame size={9} style={{ color: '#FF6B35' }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.1em', color: '#FF6B35' }}>
        SERIA {streak}
      </span>
    </div>
  );
}

// ─── Podium Card ─────────────────────────────────────────────────
function PodiumCard({ podiumEntry, totalWeeks, onSelect }) {
  const pod = PODIUM[podiumEntry.place];
  const players = podiumEntry.players;
  const exAequo = players.length > 1;

  const PLACE_STYLES = {
    1: { border: '#00FFFF', glow: 'rgba(0,255,255,0.5)',   bg: 'rgba(0,255,255,0.04)',   height: 130, label: '#1', medal: '🥇', shimmer: true },
    2: { border: '#0080FF', glow: 'rgba(0,128,255,0.4)',   bg: 'rgba(0,128,255,0.03)',   height: 90,  label: '#2', medal: '🥈', shimmer: false },
    3: { border: '#CC00FF', glow: 'rgba(204,0,255,0.35)',  bg: 'rgba(204,0,255,0.025)',  height: 62,  label: '#3', medal: '🥉', shimmer: false },
  };
  const s = PLACE_STYLES[podiumEntry.place] || PLACE_STYLES[3];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 190 }}>
      {players.map(player => {
        const rank = getRank(player.attendancePercentage);
        return (
          <div key={player.name} onClick={() => onSelect(player.name)} style={{
            width: '100%', padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
            background: s.bg,
            border: `1px solid ${s.border}50`,
            marginBottom: 6,
            clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
            position: 'relative', overflow: 'hidden',
            boxShadow: podiumEntry.place === 1 ? `0 0 20px ${s.glow}, inset 0 0 16px ${s.glow}20` : 'none',
          }}>
            {/* Top glow stripe */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: s.border,
              boxShadow: `0 0 10px ${s.glow}, 0 0 20px ${s.glow}`,
            }} />
            {/* Shimmer for 1st place */}
            {s.shimmer && <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `linear-gradient(105deg, transparent 40%, rgba(0,255,255,0.06) 50%, transparent 60%)`,
              backgroundSize: '200% 100%',
              animation: 'gold-shimmer 3s linear infinite',
            }} />}
            {/* Scan overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{s.medal}</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1.3rem',
                letterSpacing: '0.06em', color: s.border, marginBottom: 3, textTransform: 'uppercase',
                textShadow: podiumEntry.place === 1 ? `0 0 16px ${s.glow}` : 'none',
              }}>
                {player.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '2rem',
                color: s.border, lineHeight: 1,
                textShadow: `0 0 14px ${s.glow}`,
              }}>
                {player.attendancePercentage}%
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)', marginTop: 3, marginBottom: 6, letterSpacing: '0.1em' }}>
                {player.attendanceCount}/{totalWeeks} SESJI
              </div>
              {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
            </div>
          </div>
        );
      })}
      {exAequo && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'var(--co-dim)', marginBottom: 4 }}>
          EX AEQUO ×{players.length}
        </div>
      )}

      {/* Podium plinth */}
      <div style={{
        width: '100%', height: s.height,
        background: `linear-gradient(to bottom, ${s.bg}, transparent)`,
        border: `1px solid ${s.border}40`,
        borderBottom: `3px solid ${s.border}`,
        boxShadow: `0 0 30px ${s.glow}, 0 8px 24px rgba(0,0,0,0.5), inset 0 0 20px ${s.glow}25`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient scan */}
        {podiumEntry.place === 1 && <div style={{
          position: 'absolute', left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent, ${s.border}, transparent)`,
          animation: 'podium-scan 2.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />}
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '2.2rem',
          letterSpacing: '0.15em', color: s.border,
          textShadow: `0 0 16px ${s.glow}`,
        }}>{s.label}</span>
      </div>
    </div>
  );
}

function Podium({ podiumPlayers, totalWeeks, onSelect }) {
  if (podiumPlayers.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
      {PODIUM_ORDER.map((targetPlace) => {
        const entry = podiumPlayers.find(p => p.place === targetPlace);
        if (!entry) return <div key={targetPlace} style={{ flex: 1, maxWidth: 190 }} />;
        return <PodiumCard key={targetPlace} podiumEntry={entry} totalWeeks={totalWeeks} onSelect={onSelect} />;
      })}
    </div>
  );
}

// ─── Leaderboard row ─────────────────────────────────────────────
function LeaderboardRow({ player, totalWeeks, stats, place, onClick }) {
  const rank = getRank(player.attendancePercentage);
  const specialTitle = getPlayerBadge(player, stats);
  const isTop3 = place <= 3;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: isTop3 ? 'rgba(0,229,255,0.025)' : 'rgba(255,255,255,0.01)',
      border: `1px solid ${isTop3 ? 'rgba(0,229,255,0.18)' : 'var(--co-border)'}`,
      marginBottom: 3,
      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
      cursor: 'pointer',
    }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.background = isTop3 ? 'rgba(0,229,255,0.04)' : 'rgba(0,229,255,0.015)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isTop3 ? 'rgba(0,229,255,0.18)' : 'var(--co-border)'; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.background = isTop3 ? 'rgba(0,229,255,0.025)' : 'rgba(255,255,255,0.01)'; }}
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
        fontFamily: 'var(--font-display)', fontSize: '0.95rem',
        letterSpacing: '0.05em', textTransform: 'uppercase', flex: 1, minWidth: 0,
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
function Leaderboard({ ranked, podiumPlayers, totalWeeks, stats, onSelect }) {
  const theRest = ranked.filter(p => p.place > 3);
  return (
    <div style={{
      background: 'var(--co-panel)',
      border: '1px solid var(--co-border)',
      clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
      padding: 24,
      position: 'relative', overflow: 'hidden',
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
              <LeaderboardRow key={player.name} player={player} totalWeeks={totalWeeks} stats={stats} place={player.place} onClick={() => onSelect(player.name)} />
            ))}
          </div>
        )}
        {ranked.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--co-dim)', textAlign: 'center', padding: '40px 0', fontSize: '0.8rem' }}>
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
      background: 'var(--co-panel)',
      border: '1px solid var(--co-border)',
      clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
      padding: 24,
      position: 'relative',
    }}>
      <SectionHeader icon={CalendarDays} title="DANE MIESIĘCZNE" sub="obecność według miesiąca" />
      {monthlyStats.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--co-dim)', textAlign: 'center', padding: '40px 0', fontSize: '0.8rem' }}>
          {'>'} Brak danych — dodaj pierwszą sesję_
        </p>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Scroll fade hint on mobile */}
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 32,
            background: 'linear-gradient(to right, transparent, var(--co-panel))',
            pointerEvents: 'none', zIndex: 2,
          }} />
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400, fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cz-border-hi, #2E2E28)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', fontWeight: 400, textTransform: 'uppercase', position: 'sticky', left: 0, background: 'var(--co-panel)', zIndex: 2, borderRight: '1px solid rgba(0,229,255,0.08)' }}>
                  MIESIĄC
                </th>
                <th style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', fontWeight: 400, textTransform: 'uppercase' }}>
                  SESJE
                </th>
                {players?.map(p => (
                  <th key={p.name} style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--co-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 400 }}>
                    {p.name.length > 5 ? p.name.slice(0, 5) + '.' : p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map(([month, rowData]) => (
                <tr key={month} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--co-text)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--co-panel)', zIndex: 1, borderRight: '1px solid rgba(0,229,255,0.08)' }}>{month}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--co-cyan)', textAlign: 'center' }}>{rowData.total}</td>
                  {players?.map(p => {
                    const presence = rowData.players[p.name] || 0;
                    const isMax = presence === rowData.total;
                    return (
                      <td key={p.name} style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 7px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                          ...(isMax ? {
                            background: 'rgba(0,229,255,0.08)',
                            border: '1px solid rgba(0,229,255,0.3)',
                            color: 'var(--co-green)',
                          } : presence > 0 ? {
                            color: 'var(--co-cyan)',
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
        </div>
      )}
    </div>
  );
}

// ─── Rank guide ──────────────────────────────────────────────────
function RankGuide() {
  const rankColors = ['#FFD700', '#00FFFF', '#CC00FF', '#00FF66', '#0080FF', '#FF0080'];
  return (
    <div style={{
      background: 'var(--co-panel)',
      border: '1px solid var(--co-border)',
      clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
      padding: 24,
    }}>
      <SectionHeader icon={Award} title="RANGI" sub="poziom według frekwencji" accent="var(--co-cyan)" />
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--co-dim)' }}>
              {i === RANKS.length - 1 ? '<20%' : `${r.min}%+`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Player Session Drill-Down Modal ─────────────────────────────
function PlayerSessionModal({ player, history, totalWeeks, onClose }) {
  if (!player) return null;

  const c = getPlayerColor(player.name);
  const sessions = history.filter(s => s.presentPlayers.includes(player.name));
  const missedSessions = history.filter(s => !s.presentPlayers.includes(player.name));
  const multisportSessions = sessions.filter(s => s.multisportPlayers.includes(player.name));
  const avgCost = sessions.length > 0
    ? (sessions.reduce((sum, s) => {
        const paying = s.presentPlayers.filter(p => !s.multisportPlayers.includes(p));
        const cost = paying.includes(player.name) ? (s.totalCost / Math.max(paying.length, 1)) : 0;
        return sum + cost;
      }, 0) / sessions.length).toFixed(2)
    : '0.00';
  
  const currentStreak = player.currentStreak || 0;
  const longestStreak = (() => {
    let max = 0, cur = 0;
    for (const s of [...history].reverse()) {
      if (s.presentPlayers.includes(player.name)) { cur++; max = Math.max(max, cur); }
      else cur = 0;
    }
    return max;
  })();

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end',
        padding: '0',
      }}
    >
      <div className="bottom-sheet-enter" style={{
        width: '100%', maxWidth: 560, margin: '0 auto',
        maxHeight: '85vh',
        background: 'var(--co-panel)',
        border: `1px solid ${c.border}40`,
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 -8px 40px rgba(0,0,0,0.8), 0 0 40px ${c.border}15`,
        overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{
          padding: '8px 18px 14px',
          borderBottom: `1px solid ${c.border}20`,
          display: 'flex', alignItems: 'center', gap: 12,
          background: `${c.border}07`,
        }}>
          {/* Mini avatar */}
          <div style={{
            width: 42, height: 42, flexShrink: 0,
            background: c.bg, border: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
            boxShadow: `0 0 10px ${c.border}40`,
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: c.text }}>
              {player.name.slice(0,2).toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em', color: 'var(--co-text-hi)', margin: 0, lineHeight: 1 }}>
              {player.name.toUpperCase()}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--co-dim)', margin: '3px 0 0', letterSpacing: '0.12em' }}>
              {player.attendanceCount}/{totalWeeks} sesji · {player.attendancePercentage}% frekwencja
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--co-border)',
            color: 'var(--co-dim)', cursor: 'pointer', padding: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
            transition: 'color 0.15s, border-color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--co-cyan)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--co-dim)'; e.currentTarget.style.borderColor = 'var(--co-border)'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, padding: '0', background: 'var(--co-border)',
          borderBottom: `1px solid ${c.border}15`,
        }}>
          {[
            { label: 'Sesje', value: sessions.length, color: c.border },
            { label: 'Opuszczone', value: missedSessions.length, color: 'var(--co-dim)' },
            { label: 'Seria', value: currentStreak, color: currentStreak > 2 ? 'var(--co-cyan)' : 'var(--co-dim)' },
            { label: 'Multisport', value: multisportSessions.length, color: multisportSessions.length > 0 ? 'var(--co-green)' : 'var(--co-dim)' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '12px 8px', textAlign: 'center', background: 'var(--co-panel)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: stat.color, margin: 0, lineHeight: 1, textShadow: stat.color !== 'var(--co-dim)' ? `0 0 10px ${stat.color}40` : 'none' }}>
                {stat.value}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--co-dim)', margin: '4px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Session log */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            // session log — {sessions.length} attended
          </p>
          {history.length === 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-dim)', textAlign: 'center', padding: '24px 0' }}>
              Brak danych sesji
            </p>
          )}
          {history.map((session, idx) => {
            const attended = session.presentPlayers.includes(player.name);
            const isMulti = session.multisportPlayers.includes(player.name);
            const paying = session.presentPlayers.filter(p => !session.multisportPlayers.includes(p));
            const cost = paying.includes(player.name) ? (session.totalCost / Math.max(paying.length, 1)).toFixed(2) : '0.00';

            return (
              <div key={session.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', marginBottom: 3,
                background: attended ? `${c.border}08` : 'rgba(255,255,255,0.015)',
                border: `1px solid ${attended ? c.border + '25' : 'rgba(255,255,255,0.05)'}`,
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                opacity: attended ? 1 : 0.45,
                transition: 'opacity 0.15s',
              }}>
                {/* Session number */}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--co-dim)', width: 24, flexShrink: 0 }}>
                  #{String(history.length - idx).padStart(2,'0')}
                </span>
                {/* Status dot */}
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: attended ? c.border : 'var(--co-dim)',
                  boxShadow: attended ? `0 0 4px ${c.border}` : 'none',
                }} />
                {/* Date */}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: attended ? 'var(--co-text)' : 'var(--co-dim)', flex: 1 }}>
                  {formatDate(session.datePlayed)}
                </span>
                {/* Multi badge */}
                {isMulti && (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--co-green)', padding: '1px 5px', border: '1px solid rgba(0,255,136,0.3)', background: 'rgba(0,255,136,0.05)' }}>
                    M+
                  </span>
                )}
                {/* Cost / absent */}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: attended ? (isMulti ? 'var(--co-green)' : c.border) : 'var(--co-dim)', width: 50, textAlign: 'right', flexShrink: 0 }}>
                  {attended ? (isMulti ? 'free' : `${cost} zł`) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
export default function AttendanceTab({ players, history, summary }) {
  const totalWeeks = summary?.totalWeeks || 0;
  const [selectedPlayer, setSelectedPlayer] = useState(null);
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

  const selectedStats = useMemo(() => {
    if (!selectedPlayer) return null;
    return ranked.find(p => p.name === selectedPlayer);
  }, [selectedPlayer, ranked]);

  return (
    <>
    {selectedStats && (
      <PlayerSessionModal
        player={selectedStats}
        history={history}
        totalWeeks={totalWeeks}
        onClose={() => setSelectedPlayer(null)}
      />
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-in-up 0.3s ease-out' }}>
      <Leaderboard ranked={ranked} podiumPlayers={podiumPlayers} totalWeeks={totalWeeks} stats={stats} onSelect={setSelectedPlayer} />
      <MonthlyReport monthlyStats={monthlyStats} players={players} />
      <RankGuide />
    </div>
  </>
  );
}
