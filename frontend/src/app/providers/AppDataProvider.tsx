import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { onValue, ref } from 'firebase/database';
import { subscribeToData, database } from '@/lib/firebase';
import { useToast } from '@/components/common/Toast';
import type { UIData } from '@/types/ui';
import { AppDataContext, INITIAL_APP_DATA, type AppDataContextValue } from './appDataContext';

const SLOW_LOADING_AFTER_MS = 8000;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<UIData>(INITIAL_APP_DATA);
  const [hasData, setHasData] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const { showError } = useToast();

  const retry = useCallback(() => setRetryNonce(n => n + 1), []);

  useEffect(() => {
    setIsLoading(true);
    setSlowLoading(false);
    setSubscriptionError(null);

    const timer = setTimeout(() => setSlowLoading(true), SLOW_LOADING_AFTER_MS);
    const unsub = subscribeToData(
      (data) => {
        clearTimeout(timer);
        setAppData(data);
        setHasData(true);
        setIsLoading(false);
        setSlowLoading(false);
        setSubscriptionError(null);
      },
      (error, kind) => {
        clearTimeout(timer);
        if (kind === 'data') {
          // Połączenie działa, ale jeden snapshot był wadliwy — NIE kasujemy
          // działającej aplikacji, pokazujemy tylko dyskretny komunikat.
          console.error('Data processing error:', error);
          showError('Nie udało się przetworzyć części danych — pokazuję ostatni poprawny stan.');
          setIsLoading(false);
          setSlowLoading(false);
          return;
        }
        // Błąd połączenia — pełny ekran błędu tylko wtedy, gdy nie mamy żadnych danych.
        setSubscriptionError(error);
        setIsLoading(false);
        setSlowLoading(false);
      },
    );

    return () => {
      clearTimeout(timer);
      if (typeof unsub === 'function') unsub();
    };
  }, [retryNonce, showError]);

  // Rzeczywisty stan połączenia z bazą (nie polega na niepewnym navigator.onLine).
  useEffect(() => {
    const connRef = ref(database, '.info/connected');
    const unsub = onValue(connRef, (snap) => setIsConnected(snap.val() === true));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const value = useMemo<AppDataContextValue>(() => ({
    appData, hasData, isConnected, isLoading, slowLoading, subscriptionError, retry,
  }), [appData, hasData, isConnected, isLoading, slowLoading, subscriptionError, retry]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
