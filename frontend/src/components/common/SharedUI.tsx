import { useState, useRef, useEffect, useId } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Lock, Check, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ADMIN_PASSWORD, isAdminPasswordConfigured, SOUND_TYPES } from '@/constants';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';
import Modal from './Modal';
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
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputId = useId();
  const errorId = useId();
  const configured = isAdminPasswordConfigured();

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
    // Kliknięcie w tło nie zamyka: hasło łatwo wpisać do połowy i zgubić.
    <Modal
      onClose={onCancel}
      title="Podaj hasło admina"
      icon={Lock}
      accent={error ? 'var(--co-rose)' : 'var(--co-cyan)'}
      maxWidth={380}
      closeOnBackdrop={false}
    >
      {action && (
        <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', marginBottom: 16 }}>
          {'>'} {action}
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor={inputId} className="sr-only">Hasło admina</label>
        {/* Ani `border`, ani `boxShadow` nie mogą tu być inline: styl inline bije
            regułę `.cyber-input:focus`, więc pole traciło całą oznakę fokusu.
            Stan błędu jedzie klasą. */}
        <input
          id={inputId}
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="// ACCESS CODE..."
          autoFocus
          autoComplete="current-password"
          aria-invalid={error}
          aria-describedby={error ? errorId : undefined}
          className={`cyber-input ${error ? 'input-error' : ''}`}
          style={{ width: '100%', padding: '12px 14px', clipPath: CLIP.tag }}
        />
        {error && (
          <p id={errorId} role="alert" style={{ ...FONT.display(TEXT.base, TRACK.normal), color: 'var(--co-rose)', textAlign: 'center', margin: 0 }}>
            {configured ? '⚠ Złe hasło' : '⚠ Hasło admina nie jest skonfigurowane'}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="cyber-button-yellow" style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={14} aria-hidden="true" /> POTWIERDŹ
          </button>
          <button type="button" onClick={onCancel} className="cyber-button-outline" style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <X size={14} aria-hidden="true" /> ANULUJ
          </button>
        </div>
      </form>
    </Modal>
  );
}

export interface PanelHeaderProps {
  icon: LucideIcon;
  title: string;
  sub?: ReactNode;
  accent?: string;
  /** Treść dosunięta do prawej — licznik, legenda. */
  aside?: ReactNode;
}

/**
 * Nagłówek na szczycie panelu zakładki — ikona w kafelku, tytuł, podtytuł
 * i linia oddzielająca. `AdminTab`, `PlayersTab` i `HistoryTab` miały ten sam
 * blok skopiowany trzy razy, różniący się kryciem kafelka (0.07 / 0.06 / 0.08)
 * i tym, że w historii zielony tytuł siedział w cyanowym kafelku.
 */
export function PanelHeader({ icon: Icon, title, sub, accent = 'var(--co-cyan)', aside }: PanelHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 24, paddingBottom: 16,
      borderBottom: '1px solid var(--co-border)',
    }}>
      <div style={{ padding: '6px 8px', background: 'var(--co-tint)', border: `1px solid ${accent}`, clipPath: CLIP.badge }}>
        <Icon size={16} style={{ color: accent, display: 'block' }} aria-hidden="true" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2 style={{ ...FONT.display(TEXT.lead, TRACK.wide), color: accent, margin: 0 }}>{title}</h2>
        {sub && (
          <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '2px 0 0' }}>{sub}</p>
        )}
      </div>
      {aside && <div style={{ flexShrink: 0 }}>{aside}</div>}
    </div>
  );
}

export interface FieldGroupProps {
  icon: LucideIcon;
  label: string;
  /** Licznik po prawej, np. „[4/6]”. */
  counter?: ReactNode;
  counterColor?: string;
  children: ReactNode;
}

/**
 * Obramowana grupa pól z nagłówkiem i licznikiem. `AdminTab` powtarzał ten sam
 * kontener plus tę samą recepturę nagłówka cztery razy, po ~20 właściwości
 * stylu każda.
 */
export function FieldGroup({ icon: Icon, label, counter, counterColor = 'var(--co-cyan)', children }: FieldGroupProps) {
  return (
    <div style={{
      padding: '16px',
      background: 'var(--co-surface-2)',
      border: '1px solid var(--co-border)',
      clipPath: CLIP.smallCard,
    }}>
      <p style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        ...FONT.display(TEXT.base, TRACK.wide), color: 'var(--co-text)',
      }}>
        <Icon size={14} style={{ color: 'var(--co-cyan)', flexShrink: 0 }} aria-hidden="true" />
        {label}
        {counter !== undefined && (
          <span style={{ marginLeft: 'auto', ...FONT.mono(TEXT.tiny), color: counterColor }}>
            {counter}
          </span>
        )}
      </p>
      {children}
    </div>
  );
}

export interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  accent?: string;
  sub?: ReactNode;
  /** Treść dosunięta do prawej — legenda wykresu, licznik. */
  aside?: ReactNode;
}

// ─── Shared SectionHeader ────────────────────────────────────────
export function SectionHeader({ icon: Icon, title, accent = 'var(--co-cyan)', sub, aside }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{
          padding: '6px 8px',
          background: 'var(--co-tint)',
          border: '1px solid var(--co-tint-line)',
          clipPath: CLIP.badge,
        }}>
          <Icon size={14} style={{ color: accent, display: 'block' }} aria-hidden="true" />
        </div>
        <span style={{ ...FONT.display(TEXT.h3, TRACK.normal), color: accent }}>{title}</span>
        {/* Jedna moc kreski dla wszystkich separatorów — było ich trzy
            (0.133, 0.2 i 0.25 krycia), dwie w tym samym pliku. */}
        <div aria-hidden="true" style={{ flex: 1, minWidth: 20, height: 1, background: 'linear-gradient(to right, var(--co-tint-line), transparent)' }} />
        {aside && <div style={{ flexShrink: 0 }}>{aside}</div>}
      </div>
      {sub && (
        <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', letterSpacing: TRACK.normal, paddingLeft: 36, margin: 0 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
