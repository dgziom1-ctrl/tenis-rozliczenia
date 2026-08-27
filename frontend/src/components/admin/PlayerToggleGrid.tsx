import { CLIP } from '@/constants/styles';
interface PlayerToggleGridProps {
  names: string[];
  selected: string[];
  onToggle: (name: string) => void;
  accent?: 'yellow' | 'green' | 'amber';
}

export default function PlayerToggleGrid({ names, selected, onToggle, accent = 'yellow' }: PlayerToggleGridProps) {
  const accentColor = accent === 'green'
    ? 'var(--co-green)'
    : accent === 'amber'
    ? 'var(--co-amber)'
    : 'var(--co-cyan)';
  const accentAlpha = accent === 'green'
    ? 'var(--co-tint-green)'
    : accent === 'amber'
    ? 'var(--co-amber-dim)'
    : 'var(--co-tint-hi)';
  const accentBorder = accent === 'green'
    ? 'var(--co-green)'
    : accent === 'amber'
    ? 'var(--co-amber)'
    : 'var(--co-cyan)';
  const accentGlow = accent === 'green'
    ? 'var(--co-tint-green)'
    : accent === 'amber'
    ? 'var(--co-amber-dim)'
    : 'var(--co-tint-hi)';

  return (
    <div className="player-grid">
      {names.map(name => {
        const active = selected.includes(name);
        return (
          <button type="button" key={name} onClick={() => onToggle(name)} style={{
            padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: 'var(--font-display)', fontSize: '0.875rem', 
            letterSpacing: '0.1em', textTransform: 'uppercase',
            clipPath: CLIP.badge,
            ...(active ? {
              background: accentAlpha, border: `1px solid ${accentBorder}`, color: accentColor,
              boxShadow: `0 0 10px ${accentGlow}`,
            } : {
              background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
            }),
          }}>
            {name}
          </button>
        );
      })}
    </div>
  );
}
