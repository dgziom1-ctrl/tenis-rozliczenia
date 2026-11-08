import { MULTISPORT_DISCOUNT } from '@/constants';
import { FONT, TEXT } from '@/constants/styles';

interface MultisportLimitWarningProps {
  /** Ile kart honoruje obiekt dla tej sesji (korty × godziny × limit). */
  maxMulti: number;
  /** Ile kart faktycznie okazali obecni gracze. */
  cardCount: number;
}

/** Ostrzeżenie pod listą kart Multisport, gdy jest ich więcej niż limit obiektu. */
export default function MultisportLimitWarning({ maxMulti, cardCount }: MultisportLimitWarningProps) {
  const perPerson = Math.floor(maxMulti * MULTISPORT_DISCOUNT / cardCount);
  return (
    <p role="alert" style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-amber)', marginTop: 8 }}>
      ⚠ Limit {maxMulti} kart przekroczony — zniżka zostanie proporcjonalnie podzielona na {cardCount} osób ({perPerson} zł/os. zamiast {MULTISPORT_DISCOUNT} zł)
    </p>
  );
}
