import { SPORT, SQUASH_MULTISPORT_DISCOUNT } from '@/constants';
import { roundToTwoDecimals, getOvertimeShare } from './debt';

interface SessionLike {
  presentPlayers?: string[];
  present?: string[];
  multisportPlayers?: string[];
  multiPlayers?: string[];
  totalCost?: number;
  cost?: number;
  sport?: string;
  racketCost?: number;
  ownRacketPlayers?: string[];
  overtimePlayers?: string[];
  overtimeCost?: number;
}

export function getPlayerSessionCost(session: SessionLike, playerName: string): number {
  const present = session.presentPlayers ?? session.present ?? [];
  const multi = session.multisportPlayers ?? session.multiPlayers ?? [];
  const totalCost = session.totalCost ?? session.cost ?? 0;
  const sport = session.sport || SPORT.PINGPONG;
  const isMulti = multi.includes(playerName);
  const racketCost = session.racketCost ?? 0;
  const ownRacket = session.ownRacketPlayers ?? [];

  if (!present.includes(playerName)) return 0;

  const overtimeShare = getOvertimeShare(playerName, session.overtimePlayers, session.overtimeCost);

  if (sport === SPORT.SQUASH) {
    const courtCost = totalCost - racketCost;
    const multiCount = multi.filter(p => present.includes(p)).length;
    const hypothetical = courtCost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
    const base = present.length > 0 ? hypothetical / present.length : 0;
    const courtShare = roundToTwoDecimals(Math.max(0, isMulti ? base - SQUASH_MULTISPORT_DISCOUNT : base));

    const rentingPlayers = present.filter(p => !ownRacket.includes(p));
    const hasOwnRacket = ownRacket.includes(playerName);
    const racketShare = hasOwnRacket
      ? 0
      : rentingPlayers.length > 0 ? roundToTwoDecimals(racketCost / rentingPlayers.length) : 0;

    return roundToTwoDecimals(courtShare + racketShare + overtimeShare);
  }

  if (isMulti) return overtimeShare;
  const paying = present.filter(p => !multi.includes(p));
  const firstHour = paying.length > 0 ? roundToTwoDecimals(totalCost / paying.length) : 0;
  return roundToTwoDecimals(firstHour + overtimeShare);
}

export function getSessionBaseCost(session: SessionLike): number {
  const present = session.presentPlayers ?? session.present ?? [];
  const multi = session.multisportPlayers ?? session.multiPlayers ?? [];
  const totalCost = session.totalCost ?? session.cost ?? 0;
  const sport = session.sport || SPORT.PINGPONG;
  const racketCost = session.racketCost ?? 0;

  if (sport === SPORT.SQUASH) {
    const courtCost = totalCost - racketCost;
    const multiCount = multi.filter(p => present.includes(p)).length;
    const hypothetical = courtCost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
    return present.length > 0 ? roundToTwoDecimals(hypothetical / present.length) : 0;
  }

  const paying = present.filter(p => !multi.includes(p));
  return paying.length > 0 ? roundToTwoDecimals(totalCost / paying.length) : 0;
}
