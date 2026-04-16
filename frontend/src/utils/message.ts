import { SPORT, SQUASH_MULTISPORT_DISCOUNT, OWN_RACKET_PLAYERS } from '@/constants';
import { formatDate, formatAmountShort } from './format';
import { getPayingPlayers } from './debt';

interface MessageParams {
  date: string;
  totalCost: number;
  presentPlayers: string[];
  multisportPlayers: string[];
  perPerson: number;
  sport: string;
  racketCost?: number;
}

export function buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, perPerson, sport, racketCost = 0 }: MessageParams): string {
  if (sport === SPORT.SQUASH) {
    const courtCost = totalCost - racketCost;
    const multi = multisportPlayers.filter(p => presentPlayers.includes(p));
    const hypothetical = courtCost + multi.length * SQUASH_MULTISPORT_DISCOUNT;
    const base = presentPlayers.length > 0 ? hypothetical / presentPlayers.length : 0;
    const discounted = Math.max(0, base - SQUASH_MULTISPORT_DISCOUNT);

    const rentingPlayers = presentPlayers.filter(p => !OWN_RACKET_PLAYERS.includes(p));
    const ownRacketPresent = presentPlayers.filter(p => OWN_RACKET_PLAYERS.includes(p));
    const racketShare = racketCost > 0 && rentingPlayers.length > 0
      ? racketCost / rentingPlayers.length
      : 0;

    let msg = `🎾 Graliśmy w squasha! (${formatDate(date)})\n`;
    msg += `💰 Wynajem: ${formatAmountShort(courtCost)} zł`;
    if (racketCost > 0) msg += ` + rakiety: ${formatAmountShort(racketCost)} zł`;
    msg += '\n';
    msg += `👥 Obecni (${presentPlayers.length}): ${presentPlayers.join(', ')}\n`;
    msg += `💳 Bez karty: ${formatAmountShort(base + racketShare)} zł/os.\n`;
    if (multi.length > 0) {
      msg += `⚡ Cena z kartą (${multi.join(', ')}): ${formatAmountShort(discounted + racketShare)} zł/os.\n`;
    }
    if (racketCost > 0 && ownRacketPresent.length > 0) {
      msg += `🎾 ${ownRacketPresent.join(', ')} (własna rakietka): ${formatAmountShort(base)} zł/os.\n`;
    }
    return msg.trim();
  }

  const paying = getPayingPlayers(presentPlayers, multisportPlayers);
  const multi = multisportPlayers.filter(p => presentPlayers.includes(p));
  let msg = `🏓 Graliśmy! (${formatDate(date)})\n`;
  msg += `💰 Koszt: ${formatAmountShort(totalCost)} zł\n`;
  msg += `👥 Obecni (${presentPlayers.length}): ${presentPlayers.join(', ')}\n`;
  if (paying.length > 0) {
    msg += `💳 Każdy płaci: ${formatAmountShort(perPerson)} zł`;
    if (paying.length !== presentPlayers.length) msg += ` (${paying.length} os.)`;
    msg += '\n';
  }
  if (multi.length > 0) msg += `⚡ Multisport (bezpłatnie): ${multi.join(', ')}\n`;
  return msg.trim();
}
