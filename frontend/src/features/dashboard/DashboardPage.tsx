import { useOutletContext } from 'react-router';
import { useDashboard } from '@/app/providers/AppDataProvider';
import DashboardTab from '@/components/dashboard/DashboardTab';
import type { SoundType } from '@/types/ui';

export default function DashboardPage() {
  const { playSound } = useOutletContext<{ playSound: (type: SoundType) => void }>();
  const { summary, players, paidUntilWeek, payments, history } = useDashboard();

  const data = { summary, players, paidUntilWeek, payments };

  return <DashboardTab data={data} history={history} playSound={playSound} />;
}
