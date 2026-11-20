import { PODIUM_ORDER } from '@/constants';
import PodiumCard from './PodiumCard';
import type { PodiumEntry } from './PodiumCard';

interface PodiumProps {
  podiumPlayers: PodiumEntry[];
  onSelect: (name: string) => void;
}

// Kolejność w DOM (i dla czytnika ekranu) to 1., 2., 3. miejsce; układ
// wizualny „2-1-3” robi CSS `order`. Wcześniej DOM miał kolejność wizualną,
// więc czytnik zaczynał od drugiego miejsca.
const READING_ORDER = [...PODIUM_ORDER].sort((a, b) => a - b);

export default function Podium({ podiumPlayers, onSelect }: PodiumProps) {
  if (podiumPlayers.length === 0) return null;
  return (
    // marginBottom był 36px, mimo że rodzic w AttendanceTab ma gap 20 —
    // odstęp pod podium wyłamywał się z rytmu całej zakładki.
    <div role="group" aria-label="Podium rankingu" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
      {READING_ORDER.map((targetPlace) => {
        const order = PODIUM_ORDER.indexOf(targetPlace);
        const entry = podiumPlayers.find(p => p.place === targetPlace);
        // Placeholder bez wysokości przy `alignItems: flex-end` zapadał się
        // i podium z dwoma miejscami rozjeżdżało się asymetrycznie.
        if (!entry) return <div key={targetPlace} aria-hidden="true" style={{ order, flex: 1, maxWidth: 'min(100%, 190px)', minWidth: 0, height: 150 }} />;
        return <PodiumCard key={targetPlace} podiumEntry={entry} onSelect={onSelect} order={order} />;
      })}
    </div>
  );
}
