import { SPORT, SQUASH_MULTISPORT_DISCOUNT, SPORT_EMOJI, isCourtSport } from '@/constants';
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
  ownRacketPlayers?: string[];
  overtimePlayers?: string[];
  overtimeCost?: number;
}

export function buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, perPerson, sport, racketCost = 0, ownRacketPlayers = [], overtimePlayers = [], overtimeCost = 0 }: MessageParams): string {
  const overtimeInPresent = overtimePlayers.filter(p => presentPlayers.includes(p));
  const hasOvertime = overtimeCost > 0 && overtimeInPresent.length > 0;
  const overtimeLine = hasOvertime
    ? `\u23f1 Dogrywka (${overtimeInPresent.join(', ')}): ${formatAmountShort(overtimeCost / overtimeInPresent.length)} z\u0142/os.\n`
    : '';
  if (isCourtSport(sport)) {
    const courtCost = totalCost - racketCost;
    const multi = multisportPlayers.filter(p => presentPlayers.includes(p));
    const hypothetical = courtCost + multi.length * SQUASH_MULTISPORT_DISCOUNT;
    const base = presentPlayers.length > 0 ? hypothetical / presentPlayers.length : 0;
    const discounted = Math.max(0, base - SQUASH_MULTISPORT_DISCOUNT);

    const ownRacketPresent = ownRacketPlayers.filter(p => presentPlayers.includes(p));
    const rentingPlayers = presentPlayers.filter(p => !ownRacketPresent.includes(p));
    const racketShare = racketCost > 0 && rentingPlayers.length > 0
      ? racketCost / rentingPlayers.length
      : 0;

    const sportEmoji = SPORT_EMOJI[sport] ?? '🎾';
    const sportWord = sport === SPORT.BADMINTON ? 'badmintona' : 'squasha';
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
    msg += overtimeLine;
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
  msg += overtimeLine;
  return msg.trim();
}
