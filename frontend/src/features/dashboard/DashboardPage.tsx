import { useLayoutContext } from '@/app/layoutContext';
import { useDashboard } from '@/app/providers/appDataContext';
import DashboardTab from '@/components/dashboard/DashboardTab';

export default function DashboardPage() {
  const { playSound } = useLayoutContext();
  // Obiekt z `useDashboard` jest memoizowany — przekazujemy go wprost, zamiast
  // składać nowy `{ summary, players, payments }` przy każdym renderze.
  const dashboard = useDashboard();

  return <DashboardTab data={dashboard} history={dashboard.history} playSound={playSound} />;
}
