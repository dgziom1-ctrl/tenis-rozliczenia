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
    // marginBottom był 36px, mimo że rodzic w AttendanceTab ma gap 20 —
    // odstęp pod podium wyłamywał się z rytmu całej zakładki.
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
      {PODIUM_ORDER.map((targetPlace) => {
        const entry = podiumPlayers.find(p => p.place === targetPlace);
        // Placeholder bez wysokości przy `alignItems: flex-end` zapadał się
        // i podium z dwoma miejscami rozjeżdżało się asymetrycznie.
        if (!entry) return <div key={targetPlace} aria-hidden="true" style={{ flex: 1, maxWidth: 'min(100%, 190px)', minWidth: 0, height: 62 }} />;
        return <PodiumCard key={targetPlace} podiumEntry={entry} onSelect={onSelect} />;
      })}
    </div>
  );
}
