import { useOutletContext, useNavigate } from 'react-router';
import { useCallback } from 'react';
import { useAdminData } from '@/app/providers/appDataContext';
import AdminTab from '@/components/admin/AdminTab';
import { TAB_PATHS } from '@/constants';
import type { SoundType } from '@/types/ui';

export default function AdminPage() {
  const { playSound } = useOutletContext<{ playSound: (type: SoundType) => void }>();
  const { playerNames, defaultMultiPlayers, history } = useAdminData();
  const navigate = useNavigate();

  const setActiveTab = useCallback((id: string) => {
    void navigate(TAB_PATHS[id] ?? '/');
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
