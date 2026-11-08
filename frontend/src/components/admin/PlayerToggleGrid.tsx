import ToggleChip from '@/components/common/ToggleChip';

interface PlayerToggleGridProps {
  names: string[];
  selected: string[];
  onToggle: (name: string) => void;
  accent?: 'yellow' | 'green' | 'amber';
}

export default function PlayerToggleGrid({ names, selected, onToggle, accent = 'yellow' }: PlayerToggleGridProps) {
  const chipAccent = accent === 'yellow' ? 'cyan' : accent;
  return (
    <div className="player-grid">
      {names.map(name => (
        <ToggleChip key={name} active={selected.includes(name)} accent={chipAccent} onClick={() => onToggle(name)}>
          {name}
        </ToggleChip>
      ))}
    </div>
  );
}
