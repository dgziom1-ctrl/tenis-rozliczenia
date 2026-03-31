import { Trash2 } from 'lucide-react';
import { getPlayerColor } from '@/constants/colors';

interface PlayerProfileCardProps {
  player: { name: string };
  index: number;
  onDelete: (name: string) => void;
  isOrganizer: boolean;
  disabled?: boolean;
}

export default function PlayerProfileCard({ player, index, onDelete, isOrganizer, disabled = false }: PlayerProfileCardProps) {
  const c = getPlayerColor(player.name, index);
  const initials = player.name.slice(0, 2).toUpperCase();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: 'var(--co-dark)', border: `1px solid ${isOrganizer ? 'rgba(0,229,255,0.3)' : c.border + '35'}`,
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
      transition: 'border-color 0.2s',
      boxShadow: `inset 0 0 10px ${isOrganizer ? 'rgba(0,229,255,0.03)' : c.border + '08'}`,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = isOrganizer ? 'rgba(0,229,255,0.5)' : c.border + '60'}
      onMouseLeave={e => e.currentTarget.style.borderColor = isOrganizer ? 'rgba(0,229,255,0.3)' : c.border + '35'}
    >
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, flexShrink: 0,
        background: c.bg, border: `1px solid ${c.border}55`,
        boxShadow: `0 0 8px ${c.border}30`,
        borderRadius: '2px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: c.text }}>{initials}</span>
      </div>

      {/* Name + class */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--co-text-hi)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name}
        </p>

      </div>

      {/* Action */}
      {!isOrganizer ? (
        <button
          onClick={() => onDelete(player.name)}
          disabled={disabled}
          style={{
          padding: '7px 10px', background: 'transparent',
          border: '1px solid var(--co-border)',
          color: 'var(--co-dim)',
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          transition: 'all 0.15s',
          flexShrink: 0,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,32,144,0.5)'; e.currentTarget.style.color = 'var(--co-yellow)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--co-border)'; e.currentTarget.style.color = 'var(--co-dim)'; }}
          title="Usuń gracza"
        >
          <Trash2 size={14} />
        </button>
      ) : (
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.12em', color: 'var(--co-dim)', padding: '4px 8px', border: '1px solid var(--co-border)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
          HQ
        </span>
      )}
    </div>
  );
}
