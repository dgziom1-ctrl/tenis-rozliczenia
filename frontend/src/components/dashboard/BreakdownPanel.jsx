import { ChevronDown, ChevronUp } from 'lucide-react';
import { useThemeTokens } from '../../context/ThemeContext';
import { formatDate, formatAmountShort } from '../../utils/format';

export default function BreakdownPanel({ playerName, open, onToggle, breakdown, adminMode, onRemovePayment }) {
  const tokens = useThemeTokens();

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="text-xs font-bold flex items-center justify-center gap-1 mx-auto py-1 px-2 rounded transition-colors"
        style={{ color: tokens.accentText }}
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Skąd ta kwota?
      </button>

      {open && breakdown && (
        <div
          className="mt-2 rounded-lg text-xs border text-left shadow-inner overflow-hidden"
          style={{ background: tokens.cellBg, borderColor: tokens.cellBorder }}
        >
          {/* Sessions */}
          {breakdown.sessions.length > 0 && (
            <>
              <SectionHeader label="Sesje" tokens={tokens} />
              {breakdown.sessions.map((item, idx) => (
                <Row key={idx} tokens={tokens}>
                  <span style={{ color: tokens.mutedText }}>{formatDate(item.date)}</span>
                  <span className="font-bold" style={{ color: '#f87171' }}>
                    −{formatAmountShort(item.amount)} zł
                  </span>
                </Row>
              ))}
              <Row tokens={tokens} highlight="rgba(248,113,113,0.06)">
                <span style={{ color: tokens.mutedText }}>Razem sesje</span>
                <span className="font-bold" style={{ color: '#f87171' }}>
                  −{formatAmountShort(breakdown.totalSessions)} zł
                </span>
              </Row>
            </>
          )}

          {/* Payments */}
          {breakdown.payments.length > 0 && (
            <>
              <SectionHeader label="Wpłaty" tokens={tokens} />
              {breakdown.payments.map((item, idx) => (
                <Row key={idx} tokens={tokens}>
                  <span style={{ color: tokens.mutedText }}>
                    {formatDate(item.date)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: tokens.accentText }}>
                      +{formatAmountShort(item.amount)} zł
                    </span>
                    {adminMode && (
                      <button
                        onClick={() => onRemovePayment(playerName, item.id)}
                        className="opacity-40 hover:opacity-100 transition-opacity leading-none"
                        style={{ color: '#f87171' }}
                        title="Usuń wpłatę"
                      >
                        🗑
                      </button>
                    )}
                  </span>
                </Row>
              ))}
              <Row tokens={tokens} highlight={tokens.accentBg}>
                <span style={{ color: tokens.mutedText }}>Razem wpłaty</span>
                <span className="font-bold" style={{ color: tokens.accentText }}>
                  +{formatAmountShort(breakdown.totalPaid)} zł
                </span>
              </Row>
            </>
          )}

          {/* Balance */}
          <div
            className="flex justify-between px-3 py-2 font-black text-sm"
            style={{ background: tokens.accentBg, borderTop: `2px solid ${tokens.accentBorder}` }}
          >
            <span style={{ color: tokens.bodyText }}>Saldo</span>
            <span style={{
              color: breakdown.balance > 0.01 ? '#f87171'
                   : breakdown.balance < -0.01 ? tokens.accentText
                   : '#4ade80',
            }}>
              {breakdown.balance > 0.01
                ? `−${formatAmountShort(breakdown.balance)} zł`
                : breakdown.balance < -0.01
                  ? `+${formatAmountShort(Math.abs(breakdown.balance))} zł`
                  : '✓ 0 zł'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, tokens }) {
  return (
    <div
      className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase"
      style={{ color: tokens.cellLabelText, borderBottom: `1px solid ${tokens.cellBorder}` }}
    >
      {label}
    </div>
  );
}

function Row({ children, tokens, highlight }) {
  return (
    <div
      className="flex justify-between items-center px-3 py-1.5"
      style={{
        borderBottom: `1px solid ${tokens.cellBorder}`,
        ...(highlight ? { background: highlight } : {}),
      }}
    >
      {children}
    </div>
  );
}
