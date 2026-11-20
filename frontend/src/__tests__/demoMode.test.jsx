import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Tryb demo to jedyny sposób, w jaki osoba bez projektu Firebase widzi
 * aplikację z danymi (`npm run dev`). Test pilnuje, że przełącznik naprawdę
 * pomija bazę i podstawia komplet danych — inaczej podgląd UI znowu kończy
 * się ekranem „CONNECTION FAILURE”.
 */
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(),
  set: vi.fn(),
  runTransaction: vi.fn(),
  goOffline: vi.fn(),
  goOnline: vi.fn(),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_DEMO_DATA', '1');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('tryb demo', () => {
  it('startuje z kompletem danych bez łączenia z Firebase', async () => {
    const subscribeCalls = vi.fn();
    vi.doMock('../lib/firebase/index', async (importOriginal) => {
      const original = await importOriginal();
      return { ...original, subscribeToData: subscribeCalls };
    });

    const { AppDataProvider } = await import('../app/providers/AppDataProvider');
    const { useConnectionStatus, useDashboard } = await import('../app/providers/appDataContext');
    const { ToastProvider } = await import('../components/common/Toast');

    function Probe() {
      const { hasData, isLoading, isConnected } = useConnectionStatus();
      const { players, summary } = useDashboard();
      return (
        <div>
          <span data-testid="hasData">{String(hasData)}</span>
          <span data-testid="isLoading">{String(isLoading)}</span>
          <span data-testid="isConnected">{String(isConnected)}</span>
          <span data-testid="players">{players.length}</span>
          <span data-testid="weeks">{summary.totalWeeks}</span>
        </div>
      );
    }

    render(
      <ToastProvider>
        <AppDataProvider>
          <Probe />
        </AppDataProvider>
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('hasData')).toHaveTextContent('true'));
    expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    expect(screen.getByTestId('isConnected')).toHaveTextContent('true');
    expect(screen.getByTestId('players')).toHaveTextContent('8');
    expect(screen.getByTestId('weeks')).toHaveTextContent('22');
    // Baza nie może być w ogóle dotknięta — demo nie ma prawa nic zapisywać.
    expect(subscribeCalls).not.toHaveBeenCalled();
  });

  it('odmawia zapisu od razu, zamiast czekać na timeout bazy', async () => {
    const { withTransaction } = await import('../lib/firebase/transaction');
    const result = await withTransaction(() => ({}), 'Fallback');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Tryb demo/);
  });
});
