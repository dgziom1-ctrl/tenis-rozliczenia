import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AppDataProvider } from './providers/AppDataProvider';
import { useConnectionStatus } from './providers/appDataContext';
import { ThemeProvider } from './providers/ThemeProvider';
import { ToastProvider } from '@/components/common/Toast';
import { hardResetApp, signalAppReady } from '@/utils/bootRecovery';
import { Z, CLIP } from '@/constants/styles';
import Layout from './Layout';
import { routes } from './routes';

function CyberLoadingScreen({ slow = false, onRetry }: { slow?: boolean; onRetry?: () => void }) {
  return (
    <div role="status" aria-busy="true" aria-label="Ładowanie danych" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--co-void)', flexDirection: 'column', gap: 24,
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3,
        background: 'repeating-linear-gradient(-45deg, var(--co-cyan) 0px, var(--co-cyan) 8px, transparent 8px, transparent 16px)',
        boxShadow: 'var(--glow-box-cyan)', zIndex: Z.boot,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72,
          border: '2px solid var(--co-cyan)',
          clipPath: CLIP.card,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--co-tint)',
          boxShadow: 'var(--glow-box-cyan)',
          animation: 'neon-cyan 1.5s ease-in-out infinite',
          position: 'relative', overflow: 'hidden',
        }}>
          <span style={{ fontSize: '2rem', position: 'relative', zIndex: 1 }}>🏓</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.1em',
            color: 'var(--co-cyan)', textTransform: 'uppercase',
            textShadow: 'var(--glow-cyan-lg)',
            margin: 0, lineHeight: 1,
          }}>CYBER-PONK</p>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.18em',
            color: 'var(--co-cyan)', textTransform: 'uppercase', marginTop: 4,
            animation: 'flicker 2s infinite',
          }}>INITIALIZING SYSTEM...</p>
        </div>
        <div style={{
          width: 280, background: 'var(--co-surface-2)',
          border: '1px solid var(--co-border)',
          clipPath: CLIP.card,
          padding: '10px 14px',
        }}>
          {['> BOOT_SEQ: INITIATED', '> LOADING AGENT DATABASE...', '> CONNECTING TO FIREBASE...'].map((line, i) => (
            <p key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              color: i < 2 ? 'var(--co-green)' : 'var(--co-cyan)',
              letterSpacing: '0.1em', margin: '2px 0',
              animation: i === 2 ? 'flicker 1.5s infinite' : 'none',
            }}>{line}</p>
          ))}
        </div>
        <div style={{ width: 280, height: 3, background: 'var(--co-bar-track)', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', width: '35%',
            background: 'linear-gradient(90deg, transparent, var(--co-cyan), var(--co-cyan))',
            boxShadow: '0 0 10px var(--co-cyan)',
            animation: 'loading-bar 1.1s ease-in-out infinite',
          }} />
        </div>
      </div>
      {slow && (
        <div style={{
          padding: '12px 14px', background: 'var(--co-tint)',
          border: '1px solid var(--co-tint-line)', maxWidth: 380, textAlign: 'center',
          clipPath: CLIP.smallCard,
        }}>
          <p style={{
            margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--co-cyan)', fontSize: '0.875rem',
          }}>POŁĄCZENIE WOLNE...</p>
          <p style={{
            margin: '6px 0 0', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
            color: 'var(--co-dim)', fontSize: '0.75rem',
          }}>Jeśli trwa to dłużej — spróbuj ponownie.</p>
          {onRetry && (
            <button onClick={onRetry} className="cyber-button-yellow"
              style={{ marginTop: 10, padding: '10px 16px', width: '100%', maxWidth: 280 }}>
              ↻ Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CyberErrorScreen({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--co-void)', padding: 24, flexDirection: 'column', gap: 20,
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3,
        background: 'repeating-linear-gradient(-45deg, var(--co-rose) 0px, var(--co-rose) 8px, transparent 8px, transparent 16px)',
        boxShadow: 'var(--glow-box-rose)', zIndex: Z.boot,
      }} />
      <div style={{
        padding: '24px 24px', textAlign: 'center', maxWidth: 380, width: '100%',
        background: 'var(--co-surface-2)', border: '1px solid var(--co-rose)',
        clipPath: CLIP.card,
        boxShadow: 'var(--glow-box-rose)',
        position: 'relative', overflow: 'hidden',
        animation: 'neon-rose 2s ease-in-out infinite',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 14, filter: 'var(--glow-drop-rose)' }}>☠</div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.1em',
            color: 'var(--co-rose)', marginBottom: 6, textTransform: 'uppercase',
            textShadow: 'var(--glow-rose-md)',
          }}>CONNECTION FAILURE</p>
          <div style={{
            padding: '10px 12px', background: 'var(--co-tint-rose)',
            border: '1px solid var(--co-tint-rose-line)', marginBottom: 20,
            clipPath: CLIP.badge,
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)',
              letterSpacing: '0.06em', lineHeight: 1.7,
            }}>
              {'>'} ERR: FIREBASE_TIMEOUT<br />
              {'>'} Sprawdź internet lub plik .env<br />
              {'>'} SYSTEM HALTED
            </p>
          </div>
          <button onClick={onRetry ?? (() => window.location.reload())}
            className="cyber-button-yellow" style={{ padding: '12px 24px', width: '100%' }}>
            ⚡ RESTART SYSTEMU
          </button>
          <button onClick={hardResetApp}
            style={{
              marginTop: 10, padding: '10px 16px', width: '100%', cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--co-tint-rose-line)',
              color: 'var(--co-dim)', fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
            Wyczyść cache i uruchom od nowa
          </button>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { isLoading, slowLoading, bootTimedOut, subscriptionError, hasData, retry } = useConnectionStatus();

  useEffect(() => { signalAppReady(); }, []);

  if (subscriptionError && !hasData) {
    return <CyberErrorScreen onRetry={retry} />;
  }

  if (isLoading && !hasData && !bootTimedOut) {
    return <CyberLoadingScreen slow={slowLoading} onRetry={retry} />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        {routes.map((route, i) => (
          <Route key={i} {...route} />
        ))}
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AppDataProvider>
            <AppShell />
          </AppDataProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
