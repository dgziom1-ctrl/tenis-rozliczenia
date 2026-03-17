import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Terminal } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const showSuccess = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const showError   = useCallback((msg, dur) => addToast(msg, 'error',   dur), [addToast]);
  const showInfo    = useCallback((msg, dur) => addToast(msg, 'info',    dur), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showSuccess, showError, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
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

const STYLES = {
  success: {
    bg:       '#060e06',
    border:   'rgba(0,229,255,0.35)',
    shadow:   '0 0 20px rgba(0,229,255,0.1)',
    accent:   'var(--co-green)',
    icon:     <CheckCircle2 size={16} style={{ color: 'var(--co-green)', flexShrink: 0 }} />,
    prefix:   'OK',
  },
  error: {
    bg:       '#0e0606',
    border:   'rgba(255,229,0,0.4)',
    shadow:   '0 0 20px rgba(255,229,0,0.12)',
    accent:   'var(--co-yellow)',
    icon:     <AlertCircle size={16} style={{ color: 'var(--co-yellow)', flexShrink: 0 }} />,
    prefix:   'ERR',
  },
  info: {
    bg:       '#080808',
    border:   'rgba(0,229,255,0.25)',
    shadow:   '0 0 16px rgba(0,229,255,0.06)',
    accent:   'var(--co-cyan)',
    icon:     <Terminal size={16} style={{ color: 'var(--co-cyan)', flexShrink: 0 }} />,
    prefix:   'SYS',
  },
};

function Toast({ toast, onClose }) {
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
          color: '#c8c8c8', lineHeight: 1.5,
        }}>
          {toast.message}
        </p>

        {/* Close */}
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none',
          color: '#3a3a3a', cursor: 'pointer',
          padding: '2px', flexShrink: 0, transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = s.accent}
          onMouseLeave={e => e.currentTarget.style.color = '#3a3a3a'}
          aria-label="Zamknij"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
