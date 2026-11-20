import { SPORT, SPORT_EMOJI, SPORT_ACCUSATIVE } from '@/constants';
import { getCourtRefund, getShareGroups } from './sessionCost';
import type { DiscountModel, ShareGroup } from './sessionCost';
import { formatDate, formatAmountShort, plural } from './format';
import { CARD_EMOJI, shareGroupLabel } from './cardLabels';

interface MessageParams {
  date: string;
  totalCost: number;
  presentPlayers: string[];
  multisportPlayers: string[];
  sport: string;
  racketCost?: number;
  ownRacketPlayers?: string[];
  courtCount?: number;
  durationHours?: number;
  singleScanPlayers?: string[];
  discountModel?: DiscountModel;
  /** Cena kortu przed zwrotem za karty — gdy znana, wiadomość pokazuje zwrot osobno. */
  courtGross?: number;
}

/** Kwota w wiadomości: pełne złotówki bez „,00” (`5 zł`), grosze z dwiema cyframi (`24,70 zł`). */
function zl(amount: number): string {
  const cents = Math.round(amount * 100);
  return cents % 100 === 0 ? `${cents / 100} zł` : `${formatAmountShort(amount)} zł`;
}

/** Jedna linia na grupę, zawsze w tym samym układzie: znacznik, nazwa, kto. */
function describe(group: ShareGroup, sportEmoji: string): string {
  const cardEmoji = group.card === 'none' && group.ownRacket ? '' : CARD_EMOJI[group.card];
  const marker = `${cardEmoji}${group.ownRacket ? sportEmoji : ''}`;
  return `${marker} ${shareGroupLabel(group)} (${group.names.join(', ')})`;
}

export function buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, sport, racketCost = 0, ownRacketPlayers = [], courtCount = 1, durationHours = 1, singleScanPlayers, discountModel, courtGross }: MessageParams): string {
  // Stawki bierzemy z silnika rozliczeń, więc to, co ludzie przeczytają na
  // grupie, zgadza się co do grosza z saldami w aplikacji.
  const groups = getShareGroups({ totalCost, racketCost, presentPlayers, multisportPlayers, ownRacketPlayers, courtCount, durationHours, sport, singleScanPlayers, discountModel, courtGross });
  const courtCost = totalCost - racketCost;
  const refund = getCourtRefund({ totalCost, racketCost, courtGross, discountModel });

  const sportEmoji = SPORT_EMOJI[sport] ?? SPORT_EMOJI[SPORT.PINGPONG];
  const sportWord = SPORT_ACCUSATIVE[sport] ?? SPORT_ACCUSATIVE[SPORT.PINGPONG];

  // Ping-pong gra się przy stołach, reszta na kortach. Liczba mnoga w obu liniach.
  const isTable = sport === SPORT.PINGPONG || !(sport in SPORT_EMOJI);
  const unit = isTable
    ? plural(courtCount, 'stół', 'stoły', 'stołów')
    : plural(courtCount, 'kort', 'korty', 'kortów');
  const label = isTable
    ? (courtCount > 1 ? 'Stoły' : 'Stół')
    : (courtCount > 1 ? 'Korty' : 'Kort');
  let msg = `${sportEmoji} Graliśmy w ${sportWord}! (${formatDate(date)})\n`;
  msg += `🕒 Rezerwacja: ${courtCount} ${unit}, ${durationHours} h\n`;
  const rackets = racketCost > 0 ? ` + rakiety ${zl(racketCost)}` : '';
  const hasCards = multisportPlayers.some(p => presentPlayers.includes(p));
  if (refund !== null && courtGross !== undefined) {
    // Pełny rachunek: od ceny z rezerwacji do kwoty, którą dzielimy.
    msg += refund > 0
      ? `💰 ${label} ${zl(courtGross)} − zwrot za karty ${zl(refund)}${rackets} = ${zl(totalCost)}\n`
      : `💰 ${label} ${zl(courtGross)}${rackets}\n`;
  } else if (hasCards) {
    // Stara sesja: znamy tylko kwotę po zniżkach, nie cenę kortu.
    msg += `💰 Do rozdzielenia: ${zl(courtCost)} (po zniżkach kart)${rackets}\n`;
  } else {
    msg += `💰 ${label} ${zl(courtCost)}${rackets}\n`;
  }
  msg += `👥 Obecni (${presentPlayers.length}): ${presentPlayers.join(', ')}\n`;
  for (const group of groups) {
    msg += `${describe(group, sportEmoji)}: ${zl(group.perPerson)}/os.\n`;
  }
  return msg.trim();
}
