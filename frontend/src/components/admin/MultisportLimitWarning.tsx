import { MULTISPORT_DISCOUNT } from '@/constants';
import { FONT, TEXT } from '@/constants/styles';
import { formatAmount, plural } from '@/utils/format';
import { toGrosze, toZloty } from '@/utils/money';

interface MultisportLimitWarningProps {
  /** Ile kart honoruje obiekt dla tej sesji (korty × godziny × limit). */
  maxMulti: number;
  /** Ile kart faktycznie okazali obecni gracze. */
  cardCount: number;
}

/** Ostrzeżenie pod listą kart Multisport, gdy jest ich więcej niż limit obiektu. */
export default function MultisportLimitWarning({ maxMulti, cardCount }: MultisportLimitWarningProps) {
  // W groszach, tak jak w silniku podziału — inaczej 2 karty na 7 osób
  // pokazywały „4 zł” zamiast 4,28 zł.
  const perPerson = toZloty(Math.floor(maxMulti * toGrosze(MULTISPORT_DISCOUNT) / cardCount));
  return (
    <p role="alert" style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-amber)', marginTop: 8 }}>
      ⚠ Limit {maxMulti} {plural(maxMulti, 'karty', 'kart', 'kart')} przekroczony — zniżka zostanie
      proporcjonalnie podzielona na {cardCount} {plural(cardCount, 'osobę', 'osoby', 'osób')}
      {' '}({formatAmount(perPerson)}/os. zamiast {formatAmount(MULTISPORT_DISCOUNT)})
    </p>
  );
}
