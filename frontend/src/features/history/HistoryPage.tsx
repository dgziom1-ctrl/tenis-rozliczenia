import { useLayoutContext } from '@/app/layoutContext';
import { useHistoryData } from '@/app/providers/appDataContext';
import HistoryTab from '@/components/history/HistoryTab';

export default function HistoryPage() {
  const { playSound } = useLayoutContext();
  const { history, playerNames } = useHistoryData();

  return <HistoryTab history={history} playerNames={playerNames} playSound={playSound} />;
}
