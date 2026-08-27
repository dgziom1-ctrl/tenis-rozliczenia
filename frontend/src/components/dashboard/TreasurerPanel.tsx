import { ORGANIZER_NAME, SETTLED_THRESHOLD } from '@/constants';
import { formatAmountShort } from '@/utils/format';
import { FONT, TEXT } from '@/constants/styles';
import { TerminalPanel, TerminalSectionHeader, TerminalRow, TerminalFooter } from './TerminalPanel';
import type { PlayerStats } from '@/types/ui';

function Row({ name, amount, color }: { name: string; amount: string; color: string }) {
  return (
    <TerminalRow>
      <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)' }}>{name}</span>
      <span style={{ ...FONT.mono(TEXT.small), color }}>{amount}</span>
    </TerminalRow>
  );
}

interface TreasurerPanelProps {
  players: PlayerStats[];
  open: boolean;
  onToggle: () => void;
}

export default function TreasurerPanel({ players, open, onToggle }: TreasurerPanelProps) {
  const nonOrg = players.filter(p => p.name !== ORGANIZER_NAME);
  const debtors  = nonOrg.filter(p => p.currentDebt  >  SETTLED_THRESHOLD).sort((a, b) => b.currentDebt - a.currentDebt);
  const creditors = nonOrg.filter(p => p.currentDebt < -SETTLED_THRESHOLD);
  const settled  = nonOrg.filter(p => Math.abs(p.currentDebt) <= SETTLED_THRESHOLD);

  const netToRecover = debtors.reduce((s, p) => s + p.currentDebt, 0)
    - creditors.reduce((s, p) => s + Math.abs(p.currentDebt), 0);

  const toggleLabel = open
    ? 'Zwiń szczegóły'
    : debtors.length > 0
      ? `Do wpłaty (${debtors.length})`
      : 'Podsumowanie';

  return (
    <TerminalPanel
      open={open}
      onToggle={onToggle}
      toggleLabel={toggleLabel}
      footer={
        <TerminalFooter
          label="DO ZEBRANIA"
          value={`${formatAmountShort(Math.max(0, netToRecover))} ZŁ`}
          valueColor={netToRecover > SETTLED_THRESHOLD ? 'var(--co-green)' : 'var(--co-cyan)'}
          tint="var(--co-tint-green)"
        />
      }
    >
      {/* Debtors — still owe */}
      {debtors.length > 0 && (
        <>
          <TerminalSectionHeader label="Do wpłaty" />
          {debtors.map(p => (
            <Row key={p.name} name={p.name} amount={`${formatAmountShort(p.currentDebt)} ZŁ`} color="var(--co-rose)" />
          ))}
        </>
      )}

      {/* Creditors — overpaid (reduce Kamil's net recovery) */}
      {creditors.length > 0 && (
        <>
          <TerminalSectionHeader label="Nadpłata" />
          {creditors.map(p => (
            <Row key={p.name} name={p.name} amount={`+${formatAmountShort(Math.abs(p.currentDebt))} ZŁ`} color="var(--co-cyan)" />
          ))}
        </>
      )}

      {/* Settled players */}
      {settled.length > 0 && (
        <>
          <TerminalSectionHeader label="Rozliczeni" />
          {settled.map(p => (
            <Row key={p.name} name={p.name} amount="✓" color="var(--co-green)" />
          ))}
        </>
      )}
    </TerminalPanel>
  );
}
