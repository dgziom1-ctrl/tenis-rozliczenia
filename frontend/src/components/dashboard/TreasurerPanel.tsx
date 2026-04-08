import { ChevronDown } from 'lucide-react';
import { ORGANIZER_NAME, SETTLED_THRESHOLD } from '@/constants';
import { formatAmountShort } from '@/utils/format';
import type { PlayerStats } from '@/types/ui';

// ─── Per-row helpers ─────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '5px 12px',
      borderBottom: '1px solid var(--co-border)',
      fontFamily: 'var(--font-display)', fontSize: '0.82rem',
      letterSpacing: '0.2em', textTransform: 'uppercase',
      color: 'rgba(0,229,255,0.25)',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ color: 'var(--co-green)', fontSize: '0.66rem' }}>{'>'}</span>
      {label}
    </div>
  );
}

function Row({ name, amount, color }: { name: string; amount: string; color: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 12px',
      borderBottom: '1px solid var(--co-separator)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-text)' }}>
        {name}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color, fontWeight: 600 }}>
        {amount}
      </span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────
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
      ? `Kto jest winien? (${debtors.length})`
      : 'Podsumowanie';

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Toggle button — same style as BreakdownPanel */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '6px 10px',
          background: 'transparent', border: '1px solid var(--co-border)',
          cursor: 'pointer', transition: 'all 0.15s',
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          fontFamily: 'var(--font-display)', fontSize: '1.3rem',
          letterSpacing: '0.14em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)';
          e.currentTarget.style.color = 'var(--co-cyan)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--co-border)';
          e.currentTarget.style.color = 'rgba(0,229,255,0.5)';
        }}
      >
        <span style={{
          display: 'inline-flex', transition: 'transform 0.25s',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>
          <ChevronDown size={12} />
        </span>
        {toggleLabel}
      </button>

      {open && (
        <div style={{
          marginTop: 4,
          background: 'var(--co-dark)',
          border: '1px solid var(--co-border)',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          overflow: 'hidden',
          maxHeight: 'min(320px, 55vh)',
          overflowY: 'auto',
        }}>

          {/* Debtors — still owe */}
          {debtors.length > 0 && (
            <>
              <SectionHeader label="Do oddania" />
              {debtors.map(p => (
                <Row
                  key={p.name}
                  name={p.name}
                  amount={`${formatAmountShort(p.currentDebt)} ZŁ`}
                  color="var(--co-rose)"
                />
              ))}
            </>
          )}

          {/* Creditors — overpaid (reduce Kamil's net recovery) */}
          {creditors.length > 0 && (
            <>
              <SectionHeader label="Nadpłacili" />
              {creditors.map(p => (
                <Row
                  key={p.name}
                  name={p.name}
                  amount={`+${formatAmountShort(Math.abs(p.currentDebt))} ZŁ`}
                  color="var(--co-cyan)"
                />
              ))}
            </>
          )}

          {/* Settled players */}
          {settled.length > 0 && (
            <>
              <SectionHeader label="Rozliczeni" />
              {settled.map(p => (
                <Row key={p.name} name={p.name} amount="✓" color="var(--co-green)" />
              ))}
            </>
          )}

          {/* Footer — net total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(0,255,136,0.04)',
            borderTop: '1px solid rgba(0,255,136,0.12)',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.85rem',
              letterSpacing: '0.15em', color: 'var(--co-dim)', textTransform: 'uppercase',
            }}>
              ◈ DO ODZYSKANIA
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600,
              color: netToRecover > SETTLED_THRESHOLD ? 'var(--co-green)' : 'var(--co-cyan)',
            }}>
              {formatAmountShort(Math.max(0, netToRecover))} ZŁ
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
