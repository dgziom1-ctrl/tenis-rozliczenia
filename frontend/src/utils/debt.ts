import { ORGANIZER_NAME } from '@/constants';
import { toGrosze, toZloty } from './money';
import { getPlayerSessionCost } from './sessionCost';
import type { Week, Payment } from '@/types/domain';
import type { HistoryEntry, DebtSession, DebtCarryOver, DebtDisplayData, DebtDisplayPayment, PlayerStats } from '@/types/ui';

// Re-eksport dla zgodności wstecznej — reszta kodu importuje ten helper z '@/utils/debt'.
export { roundToTwoDecimals } from './money';

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

function yearOf(isoDate: string): number {
  return parseInt(String(isoDate).slice(0, 4), 10);
}

/**
 * Rok bieżącego sezonu — najnowszy rok, w którym rozegrano sesję.
 *
 * Bierzemy go z danych, a nie z zegara urządzenia: sezon zaczyna się pierwszą
 * rozegraną sesją, więc 1 stycznia, zanim ona padnie, rozliczenie ma dalej
 * wyglądać jak przez cały grudzień.
 */
function currentSeasonOf(history: HistoryEntry[]): number | null {
  let latest: number | null = null;
  for (const session of history || []) {
    const year = yearOf(session.datePlayed);
    if (Number.isFinite(year) && (latest === null || year > latest)) latest = year;
  }
  return latest;
}

/**
 * Buduje bilans otwarcia z pozycji sprzed bieżącego sezonu.
 *
 * Zwraca `null`, gdy nie ma czego zwijać — wtedy rozliczenie wygląda dokładnie
 * tak, jak wyglądało przed wprowadzeniem sezonów.
 */
function buildCarryOver(
  sessions: DebtSession[],
  payments: DebtDisplayPayment[],
): DebtCarryOver | null {
  if (sessions.length === 0 && payments.length === 0) return null;

  const years = [...sessions.map(s => yearOf(s.date)), ...payments.map(p => yearOf(p.date))]
    .filter(Number.isFinite);
  const totalSessionsGrosze = sumGrosze(sessions.map(s => s.amount));
  const totalPaidGrosze = sumGrosze(payments.map(p => p.amount || 0));

  return {
    amount: toZloty(totalSessionsGrosze - totalPaidGrosze),
    fromYear: Math.min(...years),
    toYear: Math.max(...years),
    sessions,
    payments,
    totalSessions: toZloty(totalSessionsGrosze),
    totalPaid: toZloty(totalPaidGrosze),
  };
}

/**
 * Pełne rozliczenie gracza, z historią starszych sezonów zwiniętą do jednej pozycji.
 *
 * Saldo jest ciągłe — nowy rok niczego nie zeruje — ale wypisywanie wszystkich
 * sesji od początku istnienia grupy zrobiłoby z tego panelu listę bez końca.
 * Dlatego szczegółowo pokazujemy bieżący sezon, a wszystko przed nim wchodzi
 * jako jedna kwota otwarcia. Suma pozostaje ta sama co do grosza: kwota
 * otwarcia plus sesje sezonu minus wpłaty sezonu daje dokładnie `balance`.
 */
export function buildDebtDisplayData(
  player: PlayerStats,
  history: HistoryEntry[],
  payments: Record<string, Payment[]>,
): DebtDisplayData {
  const allSessions: DebtSession[] = [...history]
    .reverse()
    .filter(s => s.presentPlayers.includes(player.name))
    .map(s => ({
      sessionId: s.id,
      date: s.datePlayed,
      amount: getPlayerSessionCost(s, player.name),
    }))
    .filter(s => s.amount > 0);

  const allPayments: DebtDisplayPayment[] = (payments?.[player.name] || []).map(p => ({
    date: p.date,
    amount: p.amount,
    id: p.id,
  }));

  const currentSeason = currentSeasonOf(history);
  // Daty, której nie da się odczytać, nie chowamy pod zbiorczą kwotą — pozycja,
  // której nie umiemy zaszufladkować, ma zostać widoczna.
  const isCurrentSeason = (date: string): boolean => {
    if (currentSeason === null) return true;
    const year = yearOf(date);
    return !Number.isFinite(year) || year >= currentSeason;
  };

  const sessions = allSessions.filter(s => isCurrentSeason(s.date));
  const seasonPayments = allPayments.filter(p => isCurrentSeason(p.date));
  const carryOver = buildCarryOver(
    allSessions.filter(s => !isCurrentSeason(s.date)),
    allPayments.filter(p => !isCurrentSeason(p.date)),
  );

  const totalSessionsGrosze = sumGrosze(sessions.map(s => s.amount));
  const totalPaidGrosze = sumGrosze(seasonPayments.map(p => p.amount || 0));
  const carryGrosze = toGrosze(carryOver?.amount ?? 0);

  return {
    sessions,
    payments: seasonPayments,
    carryOver,
    totalSessions: toZloty(totalSessionsGrosze),
    totalPaid: toZloty(totalPaidGrosze),
    balance: toZloty(carryGrosze + totalSessionsGrosze - totalPaidGrosze),
  };
}
