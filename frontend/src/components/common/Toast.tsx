import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X, Terminal } from 'lucide-react';
import { CLIP } from '@/constants/styles';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: ReactNode;
  type: ToastType;
  duration: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (message: ReactNode, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  showSuccess: (message: ReactNode, duration?: number) => string;
  showError: (message: ReactNode, duration?: number) => string;
  showInfo: (message: ReactNode, duration?: number) => string;
}

const MAX_VISIBLE_TOASTS = 5;
const DEFAULT_DURATION_MS = 5000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((
    message: ReactNode,
    type: ToastType = 'info',
    duration: number = DEFAULT_DURATION_MS,
  ): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setToasts(prev => {
      const next = [...prev, { id, message, type, duration }];
      return next.length > MAX_VISIBLE_TOASTS ? next.slice(next.length - MAX_VISIBLE_TOASTS) : next;
    });

    if (duration > 0) {
      timers.current.set(id, setTimeout(() => removeToast(id), duration));
    }
    return id;
  }, [removeToast]);

  // Bez tego timery wystrzeliłyby po odmontowaniu providera i ustawiały stan
  // na martwym komponencie.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const showSuccess = useCallback((msg: ReactNode, dur?: number) => addToast(msg, 'success', dur), [addToast]);
  const showError   = useCallback((msg: ReactNode, dur?: number) => addToast(msg, 'error',   dur), [addToast]);
  const showInfo    = useCallback((msg: ReactNode, dur?: number) => addToast(msg, 'info',    dur), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showSuccess, showError, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastStyle {
  bg: string;
  border: string;
  shadow: string;
  accent: string;
  /**
   * Wypełnienie odznaki z prefiksem. Musi być osobnym tokenem, a nie `accent`
   * z dopiskiem krycia: `accent` to już `var(...)`, więc `${accent}12` dawało
   * `var(--co-green)12` — deklarację nieprawidłową po podstawieniu zmiennej,
   * którą przeglądarka odrzucała i odznaka zostawała bez tła.
   */
  tint: string;
  icon: ReactNode;
  prefix: string;
}

const ICON_STYLE: CSSProperties = { flexShrink: 0 };

const STYLES: Record<ToastType, ToastStyle> = {
  success: {
    bg:       'var(--co-toast-success)',
    border: 'var(--co-green)',
    shadow:   '0 0 18px var(--co-tint-green)',
    accent:   'var(--co-green)',
    tint:     'var(--co-tint-green)',
    icon:     <CheckCircle2 size={16} style={{ ...ICON_STYLE, color: 'var(--co-green)' }} />,
    prefix:   'OK',
  },
  error: {
    bg:       'var(--co-toast-error)',
    border: 'var(--co-rose)',
    shadow:   '0 0 20px var(--co-tint-rose)',
    accent:   'var(--co-rose)',
    tint:     'var(--co-tint-rose)',
    icon:     <AlertCircle size={16} style={{ ...ICON_STYLE, color: 'var(--co-rose)' }} />,
    prefix:   'ERR',
  },
  info: {
    bg:       'var(--co-toast-info)',
    border: 'var(--co-tint-line)',
    shadow:   '0 0 16px var(--co-tint)',
    accent:   'var(--co-cyan)',
    tint:     'var(--co-tint)',
    icon:     <Terminal size={16} style={{ ...ICON_STYLE, color: 'var(--co-cyan)' }} />,
    prefix:   'SYS',
  },
};

function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const s = STYLES[toast.type] ?? STYLES.info;
  return (
    <div role="alert" className="accent-top" style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      boxShadow: s.shadow,
      clipPath: CLIP.card,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
        {/* Prefix badge */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
          padding: '2px 6px', background: s.tint, border: `1px solid ${s.border}`,
          clipPath: CLIP.badge,
        }}>
          {s.icon}
          {/* Etykieta była większa (0.82rem) od samej treści (0.75rem) —
              odwrócona hierarchia w komunikacie. */}
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: s.accent, textTransform: 'uppercase' }}>
            {s.prefix}
          </span>
        </div>

        {/* Message */}
        <p style={{
          flex: 1, margin: 0,
          fontFamily: 'var(--font-mono)', fontSize: '0.875rem',
          color: 'var(--co-toast-text)', lineHeight: 1.5,
        }}>
          {toast.message}
        </p>

        {/* Close — cel dotykowy miał ok. 20×20px */}
        <button onClick={onClose} className="icon-btn" style={{
          background: 'transparent', border: 'none',
          color: 'var(--co-close-btn)', cursor: 'pointer',
          width: 44, height: 44, marginTop: -10, marginRight: -8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          aria-label="Zamknij"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
