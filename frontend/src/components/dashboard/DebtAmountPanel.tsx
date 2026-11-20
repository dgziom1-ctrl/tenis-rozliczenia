import type { KeyboardEvent } from 'react';
import { TriangleAlert } from 'lucide-react';
import { FONT, CLIP, TEXT } from '@/constants/styles';
import { formatAmountShort } from '@/utils/format';

interface DebtAmountPanelProps {
  /** Kwota salda w trakcie animacji licznika (wartość bezwzględna). */
  animatedAbs: number;
  isPending: boolean;
  hasCredit: boolean;
  flash: boolean;
  settling: boolean;
  adminMode: boolean;
  ariaLabel: string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/** Kwota zaległości albo nadpłaty gracza; jednocześnie przełącznik trybu edycji wpłat. */
export default function DebtAmountPanel({
  animatedAbs, isPending, hasCredit, flash, settling, adminMode, ariaLabel, onClick, onKeyDown,
}: DebtAmountPanelProps) {
  return (
    <div
      className={`${flash ? 'debt-flash' : ''} ${settling ? 'debt-settling' : ''}`.trim()}
      role="button"
      tabIndex={0}
      aria-pressed={adminMode}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{
        minHeight: 84,
        padding: '12px',
        marginBottom: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: isPending
          ? 'var(--co-tint-rose)'
          : hasCredit ? 'var(--co-tint-green)'
          : 'var(--co-tint)',
        border: `1px solid ${isPending
          ? 'var(--co-rose)'
          : hasCredit ? 'var(--co-green)'
          : 'var(--co-tint-line)'}`,
        clipPath: CLIP.tag,
        cursor: 'default', userSelect: 'none',
        position: 'relative', overflow: 'hidden',
        textAlign: 'center',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >


      {hasCredit ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-green)', letterSpacing: 'normal', marginBottom: 2 }}>
            ↑ Nadpłata
          </div>
          <p style={{ ...FONT.tech('2.5rem', 700), color: 'var(--co-green)', margin: 0, lineHeight: 1 }}>
            +{formatAmountShort(animatedAbs)}
            <span style={{ ...FONT.display(TEXT.lead), color: 'var(--co-dim)', marginLeft: 4, letterSpacing: 'normal' }}>zł</span>
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{
            ...FONT.tech('2.5rem', 700),
            margin: 0, lineHeight: 1.1,
            color: isPending ? 'var(--co-rose)' : 'var(--co-green)',
            textShadow: isPending ? 'var(--glow-rose-md)' : 'var(--glow-cyan-md)',
          }}>
            {formatAmountShort(animatedAbs)}
            <span style={{ ...FONT.display(TEXT.lead), color: 'var(--co-dim)', marginLeft: 4, letterSpacing: 'normal' }}>zł</span>
          </p>
        </div>
      )}
      {adminMode && (
        <p style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...FONT.mono(TEXT.tiny), color: 'var(--co-rose)', letterSpacing: 'normal', marginTop: 4, position: 'relative', zIndex: 1 }}>
          <TriangleAlert size={12} aria-hidden="true" /> Tryb edycji
        </p>
      )}
    </div>
  );
}
