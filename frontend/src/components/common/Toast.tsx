import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X, Terminal } from 'lucide-react';

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
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        left: 8, right: 8,
        zIndex: 9000,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxWidth: 400,
      }}
      className="sm:bottom-auto sm:top-4 sm:left-auto sm:right-4"
    >
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
  icon: ReactNode;
  prefix: string;
}

const ICON_STYLE: CSSProperties = { flexShrink: 0 };

const STYLES: Record<ToastType, ToastStyle> = {
  success: {
    bg:       'var(--co-toast-success)',
    border:   'rgba(0,255,102,0.3)',
    shadow:   '0 0 18px rgba(0,255,102,0.08)',
    accent:   'var(--co-green)',
    icon:     <CheckCircle2 size={16} style={{ ...ICON_STYLE, color: 'var(--co-green)' }} />,
    prefix:   'OK',
  },
  error: {
    bg:       'var(--co-toast-error)',
    border:   'rgba(255,32,144,0.4)',
    shadow:   '0 0 20px rgba(255,32,144,0.12)',
    accent:   'var(--co-rose)',
    icon:     <AlertCircle size={16} style={{ ...ICON_STYLE, color: 'var(--co-rose)' }} />,
    prefix:   'ERR',
  },
  info: {
    bg:       'var(--co-toast-info)',
    border:   'rgba(0,229,255,0.25)',
    shadow:   '0 0 16px rgba(0,229,255,0.06)',
    accent:   'var(--co-cyan)',
    icon:     <Terminal size={16} style={{ ...ICON_STYLE, color: 'var(--co-cyan)' }} />,
    prefix:   'SYS',
  },
};

function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const s = STYLES[toast.type] ?? STYLES.info;
  return (
    <div role="alert" style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      boxShadow: s.shadow,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: s.accent, opacity: 0.5 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
        {/* Prefix badge */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
          padding: '2px 6px', background: `${s.accent}12`, border: `1px solid ${s.border}`,
          clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
        }}>
          {s.icon}
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.18em', color: s.accent, textTransform: 'uppercase' }}>
            {s.prefix}
          </span>
        </div>

        {/* Message */}
        <p style={{
          flex: 1, margin: 0,
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          color: 'var(--co-toast-text)', lineHeight: 1.5,
        }}>
          {toast.message}
        </p>

        {/* Close */}
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none',
          color: 'var(--co-close-btn)', cursor: 'pointer',
          padding: '2px', flexShrink: 0, transition: 'color 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = s.accent; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--co-close-btn)'; }}
          aria-label="Zamknij"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
