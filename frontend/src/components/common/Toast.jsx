import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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

  const removeToast  = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const showSuccess  = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const showError    = useCallback((msg, dur) => addToast(msg, 'error',   dur), [addToast]);
  const showInfo     = useCallback((msg, dur) => addToast(msg, 'info',    dur), [addToast]);

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
  const theme = useTheme();
  if (toasts.length === 0) return null;
  return (
    <div
      className={`fixed bottom-24 left-2 right-2 sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 max-w-sm w-full sm:px-0 px-0 ${theme === 'arcade' ? 'theme-arcade' : theme === 'zen' ? 'theme-zen' : ''}`}
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} theme={theme} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose, theme }) {
  const { message, type } = toast;
  const a = theme === 'arcade';
  const z = theme === 'zen';

  const STYLES = {
    success: {
      bg:     a ? '#010300'             : z ? '#f0ebe0'             : 'rgb(6,28,20)',
      border: a ? '#39ff14'             : z ? '#2d6a4f'             : 'rgb(16,185,129)',
      shadow: a ? '0 0 12px rgba(57,255,20,0.3)' : z ? '0 4px 16px rgba(45,106,79,0.15)' : '0 0 12px rgba(16,185,129,0.2)',
      icon:   <CheckCircle2 style={{ color: a ? '#39ff14' : z ? '#2d6a4f' : 'rgb(52,211,153)' }} size={20} />,
      text:   a ? '#39ff14'             : z ? '#2d6a4f'             : 'rgb(110,231,183)',
      close:  a ? '#176604'             : z ? '#9aaa9a'             : 'rgb(52,211,153)',
    },
    error: {
      bg:     a ? '#1a0200'             : z ? '#f5ebe0'             : 'rgb(28,6,6)',
      border: a ? '#ff3300'             : z ? '#b44632'             : 'rgb(220,38,38)',
      shadow: a ? '0 0 12px rgba(255,51,0,0.3)' : z ? '0 4px 16px rgba(180,70,50,0.15)' : '0 0 12px rgba(220,38,38,0.2)',
      icon:   <AlertCircle style={{ color: a ? '#ff3300' : z ? '#b44632' : 'rgb(248,113,113)' }} size={20} />,
      text:   a ? '#ff6644'             : z ? '#b44632'             : 'rgb(252,165,165)',
      close:  a ? '#cc2200'             : z ? '#c49a6c'             : 'rgb(248,113,113)',
    },
    info: {
      bg:     a ? '#010300'             : z ? '#f0ebe0'             : '#0d1220',
      border: a ? '#39ff14'             : z ? '#2d6a4f'             : 'rgba(129,140,248,0.35)',
      shadow: a ? '0 0 12px rgba(57,255,20,0.2)' : z ? '0 4px 16px rgba(45,106,79,0.12)' : '0 8px 32px rgba(0,0,0,0.4)',
      icon:   <Info style={{ color: a ? '#39ff14' : z ? '#2d6a4f' : '#a5b4fc' }} size={20} />,
      text:   a ? '#39ff14'             : z ? '#2d6a4f'             : '#a5b4fc',
      close:  a ? '#176604'             : z ? '#9aaa9a'             : 'rgba(129,140,248,0.5)',
    },
  };

  const s = STYLES[type] ?? STYLES.info;

  return (
    <div
      role="alert"
      style={{
        background: s.bg,
        border: `2px solid ${s.border}`,
        boxShadow: s.shadow,
        borderRadius: a ? '0' : z ? '1rem' : '0.75rem',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      className="p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300"
    >
      <div className="flex-shrink-0">{s.icon}</div>
      <p style={{ color: s.text, fontSize: a ? '0.55rem' : '0.875rem', fontFamily: a ? "'Press Start 2P',monospace" : z ? "'Lato',sans-serif" : 'inherit' }}
        className="flex-1 font-medium leading-relaxed">{message}</p>
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
