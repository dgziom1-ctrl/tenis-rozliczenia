import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useLayoutContext } from '@/app/layoutContext';
import { useAttendanceData } from '@/app/providers/appDataContext';
import AttendanceTab from '@/components/attendance/AttendanceTab';

export default function AttendancePage() {
  const { playSound } = useLayoutContext();
  const { players, history, summary } = useAttendanceData();
  const [searchParams, setSearchParams] = useSearchParams();

  // `searchParams.get` już zdekodował wartość — drugie `decodeURIComponent`
  // wywalało się błędem URIError na nazwie z `%`.
  // Czytamy parametr na bieżąco (bez kopii w stanie), żeby link z powiadomienia
  // otwarty przy zamontowanej stronie też wybierał gracza.
  const notifPlayer = searchParams.get('player') || null;

  const handleNotifPlayerConsumed = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('player');
      return next;
    });
  }, [setSearchParams]);

  return (
    <AttendanceTab
      players={players}
      history={history}
      summary={summary}
      playSound={playSound}
      initialPlayer={notifPlayer}
      onInitialPlayerConsumed={handleNotifPlayerConsumed}
    />
  );
}
