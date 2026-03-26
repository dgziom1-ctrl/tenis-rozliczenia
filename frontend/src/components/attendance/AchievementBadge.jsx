import { useState, useRef, useEffect } from 'react';

// ─── Achievement Badge (tappable, shows desc on tap) ─────────────
export default function AchievementBadge({ achievement: a, accentColor }) {
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
      <button
        type="button"
        onClick={handleTap}
        aria-label={a.label + ': ' + a.desc}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px',
          background: `${accentColor}10`,
          border: `1px solid ${accentColor}${visible ? '70' : '30'}`,
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          userSelect: 'none',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ fontSize: '0.85rem' }}>{a.emoji}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', color: accentColor, letterSpacing: '0.06em' }}>
          {a.label}
        </span>
      </button>
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
