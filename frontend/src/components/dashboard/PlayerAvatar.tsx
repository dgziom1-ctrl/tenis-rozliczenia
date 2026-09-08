import { getPlayerColor } from '@/constants/colors';
import { CLIP } from '@/constants/styles';
import { CyberPortrait } from './CyberPortrait';

/**
 * Awatar gracza — mini-portret z inicjałami w kolorze jego tożsamości.
 */

interface PlayerAvatarProps {
  name: string;
  index?: number;
  size?: number;
  /** Kropka statusu rozliczenia — tylko na karcie gracza. */
  isPending?: boolean;
}

export function PlayerAvatar({ name, index, size = 60, isPending }: PlayerAvatarProps) {
  const c = getPlayerColor(name, index);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size,
        border: `1px solid ${c.border}`,
        clipPath: CLIP.badge,
        boxShadow: 'var(--glow-box-cyan)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <CyberPortrait name={name} color={c.border} size={size} />
      </div>
      {isPending !== undefined && (
        <div
          title={isPending ? 'Niezapłacone' : 'Rozliczone'}
          style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 10, height: 10,
            background: isPending ? 'var(--co-rose)' : 'var(--co-green)',
            border: '2px solid var(--co-void)',
            boxShadow: isPending ? 'var(--glow-box-rose)' : 'var(--glow-box-cyan)',
            borderRadius: '50%',
          }}
        />
      )}
    </div>
  );
}
