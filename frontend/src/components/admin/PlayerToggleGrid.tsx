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
    ? 'rgba(0,255,136,0.08)'
    : accent === 'amber'
    ? 'rgba(251,191,36,0.08)'
    : 'rgba(0,229,255,0.08)';
  const accentBorder = accent === 'green'
    ? 'rgba(0,255,136,0.4)'
    : accent === 'amber'
    ? 'rgba(251,191,36,0.4)'
    : 'rgba(0,229,255,0.4)';
  const accentGlow = accent === 'green'
    ? 'rgba(0,255,136,0.1)'
    : accent === 'amber'
    ? 'rgba(251,191,36,0.1)'
    : 'rgba(0,229,255,0.1)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
      {names.map(name => {
        const active = selected.includes(name);
        return (
          <button type="button" key={name} onClick={() => onToggle(name)} style={{
            padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
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
