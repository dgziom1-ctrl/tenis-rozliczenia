import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { hardResetApp, isStaleBuildError, recoverFromStaleBuild, signalAppReady } from '@/utils/bootRecovery';
import { Z, CLIP, FONT, TEXT, TRACK } from '@/constants/styles';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isStaleBuild: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null, isStaleBuild: false };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error, isStaleBuild: isStaleBuildError(error) };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Aplikacja została wdrożona na nowo, a przeglądarka trzyma stary
    // `index.html` i szuka paczek, których już nie ma. Świeży start naprawia to
    // sam, więc nie zawracamy tym głowy użytkownikowi.
    if (isStaleBuildError(error) && recoverFromStaleBuild(error)) return;

    // Zwykły bug w kodzie. Ten ekran jest widoczny i ma przyciski, więc start
    // się udał — bez tego sygnału straż startu przeładowałaby go po kilkunastu
    // sekundach i użytkownik nigdy nie zobaczyłby, co się stało.
    signalAppReady();
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, isStaleBuild: false });
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    // Ten ekran był jedynym miejscem w aplikacji poza systemem projektowym:
    // domyślna paleta `rose-*` z Tailwinda (której tryb jasny nie przemapuje,
    // więc na białym tle zostawała ciemna plama) i zaokrąglone narożniki,
    // choć ciemny motyw jest wszędzie kanciasty. Teraz układ i barwy są te
    // same co w `CyberErrorScreen` — to dwa warianty tego samego ekranu.
    return (
      <div role="alert" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--co-void)', padding: 24, flexDirection: 'column', gap: 20,
      }}>
        <div aria-hidden="true" style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3,
          background: 'repeating-linear-gradient(-45deg, var(--co-rose) 0px, var(--co-rose) 8px, transparent 8px, transparent 16px)',
          boxShadow: 'var(--glow-box-rose)', zIndex: Z.boot,
        }} />

        <div style={{
          padding: 24, maxWidth: 420, width: '100%',
          background: 'var(--co-surface-2)', border: '1px solid var(--co-rose)',
          clipPath: CLIP.card,
          boxShadow: 'var(--glow-box-rose)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <AlertTriangle size={24} style={{ color: 'var(--co-rose)', flexShrink: 0 }} aria-hidden="true" />
            <h1 style={{
              ...FONT.display(TEXT.h3, TRACK.normal),
              color: 'var(--co-rose)', margin: 0,
              textShadow: 'var(--glow-rose-md)',
            }}>
              {this.state.isStaleBuild ? 'Aplikacja się zaktualizowała' : 'Coś poszło nie tak'}
            </h1>
          </div>

          <p style={{
            ...FONT.mono(TEXT.small),
            color: 'var(--co-text)', lineHeight: 1.6, margin: '0 0 20px',
          }}>
            {this.state.isStaleBuild
              ? 'Wyszła nowa wersja i przeglądarka trzyma jeszcze starą. Odśwież stronę — to wystarczy, nie musisz nic czyścić.'
              : 'Aplikacja napotkała nieoczekiwany błąd. Spróbuj odświeżyć stronę.'}
          </p>

          {import.meta.env.MODE === 'development' && this.state.error && (
            <details style={{
              marginBottom: 20, padding: '10px 12px',
              background: 'var(--co-tint-rose)', border: '1px solid var(--co-tint-rose-line)',
              clipPath: CLIP.badge,
            }}>
              <summary style={{
                ...FONT.mono(TEXT.tiny),
                color: 'var(--co-rose)', cursor: 'pointer', letterSpacing: TRACK.tight,
              }}>
                Szczegóły błędu (dev mode)
              </summary>
              {/* Stos komponentów bywa na kilkadziesiąt linii — bez własnego
                  przewijania rozpychał panel poza ekran. */}
              <pre style={{
                ...FONT.mono(TEXT.tiny),
                color: 'var(--co-dim)', margin: '8px 0 0',
                maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            className="cyber-button-yellow"
            style={{
              width: '100%', padding: '12px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Odśwież stronę
          </button>

          {/* Gdy odświeżenie nie pomaga, to niemal zawsze zepsuty cache.
              Ten przycisk robi to samo, co „wyczyść dane strony” w ustawieniach.
              Celowo stonowany — to ostatnia furtka, nie główna akcja. */}
          <button
            onClick={hardResetApp}
            style={{
              width: '100%', marginTop: 10, padding: '10px 16px', cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--co-tint-rose-line)',
              color: 'var(--co-dim)',
              ...FONT.mono(TEXT.tiny),
              letterSpacing: TRACK.normal, textTransform: 'uppercase',
            }}
          >
            Wyczyść cache i uruchom od nowa
          </button>
        </div>
      </div>
    );
  }
}
