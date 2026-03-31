import { useOutletContext, useNavigate } from 'react-router';
import { useCallback } from 'react';
import { useAdminData } from '@/app/providers/AppDataProvider';
import AdminTab from '@/components/admin/AdminTab';
import type { SoundType } from '@/types/ui';

export default function AdminPage() {
  const { playSound } = useOutletContext<{ playSound: (type: SoundType) => void }>();
  const { playerNames, defaultMultiPlayers, history } = useAdminData();
  const navigate = useNavigate();

  const setActiveTab = useCallback((id: string) => {
    const paths: Record<string, string> = {
      dashboard: '/',
      attendance: '/attendance',
      admin: '/admin',
      history: '/history',
      players: '/players',
    };
    navigate(paths[id] || '/');
  }, [navigate]);

  return (
    <AdminTab
      playerNames={playerNames}
      defaultMultiPlayers={defaultMultiPlayers}
      history={history}
      setActiveTab={setActiveTab}
      playSound={playSound}
    />
  );
}
