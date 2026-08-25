import { SPORT, MULTISPORT_DISCOUNT, SPORT_EMOJI, SPORT_ACCUSATIVE } from '@/constants';
import { formatDate, formatAmountShort } from './format';

interface MessageParams {
  date: string;
  totalCost: number;
  presentPlayers: string[];
  multisportPlayers: string[];
  sport: string;
  racketCost?: number;
  ownRacketPlayers?: string[];
}

export function buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, sport, racketCost = 0, ownRacketPlayers = [] }: MessageParams): string {
  const courtCost = totalCost - racketCost;
  const multi = multisportPlayers.filter(p => presentPlayers.includes(p));
  const hypothetical = courtCost + multi.length * MULTISPORT_DISCOUNT;
  const base = presentPlayers.length > 0 ? hypothetical / presentPlayers.length : 0;
  const discounted = Math.max(0, base - MULTISPORT_DISCOUNT);

  const ownRacketPresent = ownRacketPlayers.filter(p => presentPlayers.includes(p));
  const rentingPlayers = presentPlayers.filter(p => !ownRacketPresent.includes(p));
  const racketShare = racketCost > 0 && rentingPlayers.length > 0
    ? racketCost / rentingPlayers.length
    : 0;

  const sportEmoji = SPORT_EMOJI[sport] ?? SPORT_EMOJI[SPORT.PINGPONG];
  const sportWord = SPORT_ACCUSATIVE[sport] ?? SPORT_ACCUSATIVE[SPORT.PINGPONG];

  let msg = `${sportEmoji} Graliśmy w ${sportWord}! (${formatDate(date)})\n`;
  msg += `💰 Wynajem: ${formatAmountShort(courtCost)} zł`;
  if (racketCost > 0) msg += ` + rakiety: ${formatAmountShort(racketCost)} zł`;
  msg += '\n';
  msg += `👥 Obecni (${presentPlayers.length}): ${presentPlayers.join(', ')}\n`;
  msg += `💳 Bez karty: ${formatAmountShort(base + racketShare)} zł/os.\n`;
  if (multi.length > 0) {
    msg += `⚡ Cena z kartą (${multi.join(', ')}): ${formatAmountShort(discounted + racketShare)} zł/os.\n`;
  }
  if (racketCost > 0 && ownRacketPresent.length > 0) {
    msg += `${sportEmoji} ${ownRacketPresent.join(', ')} (własna rakietka): ${formatAmountShort(base)} zł/os.\n`;
  }
  return msg.trim();
}
