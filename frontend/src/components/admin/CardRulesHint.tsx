import { MULTISPORT_DISCOUNT } from '@/constants';
import { FONT, TEXT } from '@/constants/styles';
import { CARD_EMOJI } from '@/utils/cardLabels';

/** Krótka ściąga pod listą kart — ta sama w dodawaniu i edycji sesji. */
export default function CardRulesHint() {
  return (
    <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 8 }}>
      {CARD_EMOJI.multi} Multisport: zwrot {MULTISPORT_DISCOUNT} zł za każdą godzinę · {CARD_EMOJI.single} Medicover: zwrot {MULTISPORT_DISCOUNT} zł raz na sesję.
      {' '}Kartę gracza (Multisport albo Medicover) ustawiasz w zakładce Gracze.
    </p>
  );
}
