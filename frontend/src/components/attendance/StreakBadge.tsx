import { Flame } from 'lucide-react';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';

interface StreakBadgeProps {
  streak: number;
}

// ─── Streak badge ────────────────────────────────────────────────
export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak < 2) return null;
  return (
    // Odznaka miała pomarańcz #FF6B35, którego nie ma w żadnej palecie, wpisany
    // w cyanowy chip — dwa niepowiązane odcienie w elemencie wielkości 20px.
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 6px',
      background: 'var(--co-amber-dim)',
      border: '1px solid var(--co-amber)',
      clipPath: CLIP.badge,
    }}>
      <Flame size={11} style={{ color: 'var(--co-amber)' }} aria-hidden="true" />
      <span style={{ ...FONT.display(TEXT.tiny, TRACK.normal), color: 'var(--co-amber)' }}>
        SERIA {streak}
      </span>
    </div>
  );
}
