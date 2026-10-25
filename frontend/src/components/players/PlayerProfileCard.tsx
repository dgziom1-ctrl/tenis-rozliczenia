import { Trash2 } from 'lucide-react';
import type { PlayerColor } from '@/types/ui';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';
import { PlayerAvatar } from '../dashboard/PlayerAvatar';

interface PlayerProfileCardProps {
  player: { name: string };
  playerColor: PlayerColor;
  onDelete: (name: string) => void;
  isOrganizer: boolean;
  disabled?: boolean;
}

export default function PlayerProfileCard({ player, playerColor, onDelete, isOrganizer, disabled = false }: PlayerProfileCardProps) {
  const c = playerColor;
  const idleBorder = `${c.border}35`;

  return (
    <div className="glass-panel" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      border: `1px solid ${idleBorder}`,
      clipPath: CLIP.smallCard,
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = c.border}
      onMouseLeave={e => e.currentTarget.style.borderColor = idleBorder}
    >
      <PlayerAvatar name={player.name} color={c} size={40} />

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...FONT.display(TEXT.base, TRACK.tight), color: 'var(--co-text-hi)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name}
        </p>
      </div>

      {/* Action — hover przez klasę `.icon-btn.danger`, nie przez handlery JS,
          które na dotyku zostawały aktywne do kolejnego tapnięcia. */}
      {!isOrganizer ? (
        <button
          onClick={() => onDelete(player.name)}
          disabled={disabled}
          className="icon-btn danger"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, flexShrink: 0,
            background: 'transparent',
            border: '1px solid var(--co-border)',
            color: 'var(--co-dim)',
            clipPath: CLIP.badge,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          title="Usuń gracza"
          aria-label={`Usuń gracza ${player.name}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      ) : (
        <span style={{ ...FONT.display(TEXT.tiny, TRACK.normal), color: 'var(--co-dim)', padding: '4px 8px', border: '1px solid var(--co-border)', clipPath: CLIP.badge }}>
          HQ
        </span>
      )}
    </div>
  );
}
