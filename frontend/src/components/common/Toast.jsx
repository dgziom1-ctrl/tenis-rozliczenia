import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const showError = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const showInfo = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  const { message, type } = toast;

  const styles = {
    success: {
      bg: 'bg-emerald-950/95 border-emerald-500',
      icon: <CheckCircle2 className="text-emerald-400" size={20} />,
      text: 'text-emerald-300',
    },
    error: {
      bg: 'bg-rose-950/95 border-rose-500',
      icon: <AlertCircle className="text-rose-400" size={20} />,
      text: 'text-rose-300',
    },
    info: {
      bg: 'bg-cyan-950/95 border-cyan-500',
      icon: <Info className="text-cyan-400" size={20} />,
      text: 'text-cyan-300',
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div 
      className={`cyber-box ${style.bg} rounded-xl p-4 flex items-start gap-3 shadow-lg animate-in slide-in-from-right duration-300 backdrop-blur-sm`}
      role="alert"
    >
      <div className="flex-shrink-0">{style.icon}</div>
      <p className={`flex-1 text-sm font-medium ${style.text}`}>{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-cyan-600 hover:text-cyan-400 transition-colors"
        aria-label="Zamknij"
      >
        <X size={18} />
      </button>
    </div>
  );
}
