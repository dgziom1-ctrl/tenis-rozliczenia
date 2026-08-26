import { createContext, useContext, useMemo } from 'react';
import type { UIData } from '@/types/ui';

// Kontekst i selektory trzymamy poza plikiem providera, żeby ten eksportował
// wyłącznie komponent — inaczej Fast Refresh przeładowuje całe drzewo przy
// każdej zmianie w hookach.

export const INITIAL_APP_DATA: UIData = {
  summary: { totalToCollect: 0, settledPlayers: 0, totalPlayers: 0, totalWeeks: 0 },
  players: [],
  playerNames: [],
  defaultMultiPlayers: [],
  deletedPlayers: [],
  history: [],
  payments: {},
};

export interface AppDataContextValue {
  appData: UIData;
  hasData: boolean;
  isConnected: boolean;
  isLoading: boolean;
  slowLoading: boolean;
  /** Baza nie odpowiedziała w wyznaczonym czasie — pokazujemy interfejs bez danych. */
  bootTimedOut: boolean;
  subscriptionError: Error | null;
  retry: () => void;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

function useAppDataContext(hookName: string): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error(`${hookName} must be used within AppDataProvider`);
  return ctx;
}

function useAppData(): UIData {
  return useAppDataContext('useAppData').appData;
}

export function useConnectionStatus() {
  const ctx = useAppDataContext('useConnectionStatus');
  return {
    hasData: ctx.hasData,
    isConnected: ctx.isConnected,
    isLoading: ctx.isLoading,
    slowLoading: ctx.slowLoading,
    bootTimedOut: ctx.bootTimedOut,
    subscriptionError: ctx.subscriptionError,
    retry: ctx.retry,
  };
}

// Każdy widok pobiera tylko ten wycinek danych, którego naprawdę używa —
// dzięki temu zmiana wpłaty nie przerenderowuje np. rankingu.

export function useDashboard() {
  const data = useAppData();
  return useMemo(() => ({
    summary: data.summary,
    players: data.players,
    payments: data.payments,
    history: data.history,
  }), [data.summary, data.players, data.payments, data.history]);
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
