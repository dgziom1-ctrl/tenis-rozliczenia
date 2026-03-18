import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show,           setShow]           = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    try { if (localStorage.getItem('pwa-dismissed')) return; } catch {}

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);
    if (ios) { setTimeout(() => setShow(true), 2000); return; }

    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
    else setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem('pwa-dismissed', '1'); } catch {}
  };

  if (!show) return null;

  const bannerStyle = {
    position: 'fixed',
    bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
    left: 10, right: 10,
    zIndex: 45,
    background: 'var(--co-dark)',
    border: '1px solid rgba(0,229,255,0.35)',
    clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
    boxShadow: '0 0 24px rgba(0,229,255,0.12), 0 4px 30px rgba(0,0,0,0.9)',
    animation: 'pwaSlideUp 0.3s ease-out',
    overflow: 'hidden',
  };

  if (!isIOS) {
    return (
      <div style={bannerStyle}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, var(--co-cyan), transparent)', opacity: 0.6 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.3)',
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.2rem' }}>🕹️</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.16em', color: 'var(--co-cyan)', margin: 0, textTransform: 'uppercase' }}>
              DODAJ DO EKRANU GŁÓWNEGO
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', margin: '2px 0 0' }}>
              Otwieraj jak natywna aplikacja
            </p>
          </div>
          <button onClick={handleInstall} style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px',
            background: 'var(--co-cyan)', color: '#000',
            border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.12em',
            clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
            whiteSpace: 'nowrap',
          }}>
            <Download size={12} /> DODAJ
          </button>
          <button onClick={dismiss} style={{ background: 'transparent', border: 'none', color: '#3a3a3a', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--co-cyan)'}
            onMouseLeave={e => e.currentTarget.style.color = '#3a3a3a'}
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  // iOS steps
  const steps = [
    { n: '01', content: <span>Stuknij ikonę <span style={{ color: 'var(--co-cyan)' }}>Udostępnij</span> na dole Safari <Share size={11} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} /></span> },
    { n: '02', content: <span>Wybierz <span style={{ color: 'var(--co-cyan)' }}>"Dodaj do ekranu głównego"</span></span> },
    { n: '03', content: <span>Stuknij <span style={{ color: 'var(--co-cyan)' }}>"Dodaj"</span> w prawym górnym rogu</span> },
  ];

  return (
    <div style={bannerStyle}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, var(--co-cyan), transparent)', opacity: 0.6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
        <div style={{ width: 32, height: 32, flexShrink: 0, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1rem' }}>🕹️</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.16em', color: 'var(--co-cyan)', margin: 0, textTransform: 'uppercase' }}>
            DODAJ DO EKRANU GŁÓWNEGO
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', margin: '2px 0 0' }}>
            Działa jak natywna aplikacja
          </p>
        </div>
        <button onClick={dismiss} style={{ background: 'transparent', border: 'none', color: '#3a3a3a', cursor: 'pointer', padding: 4, flexShrink: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--co-cyan)'}
          onMouseLeave={e => e.currentTarget.style.color = '#3a3a3a'}
        >
          <X size={15} />
        </button>
      </div>
      <div style={{ borderTop: '1px solid #141414', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 22, height: 22, flexShrink: 0,
              border: '1px solid rgba(0,229,255,0.25)',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,229,255,0.04)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--co-cyan)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em' }}>{step.n}</span>
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--co-dim)', lineHeight: 1.4 }}>{step.content}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', paddingBottom: 8, marginTop: -4 }}>
        <span style={{ color: 'rgba(0,229,255,0.25)', fontSize: '0.8rem' }}>↓</span>
      </div>
    </div>
  );
}
