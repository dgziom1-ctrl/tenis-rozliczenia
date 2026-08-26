import { formatDate, formatAmountShort } from '@/utils/format';
import { FONT, TEXT, TRACK } from '@/constants/styles';
import { TerminalPanel, TerminalSectionHeader, TerminalRow, TerminalFooter } from './TerminalPanel';
import type { DebtDisplayData } from '@/types/ui';
import type { TransactionResult } from '@/types/domain';

interface BreakdownPanelProps {
  playerName: string;
  open: boolean;
  onToggle: () => void;
  breakdown: DebtDisplayData | null;
  adminMode: boolean;
  onRemovePayment: (playerName: string, paymentId: string) => Promise<TransactionResult>;
}

export default function BreakdownPanel({ playerName, open, onToggle, breakdown, adminMode, onRemovePayment }: BreakdownPanelProps) {
  const sessionCount = breakdown?.sessions?.length ?? 0;
  const toggleLabel  = open
    ? 'Zwiń szczegóły'
    : sessionCount > 0
      ? `Skąd ta kwota? (${sessionCount} sesje)`
      : 'Skąd ta kwota?';

  if (!open || !breakdown) {
    return <TerminalPanel open={false} onToggle={onToggle} toggleLabel={toggleLabel} footer={null}>{null}</TerminalPanel>;
  }

  const balanceColor = breakdown.balance > 0.01 ? 'var(--co-rose)'
    : breakdown.balance < -0.01 ? 'var(--co-cyan)'
    : 'var(--co-green)';

  const balanceLabel = breakdown.balance > 0.01
    ? `DO ZAPŁATY: ${formatAmountShort(breakdown.balance)} ZŁ`
    : breakdown.balance < -0.01
      ? `NADPŁATA: +${formatAmountShort(Math.abs(breakdown.balance))} ZŁ`
      : '✓ ROZLICZONY';

  return (
    <TerminalPanel
      open
      onToggle={onToggle}
      toggleLabel={toggleLabel}
      footer={<TerminalFooter label="SALDO" value={balanceLabel} valueColor={balanceColor} />}
    >
      {/* Sessions */}
      {breakdown.sessions.length > 0 ? (
        <>
          <TerminalSectionHeader label="Sesje" />
          {breakdown.sessions.map((item, idx) => (
            <TerminalRow key={idx}>
              <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)' }}>{formatDate(item.date)}</span>
              <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-rose)' }}>
                -{formatAmountShort(item.amount)} ZŁ
              </span>
            </TerminalRow>
          ))}
          {breakdown.sessions.length > 1 && (
            <TerminalRow highlight="var(--co-tint-rose)">
              <span style={{ ...FONT.display(TEXT.tiny, TRACK.normal), color: 'var(--co-dim)' }}>RAZEM SESJE</span>
              <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-rose)' }}>
                -{formatAmountShort(breakdown.totalSessions)} ZŁ
              </span>
            </TerminalRow>
          )}
        </>
      ) : (
        <TerminalRow>
          <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)' }}>Brak niezapłaconych sesji</span>
          <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-green)' }}>✓</span>
        </TerminalRow>
      )}

      {/* Payments */}
      {breakdown.payments.length > 0 && (
        <>
          <TerminalSectionHeader label="Wpłaty" />
          {breakdown.payments.map((item, idx) => (
            <TerminalRow key={idx}>
              <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)' }}>
                {item.id === '__legacy_settled__'
                  ? (item.date ? `Rozliczono ${formatDate(item.date)}` : 'Rozliczono')
                  : formatDate(item.date)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-cyan)' }}>
                  +{formatAmountShort(item.amount)} ZŁ
                </span>
                {/* Cel dotykowy miał ok. 15×13px przy 40% krycia — a to akcja
                    kasująca wpłatę. */}
                {adminMode && item.id !== '__legacy_settled__' && (
                  <button
                    onClick={() => onRemovePayment(playerName, item.id)}
                    className="icon-btn danger"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 32, height: 32, flexShrink: 0,
                      background: 'transparent', border: '1px solid var(--co-border)',
                      color: 'var(--co-rose)', cursor: 'pointer', lineHeight: 1,
                      fontSize: TEXT.small,
                    }}
                    title="Usuń wpłatę"
                    aria-label={`Usuń wpłatę ${formatAmountShort(item.amount)} zł z ${formatDate(item.date)}`}
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                )}
              </span>
            </TerminalRow>
          ))}
          {breakdown.payments.length > 1 && (
            <TerminalRow highlight="var(--co-tint)">
              <span style={{ ...FONT.display(TEXT.tiny, TRACK.normal), color: 'var(--co-dim)' }}>RAZEM WPŁACONO</span>
              <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-cyan)' }}>
                +{formatAmountShort(breakdown.totalPaid)} ZŁ
              </span>
            </TerminalRow>
          )}
        </>
      )}
    </TerminalPanel>
  );
}
