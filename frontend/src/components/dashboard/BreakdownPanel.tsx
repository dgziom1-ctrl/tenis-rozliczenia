import { useState } from 'react';
import { formatDate, formatAmountShort } from '@/utils/format';
import { FONT, TEXT, TRACK } from '@/constants/styles';
import { TerminalPanel, TerminalSectionHeader, TerminalRow, TerminalFooter } from './TerminalPanel';
import type { DebtCarryOver, DebtDisplayData } from '@/types/ui';
import type { TransactionResult } from '@/types/domain';

/**
 * Bilans zamknięcia poprzednich sezonów jako jeden wiersz.
 *
 * Wypisanie wszystkich sesji od początku istnienia grupy zrobiłoby z panelu
 * listę bez końca, a zwykłe pominięcie ich kazałoby uwierzyć, że kwota wzięła
 * się znikąd. Dlatego jedna pozycja, którą da się rozwinąć do pełnej listy.
 */
function CarryOverSection({ carryOver }: { carryOver: DebtCarryOver }) {
  const [open, setOpen] = useState(false);

  const { amount, fromYear, toYear } = carryOver;
  const years = fromYear === toYear ? String(fromYear) : `${fromYear}–${toYear}`;
  const detailCount = carryOver.sessions.length + carryOver.payments.length;

  const owed = amount > 0.01;
  const overpaid = amount < -0.01;
  const label = owed ? `Zaległość z ${years}` : overpaid ? `Nadpłata z ${years}` : `Sezon ${years} rozliczony`;
  const color = owed ? 'var(--co-rose)' : overpaid ? 'var(--co-cyan)' : 'var(--co-green)';
  const value = owed
    ? `-${formatAmountShort(amount)} ZŁ`
    : overpaid
      ? `+${formatAmountShort(Math.abs(amount))} ZŁ`
      : '✓';

  return (
    <>
      <TerminalSectionHeader label="Poprzednie sezony" />
      <TerminalRow highlight={owed ? 'var(--co-tint-rose)' : undefined}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="icon-btn"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            minHeight: 32, padding: '2px 0', flex: 1, textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...FONT.mono(TEXT.small), color: 'var(--co-dim)',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--co-green)' }}>{open ? '−' : '+'}</span>
          {label}
          <span style={{ ...FONT.monoMicro }}>({detailCount})</span>
        </button>
        <span style={{ ...FONT.mono(TEXT.small), color }}>{value}</span>
      </TerminalRow>

      {open && carryOver.sessions.map(item => (
        <TerminalRow key={item.sessionId}>
          <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', paddingLeft: 14 }}>
            {formatDate(item.date)}
          </span>
          <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-rose)' }}>
            -{formatAmountShort(item.amount)} ZŁ
          </span>
        </TerminalRow>
      ))}
      {open && carryOver.payments.map(item => (
        <TerminalRow key={item.id}>
          <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', paddingLeft: 14 }}>
            {item.id === '__legacy_settled__'
              ? (item.date ? `Rozliczono ${formatDate(item.date)}` : 'Rozliczono')
              : `Wpłata ${formatDate(item.date)}`}
          </span>
          <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-cyan)' }}>
            +{formatAmountShort(item.amount)} ZŁ
          </span>
        </TerminalRow>
      ))}
    </>
  );
}

interface BreakdownPanelProps {
  playerName: string;
  open: boolean;
  onToggle: () => void;
  breakdown: DebtDisplayData | null;
  adminMode: boolean;
  onRemovePayment: (playerName: string, paymentId: string) => Promise<TransactionResult>;
}

export default function BreakdownPanel({ playerName, open, onToggle, breakdown, adminMode, onRemovePayment }: BreakdownPanelProps) {
  // Licznik obejmuje też sesje zwinięte do bilansu otwarcia — inaczej po
  // przełomie roku przycisk obiecywałby dwie sesje, a saldo liczyło pięćdziesiąt.
  const sessionCount = (breakdown?.sessions?.length ?? 0) + (breakdown?.carryOver?.sessions.length ?? 0);
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
      {breakdown.carryOver && <CarryOverSection carryOver={breakdown.carryOver} />}

      {/* Sessions */}
      {breakdown.sessions.length > 0 ? (
        <>
          <TerminalSectionHeader label={breakdown.carryOver ? 'Sesje — bieżący sezon' : 'Sesje'} />
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
      ) : !breakdown.carryOver && (
        <TerminalRow>
          <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)' }}>Brak niezapłaconych sesji</span>
          <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-green)' }}>✓</span>
        </TerminalRow>
      )}

      {/* Payments */}
      {breakdown.payments.length > 0 && (
        <>
          <TerminalSectionHeader label={breakdown.carryOver ? 'Wpłaty — bieżący sezon' : 'Wpłaty'} />
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
