import { RotateCcw } from 'lucide-react';
import { useThemeTokens } from '../../context/ThemeContext';

export default function UndoBar({ message, secondsLeft, progressPct, onUndo, buttonLabel = 'COFNIJ', compact = false }) {
  const tokens = useThemeTokens();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      position: 'relative', overflow: 'hidden',
      padding: compact ? '8px 12px' : '12px 16px',
      background: tokens.undoBg,
      border: `1px solid ${tokens.undoBorder}`,
      boxShadow: compact ? 'none' : '0 0 16px rgba(252,227,0,0.08)',
      clipPath: compact
        ? 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)'
        : 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        height: compact ? 2 : 2,
        width: `${progressPct}%`,
        background: 'var(--cyber-yellow)',
        boxShadow: '0 0 6px var(--cyber-yellow)',
        transition: 'width 1s linear',
      }} />

      {/* Message */}
      <span style={{
        fontFamily: compact ? 'var(--font-mono)' : 'var(--font-display)',
        fontSize: compact ? '0.65rem' : '0.7rem',
        fontWeight: 600,
        letterSpacing: compact ? '0.02em' : '0.08em',
        color: tokens.undoText,
        display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap',
      }}>
        {message}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.58rem',
          color: tokens.mutedText, opacity: 0.7, flexShrink: 0,
        }}>
          ({secondsLeft}s)
        </span>
      </span>

      {/* Undo button */}
      <button onClick={onUndo} style={{
        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        padding: compact ? '4px 8px' : '6px 12px',
        background: 'transparent',
        border: `1px solid ${tokens.undoBorder}`,
        color: 'var(--cyber-yellow)',
        cursor: 'pointer', transition: 'all 0.15s',
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: compact ? '0.45rem' : '0.52rem', letterSpacing: '0.12em',
        textTransform: 'uppercase',
        clipPath: compact
          ? 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)'
          : 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(252,227,0,0.08)'; e.currentTarget.style.borderColor = 'var(--cyber-yellow)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = tokens.undoBorder; }}
      >
        <RotateCcw size={compact ? 10 : 12} /> {buttonLabel}
      </button>
    </div>
  );
}
