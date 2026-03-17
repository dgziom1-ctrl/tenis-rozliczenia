import { ChevronDown, Minus } from 'lucide-react';
import { useThemeTokens } from '../../context/ThemeContext';
import { formatDate, formatAmountShort } from '../../utils/format';

export default function BreakdownPanel({ playerName, open, onToggle, breakdown, adminMode, onRemovePayment }) {
  const tokens = useThemeTokens();
  const sessionCount = breakdown?.sessions?.length ?? 0;
  const toggleLabel  = open
    ? 'Zwiń szczegóły'
    : sessionCount > 0
      ? `Skąd ta kwota? (${sessionCount} sesje)`
      : 'Skąd ta kwota?';

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        width: '100%', padding: '6px 10px',
        background: 'transparent', border: '1px solid var(--cz-border)',
        cursor: 'pointer', transition: 'all 0.15s',
        clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
        fontFamily: 'var(--font-display)', fontSize: '1.3rem',
        letterSpacing: '0.14em', color: 'rgba(232,89,10,0.5)', textTransform: 'uppercase',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,89,10,0.25)'; e.currentTarget.style.color = 'var(--cz-orange)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = 'rgba(232,89,10,0.5)'; }}
      >
        <span style={{ display: 'inline-flex', transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <ChevronDown size={12} />
        </span>
        {toggleLabel}
      </button>

      {open && breakdown && (
        <div style={{
          marginTop: 4,
          background: '#06060a',
          border: '1px solid var(--cz-border)',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          overflow: 'hidden',
        }}>
          {/* Sessions */}
          {breakdown.sessions.length > 0 ? (
            <>
              <TerminalSectionHeader label="Sesje" />
              {breakdown.sessions.map((item, idx) => (
                <TerminalRow key={idx}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#555' }}>{formatDate(item.date)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cz-blood)', fontWeight: 600 }}>
                    -{formatAmountShort(item.amount)} ZŁ
                  </span>
                </TerminalRow>
              ))}
              {breakdown.sessions.length > 1 && (
                <TerminalRow highlight="rgba(255,0,51,0.04)">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: '#444', textTransform: 'uppercase' }}>RAZEM SESJE</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cz-blood)' }}>
                    -{formatAmountShort(breakdown.totalSessions)} ZŁ
                  </span>
                </TerminalRow>
              )}
            </>
          ) : (
            <TerminalRow>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#333' }}>Brak niezapłaconych sesji</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cz-acid)' }}>✓</span>
            </TerminalRow>
          )}

          {/* Payments */}
          {breakdown.payments.length > 0 && (
            <>
              <TerminalSectionHeader label="Wpłaty" />
              {breakdown.payments.map((item, idx) => (
                <TerminalRow key={idx}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#555' }}>
                    {item.id === '__legacy_settled__' ? 'Rozliczono' : formatDate(item.date)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cz-orange)', fontWeight: 600 }}>
                      +{formatAmountShort(item.amount)} ZŁ
                    </span>
                    {adminMode && item.id !== '__legacy_settled__' && (
                      <button onClick={() => onRemovePayment(playerName, item.id)} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--cz-blood)', opacity: 0.4, padding: '1px 2px', lineHeight: 1,
                        fontSize: '0.7rem', transition: 'opacity 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
                        title="Usuń wpłatę"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </TerminalRow>
              ))}
              {breakdown.payments.length > 1 && (
                <TerminalRow highlight="rgba(232,89,10,0.03)">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: '#444', textTransform: 'uppercase' }}>RAZEM WPŁACONO</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cz-orange)' }}>
                    +{formatAmountShort(breakdown.totalPaid)} ZŁ
                  </span>
                </TerminalRow>
              )}
            </>
          )}

          {/* Balance line */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(232,89,10,0.04)',
            borderTop: '1px solid rgba(232,89,10,0.1)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.15em', color: '#666', textTransform: 'uppercase' }}>
              ◈ SALDO
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600,
              color: breakdown.balance > 0.01 ? 'var(--cz-blood)'
                   : breakdown.balance < -0.01 ? 'var(--cz-orange)'
                   : 'var(--cz-acid)',
            }}>
              {breakdown.balance > 0.01
                ? `DO ZAPŁATY: ${formatAmountShort(breakdown.balance)} ZŁ`
                : breakdown.balance < -0.01
                  ? `NADPŁATA: +${formatAmountShort(Math.abs(breakdown.balance))} ZŁ`
                  : '✓ ROZLICZONY'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TerminalSectionHeader({ label }) {
  return (
    <div style={{
      padding: '5px 12px',
      borderBottom: '1px solid var(--cz-border)',
      fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700,
      letterSpacing: '0.2em', textTransform: 'uppercase', color: '#333',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ color: 'var(--cz-acid)', fontSize: '0.66rem' }}>{'>'}</span>
      {label}
    </div>
  );
}

function TerminalRow({ children, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      background: highlight || 'transparent',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => { if (!highlight) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
      onMouseLeave={e => { if (!highlight) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </div>
  );
}
