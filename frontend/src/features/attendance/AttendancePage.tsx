import { useOutletContext, useSearchParams } from 'react-router';
import { useState, useCallback } from 'react';
import { useAttendanceData } from '@/app/providers/AppDataProvider';
import AttendanceTab from '@/components/attendance/AttendanceTab';
import type { SoundType } from '@/types/ui';

export default function AttendancePage() {
  const { playSound } = useOutletContext<{ playSound: (type: SoundType) => void }>();
  const { players, history, summary } = useAttendanceData();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPlayer = searchParams.get('player') ? decodeURIComponent(searchParams.get('player')!) : null;
  const [notifPlayer, setNotifPlayer] = useState<string | null>(initialPlayer);

  const handleNotifPlayerConsumed = useCallback(() => {
    setNotifPlayer(null);
    setSearchParams(prev => {
      prev.delete('player');
      return prev;
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
