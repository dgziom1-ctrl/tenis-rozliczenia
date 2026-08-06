import { PODIUM_ORDER } from '@/constants';
import PodiumCard from './PodiumCard';
import type { PodiumEntry } from './PodiumCard';

interface PodiumProps {
  podiumPlayers: PodiumEntry[];
  onSelect: (name: string) => void;
}

export default function Podium({ podiumPlayers, onSelect }: PodiumProps) {
  if (podiumPlayers.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
      {PODIUM_ORDER.map((targetPlace) => {
        const entry = podiumPlayers.find(p => p.place === targetPlace);
        if (!entry) return <div key={targetPlace} style={{ flex: 1, maxWidth: 'min(100%, 190px)', minWidth: 0 }} />;
        return <PodiumCard key={targetPlace} podiumEntry={entry} onSelect={onSelect} />;
      })}
    </div>
  );
}
