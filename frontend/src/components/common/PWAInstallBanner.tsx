import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Download, Share, X } from 'lucide-react';
import { TEXT, CLIP } from '@/constants/styles';

/** Ile czekamy na iOS, zanim pokażemy podpowiedź instalacji. */
const IOS_BANNER_DELAY_MS = 2000;

/**
 * `beforeinstallprompt` nie istnieje w lib.dom.d.ts — to propozycja standardu
 * obsługiwana tylko przez przeglądarki Chromium.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Window {
    /** Relikt IE/Edge — obecność tej właściwości odsiewa fałszywe „iOS” w UA. */
    MSStream?: unknown;
  }
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show,           setShow]           = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return undefined;
    try { if (localStorage.getItem('pwa-dismissed')) return undefined; } catch { /* localStorage unavailable */ }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);
    // iOS nie zna `beforeinstallprompt`, więc baner pokazujemy z opóźnieniem.
    // Timer MUSI być sprzątany — bez tego wyjście z ekranu w ciągu tych 2 s
    // ustawiało stan na odmontowanym komponencie.
    if (ios) {
      const t = setTimeout(() => setShow(true), IOS_BANNER_DELAY_MS);
      return () => clearTimeout(t);
    }

    const handler = (e: BeforeInstallPromptEvent) => { e.preventDefault(); setDeferredPrompt(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    try { localStorage.setItem('pwa-dismissed', '1'); } catch { /* localStorage unavailable */ }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') dismiss();
      else setShow(false);
    } catch {
      // Przeglądarka potrafi odrzucić `prompt()` (np. wywołany drugi raz).
      // Baner nie jest funkcją krytyczną — chowamy go bez komunikatu.
      setShow(false);
    }
  };

  if (!show) return null;

  // Pozycjonowanie (fixed, odstęp od nawigacji, warstwa, rozmycie) bierze klasa
  // `.bottom-banner`, wspólna z banerem powiadomień.
  const bannerStyle: CSSProperties = {
    left: 10, right: 10,
    background: 'var(--co-panel)',
    border: '1px solid var(--co-tint-line)',
    clipPath: CLIP.card,
    boxShadow: 'var(--glow-box-panel)',
    animation: 'pwaSlideUp 0.3s ease-out',
    overflow: 'hidden',
  };

  if (!isIOS) {
    return (
      <div style={bannerStyle} className="pwa-banner bottom-banner accent-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            background: 'var(--co-tint-hi)', border: '1px solid var(--co-tint-line)',
            clipPath: CLIP.badge,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.25rem' }}>🕹️</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--co-cyan)', margin: 0, textTransform: 'uppercase' }}>
              DODAJ DO EKRANU GŁÓWNEGO
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', margin: '2px 0 0' }}>
              Otwieraj jak natywna aplikacja
            </p>
          </div>
          {/* Wspólna klasa: kolor tekstu na wypełnieniu akcentem zależy od
              motywu (czerń na cyanie, biel na morskim), a hover jest CSS-owy. */}
          <button onClick={() => void handleInstall()} className="cyber-button-yellow" style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            minHeight: 44, padding: '10px 14px',
            whiteSpace: 'nowrap',
          }}>
            <Download size={13} aria-hidden="true" /> DODAJ
          </button>
          <button onClick={dismiss} aria-label="Zamknij" className="icon-btn" style={{
            background: 'transparent', border: 'none', color: 'var(--co-dim)', cursor: 'pointer',
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <X size={18} aria-hidden="true" />
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
    <div style={bannerStyle} className="pwa-banner bottom-banner accent-top">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
        <div style={{ width: 32, height: 32, flexShrink: 0, background: 'var(--co-tint-hi)', border: '1px solid var(--co-tint-line)', clipPath: CLIP.badge, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1rem' }}>🕹️</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--co-cyan)', margin: 0, textTransform: 'uppercase' }}>
            DODAJ DO EKRANU GŁÓWNEGO
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', margin: '2px 0 0' }}>
            Działa jak natywna aplikacja
          </p>
        </div>
        <button onClick={dismiss} aria-label="Zamknij" className="icon-btn" style={{
          background: 'transparent', border: 'none', color: 'var(--co-dim)', cursor: 'pointer',
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div style={{ borderTop: '1px solid var(--co-border)', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 22, height: 22, flexShrink: 0,
              border: '1px solid var(--co-tint-line)',
              clipPath: CLIP.badge,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--co-tint)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--co-cyan)', fontSize: '0.875rem', letterSpacing: '0.06em' }}>{step.n}</span>
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--co-dim)', lineHeight: 1.4 }}>{step.content}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', paddingBottom: 8, marginTop: -4 }}>
        <span aria-hidden="true" style={{ color: 'var(--co-dim)', fontSize: TEXT.small }}>↓</span>
      </div>
    </div>
  );
}
