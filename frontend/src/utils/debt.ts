import { ORGANIZER_NAME } from '@/constants';
import { toGrosze, toZloty } from './money';
import { getPlayerSessionCost } from './sessionCost';
import type { Week, Payment } from '@/types/domain';
import type { HistoryEntry, DebtSession, DebtDisplayData, DebtDisplayPayment, PlayerStats } from '@/types/ui';

// Re-eksport dla zgodności wstecznej — reszta kodu importuje te helpery z '@/utils/debt'.
export { roundToTwoDecimals, getPayingPlayers } from './money';

interface DebtCalcData {
  weeks: Week[];
  payments?: Record<string, Payment[]>;
}

/** Sumuje kwoty w groszach, żeby uniknąć narastania błędu zmiennoprzecinkowego. */
function sumGrosze(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + toGrosze(amount), 0);
}

/**
 * Saldo gracza ma dokładnie jedno źródło prawdy: koszt wszystkich jego sesji
 * minus wszystkie jego wpłaty. Rozliczenia sprzed księgi wpłat siedzą w tej
 * samej księdze jako zwykłe wpłaty, więc nie ma drugiego, równoległego zapisu
 * „do kiedy zapłacone”, który mógłby wykasować historię kosztów.
 */
export function calculateDebt(playerName: string, data: DebtCalcData): number {
  if (playerName === ORGANIZER_NAME) return 0;

  const sessionGrosze = sumGrosze(
    (data.weeks || []).map(week => getPlayerSessionCost(week, playerName)),
  );
  const paidGrosze = sumGrosze((data.payments?.[playerName] || []).map(p => p.amount || 0));
  return toZloty(sessionGrosze - paidGrosze);
}

/**
 * Najstarsze nierozliczone sesje składające się na bieżące zadłużenie.
 * Ostatnia pozycja jest przycinana do pozostałej kwoty, więc suma rozbicia
 * jest dokładnie równa `debtAmount` i nigdy go nie przekracza.
 */
export function calculateDebtBreakdown(
  playerName: string,
  debtAmount: number,
  history: HistoryEntry[],
): DebtSession[] {
  const debtGrosze = toGrosze(debtAmount);
  if (debtGrosze <= 0 || !history) return [];

  const chronological = [...history].reverse();
  const sessions: DebtSession[] = [];
  let remaining = debtGrosze;

  for (const session of chronological) {
    if (remaining <= 0) break;
    if (!session.presentPlayers.includes(playerName)) continue;

    const amountGrosze = toGrosze(getPlayerSessionCost(session, playerName));
    if (amountGrosze <= 0) continue;

    const applied = Math.min(amountGrosze, remaining);
    sessions.push({ sessionId: session.id, date: session.datePlayed, amount: toZloty(applied) });
    remaining -= applied;
  }

  return sessions;
}

export function buildDebtDisplayData(
  player: PlayerStats,
  history: HistoryEntry[],
  payments: Record<string, Payment[]>,
): DebtDisplayData {
  const sessions: DebtSession[] = [...history]
    .reverse()
    .filter(s => s.presentPlayers.includes(player.name))
    .map(s => ({
      sessionId: s.id,
      date: s.datePlayed,
      amount: getPlayerSessionCost(s, player.name),
    }))
    .filter(s => s.amount > 0);

  const playerPayments: DebtDisplayPayment[] = (payments?.[player.name] || []).map(p => ({
    date: p.date,
    amount: p.amount,
    id: p.id,
  }));

  const totalSessionsGrosze = sumGrosze(sessions.map(s => s.amount));
  const totalPaidGrosze = sumGrosze(playerPayments.map(p => p.amount || 0));

  return {
    sessions,
    payments: playerPayments,
    totalSessions: toZloty(totalSessionsGrosze),
    totalPaid: toZloty(totalPaidGrosze),
    balance: toZloty(totalSessionsGrosze - totalPaidGrosze),
  };
}
