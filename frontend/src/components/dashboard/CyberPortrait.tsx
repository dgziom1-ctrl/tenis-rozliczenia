import { useId } from 'react';
import { FONT, TEXT, TRACK } from '@/constants/styles';

/**
 * Deterministyczny mini-portret z imienia — ten sam gracz zawsze dostaje
 * ten sam wzór, bez wrzucania zdjęć (aplikacja nie ma kont).
 */
function nameSeed(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface CyberPortraitProps {
  name: string;
  color: string;
  size?: number;
}

export function CyberPortrait({ name, color, size = 60 }: CyberPortraitProps) {
  const uid = useId().replace(/:/g, '');
  const seed = nameSeed(name || '?');
  const initials = (name || '?').slice(0, 2).toUpperCase();
  const cells = 5;
  const bits: boolean[] = [];
  let cursor = seed;
  for (let i = 0; i < cells * cells; i++) {
    bits.push((cursor & 1) === 1);
    cursor = (Math.imul(cursor, 1103515245) + 12345) >>> 0;
  }
  const visorY = 18 + (seed % 8);
  const accent = color;

  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--co-void)',
      }}
    >
      <svg viewBox="0 0 80 80" width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`cp-bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.08" />
          </linearGradient>
          <clipPath id={`cp-clip-${uid}`}>
            <rect x="0" y="0" width="80" height="80" />
          </clipPath>
        </defs>
        <rect width="80" height="80" fill={`url(#cp-bg-${uid})`} />
        <g clipPath={`url(#cp-clip-${uid})`}>
          {bits.map((on, i) => {
            if (!on) return null;
            const x = (i % cells) * 16;
            const y = Math.floor(i / cells) * 16;
            return (
              <rect
                key={i}
                x={x + 1}
                y={y + 1}
                width="14"
                height="14"
                fill={accent}
                opacity={0.22 + ((i * 7) % 5) * 0.06}
              />
            );
          })}
          <rect x="8" y={visorY} width="64" height="10" fill={accent} opacity="0.45" />
          <rect x="0" y="0" width="6" height="80" fill={accent} opacity="0.35" />
          <rect x="74" y="0" width="6" height="80" fill={accent} opacity="0.35" />
          <line x1="0" y1="28" x2="80" y2="52" stroke={accent} strokeWidth="1" opacity="0.35" />
          <line x1="0" y1="60" x2="80" y2="40" stroke={accent} strokeWidth="1" opacity="0.2" />
        </g>
      </svg>
      <span style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...FONT.display(size >= 56 ? TEXT.h3 : size >= 40 ? TEXT.lead : TEXT.base, TRACK.tight),
        color: 'var(--co-text-hi)',
        textShadow: '0 1px 8px var(--co-void)',
        pointerEvents: 'none',
        lineHeight: 1,
      }}>
        {initials}
      </span>
    </div>
  );
}
