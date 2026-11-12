import { useLayoutContext } from '@/app/layoutContext';
import { usePlayersData } from '@/app/providers/appDataContext';
import PlayersTab from '@/components/players/PlayersTab';

export default function PlayersPage() {
  const { playSound } = useLayoutContext();
  const { players, deletedPlayers, defaultMultiPlayers } = usePlayersData();

  return (
    <PlayersTab
      players={players}
      deletedPlayers={deletedPlayers}
      defaultMultiPlayers={defaultMultiPlayers}
      playSound={playSound}
    />
  );
}
