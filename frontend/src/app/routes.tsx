import { Navigate } from 'react-router';
import { lazy } from 'react';
import { LazyPage } from './LazyPage';

const loadDashboard = () => import('@/features/dashboard/DashboardPage');
const loadAttendance = () => import('@/features/attendance/AttendancePage');
const loadAdmin = () => import('@/features/admin/AdminPage');
const loadHistory = () => import('@/features/history/HistoryPage');
const loadPlayers = () => import('@/features/players/PlayersPage');

const DashboardPage = lazy(loadDashboard);
const AttendancePage = lazy(loadAttendance);
const AdminPage = lazy(loadAdmin);
const HistoryPage = lazy(loadHistory);
const PlayersPage = lazy(loadPlayers);

/**
 * Dociąga paczki pozostałych zakładek, gdy przeglądarka ma wolną chwilę.
 * Pierwsze wejście w zakładkę nie czeka wtedy na sieć — a w trakcie
 * oczekiwania zawartość miała zerową wysokość, przez co dolny pasek
 * „podskakiwał". Błąd pobrania jest ignorowany: zakładka spróbuje jeszcze raz
 * przy normalnym wejściu (i ma własną osłonę błędu).
 */
export function prefetchTabs(): void {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (saveData) return;
  const run = () => {
    for (const load of [loadAttendance, loadAdmin, loadHistory, loadPlayers, loadDashboard]) {
      load().catch(() => { /* ponowi się przy wejściu w zakładkę */ });
    }
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}

export const routes = [
  { index: true, element: <LazyPage Component={DashboardPage} /> },
  { path: 'attendance', element: <LazyPage Component={AttendancePage} /> },
  { path: 'admin', element: <LazyPage Component={AdminPage} /> },
  { path: 'history', element: <LazyPage Component={HistoryPage} /> },
  { path: 'players', element: <LazyPage Component={PlayersPage} /> },
  { path: '*', element: <Navigate to="/" replace /> },
];
