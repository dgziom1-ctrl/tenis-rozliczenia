import { Ticket } from 'lucide-react';
import ToggleChip from '@/components/common/ToggleChip';

interface PlayerToggleGridProps {
  names: string[];
  selected: string[];
  onToggle: (name: string) => void;
  accent?: 'yellow' | 'green' | 'amber';
  /** Gracze z Medicoverem — na ich przyciskach widać znacznik biletu. */
  medicover?: readonly string[];
}

export default function PlayerToggleGrid({ names, selected, onToggle, accent = 'yellow', medicover = [] }: PlayerToggleGridProps) {
  const chipAccent = accent === 'yellow' ? 'cyan' : accent;
  return (
    <div className="player-grid">
      {names.map(name => {
        const isMedicover = medicover.includes(name);
        return (
          <ToggleChip key={name} active={selected.includes(name)} accent={chipAccent} onClick={() => onToggle(name)}
            ariaLabel={isMedicover ? `${name} (Medicover)` : undefined}>
            {isMedicover ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Ticket size={12} aria-hidden="true" style={{ color: 'var(--co-amber)', flexShrink: 0 }} />
                {name}
              </span>
            ) : name}
          </ToggleChip>
        );
      })}
    </div>
  );
}
