import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface PlayerFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  playerNames: string[];
  filterPlayer: string;
  onSelect: (name: string) => void;
}

export default function PlayerFilterSheet({ isOpen, onClose, playerNames, filterPlayer, onSelect }: PlayerFilterSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) overlayRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      tabIndex={-1}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'var(--co-overlay, rgba(0,0,0,0.85))',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--co-panel)',
          border: '1px solid var(--co-border)',
          borderRadius: '12px 12px 0 0',
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--co-border)',
          background: 'rgba(0,229,255,0.03)',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.9rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--co-cyan)',
          }}>
            Filtr gracza
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              padding: 6,
              background: 'transparent',
              border: '1px solid var(--co-border)',
              cursor: 'pointer',
              color: 'var(--co-dim)',
            }}
            aria-label="Zamknij filtr"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => { onSelect(''); onClose(); }}
            style={{
              width: '100%',
              padding: '12px 14px',
              cursor: 'pointer',
              border: '1px solid var(--co-border)',
              background: !filterPlayer ? 'rgba(0,229,255,0.08)' : 'transparent',
              color: !filterPlayer ? 'var(--co-cyan)' : 'var(--co-dim)',
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            WSZYSCY
          </button>

          {playerNames?.map((name) => (
            <button
              key={name}
              onClick={() => { onSelect(name); onClose(); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                cursor: 'pointer',
                border: '1px solid var(--co-border)',
                background: filterPlayer === name ? 'rgba(0,229,255,0.08)' : 'transparent',
                color: filterPlayer === name ? 'var(--co-cyan)' : 'var(--co-dim)',
                clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.85rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
