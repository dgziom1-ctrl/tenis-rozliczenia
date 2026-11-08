import type { ReactNode, CSSProperties } from 'react';
import { CLIP } from '@/constants/styles';

export type ToggleAccent = 'cyan' | 'green' | 'amber';

const ACCENTS: Record<ToggleAccent, { color: string; bg: string; border: string; glow: string }> = {
  cyan:  { color: 'var(--co-cyan)',  bg: 'var(--co-tint-hi)',   border: 'var(--co-cyan)',  glow: 'var(--co-tint-hi)' },
  green: { color: 'var(--co-green)', bg: 'var(--co-tint-green)', border: 'var(--co-green)', glow: 'var(--co-tint-green)' },
  amber: { color: 'var(--co-amber)', bg: 'var(--co-amber-dim)', border: 'var(--co-amber)', glow: 'var(--co-amber-dim)' },
};

interface ToggleChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  accent?: ToggleAccent;
  /** `mono` — krótkie wartości (liczby), `display` — imiona i etykiety. */
  font?: 'mono' | 'display';
  ariaLabel?: string;
  /** Mniejszy, „płaski" wariant do pasków filtrów (nadal 44 px wysokości celu dotyku). */
  compact?: boolean;
  style?: CSSProperties;
  className?: string;
}

/**
 * Wspólny przełącznik „zaznaczone / niezaznaczone".
 *
 * Wcześniej ten sam przycisk był skopiowany w kilku miejscach (wybór graczy,
 * korty, godziny, rakiety, filtry), z celami dotykowymi poniżej 44 px i bez
 * `aria-pressed`. Tutaj jest jedno miejsce, które pilnuje obu rzeczy.
 */
export default function ToggleChip({
  active, onClick, children, accent = 'cyan', font = 'display', ariaLabel, compact = false, style, className,
}: ToggleChipProps) {
  const a = ACCENTS[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={className}
      style={{
        minHeight: 44,
        padding: compact ? '4px 10px' : '10px 12px',
        cursor: 'pointer',
        transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        fontFamily: font === 'mono' ? 'var(--font-mono)' : 'var(--font-display)',
        fontSize: compact ? '0.8125rem' : '0.875rem',
        letterSpacing: 'normal',
        textTransform: 'none',
        clipPath: CLIP.badge,
        ...(active
          ? { background: a.bg, border: `1px solid ${a.border}`, color: a.color, boxShadow: compact ? 'none' : `0 0 10px ${a.glow}` }
          : { background: compact ? 'transparent' : 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)' }),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
