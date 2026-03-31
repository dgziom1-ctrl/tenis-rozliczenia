import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { subscribeToData } from '@/lib/firebase';
import type { UIData } from '@/types/ui';
import type { Payment } from '@/types/domain';

const INITIAL_APP_DATA: UIData = {
  summary: { totalToCollect: 0, settledPlayers: 0, totalPlayers: 0, totalWeeks: 0 },
  players: [],
  playerNames: [],
  defaultMultiPlayers: [],
  deletedPlayers: [],
  paidUntilWeek: {},
  history: [],
  payments: {},
};

interface AppDataContextValue {
  appData: UIData;
  isConnected: boolean;
  isLoading: boolean;
  slowLoading: boolean;
  subscriptionError: Error | null;
  retry: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<UIData>(INITIAL_APP_DATA);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const retry = useCallback(() => setRetryNonce(n => n + 1), []);

  useEffect(() => {
    setIsLoading(true);
    setSlowLoading(false);
    setSubscriptionError(null);

    const timer = setTimeout(() => setSlowLoading(true), 8000);
    const unsub = subscribeToData(
      (data) => {
        clearTimeout(timer);
        setAppData(data);
        setIsConnected(true);
        setIsLoading(false);
        setSlowLoading(false);
      },
      (error) => {
        clearTimeout(timer);
        setSubscriptionError(error);
        setIsConnected(false);
        setIsLoading(false);
        setSlowLoading(false);
      },
    );

    return () => {
      clearTimeout(timer);
      if (typeof unsub === 'function') unsub();
    };
  }, [retryNonce]);

  useEffect(() => {
    const handleOffline = () => setIsConnected(false);
    const handleOnline = () => setIsConnected(true);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const value = useMemo<AppDataContextValue>(() => ({
    appData, isConnected, isLoading, slowLoading, subscriptionError, retry,
  }), [appData, isConnected, isLoading, slowLoading, subscriptionError, retry]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): UIData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx.appData;
}

export function useConnectionStatus() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useConnectionStatus must be used within AppDataProvider');
  return {
    isConnected: ctx.isConnected,
    isLoading: ctx.isLoading,
    slowLoading: ctx.slowLoading,
    subscriptionError: ctx.subscriptionError,
    retry: ctx.retry,
  };
}

export function useDashboard() {
  const data = useAppData();
  return useMemo(() => ({
    summary: data.summary,
    players: data.players,
    paidUntilWeek: data.paidUntilWeek,
    payments: data.payments,
    history: data.history,
  }), [data.summary, data.players, data.paidUntilWeek, data.payments, data.history]);
}

export function useHistoryData() {
  const data = useAppData();
  return useMemo(() => ({
    history: data.history,
    playerNames: data.playerNames,
  }), [data.history, data.playerNames]);
}

export function usePlayersData() {
  const data = useAppData();
  return useMemo(() => ({
    players: data.players,
    playerNames: data.playerNames,
    deletedPlayers: data.deletedPlayers,
    defaultMultiPlayers: data.defaultMultiPlayers,
  }), [data.players, data.playerNames, data.deletedPlayers, data.defaultMultiPlayers]);
}

export function useAdminData() {
  const data = useAppData();
  return useMemo(() => ({
    playerNames: data.playerNames,
    defaultMultiPlayers: data.defaultMultiPlayers,
    history: data.history,
  }), [data.playerNames, data.defaultMultiPlayers, data.history]);
}

export function useAttendanceData() {
  const data = useAppData();
  return useMemo(() => ({
    players: data.players,
    history: data.history,
    summary: data.summary,
  }), [data.players, data.history, data.summary]);
}
