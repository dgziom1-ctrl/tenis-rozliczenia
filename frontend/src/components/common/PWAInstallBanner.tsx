import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Download, Share, X } from 'lucide-react';
import { TEXT, CLIP, FONT } from '@/constants/styles';
import BrandMark from './BrandMark';

const DISMISS_KEY = 'pwa-dismissed';
/** Jak długo „×” ukrywa baner instalacji. */
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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
  const [isIPad,         setIsIPad]         = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return undefined;
    try {
      // Odrzucenie obowiązuje 30 dni, a nie na zawsze — inaczej jedno kliknięcie
      // „×” na stałe odcinało drogę do instalacji z banera.
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return undefined;
    } catch { /* localStorage unavailable */ }

    const ua = navigator.userAgent;
    // iPadOS 13+ podaje się jako Mac, więc rozpoznajemy go po ekranie dotykowym.
    const ipad = /ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const ios = (/iphone|ipad|ipod/i.test(ua) || ipad) && !window.MSStream;
    setIsIOS(ios);
    setIsIPad(ipad);
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
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* localStorage unavailable */ }
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
    left: 'max(10px, env(safe-area-inset-left, 0px))', right: 'max(10px, env(safe-area-inset-right, 0px))',
    border: '1px solid var(--co-tint-line)',
    clipPath: CLIP.card,
    boxShadow: 'var(--glass-shadow)',
    animation: 'pwaSlideUp 0.3s ease-out',
    overflow: 'hidden',
  };

  if (!isIOS) {
    return (
      <div style={bannerStyle} className="pwa-banner bottom-banner glass-surface accent-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            background: 'var(--co-tint-hi)', border: '1px solid var(--co-tint-line)',
            clipPath: CLIP.badge,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BrandMark size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ ...FONT.display(TEXT.small), color: 'var(--co-cyan)', margin: 0, textTransform: 'none' }}>
              Dodaj do ekranu głównego
            </p>
            <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '2px 0 0' }}>
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
            <Download size={13} aria-hidden="true" /> Dodaj
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
    { n: '01', content: <span>Stuknij ikonę <span style={{ color: 'var(--co-cyan)' }}>Udostępnij</span> {isIPad ? 'u góry Safari' : 'na dole Safari'} <Share size={11} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} /></span> },
    { n: '02', content: <span>Wybierz <span style={{ color: 'var(--co-cyan)' }}>"Dodaj do ekranu głównego"</span></span> },
    { n: '03', content: <span>Stuknij <span style={{ color: 'var(--co-cyan)' }}>"Dodaj"</span> w prawym górnym rogu</span> },
  ];

  return (
    <div style={bannerStyle} className="pwa-banner bottom-banner glass-surface accent-top">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
        <div style={{ width: 32, height: 32, flexShrink: 0, background: 'var(--co-tint-hi)', border: '1px solid var(--co-tint-line)', clipPath: CLIP.badge, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandMark size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ ...FONT.display(TEXT.small), color: 'var(--co-cyan)', margin: 0, textTransform: 'none' }}>
            Dodaj do ekranu głównego
          </p>
          <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '2px 0 0' }}>
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
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--co-cyan)', fontSize: '0.875rem', letterSpacing: 'normal' }}>{step.n}</span>
            </div>
            <p style={{ margin: 0, ...FONT.mono(TEXT.small), color: 'var(--co-dim)', lineHeight: 1.4 }}>{step.content}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', paddingBottom: 8, marginTop: -4 }}>
        <span aria-hidden="true" style={{ color: 'var(--co-dim)', fontSize: TEXT.small }}>↓</span>
      </div>
    </div>
  );
}
