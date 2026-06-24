import { ORGANIZER_NAME, SQUASH_MULTISPORT_DISCOUNT, isCourtSport } from '@/constants';
import type { Week, Payment } from '@/types/domain';
import type { HistoryEntry, DebtSession, DebtDisplayData, DebtDisplayPayment, PlayerStats } from '@/types/ui';

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getPayingPlayers(present: string[] = [], multisportPlayers: string[] = []): string[] {
  return present.filter(p => !multisportPlayers.includes(p));
}

/**
 * Koszt dogrywki przypadający na jednego gracza.
 * Dzielony po równo pomiędzy WSZYSTKICH graczy dogrywki — karty lojalnościowe
 * nie dają tu zniżki.
 */
export function getOvertimeShare(
  playerName: string,
  overtimePlayers: string[] = [],
  overtimeCost = 0,
): number {
  if (overtimeCost <= 0 || overtimePlayers.length === 0) return 0;
  if (!overtimePlayers.includes(playerName)) return 0;
  return roundToTwoDecimals(overtimeCost / overtimePlayers.length);
}

function getSquashPlayerAmountFromHistory(s: HistoryEntry, playerName: string, isMulti: boolean): number {
  const overtimeShare = getOvertimeShare(playerName, s.overtimePlayers, s.overtimeCost);
  if (!isCourtSport(s.sport)) {
    const base = isMulti ? 0 : s.costPerPerson;
    return roundToTwoDecimals(base + overtimeShare);
  }
  const baseAmount = isMulti ? (s.costPerPersonMulti ?? s.costPerPerson) : s.costPerPerson;
  const ownRacket = s.ownRacketPlayers ?? [];
  if (!ownRacket.includes(playerName)) return roundToTwoDecimals(baseAmount + overtimeShare);
  const racketCost = s.racketCost ?? 0;
  const rentingPlayers = s.presentPlayers.filter(p => !ownRacket.includes(p));
  const racketShare = rentingPlayers.length > 0 ? roundToTwoDecimals(racketCost / rentingPlayers.length) : 0;
  return roundToTwoDecimals(baseAmount - racketShare + overtimeShare);
}

interface UnpaidSession {
  id: string;
  costPerPerson: number;
}

function unpaidSessionsFromWeeks(
  playerName: string,
  weeks: Week[],
  paidUntilWeekId?: string,
): UnpaidSession[] {
  const lastPaidIndex = paidUntilWeekId
    ? weeks.findIndex(w => w.id === paidUntilWeekId)
    : -1;

  const result: UnpaidSession[] = [];
  for (let idx = lastPaidIndex + 1; idx < weeks.length; idx++) {
    const week = weeks[idx];
    const isPresent = (week.present || []).includes(playerName);
    if (!isPresent) continue;

    const overtimeShare = getOvertimeShare(playerName, week.overtimePlayers, week.overtimeCost);

    if (isCourtSport(week.sport)) {
      const multi = week.multiPlayers || [];
      const present = week.present || [];
      const racketCost = week.racketCost ?? 0;
      const courtCost = week.cost - racketCost;
      const multiCount = multi.filter(p => present.includes(p)).length;
      const hypothetical = courtCost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
      const base = present.length > 0 ? hypothetical / present.length : 0;
      const isMulti = multi.includes(playerName);
      const courtShare = roundToTwoDecimals(Math.max(0, isMulti ? base - SQUASH_MULTISPORT_DISCOUNT : base));
      const ownRacket = week.ownRacketPlayers ?? [];
      const rentingPlayers = present.filter(p => !ownRacket.includes(p));
      const hasOwnRacket = ownRacket.includes(playerName);
      const racketShare = hasOwnRacket
        ? 0
        : rentingPlayers.length > 0 ? roundToTwoDecimals(racketCost / rentingPlayers.length) : 0;
      result.push({
        id: week.id,
        costPerPerson: roundToTwoDecimals(courtShare + racketShare + overtimeShare),
      });
    } else {
      const isMulti = (week.multiPlayers || []).includes(playerName);
      if (!isMulti) {
        const paying = getPayingPlayers(week.present || [], week.multiPlayers || []);
        const firstHour = paying.length > 0 ? roundToTwoDecimals(week.cost / paying.length) : 0;
        result.push({
          id: week.id,
          costPerPerson: roundToTwoDecimals(firstHour + overtimeShare),
        });
      } else if (overtimeShare > 0) {
        // Posiadacz karty nie płaci za 1. godzinę, ale płaci swoją część dogrywki.
        result.push({
          id: week.id,
          costPerPerson: overtimeShare,
        });
      }
    }
  }
  return result;
}

