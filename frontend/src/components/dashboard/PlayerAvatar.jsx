import { getPlayerColor } from '../../constants/playerColors';

// ── Avatar ───────────────────────────────────────────────────────
export function PlayerAvatar({ name, index, isPending }) {
  const c = getPlayerColor(name, index);
  const initials = name.slice(0, 2).toUpperCase();
  // Avatar always uses player's own color — never changes based on debt status

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 60, height: 60,
        background: c.bg,
        border: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        boxShadow: `0 0 12px ${c.border}40, inset 0 0 6px ${c.border}08`,
        overflow: 'hidden', position: 'relative',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.3rem',
          color: c.text,
          lineHeight: 1,
          textShadow: `0 0 10px ${c.border}55`,
        }}>{initials}</span>
      </div>
      {/* Status dot — only this element carries semantic color */}
      <div
        title={isPending ? 'Niezapłacone' : 'Rozliczone'}
        style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 10, height: 10,
          background: isPending ? 'var(--co-yellow)' : 'var(--co-green)',
          border: '2px solid var(--co-void)',
          boxShadow: isPending ? '0 0 4px rgba(255,32,144,0.5)' : '0 0 4px rgba(0,255,102,0.5)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}
