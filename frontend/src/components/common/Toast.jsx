import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
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
    <div className="fixed bottom-24 left-2 right-2 sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 max-w-sm w-full sm:px-0 px-0">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

const STYLES = {
  success: {
    bg:     'rgb(6,28,20)',
    border: 'rgba(52,211,153,0.4)',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    icon:   <CheckCircle2 style={{ color: 'rgb(52,211,153)' }} size={20} />,
    text:   'rgb(110,231,183)',
    close:  'rgba(52,211,153,0.5)',
  },
  error: {
    bg:     'rgb(28,6,6)',
    border: 'rgba(220,38,38,0.4)',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    icon:   <AlertCircle style={{ color: 'rgb(248,113,113)' }} size={20} />,
    text:   'rgb(252,165,165)',
    close:  'rgba(248,113,113,0.5)',
  },
  info: {
    bg:     '#0d1220',
    border: 'rgba(129,140,248,0.35)',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    icon:   <Info style={{ color: '#a5b4fc' }} size={20} />,
    text:   '#a5b4fc',
    close:  'rgba(129,140,248,0.5)',
  },
};

function Toast({ toast, onClose }) {
  const s = STYLES[toast.type] ?? STYLES.info;
  return (
    <div
      role="alert"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        boxShadow: s.shadow,
        borderRadius: '0.75rem',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      className="p-4 flex items-start gap-3"
    >
      <div className="flex-shrink-0">{s.icon}</div>
      <p style={{ color: s.text, fontSize: '0.875rem' }}
        className="flex-1 font-medium leading-relaxed">{toast.message}</p>
      <button
        onClick={onClose}
        style={{ color: s.close }}
        className="flex-shrink-0 transition-opacity hover:opacity-70"
        aria-label="Zamknij"
      >
        <X size={18} />
      </button>
    </div>
  );
}
