import { useOutletContext } from 'react-router';
import { usePlayersData } from '@/app/providers/AppDataProvider';
import PlayersTab from '@/components/players/PlayersTab';
import type { SoundType } from '@/types/ui';

export default function PlayersPage() {
  const { playSound } = useOutletContext<{ playSound: (type: SoundType) => void }>();
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
