import { useMemo, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { RANKS, getRank, SPORT } from '../../constants';
import { FONT, CLIP } from '../../constants/styles';
import { formatDate } from '../../utils/format';
import { getPlayerColor } from '../../constants/playerColors';
import { getPlayerAchievements } from '../../utils/calculations';
import { getPlayerSessionCost } from '../../utils/sessionCost';
import AchievementBadge from './AchievementBadge';

// ─── Player Session Drill-Down Modal ─────────────────────────────
export default function PlayerSessionModal({ player, history, totalWeeks, onClose }) {
  const overlayRef = useRef(null);
  useEffect(() => { overlayRef.current?.focus(); }, []);

  if (!player) return null;

  const c = getPlayerColor(player.name);

  const { sessions, missedSessions, multisportSessions } = useMemo(() => {
    const sessions = history.filter(s => s.presentPlayers.includes(player.name));
    const missedSessions = history.filter(s => !s.presentPlayers.includes(player.name));
    const multisportSessions = sessions.filter(s => s.multisportPlayers.includes(player.name));
    return { sessions, missedSessions, multisportSessions };
  }, [history, player.name]);

  const avgCost = useMemo(() =>
    sessions.length > 0
      ? (sessions.reduce((sum, s) => sum + getPlayerSessionCost(s, player.name), 0) / sessions.length).toFixed(2)
      : '0.00',
    [sessions, player.name]);

  const currentStreak = player.currentStreak || 0;
  const longestStreak = useMemo(() => {
    let max = 0, cur = 0;
    for (const s of [...history].reverse()) {
      if (s.presentPlayers.includes(player.name)) { cur++; max = Math.max(max, cur); }
      else cur = 0;
    }
    return max;
  }, [history, player.name]);

  const achievements = useMemo(() => getPlayerAchievements(player, history), [player, history]);

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      tabIndex={-1}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
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
            clipPath: CLIP.badge,
            boxShadow: `0 0 10px ${c.border}40`,
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: c.text }}>
              {player.name.slice(0,2).toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ ...FONT.display('1.4rem', '0.06em'), color: 'var(--co-text-hi)', margin: 0, lineHeight: 1 }}>
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
            clipPath: CLIP.badge,
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
                  <span style={{ ...FONT.monoSmall }}>
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
                <span style={{ ...FONT.monoTiny }}>0%</span>
                <span style={{ ...FONT.mono('0.5rem'), color: currentRank.hex, fontWeight: 500 }}>{pct}%</span>
                <span style={{ ...FONT.monoTiny }}>100%</span>
              </div>
            </div>
          );
        })()}

        {/* Achievements */}
        {achievements.length > 0 && (
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
        )}

        {/* Session log */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          <p style={{ ...FONT.monoSmall, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
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
            const isSquashSession = session.sport === SPORT.SQUASH;

            // For squash: everyone pays; multisport holders get -15 zł discount.
            // For ping-pong: multisport players pay nothing.
            let costLabel = '—';
            if (attended) {
              const playerCost = getPlayerSessionCost(session, player.name);
              costLabel = (isMulti && !isSquashSession && playerCost === 0) ? 'free' : `${playerCost.toFixed(2)} zł`;
            }

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
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: attended ? (isMulti && !isSquashSession ? 'var(--co-green)' : c.border) : 'var(--co-dim)', width: 55, textAlign: 'right', flexShrink: 0 }}>
                  {costLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
