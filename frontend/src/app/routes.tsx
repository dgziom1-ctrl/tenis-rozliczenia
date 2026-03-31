import { Navigate } from 'react-router';
import { lazy, Suspense, type ComponentType } from 'react';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const AttendancePage = lazy(() => import('@/features/attendance/AttendancePage'));
const AdminPage = lazy(() => import('@/features/admin/AdminPage'));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'));
const PlayersPage = lazy(() => import('@/features/players/PlayersPage'));

function PageFallback() {
  return null;
}

function LazyPage({ Component }: { Component: React.LazyExoticComponent<ComponentType> }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

export const routes = [
  { index: true, element: <LazyPage Component={DashboardPage} /> },
  { path: 'attendance', element: <LazyPage Component={AttendancePage} /> },
  { path: 'admin', element: <LazyPage Component={AdminPage} /> },
  { path: 'history', element: <LazyPage Component={HistoryPage} /> },
  { path: 'players', element: <LazyPage Component={PlayersPage} /> },
  { path: '*', element: <Navigate to="/" replace /> },
];
