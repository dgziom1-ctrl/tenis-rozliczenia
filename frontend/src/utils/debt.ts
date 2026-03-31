import { ORGANIZER_NAME, SPORT, SQUASH_MULTISPORT_DISCOUNT } from '@/constants';
import type { Week, Payment } from '@/types/domain';
import type { HistoryEntry, DebtSession, DebtDisplayData, DebtDisplayPayment, PlayerStats } from '@/types/ui';

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getPayingPlayers(present: string[] = [], multisportPlayers: string[] = []): string[] {
  return present.filter(p => !multisportPlayers.includes(p));
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

    if (week.sport === SPORT.SQUASH) {
      const multi = week.multiPlayers || [];
      const multiCount = multi.filter(p => (week.present || []).includes(p)).length;
      const hypothetical = week.cost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
      const base = week.present.length > 0 ? hypothetical / week.present.length : 0;
      const isMulti = multi.includes(playerName);
      result.push({
        id: week.id,
        costPerPerson: roundToTwoDecimals(Math.max(0, isMulti ? base - SQUASH_MULTISPORT_DISCOUNT : base)),
      });
    } else {
      const isMulti = (week.multiPlayers || []).includes(playerName);
      if (!isMulti) {
        const paying = getPayingPlayers(week.present || [], week.multiPlayers || []);
        result.push({
          id: week.id,
          costPerPerson: paying.length > 0 ? week.cost / paying.length : 0,
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
    const owes = session.sport === SPORT.SQUASH ? isPresent : (isPresent && !isMulti);

    if (owes) {
      const amount = session.sport === SPORT.SQUASH
        ? (isMulti ? (session.costPerPersonMulti ?? session.costPerPerson) : session.costPerPerson)
        : session.costPerPerson;

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
    if (s.sport === SPORT.SQUASH) return true;
    return !s.multisportPlayers.includes(player.name);
  };

  const sessionMap = (s: HistoryEntry): DebtSession => {
    const isMulti = s.multisportPlayers.includes(player.name);
    const amount = s.sport === SPORT.SQUASH
      ? (isMulti ? (s.costPerPersonMulti ?? s.costPerPerson) : s.costPerPerson)
      : s.costPerPerson;
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
          const amount = x.sport === SPORT.SQUASH
            ? (isMulti ? (x.costPerPersonMulti ?? x.costPerPerson) : x.costPerPerson)
            : x.costPerPerson;
          return s + amount;
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
