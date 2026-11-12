import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useLayoutContext } from '@/app/layoutContext';
import { useAdminData } from '@/app/providers/appDataContext';
import AdminTab from '@/components/admin/AdminTab';
import { TAB_PATHS } from '@/constants';

export default function AdminPage() {
  const { playSound } = useLayoutContext();
  const { playerNames, defaultMultiPlayers, history, players } = useAdminData();
  const navigate = useNavigate();

  const setActiveTab = useCallback((id: string) => {
    void navigate(TAB_PATHS[id] ?? '/', { preventScrollReset: true });
  }, [navigate]);

  return (
    <AdminTab
      playerNames={playerNames}
      defaultMultiPlayers={defaultMultiPlayers}
      history={history}
      players={players}
      setActiveTab={setActiveTab}
      playSound={playSound}
    />
  );
}
