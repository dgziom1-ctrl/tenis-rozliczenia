import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';

export interface UndoBarProps {
  message: ReactNode;
  secondsLeft: number;
  progressPct: number;
  onUndo: () => void;
  buttonLabel?: string;
  compact?: boolean;
}

export default function UndoBar({ message, secondsLeft, progressPct, onUndo, buttonLabel = 'COFNIJ', compact = false }: UndoBarProps) {
  return (
    // aria-atomic="false" + ukryty licznik: bez tego czytnik ekranu czytałby
    // cały pasek od nowa co sekundę, przy każdym tyknięciu odliczania.
    <div role="status" aria-atomic="false" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      position: 'relative', overflow: 'hidden',
      padding: compact ? '8px 12px' : '12px 16px',
      background: 'var(--co-surface-2)',
      border: '1px solid var(--co-tint-line)',
      boxShadow: compact ? 'none' : 'var(--glow-box-cyan)',
      clipPath: compact ? CLIP.badge : CLIP.tag,
    }}>
      {/* Progress bar */}
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: 0, left: 0,
        height: 2,
        width: `${progressPct}%`,
        background: 'var(--co-cyan)',
        boxShadow: 'var(--glow-box-cyan)',
        transition: 'width 1s linear',
      }} />

      {/* Message */}
      <span style={{
        ...(compact ? FONT.mono(TEXT.small) : FONT.display(TEXT.small, TRACK.tight)),
        color: 'var(--co-text)',
        display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap',
      }}>
        {message}
        <span aria-hidden="true" style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', flexShrink: 0 }}>
          ({secondsLeft}s)
        </span>
      </span>

      {/* Undo button */}
      <button
        onClick={onUndo}
        className="cyber-button-outline"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0,
          minHeight: 36,
          padding: compact ? '6px 10px' : '8px 14px',
        }}
      >
        <RotateCcw size={compact ? 11 : 13} aria-hidden="true" /> {buttonLabel}
      </button>
    </div>
  );
}
