import { Navigate } from 'react-router';
import { lazy } from 'react';
import { LazyPage } from './LazyPage';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const AttendancePage = lazy(() => import('@/features/attendance/AttendancePage'));
const AdminPage = lazy(() => import('@/features/admin/AdminPage'));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'));
const PlayersPage = lazy(() => import('@/features/players/PlayersPage'));

export const routes = [
  { index: true, element: <LazyPage Component={DashboardPage} /> },
  { path: 'attendance', element: <LazyPage Component={AttendancePage} /> },
  { path: 'admin', element: <LazyPage Component={AdminPage} /> },
  { path: 'history', element: <LazyPage Component={HistoryPage} /> },
  { path: 'players', element: <LazyPage Component={PlayersPage} /> },
  { path: '*', element: <Navigate to="/" replace /> },
];
