import { useOutletContext } from 'react-router';
import { useHistoryData } from '@/app/providers/AppDataProvider';
import HistoryTab from '@/components/history/HistoryTab';
import type { SoundType } from '@/types/ui';

export default function HistoryPage() {
  const { playSound } = useOutletContext<{ playSound: (type: SoundType) => void }>();
  const { history, playerNames } = useHistoryData();

  return <HistoryTab history={history} playerNames={playerNames} playSound={playSound} />;
}
