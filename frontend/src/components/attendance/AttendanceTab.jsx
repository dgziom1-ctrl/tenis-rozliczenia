import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { CalendarDays, Flame, Target, TrendingUp, X } from 'lucide-react';
import { RANKS, PODIUM, PODIUM_ORDER, getRank, SOUND_TYPES } from '../../constants';
import { formatDate } from '../../utils/format';
import { getPlayerColor } from '../../constants/playerColors';
import { calculatePlayerStats, assignRankingPlaces, groupSessionsByMonth, getPlayerAchievements, computeRankingHistory } from '../../utils/calculations';
import { SectionHeader } from '../common/SharedUI';

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
  const players = podiumEntry.players;
  const exAequo = players.length > 1;
  const [shimmerKey, setShimmerKey] = useState(0);

  const PLACE_STYLES = {
    1: { border: '#00FFFF', glow: 'rgba(0,255,255,0.5)',   bg: 'rgba(0,255,255,0.04)',   height: 130, label: '#1', medal: '🥇' },
    2: { border: '#0080FF', glow: 'rgba(0,128,255,0.4)',   bg: 'rgba(0,128,255,0.03)',   height: 90,  label: '#2', medal: '🥈' },
    3: { border: '#CC00FF', glow: 'rgba(204,0,255,0.35)',  bg: 'rgba(204,0,255,0.025)',  height: 62,  label: '#3', medal: '🥉' },
  };
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
            {/* Shimmer — synced to paddle hit for all 3 places */}
            <div
              key={shimmerKey}
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `linear-gradient(105deg, transparent 20%, ${s.border}18 50%, transparent 80%)`,
                animation: shimmerKey > 0 ? 'gold-shimmer 3s ease-out forwards' : 'none',
              }}
            />
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
function LeaderboardRow({ player, totalWeeks, place, onClick }) {
  const rank = getRank(player.attendancePercentage);
  const isTop3 = place <= 3;

  return (
    <div
      className={`leaderboard-row ${isTop3 ? 'top3' : 'rest'}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: isTop3 ? 'rgba(0,229,255,0.025)' : 'rgba(255,255,255,0.01)',
        border: `1px solid ${isTop3 ? 'rgba(0,229,255,0.18)' : 'var(--co-border)'}`,
        marginBottom: 3,
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
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
              <LeaderboardRow key={player.name} player={player} totalWeeks={totalWeeks} place={player.place} onClick={() => onSelect(player.name)} />
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
// ─── Ranking History Chart ────────────────────────────────────────
function RankingHistoryChart({ players, history }) {
  const data = useMemo(() => computeRankingHistory(players, history), [players, history]);
  if (!data || data.length < 2) return null;

  const playerNames = players?.map(p => p.name) || [];
  const COLORS = ['#00E5FF','#FF2090','#00FF88','#FF8800','#CC00FF','#0080FF','#FFD700'];

  const W = 560, H = 200, PAD = { top: 20, right: 16, bottom: 32, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = data.length;
  const maxPlace = Math.max(...data.flatMap(d => d.rankings.map(r => r.place)));

  const xPos = i => PAD.left + (i / (n - 1)) * innerW;
  const yPos = place => PAD.top + ((place - 1) / Math.max(maxPlace - 1, 1)) * innerH;

  const linePath = pts => pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const prev = pts[i - 1];
    const cpx = (prev[0] + x) / 2;
    return `${acc} C${cpx},${prev[1]} ${cpx},${y} ${x},${y}`;
  }, '');

  return (
    <div style={{ background: 'var(--co-panel)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)', padding: 24 }}>
      <SectionHeader icon={TrendingUp} title="HISTORIA RANKINGU" sub="pozycja graczy w czasie" />
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {playerNames.map((name, i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 18, height: 2, background: COLORS[i % COLORS.length], borderRadius: 1 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)' }}>{name}</span>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', background: 'rgba(0,229,255,0.015)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
          {/* Place labels on Y axis */}
          {Array.from({ length: maxPlace }, (_, i) => i + 1).map(place => (
            <g key={place}>
              <line x1={PAD.left} y1={yPos(place)} x2={W - PAD.right} y2={yPos(place)}
                stroke="rgba(0,229,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={PAD.left - 4} y={yPos(place) + 4} textAnchor="end"
                fill="rgba(0,229,255,0.3)" fontSize="9" fontFamily="Space Mono, monospace">
                #{place}
              </text>
            </g>
          ))}
          {/* Player lines */}
          {playerNames.map((name, i) => {
            const pts = data.map((d, di) => {
              const r = d.rankings.find(r => r.name === name);
              return r ? [xPos(di), yPos(r.place)] : null;
            }).filter(Boolean);
            if (pts.length < 2) return null;
            const col = COLORS[i % COLORS.length];
            return (
              <g key={name}>
                <path d={linePath(pts)} fill="none" stroke={col} strokeWidth="2" opacity="0.85" />
                {pts.map(([x, y], pi) => (
                  <circle key={pi} cx={x} cy={y} r="3.5" fill="var(--co-panel)" stroke={col} strokeWidth="1.5" />
                ))}
              </g>
            );
          })}
          {/* X axis month labels */}
          {data.map((d, i) => (
            (i % Math.max(1, Math.floor(n / 5)) === 0 || i === n - 1) && (
              <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle"
                fill="rgba(168,192,212,0.5)" fontSize="8" fontFamily="Space Mono, monospace">
                {d.month.slice(2).replace('-', '/')}
              </text>
            )
          ))}
        </svg>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--co-dim)', marginTop: 8, letterSpacing: '0.08em' }}>
        * pozycja liczona na podstawie frekwencji po każdym miesiącu
      </p>
    </div>
  );
}

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
                {players?.map(p => {
                  const c = getPlayerColor(p.name);
                  return (
                    <th key={p.name} style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 400 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: '100%', height: 2, background: c.border, borderRadius: 1, opacity: 0.7 }} />
                        <span style={{ color: c.border, whiteSpace: 'nowrap' }}>{p.name}</span>
                      </div>
                    </th>
                  );
                })}
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


// ─── Player Session Drill-Down Modal ─────────────────────────────
// ─── Achievement Badge (tappable, shows desc on tap) ─────────────
function AchievementBadge({ achievement: a, accentColor }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const handleTap = (e) => {
    e.stopPropagation();
    clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2800);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={handleTap}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px',
          background: `${accentColor}10`,
          border: `1px solid ${accentColor}${visible ? '70' : '30'}`,
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          cursor: 'pointer', userSelect: 'none',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ fontSize: '0.85rem' }}>{a.emoji}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', color: accentColor, letterSpacing: '0.06em' }}>
          {a.label}
        </span>
      </div>
      {visible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', left: 0,
          background: 'var(--co-void)',
          border: `1px solid ${accentColor}50`,
          padding: '6px 10px',
          zIndex: 50,
          whiteSpace: 'nowrap',
          clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          boxShadow: `0 0 12px ${accentColor}25`,
          animation: 'slide-in-up 0.15s ease-out',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: accentColor, margin: 0 }}>
            {a.emoji} {a.label}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)', margin: '3px 0 0' }}>
            {a.desc}
          </p>
        </div>
      )}
    </div>
  );
}

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
        background: 'var(--co-overlay, rgba(0,0,0,0.85))',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div className="bottom-sheet-enter" style={{
        width: '100%', maxWidth: 520,
        maxHeight: 'calc(100vh - 32px)',
        background: 'var(--co-panel)',
        border: `1px solid ${c.border}40`,
        borderRadius: '12px',
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 8px 40px rgba(0,0,0,0.8), 0 0 40px ${c.border}15`,
        overflow: 'hidden',
      }}>
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
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1, padding: '0', background: 'var(--co-border)',
          borderBottom: `1px solid ${c.border}15`,
        }}>
          {[
            { label: 'Sesje', value: sessions.length, color: c.border },
            { label: 'Opuszczone', value: missedSessions.length, color: 'var(--co-dim)' },
            { label: 'Seria', value: currentStreak, color: currentStreak > 2 ? 'var(--co-cyan)' : 'var(--co-dim)' },
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

        {/* Rank progression */}
        {(() => {
          const pct = player.attendancePercentage;
          const currentRank = getRank(pct);
          const rankIdx = RANKS.findIndex(r => r.name === currentRank.name);
          const nextRank = rankIdx > 0 ? RANKS[rankIdx - 1] : null;
          return (
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${c.border}15`, background: `${currentRank.hex}04` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: currentRank.hex, letterSpacing: '0.08em' }}>
                  {currentRank.emoji} {currentRank.name}
                </span>
                {nextRank ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)' }}>
                    do {nextRank.emoji} {nextRank.name}: <span style={{ color: nextRank.hex }}>{Math.max(0, nextRank.min - pct)}%</span>
                  </span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: currentRank.hex }}>
                    ★ max ranga
                  </span>
                )}
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${pct}%`,
                  background: nextRank
                    ? `linear-gradient(90deg, ${currentRank.hex}, ${nextRank.hex})`
                    : currentRank.hex,
                  boxShadow: `0 0 6px ${currentRank.hex}80`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--co-dim)' }}>0%</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: currentRank.hex, fontWeight: 500 }}>{pct}%</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--co-dim)' }}>100%</span>
              </div>
            </div>
          );
        })()}

        {/* Achievements */}
        {(() => {
          const achievements = getPlayerAchievements(player, history);
          if (achievements.length === 0) return null;
          return (
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${c.border}15` }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--co-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                // osiągnięcia — {achievements.length}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {achievements.map(a => (
                  <AchievementBadge key={a.id} achievement={a} accentColor={c.border} />
                ))}
              </div>
            </div>
          );
        })()}

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
export default function AttendanceTab({ players, history, summary, playSound }) {
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

  const handleSelect = useCallback((name) => {
    setSelectedPlayer(name);
    if (!playSound) return;
    const player = ranked.find(p => p.name === name);
    if (player?.place === 1) {
      playSound(SOUND_TYPES.RANK1);
    } else {
      playSound(SOUND_TYPES.CLICK);
    }
  }, [ranked, playSound]);

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
      <Leaderboard ranked={ranked} podiumPlayers={podiumPlayers} totalWeeks={totalWeeks} stats={stats} onSelect={handleSelect} />
      <RankingHistoryChart players={players} history={history} />
      <MonthlyReport monthlyStats={monthlyStats} players={players} />
    </div>
  </>
  );
}
