import { SPORT, SQUASH_MULTISPORT_DISCOUNT } from '@/constants';
import { roundToTwoDecimals } from './debt';

interface SessionLike {
  presentPlayers?: string[];
  present?: string[];
  multisportPlayers?: string[];
  multiPlayers?: string[];
  totalCost?: number;
  cost?: number;
  sport?: string;
}

export function getPlayerSessionCost(session: SessionLike, playerName: string): number {
  const present = session.presentPlayers ?? session.present ?? [];
  const multi = session.multisportPlayers ?? session.multiPlayers ?? [];
  const cost = session.totalCost ?? session.cost ?? 0;
  const sport = session.sport || SPORT.PINGPONG;
  const isMulti = multi.includes(playerName);

  if (!present.includes(playerName)) return 0;

  if (sport === SPORT.SQUASH) {
    const multiCount = multi.filter(p => present.includes(p)).length;
    const hypothetical = cost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
    const base = present.length > 0 ? hypothetical / present.length : 0;
    return roundToTwoDecimals(Math.max(0, isMulti ? base - SQUASH_MULTISPORT_DISCOUNT : base));
  }

  if (isMulti) return 0;
  const paying = present.filter(p => !multi.includes(p));
  return paying.length > 0 ? roundToTwoDecimals(cost / paying.length) : 0;
}

export function getSessionBaseCost(session: SessionLike): number {
  const present = session.presentPlayers ?? session.present ?? [];
  const multi = session.multisportPlayers ?? session.multiPlayers ?? [];
  const cost = session.totalCost ?? session.cost ?? 0;
  const sport = session.sport || SPORT.PINGPONG;

  if (sport === SPORT.SQUASH) {
    const multiCount = multi.filter(p => present.includes(p)).length;
    const hypothetical = cost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
    return present.length > 0 ? roundToTwoDecimals(hypothetical / present.length) : 0;
  }

  const paying = present.filter(p => !multi.includes(p));
  return paying.length > 0 ? roundToTwoDecimals(cost / paying.length) : 0;
}
