import { FONT, TEXT } from '@/constants/styles';
import { RARITY_LABEL } from '@/utils/playerCard';
import type { PlayerCardMeta, PlayerColor } from '@/types/ui';

interface CardStatusStripProps {
  isOrganizer: boolean;
  isPending: boolean;
  hasCredit: boolean;
  isSettled: boolean;
  playerColor: PlayerColor;
  meta: PlayerCardMeta;
}

/** Pasek u góry karty: stan salda po lewej, rzadkość karty po prawej. */
export default function CardStatusStrip({ isOrganizer, isPending, hasCredit, isSettled, playerColor, meta }: CardStatusStripProps) {
  return (
    <div style={{
      padding: '6px 14px',
      background: (!isOrganizer && isPending)
        ? 'var(--co-tint-rose)'
        : hasCredit ? 'var(--co-tint-green)'
        : 'var(--co-tint)',
      borderBottom: '1px solid var(--co-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', zIndex: 1,
    }}>
      <span style={{
        ...FONT.mono(TEXT.tiny),
        color: (!isOrganizer && isPending) ? `${playerColor.border}99` : hasCredit ? 'var(--co-green)' : 'var(--co-dim)',
        letterSpacing: 'normal', textTransform: 'none',
      }}>
        {isOrganizer
          ? (hasCredit ? '↑ Do zebrania' : isPending ? '↕ Saldo' : '✓ Skarbnik')
          : isPending ? 'Do wpłaty'
          : isSettled ? 'Rozliczony'
          : '↑ Nadpłata'}
      </span>
      <span style={{
        ...FONT.display(TEXT.tiny),
        color: meta.rank.hex, letterSpacing: 'normal',
      }}>{RARITY_LABEL[meta.rarity]}</span>
    </div>
  );
}
