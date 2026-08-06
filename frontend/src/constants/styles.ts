import type { CSSProperties } from 'react';

export const CLIP = {
  panel: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
  card: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
  badge: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
  smallCard: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
  tag: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
} as const;

export const FONT = {
  display: (size = '1rem', spacing = '0.08em'): CSSProperties => ({
    fontFamily: 'var(--font-display)',
    fontSize: size,
    letterSpacing: spacing,
    textTransform: 'uppercase',
  }),
  mono: (size = '0.7rem'): CSSProperties => ({
    fontFamily: 'var(--font-mono)',
    fontSize: size,
  }),
  monoLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.52rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--co-dim)',
  } as CSSProperties,
  monoSmall: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.58rem',
    color: 'var(--co-dim)',
  } as CSSProperties,
  monoTiny: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.5rem',
    color: 'var(--co-dim)',
  } as CSSProperties,
  monoMicro: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.42rem',
    color: 'var(--co-dim)',
  } as CSSProperties,
};

export const PANEL = {
  base: {
    background: 'var(--co-panel)',
    border: '1px solid var(--co-border)',
  } as CSSProperties,
  cyberCut: {
    background: 'var(--co-panel)',
    border: '1px solid var(--co-border)',
    clipPath: CLIP.panel,
    padding: 24,
    position: 'relative',
  } as CSSProperties,
};
