import { Flame } from 'lucide-react';

// ─── Streak badge ────────────────────────────────────────────────
export default function StreakBadge({ streak }) {
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
