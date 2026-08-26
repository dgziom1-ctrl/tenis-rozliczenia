import { useState, useRef, useEffect, useId } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Lock, Check, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ADMIN_PASSWORD, isAdminPasswordConfigured, SOUND_TYPES } from '@/constants';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { SoundType } from '@/types/ui';

/** Jak długo świeci komunikat o złym haśle. */
const ERROR_FLASH_MS = 1500;

export interface PasswordModalProps {
  action?: string;
  onConfirm: () => void;
  onCancel: () => void;
  playSound?: (type: SoundType) => void;
}

// ─── Shared PasswordModal ────────────────────────────────────────
export function PasswordModal({ action, onConfirm, onCancel, playSound }: PasswordModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();
  const inputId = useId();
  const configured = isAdminPasswordConfigured();

  useFocusTrap(overlayRef);
  useEffect(() => { overlayRef.current?.focus(); }, []);
  useEffect(() => () => { if (errorTimer.current) clearTimeout(errorTimer.current); }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Gdy hasła nie skonfigurowano, `input === ADMIN_PASSWORD` byłoby prawdą
    // dla pustego pola i puszczało dalej każdego — dlatego blokujemy wprost.
    if (configured && input === ADMIN_PASSWORD) {
      onConfirm();
      return;
    }
    setError(true);
    setInput('');
    playSound?.(SOUND_TYPES.ERROR);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(false), ERROR_FLASH_MS);
  };

  return (
    <div
      ref={overlayRef}
      style={{ background: 'var(--co-overlay, rgba(0,0,0,0.9))', backdropFilter: 'blur(4px)' }}
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      tabIndex={-1}
      onKeyDown={e => e.key === 'Escape' && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="modal-enter" style={{
        background: 'var(--co-panel)',
        border: `1px solid ${error ? 'var(--co-rose)' : 'rgba(0,229,255,0.3)'}`,
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        padding: 24, width: '100%', maxWidth: 360,
        boxShadow: error ? '0 0 30px rgba(255,32,144,0.3)' : '0 0 30px rgba(0,229,255,0.15)',
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Lock size={16} style={{ color: 'var(--co-cyan)', flexShrink: 0 }} />
          <h3 id={titleId} style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.15em', color: 'var(--co-cyan)', margin: 0, textTransform: 'uppercase' }}>
            Podaj hasło admina
          </h3>
        </div>
        {action && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--co-dim)', marginBottom: 16 }}>
            {'>'} {action}
          </p>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label htmlFor={inputId} className="sr-only">Hasło admina</label>
          <input
            id={inputId}
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="// ACCESS CODE..."
            autoFocus
            autoComplete="current-password"
            aria-invalid={error}
            className="cyber-input"
            style={{
              width: '100%', padding: '10px 12px',
              fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
              border: `1px solid ${error ? 'var(--co-rose)' : 'var(--co-border)'}`,
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              boxShadow: error ? '0 0 12px rgba(255,32,144,0.3)' : 'none',
            }}
          />
          {error && (
            <p role="alert" style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', letterSpacing: '0.15em', color: 'var(--co-rose)', textAlign: 'center' }}>
              {configured ? '⚠ Złe hasło' : '⚠ Hasło admina nie jest skonfigurowane'}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="cyber-button-yellow" style={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={14} /> POTWIERDŹ
            </button>
            <button type="button" onClick={onCancel} className="cyber-button-outline" style={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <X size={14} /> ANULUJ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  accent?: string;
  sub?: ReactNode;
}

// ─── Shared SectionHeader ────────────────────────────────────────
export function SectionHeader({ icon: Icon, title, accent = 'var(--co-cyan)', sub }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          padding: '5px 7px',
          background: `${accent}10`,
          border: `1px solid ${accent}28`,
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
        }}>
          <Icon size={13} style={{ color: accent, display: 'block' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: accent,
        }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}22, transparent)` }} />
      </div>
      {sub && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', letterSpacing: '0.1em', paddingLeft: 34 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
