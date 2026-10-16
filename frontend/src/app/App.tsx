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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, var(--co-cyan), transparent)',
        opacity: 0.7, zIndex: Z.boot,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72,
          border: '2px solid var(--co-cyan)',
          borderRadius: 'var(--radius-lg)',
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
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '2rem', letterSpacing: '0.06em',
            color: 'var(--co-cyan)', textTransform: 'uppercase',
            margin: 0, lineHeight: 1,
          }}>CYBER-PONK</p>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.14em',
            color: 'var(--co-dim)', textTransform: 'uppercase', marginTop: 6,
          }}>Wczytywanie danych…</p>
        </div>
        <div style={{
          width: 280, background: 'var(--co-surface-2)',
          border: '1px solid var(--co-border)',
          borderRadius: 'var(--radius-md)',
          clipPath: CLIP.card,
          padding: '10px 14px',
        }}>
          {['Wczytywanie bazy…', 'Łączenie z chmurą…', 'Przygotowanie sezonu…'].map((line, i) => (
            <p key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              color: i < 2 ? 'var(--co-green)' : 'var(--co-cyan)',
              letterSpacing: '0.06em', margin: '2px 0',
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
          padding: '16px 18px', background: 'var(--co-tint)',
          border: '1px solid var(--co-tint-line)', borderRadius: 'var(--radius-lg)',
          maxWidth: 380, width: '100%', textAlign: 'center',
        }}>
          <p style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 600,
            letterSpacing: '0.04em', color: 'var(--co-cyan)', fontSize: '1rem',
          }}>Łączenie trwa dłużej</p>
          <p style={{
            margin: '6px 0 0', fontFamily: 'var(--font-body)', letterSpacing: '0.005em',
            color: 'var(--co-dim)', fontSize: '0.8rem', lineHeight: 1.55,
          }}>Jeśli to potrwa jeszcze chwilę — spróbuj ponownie.</p>
          {onRetry && (
            <button onClick={onRetry} className="cyber-button-yellow"
              style={{ marginTop: 12, padding: '11px 16px', width: '100%', maxWidth: 280 }}>
              Spróbuj ponownie
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
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, var(--co-rose), transparent)',
        opacity: 0.7, zIndex: Z.boot,
      }} />
      <div style={{
        padding: '30px 26px 24px', textAlign: 'center', maxWidth: 400, width: '100%',
        background: 'var(--co-surface-2)', border: '1px solid var(--co-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--glow-box-panel)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          width: 56, height: 56, margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          background: 'var(--co-tint-rose)',
          border: '1px solid var(--co-tint-rose-line)',
          color: 'var(--co-rose)',
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.6rem',
          animation: 'neon-rose 2.4s ease-in-out infinite',
        }}>!</div>
        <p style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.5rem',
          letterSpacing: '0.01em', color: 'var(--co-text-hi)', margin: '0 0 8px',
        }}>Brak połączenia</p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.6,
          color: 'var(--co-dim)', margin: '0 0 20px',
        }}>
          Nie udało się wczytać klubowej księgi. Sprawdź połączenie z internetem
          i spróbuj jeszcze raz.
        </p>
        <div style={{
          padding: '12px 14px', background: 'var(--co-tint-rose)',
          border: '1px solid var(--co-tint-rose-line)', borderRadius: 'var(--radius-md)',
          marginBottom: 20, textAlign: 'left',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)',
            letterSpacing: '0.04em', lineHeight: 1.7, margin: 0,
          }}>
            Baza klubu nie odpowiedziała w wyznaczonym czasie.<br />
            Sprawdź połączenie z internetem lub konfigurację aplikacji.
          </p>
        </div>
        <button onClick={onRetry ?? (() => window.location.reload())}
          className="cyber-button-yellow" style={{ padding: '12px 24px', width: '100%' }}>
          Spróbuj ponownie
        </button>
        <button onClick={hardResetApp}
          style={{
            marginTop: 10, padding: '10px 16px', width: '100%', cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--co-border-hi)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--co-dim)', fontFamily: 'var(--font-body)',
            fontSize: '0.8rem', letterSpacing: '0.005em',
          }}>
          Wyczyść cache i uruchom od nowa
        </button>
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
