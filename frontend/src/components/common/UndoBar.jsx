import { RotateCcw } from 'lucide-react';
import { useThemeTokens } from '../../context/ThemeContext';

/**
 * Generic undo toast bar with progress indicator.
 *
 * Props:
 *   message      — main label text (node/string)
 *   secondsLeft  — countdown integer
 *   progressPct  — 0–100, width of the progress bar
 *   onUndo       — called when user clicks the undo button
 *   buttonLabel  — optional override (default: 'COFNIJ')
 *   compact      — smaller variant for in-card use (default: false)
 */
export default function UndoBar({ message, secondsLeft, progressPct, onUndo, buttonLabel = 'COFNIJ', compact = false }) {
  const tokens = useThemeTokens();

  return (
    <div
      className={`flex items-center justify-between gap-2 relative overflow-hidden ${compact ? 'rounded-xl px-3 py-2' : 'p-4 gap-4'}`}
      style={{
        background:   tokens.undoBg,
        border:       `${compact ? 1 : 2}px solid ${tokens.undoBorder}`,
        borderRadius: compact ? tokens.modalRadius : tokens.modalRadius,
        boxShadow:    compact ? undefined : tokens.modalShadow,
      }}
    >
      <div
        className={`absolute bottom-0 left-0 transition-all duration-1000 ${compact ? 'h-0.5' : 'h-1'}`}
        style={{ width: `${progressPct}%`, background: tokens.undoProgressBg }}
      />

      <span
        className={`font-bold flex items-center gap-1 min-w-0 ${compact ? 'text-xs' : 'text-sm flex-wrap'}`}
        style={{ color: tokens.undoText, fontFamily: compact ? undefined : tokens.fontFamily }}
      >
        {message}
        <span className="font-mono opacity-60 flex-shrink-0" style={{ fontSize: compact ? '0.7rem' : '0.75rem', color: tokens.mutedText }}>
          ({secondsLeft}s)
        </span>
      </span>

      <button
        onClick={onUndo}
        className={`flex items-center gap-1 font-bold flex-shrink-0 transition-all hover:opacity-80 ${compact ? 'text-xs px-2 py-1 rounded-lg' : 'text-sm px-4 py-2'}`}
        style={{
          border:       `${compact ? 1 : 2}px solid ${tokens.undoBorder}`,
          color:        compact ? tokens.accentText : tokens.undoText,
          borderRadius: tokens.modalRadius,
          background:   'transparent',
        }}
      >
        <RotateCcw size={compact ? 11 : 14} /> {buttonLabel}
      </button>
    </div>
  );
}
