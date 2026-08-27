import { useState, useRef, useEffect } from 'react';
import { FONT, TEXT, TRACK, CLIP, Z } from '@/constants/styles';
import type { Achievement } from '@/types/ui';

interface AchievementBadgeProps {
  achievement: Achievement;
  accentColor: string;
}

// ─── Achievement Badge (tappable, shows desc on tap) ─────────────
export default function AchievementBadge({ achievement: a, accentColor }: AchievementBadgeProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2800);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleTap}
        aria-label={a.label + ': ' + a.desc}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          minHeight: 36, padding: '6px 10px',
          cursor: 'pointer',
          background: `${accentColor}10`,
          border: `1px solid ${accentColor}${visible ? '' : '30'}`,
          clipPath: CLIP.badge,
          userSelect: 'none',
          transition: 'border-color 0.15s',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: TEXT.base }}>{a.emoji}</span>
        <span style={{ ...FONT.display(TEXT.small, TRACK.tight), color: accentColor }}>
          {a.label}
        </span>
      </button>
      {visible && (
        // W dół i z zawijaniem: dymek otwierany do góry z `whiteSpace: nowrap`
        // był ucinany przez `overflow: hidden` okna gracza, a przy dłuższym
        // opisie wychodził poza jego prawą krawędź.
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', left: 0,
          minWidth: 180, maxWidth: 260,
          background: 'var(--co-panel)',
          border: `1px solid ${accentColor}`,
          padding: '8px 10px',
          zIndex: Z.popover,
          clipPath: CLIP.tag,
          boxShadow: 'var(--glow-box-cyan)',
          animation: 'slide-in-up 0.15s ease-out',
        }}>
          <p style={{ ...FONT.mono(TEXT.small), color: accentColor, margin: 0 }}>
            {a.emoji} {a.label}
          </p>
          <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)', margin: '4px 0 0', lineHeight: 1.4 }}>
            {a.desc}
          </p>
        </div>
      )}
    </div>
  );
}
