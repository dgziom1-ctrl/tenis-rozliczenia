import { getPlayerColor } from '@/constants/colors';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';

/**
 * Awatar gracza — inicjały w kolorze jego tożsamości.
 *
 * Ten element był zaimplementowany trzy razy, każdy raz z inną geometrią:
 * 60×60 bez ścięcia, 38×38 ze ścięciem *i* martwym `borderRadius`, oraz 42×42
 * z `CLIP.badge`. Teraz jest jeden komponent z parametrem rozmiaru.
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
  const initials = name.slice(0, 2).toUpperCase();
  // Awatar zawsze nosi własny kolor gracza — nigdy nie zmienia go status długu.
  const fontSize = size >= 56 ? TEXT.h3 : size >= 40 ? TEXT.lead : TEXT.base;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size,
        background: c.bg,
        border: `1px solid ${c.border}`,
        clipPath: CLIP.badge,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--glow-box-cyan)',
        overflow: 'hidden', position: 'relative',
      }}>
        <span style={{ ...FONT.display(fontSize, TRACK.tight), color: c.text, lineHeight: 1 }}>
          {initials}
        </span>
      </div>
      {/* Status dot — only this element carries semantic color */}
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