interface DebtCalcData {
  weeks: Week[];
  paidUntilWeek?: Record<string, string>;
  payments?: Record<string, Payment[]>;
}

export function calculateDebt(playerName: string, data: DebtCalcData): number {
  if (playerName === ORGANIZER_NAME) return 0;

  const sessions = unpaidSessionsFromWeeks(playerName, data.weeks || [], data.paidUntilWeek?.[playerName]);
  const sessionCost = roundToTwoDecimals(sessions.reduce((sum, s) => sum + s.costPerPerson, 0));
  const totalPaid = roundToTwoDecimals(
    (data.payments?.[playerName] || []).reduce((sum, p) => sum + (p.amount || 0), 0),
  );
  return roundToTwoDecimals(sessionCost - totalPaid);
}

export function calculateDebtBreakdown(
  playerName: string,
  debtAmount: number,
  history: HistoryEntry[],
): DebtSession[] {
  if (debtAmount <= 0 || !history) return [];

  const chronological = [...history].reverse();
  const sessions: DebtSession[] = [];
  let accumulated = 0;

  for (const session of chronological) {
    if (accumulated >= debtAmount - 0.001) break;

    const isPresent = session.presentPlayers.includes(playerName);
    const isMulti = session.multisportPlayers.includes(playerName);

    if (isPresent) {
      const amount = getSquashPlayerAmountFromHistory(session, playerName, isMulti);

      if (amount > 0) {
        sessions.push({ sessionId: session.id, date: session.datePlayed, amount });
        accumulated = roundToTwoDecimals(accumulated + amount);
      }
    }
  }
  return sessions;
}

export function buildDebtDisplayData(
  player: PlayerStats,
  history: HistoryEntry[],
  payments: Record<string, Payment[]>,
  paidUntilWeek: Record<string, string>,
): DebtDisplayData {
  const chronological = [...history].reverse();
  const paidUntilId = paidUntilWeek?.[player.name];
  const cutoffIdx = paidUntilId
    ? chronological.findIndex(s => s.id === paidUntilId)
    : -1;

  const sessionFilter = (s: HistoryEntry): boolean => {
    if (!s.presentPlayers.includes(player.name)) return false;
    const inOvertime = (s.overtimePlayers ?? []).includes(player.name) && (s.overtimeCost ?? 0) > 0;
    if (isCourtSport(s.sport)) return true;
    return !s.multisportPlayers.includes(player.name) || inOvertime;
  };

  const sessionMap = (s: HistoryEntry): DebtSession => {
    const isMulti = s.multisportPlayers.includes(player.name);
    const amount = getSquashPlayerAmountFromHistory(s, player.name, isMulti);
    return { sessionId: s.id, date: s.datePlayed, amount };
  };

  const sessions = chronological.filter(sessionFilter).map(sessionMap);

  let playerPayments: DebtDisplayPayment[] = (payments?.[player.name] || []).map(p => ({
    date: p.date,
    amount: p.amount,
    id: p.id,
  }));

  if (cutoffIdx >= 0 && !playerPayments.some(p => p.id === '__legacy_settled__')) {
    const settledCost = roundToTwoDecimals(
      chronological.slice(0, cutoffIdx + 1).filter(sessionFilter)
        .reduce((s, x) => {
          const isMulti = x.multisportPlayers.includes(player.name);
          return s + getSquashPlayerAmountFromHistory(x, player.name, isMulti);
        }, 0),
    );
    const settlementDate = chronological[cutoffIdx]?.datePlayed ?? '';

    if (settledCost > 0) {
      playerPayments = [
        { id: '__legacy_settled__', amount: settledCost, date: settlementDate },
        ...playerPayments,
      ];
    }
  }

  const totalSessions = roundToTwoDecimals(sessions.reduce((s, x) => s + x.amount, 0));
  const totalPaid = roundToTwoDecimals(playerPayments.reduce((s, p) => s + (p.amount || 0), 0));
  const balance = roundToTwoDecimals(totalSessions - totalPaid);

  return { sessions, payments: playerPayments, totalSessions, totalPaid, balance };
}
