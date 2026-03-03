import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show,           setShow]           = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    try { if (localStorage.getItem('pwa-dismissed')) return; } catch {}

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      setTimeout(() => setShow(true), 2000);
      return;
    }

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

  const base = {
    position: 'fixed',
    bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
    left: '12px', right: '12px',
    zIndex: 45,
    background: 'rgba(8,12,20,0.97)',
    border: '2px solid rgba(6,182,212,0.5)',
    borderRadius: '14px',
    boxShadow: '0 0 20px rgba(6,182,212,0.12), 0 4px 24px rgba(0,0,0,0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    animation: 'pwaSlideUp 0.3s ease-out',
  };

  // ── Android / Chrome — jeden przycisk ─────────────────────────────────────
  if (!isIOS) {
    return (
      <div style={base}>
        <style>{`@keyframes pwaSlideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }`}</style>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px' }}>
          <span style={{ fontSize:'22px', flexShrink:0 }}>🕹️</span>
          <div style={{ flex:1 }}>
            <p style={{ color:'#22d3ee', fontWeight:900, fontSize:'0.78rem', margin:0, letterSpacing:'0.05em' }}>DODAJ DO EKRANU GŁÓWNEGO</p>
            <p style={{ color:'rgba(6,182,212,0.5)', fontSize:'0.65rem', margin:'2px 0 0' }}>Otwieraj jak natywna aplikacja</p>
          </div>
          <button onClick={handleInstall} style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'5px', padding:'7px 12px', border:'2px solid rgba(6,182,212,0.7)', borderRadius:'9px', background:'rgba(8,47,73,0.8)', color:'#67e8f9', fontWeight:900, fontSize:'0.72rem', cursor:'pointer', whiteSpace:'nowrap' }}>
            <Download size={14} /> DODAJ
          </button>
          <button onClick={dismiss} style={{ background:'transparent', border:'none', color:'rgba(6,182,212,0.35)', cursor:'pointer', padding:'4px', display:'flex', flexShrink:0 }}>
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── iOS — tutorial krok po kroku ──────────────────────────────────────────
  const steps = [
    { icon: '1', content: <span>Stuknij ikonę <strong style={{color:'#67e8f9'}}>Udostępnij</strong> na dole Safari <Share size={13} style={{display:'inline',verticalAlign:'middle',marginLeft:'3px'}}/></span> },
    { icon: '2', content: <span>Wybierz <strong style={{color:'#67e8f9'}}>"Dodaj do ekranu głównego"</strong></span> },
    { icon: '3', content: <span>Stuknij <strong style={{color:'#67e8f9'}}>"Dodaj"</strong> w prawym górnym rogu</span> },
  ];

  return (
    <div style={base}>
      <style>{`@keyframes pwaSlideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px 10px' }}>
        <span style={{ fontSize:'22px', flexShrink:0 }}>🕹️</span>
        <div style={{ flex:1 }}>
          <p style={{ color:'#22d3ee', fontWeight:900, fontSize:'0.78rem', margin:0, letterSpacing:'0.05em' }}>DODAJ DO EKRANU GŁÓWNEGO</p>
          <p style={{ color:'rgba(6,182,212,0.5)', fontSize:'0.65rem', margin:'2px 0 0' }}>Działa jak natywna aplikacja</p>
        </div>
        <button onClick={dismiss} style={{ background:'transparent', border:'none', color:'rgba(6,182,212,0.35)', cursor:'pointer', padding:'4px', display:'flex', flexShrink:0 }}>
          <X size={16} />
        </button>
      </div>

      {/* Steps */}
      <div style={{ borderTop:'1px solid rgba(6,182,212,0.12)', padding:'10px 14px 14px', display:'flex', flexDirection:'column', gap:'8px' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'50%', border:'2px solid rgba(6,182,212,0.5)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#22d3ee', fontWeight:900, fontSize:'0.65rem' }}>
              {step.icon}
            </div>
            <p style={{ margin:0, color:'rgba(226,232,240,0.8)', fontSize:'0.72rem', lineHeight:1.4 }}>{step.content}</p>
          </div>
        ))}
      </div>

      {/* Arrow pointing down toward Safari toolbar */}
      <div style={{ textAlign:'center', paddingBottom:'8px', marginTop:'-4px' }}>
        <span style={{ color:'rgba(6,182,212,0.35)', fontSize:'1rem' }}>↓</span>
      </div>
    </div>
  );
}
