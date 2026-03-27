import { useState, useEffect } from 'react';
import { getRank } from '../../constants';
import { FONT, CLIP } from '../../constants/styles';
import StreakBadge from './StreakBadge';

// ─── Podium Card ─────────────────────────────────────────────────
export default function PodiumCard({ podiumEntry, totalWeeks, onSelect }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 'min(100%, 190px)', minWidth: 0 }}>
      {players.map(player => {
        const _rank = getRank(player.attendancePercentage);
        return (
          <div key={player.name} role="button" tabIndex={0} onClick={() => onSelect(player.name)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(player.name); } }} style={{
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
                ...FONT.display('1.3rem', '0.06em'), color: s.border, marginBottom: 3,
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
              <div style={{ ...FONT.monoSmall, marginTop: 3, marginBottom: 6, letterSpacing: '0.1em' }}>
                {player.attendanceCount}/{totalWeeks} SESJI
              </div>
              {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
            </div>
          </div>
        );
      })}
      {exAequo && (
        <div style={{ textAlign: 'center', ...FONT.monoSmall, letterSpacing: '0.2em', marginBottom: 4 }}>
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
          ...FONT.display('2.2rem', '0.15em'), color: s.border,
          textShadow: `0 0 16px ${s.glow}`,
        }}>{s.label}</span>
      </div>
    </div>
  );
}
