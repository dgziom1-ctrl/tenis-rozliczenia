import { FONT, CLIP, TEXT } from '@/constants/styles';
import { formatAmountShort } from '@/utils/format';

interface TreasurerAmountPanelProps {
  animatedAbs: number;
  isPending: boolean;
  hasCredit: boolean;
  flash: boolean;
}

/** Kwota skarbnika: ile zebrać od graczy, saldo dodatnie albo „wszyscy rozliczeni". */
export default function TreasurerAmountPanel({ animatedAbs, isPending, hasCredit, flash }: TreasurerAmountPanelProps) {
  return (
    <div
      className={flash ? 'debt-flash' : ''}
      style={{
        minHeight: 84,
        padding: '12px',
        marginBottom: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: hasCredit ? 'var(--co-tint-green)' : 'var(--co-tint)',
        border: `1px solid ${hasCredit ? 'var(--co-green)' : 'var(--co-tint-line)'}`,
        clipPath: CLIP.tag,
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      {hasCredit ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-green)', letterSpacing: 'normal', marginBottom: 2 }}>
            ↑ Do zebrania
          </div>
          <p style={{ ...FONT.tech('2.5rem', 700), color: 'var(--co-green)', margin: 0, lineHeight: 1, textShadow: 'var(--glow-green-md)' }}>
            +{formatAmountShort(animatedAbs)}
            <span style={{ ...FONT.display(TEXT.lead), color: 'var(--co-dim)', marginLeft: 4, letterSpacing: 'normal' }}>zł</span>
          </p>
          <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-green)', letterSpacing: 'normal', margin: '4px 0 0' }}>
            suma wpłat do zebrania od graczy
          </p>
        </div>
      ) : isPending ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-cyan)', letterSpacing: 'normal', marginBottom: 2 }}>
            ↕ Saldo
          </div>
          <p style={{ ...FONT.tech('2.5rem', 700), color: 'var(--co-cyan)', margin: 0, lineHeight: 1, textShadow: 'var(--glow-cyan-md)' }}>
            {formatAmountShort(animatedAbs)}
            <span style={{ ...FONT.display(TEXT.lead), color: 'var(--co-dim)', marginLeft: 4, letterSpacing: 'normal' }}>zł</span>
          </p>
          <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-cyan)', letterSpacing: 'normal', margin: '4px 0 0' }}>
            nadwyżka ponad zaległości
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ ...FONT.display(TEXT.h2), color: 'var(--co-green)', margin: 0, letterSpacing: 'normal', textShadow: 'var(--glow-green-md)' }}>
            ✓ Wszyscy rozliczeni
          </p>
        </div>
      )}
    </div>
  );
}
