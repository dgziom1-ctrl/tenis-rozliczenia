import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';

/**
 * Rozwijana lista w stylu terminala.
 *
 * `BreakdownPanel` i `TreasurerPanel` były niemal identycznymi bliźniakami —
 * ten sam przycisk (17 właściwości stylu), ta sama para handlerów hover, ten
 * sam kontener, ten sam nagłówek sekcji, ten sam wiersz i ta sama stopka
 * z sumą. Jedyną realną różnicą było `maxHeight`. Nawet komentarz w kodzie
 * przyznawał: „same style as BreakdownPanel".
 */

interface TerminalPanelProps {
  open: boolean;
  onToggle: () => void;
  toggleLabel: string;
  children: ReactNode;
  footer: ReactNode;
}

export function TerminalPanel({ open, onToggle, toggleLabel, children, footer }: TerminalPanelProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="icon-btn"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', minHeight: 44, padding: '8px 10px',
          background: 'transparent', border: '1px solid var(--co-border)',
          cursor: 'pointer',
          clipPath: CLIP.badge,
          ...FONT.display(TEXT.base, TRACK.normal),
          color: 'var(--co-cyan)',
        }}
      >
        <span aria-hidden="true" style={{ display: 'inline-flex', transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <ChevronDown size={14} />
        </span>
        {toggleLabel}
      </button>

      {open && (
        <div style={{
          marginTop: 4,
          background: 'var(--co-surface-2)',
          border: '1px solid var(--co-border)',
          clipPath: CLIP.card,
          overflow: 'hidden',
          maxHeight: 'min(320px, 55vh)',
          overflowY: 'auto',
        }}>
          {children}
          {footer}
        </div>
      )}
    </div>
  );
}

export function TerminalSectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '6px 12px',
      borderBottom: '1px solid var(--co-border)',
      ...FONT.display(TEXT.tiny, TRACK.wide),
      color: 'var(--co-dim)',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span aria-hidden="true" style={{ color: 'var(--co-green)' }}>{'>'}</span>
      {label}
    </div>
  );
}

interface TerminalRowProps {
  children: ReactNode;
  highlight?: string;
}

export function TerminalRow({ children, highlight }: TerminalRowProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
      padding: '6px 12px',
      borderBottom: '1px solid var(--co-separator)',
      background: highlight || 'transparent',
    }}>
      {children}
    </div>
  );
}

interface TerminalFooterProps {
  label: string;
  value: ReactNode;
  valueColor: string;
  tint?: string;
}

export function TerminalFooter({ label, value, valueColor, tint = 'var(--co-tint)' }: TerminalFooterProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: tint,
      borderTop: '1px solid var(--co-border)',
    }}>
      <span style={{ ...FONT.display(TEXT.tiny, TRACK.wide), color: 'var(--co-dim)' }}>
        ◈ {label}
      </span>
      <span style={{ ...FONT.mono(TEXT.small), color: valueColor }}>
        {value}
      </span>
    </div>
  );
}
