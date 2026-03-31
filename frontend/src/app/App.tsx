import { BrowserRouter, Routes, Route } from 'react-router';
import { AppDataProvider, useConnectionStatus } from './providers/AppDataProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { ToastProvider } from '@/components/common/Toast';
import Layout from './Layout';
import { routes } from './routes';

function CyberLoadingScreen({ slow = false, onRetry }: { slow?: boolean; onRetry?: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--co-void)', flexDirection: 'column', gap: 28,
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3,
        background: 'repeating-linear-gradient(-45deg, var(--co-cyan) 0px, var(--co-cyan) 8px, rgba(0,0,0,0.6) 8px, rgba(0,0,0,0.6) 16px)',
        boxShadow: '0 0 16px rgba(0,229,255,0.8)', zIndex: 1000,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72,
          border: '2px solid var(--co-cyan)',
          clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,229,255,0.06)',
          boxShadow: '0 0 30px rgba(0,229,255,0.35), inset 0 0 20px rgba(0,229,255,0.05)',
          animation: 'neon-orange 1.5s ease-in-out infinite',
          position: 'relative', overflow: 'hidden',
        }}>
          <span style={{ fontSize: '1.9rem', position: 'relative', zIndex: 1 }}>🏓</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.1em',
            color: 'var(--co-cyan)', textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(0,229,255,0.5)',
            margin: 0, lineHeight: 1,
          }}>CYBER-PONG</p>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.25em',
            color: 'rgba(0,229,255,0.45)', textTransform: 'uppercase', marginTop: 4,
            animation: 'flicker 2s infinite',
          }}>INITIALIZING SYSTEM...</p>
        </div>
        <div style={{
          width: 280, background: '#07070A',
          border: '1px solid var(--co-border)',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          padding: '10px 14px',
        }}>
          {['> BOOT_SEQ: INITIATED', '> LOADING AGENT DATABASE...', '> CONNECTING TO FIREBASE...'].map((line, i) => (
            <p key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              color: i < 2 ? 'var(--co-green)' : 'rgba(0,229,255,0.4)',
              letterSpacing: '0.08em', margin: '2px 0',
              animation: i === 2 ? 'flicker 1.5s infinite' : 'none',
            }}>{line}</p>
          ))}
        </div>
        <div style={{ width: 280, height: 3, background: '#1A1A14', overflow: 'hidden', position: 'relative' }}>
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
          padding: '12px 14px', background: 'rgba(0,229,255,0.05)',
          border: '1px solid rgba(0,229,255,0.25)', maxWidth: 380, textAlign: 'center',
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
        }}>
          <p style={{
            margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--co-cyan)', fontSize: '0.75rem',
          }}>POŁĄCZENIE WOLNE...</p>
          <p style={{
            margin: '6px 0 0', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
            color: 'var(--co-dim)', fontSize: '0.65rem',
          }}>Jeśli trwa to dłużej — spróbuj ponownie.</p>
          {onRetry && (
            <button onClick={onRetry} className="cyber-button-yellow"
              style={{ marginTop: 10, padding: '10px 18px', width: '100%', maxWidth: 280 }}>
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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--co-void)', padding: 24, flexDirection: 'column', gap: 20,
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3,
        background: 'repeating-linear-gradient(-45deg, #CC0022 0px, #CC0022 8px, rgba(0,0,0,0.6) 8px, rgba(0,0,0,0.6) 16px)',
        boxShadow: '0 0 16px rgba(200,0,30,0.8)', zIndex: 1000,
      }} />
      <div style={{
        padding: '28px 24px', textAlign: 'center', maxWidth: 380, width: '100%',
        background: '#0D0008', border: '1px solid rgba(200,0,30,0.4)',
        clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))',
        boxShadow: '0 0 40px rgba(200,0,30,0.18), inset 0 0 30px rgba(200,0,30,0.04)',
        position: 'relative', overflow: 'hidden',
        animation: 'neon-yellow 2s ease-in-out infinite',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 14, filter: 'drop-shadow(0 0 8px rgba(200,0,30,0.5))' }}>☠</div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.12em',
            color: '#FF3333', marginBottom: 6, textTransform: 'uppercase',
            textShadow: '0 0 16px rgba(200,0,30,0.5)',
          }}>CONNECTION FAILURE</p>
          <div style={{
            padding: '10px 12px', background: 'rgba(200,0,30,0.06)',
            border: '1px solid rgba(200,0,30,0.2)', marginBottom: 20,
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)',
              letterSpacing: '0.06em', lineHeight: 1.7,
            }}>
              {'>'} ERR: FIREBASE_TIMEOUT<br />
              {'>'} Sprawdź internet lub plik .env<br />
              {'>'} SYSTEM HALTED
            </p>
          </div>
          <button onClick={onRetry ?? (() => window.location.reload())}
            className="cyber-button-yellow" style={{ padding: '13px 24px', width: '100%' }}>
            ⚡ RESTART SYSTEMU
          </button>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { isLoading, slowLoading, subscriptionError, retry } = useConnectionStatus();

  if (subscriptionError) {
    return <CyberErrorScreen onRetry={retry} />;
  }

  if (isLoading) {
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
