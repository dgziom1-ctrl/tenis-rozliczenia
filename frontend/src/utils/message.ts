import { SPORT, SPORT_EMOJI, SPORT_ACCUSATIVE } from '@/constants';
import { getShareGroups } from './sessionCost';
import type { ShareGroup } from './sessionCost';
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

function describe(group: ShareGroup, sportEmoji: string): string {
  if (group.ownRacket) {
    return group.hasCard
      ? `⚡${sportEmoji} ${group.names.join(', ')} (karta + własna rakietka)`
      : `${sportEmoji} ${group.names.join(', ')} (własna rakietka)`;
  }
  return group.hasCard
    ? `⚡ Cena z kartą (${group.names.join(', ')})`
    : '💳 Bez karty';
}

export function buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, sport, racketCost = 0, ownRacketPlayers = [] }: MessageParams): string {
  // Stawki bierzemy z silnika rozliczeń, więc to, co ludzie przeczytają na
  // grupie, zgadza się co do grosza z saldami w aplikacji.
  const groups = getShareGroups({ totalCost, racketCost, presentPlayers, multisportPlayers, ownRacketPlayers });
  const courtCost = totalCost - racketCost;

  const sportEmoji = SPORT_EMOJI[sport] ?? SPORT_EMOJI[SPORT.PINGPONG];
  const sportWord = SPORT_ACCUSATIVE[sport] ?? SPORT_ACCUSATIVE[SPORT.PINGPONG];

  let msg = `${sportEmoji} Graliśmy w ${sportWord}! (${formatDate(date)})\n`;
  msg += `💰 Wynajem: ${formatAmountShort(courtCost)} zł`;
  if (racketCost > 0) msg += ` + rakiety: ${formatAmountShort(racketCost)} zł`;
  msg += '\n';
  msg += `👥 Obecni (${presentPlayers.length}): ${presentPlayers.join(', ')}\n`;
  for (const group of groups) {
    msg += `${describe(group, sportEmoji)}: ${formatAmountShort(group.perPerson)} zł/os.\n`;
  }
  return msg.trim();
}
