import { createContext, useContext, useMemo, type Context } from 'react';
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

export interface ConnectionStatus {
  hasData: boolean;
  isConnected: boolean;
  isLoading: boolean;
  slowLoading: boolean;
  /** Baza nie odpowiedziała w wyznaczonym czasie — pokazujemy interfejs bez danych. */
  bootTimedOut: boolean;
  subscriptionError: Error | null;
  retry: () => void;
}

/**
 * Dane i stan połączenia żyją w osobnych kontekstach.
 *
 * Wspólny kontekst zmieniał wartość przy każdym mignięciu połączenia
 * (`isConnected`, `slowLoading`), a wtedy React przerenderowywał każdą zakładkę
 * czytającą dane — choć same dane się nie zmieniły. Teraz zmiana stanu łącza
 * dociera tylko do tych, którzy go czytają (powłoka aplikacji i baner offline).
 */
export const AppDataContext = createContext<UIData | null>(null);
export const ConnectionStatusContext = createContext<ConnectionStatus | null>(null);

function useRequiredContext<T>(context: Context<T | null>, hookName: string): T {
  const value = useContext(context);
  if (value === null) throw new Error(`${hookName} must be used within AppDataProvider`);
  return value;
}

function useAppData(): UIData {
  return useRequiredContext(AppDataContext, 'useAppData');
}

export function useConnectionStatus(): ConnectionStatus {
  return useRequiredContext(ConnectionStatusContext, 'useConnectionStatus');
}

// Każdy widok pobiera tylko ten wycinek danych, którego naprawdę używa, a wynik
// jest stabilny, dopóki te pola się nie zmienią — dzięki temu memoizowane
// komponenty niżej nie renderują się bez potrzeby.

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
    players: data.players,
  }), [data.playerNames, data.defaultMultiPlayers, data.history, data.players]);
}

export function useAttendanceData() {
  const data = useAppData();
  return useMemo(() => ({
    players: data.players,
    history: data.history,
    summary: data.summary,
  }), [data.players, data.history, data.summary]);
}
