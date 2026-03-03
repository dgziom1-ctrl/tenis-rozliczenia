import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Pokazuje się raz gdy:
 * - przeglądarka obsługuje beforeinstallprompt (Chrome/Edge Android)
 * - lub iOS Safari (instrukcja manualna)
 * - użytkownik jeszcze nie zamknął banera
 */
export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show,           setShow]           = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);

  useEffect(() => {
    // Nie pokazuj jeśli już zainstalowana (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Nie pokazuj jeśli user już odrzucił
    try { if (localStorage.getItem('pwa-dismissed')) return; } catch {}

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS nie ma beforeinstallprompt — pokazujemy manualny hint
      setTimeout(() => setShow(true), 3000);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') dismiss();
    }
    setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem('pwa-dismissed', '1'); } catch {}
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', // nad bottom nav
      left: '12px',
      right: '12px',
      zIndex: 45,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 14px',
      background: 'rgba(8,12,20,0.97)',
      border: '2px solid rgba(6,182,212,0.6)',
      borderRadius: '14px',
      boxShadow: '0 0 20px rgba(6,182,212,0.15), 0 4px 24px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      animation: 'slideUpIn 0.3s ease-out',
    }}>
      <style>{`
        @keyframes slideUpIn {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div style={{ fontSize: '24px', flexShrink: 0 }}>🕹️</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#22d3ee', fontWeight: 900, fontSize: '0.8rem', margin: 0, letterSpacing: '0.05em' }}>
          DODAJ DO EKRANU
        </p>
        <p style={{ color: 'rgba(6,182,212,0.55)', fontSize: '0.7rem', margin: '2px 0 0', lineHeight: 1.3 }}>
          {isIOS
            ? 'Stuknij 📤 → „Dodaj do ekranu głównego"'
            : 'Otwieraj jak natywna aplikacja'}
        </p>
      </div>

      {!isIOS && (
        <button
          onClick={handleInstall}
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '7px 12px',
            border: '2px solid rgba(6,182,212,0.7)',
            borderRadius: '9px',
            background: 'rgba(8,47,73,0.8)',
            color: '#67e8f9',
            fontWeight: 900,
            fontSize: '0.72rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Download size={14} /> DODAJ
        </button>
      )}

      <button
        onClick={dismiss}
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          color: 'rgba(6,182,212,0.4)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
        }}
        aria-label="Zamknij"
      >
        <X size={16} />
      </button>
    </div>
  );
}
