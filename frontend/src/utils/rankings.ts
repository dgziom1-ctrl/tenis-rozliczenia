import type { PlayerStats, ExtendedPlayerStats, RankedPlayer, RankingHistoryEntry, HistoryEntry } from '@/types/ui';

/** Procent całkowity; 0 sesji do rozegrania to 0%, nie NaN. */
function percentage(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * Ile sesji z rzędu — licząc od najnowszej — gracz był obecny.
 * `history` musi być posortowana od najnowszej do najstarszej.
 */
function currentStreakOf(name: string, history: HistoryEntry[]): number {
  let streak = 0;
  for (const session of history) {
    if (!session.presentPlayers.includes(name)) break;
    streak++;
  }
  return streak;
}

export function calculatePlayerStats(
  players: PlayerStats[],
  history: HistoryEntry[],
  totalWeeks: number,
): ExtendedPlayerStats[] {
  if (!players || !history) return [];

  return players.map(player => ({
    ...player,
    // Mianownikiem są sesje rozegrane od dołączenia gracza, a nie wszystkie
    // w historii — inaczej ktoś, kto dołączył w połowie sezonu i nie opuścił
    // ani jednej gry, miałby 50% zamiast 100%.
    attendancePercentage: percentage(player.attendanceCount, player.eligibleWeeks ?? totalWeeks),
    currentStreak: currentStreakOf(player.name, history),
  }));
}

/**
 * Nadaje miejsca w rankingu z obsługą remisów: równy procent = to samo miejsce,
 * a kolejne miejsce przeskakuje o liczbę remisujących (1, 1, 3 — nie 1, 1, 2).
 */
export function assignRankingPlaces(sortedPlayers: ExtendedPlayerStats[]): RankedPlayer[] {
  let currentPlace = 1;
  return sortedPlayers.map((player, index) => {
    if (index > 0 && player.attendancePercentage < sortedPlayers[index - 1].attendancePercentage) {
      currentPlace = index + 1;
    }
    return { ...player, place: currentPlace };
  });
}

/**
 * Statystyki w obrębie jednego sezonu, dla każdego gracza z listy.
 *
 * Nowy sezon to czysta karta: liczą się wyłącznie sesje z danego roku —
 * frekwencja, liczba sesji, sporty, odznaki, ranga i OVR. Seria też jest tu
 * ucinana na granicy sezonu, tak jak wszystko inne: 1 stycznia każdy zaczyna
 * od zera. (Powiadomienia o serii liczą ją dalej w czasie rzeczywistym — to
 * osobna kalkulacja, zob. `utils/celebrations`.)
 *
 * Widok „wszystkie sezony" dostaje po prostu pełną historię, więc działa na
 * tych samych regułach co sezon.
 */
function seasonStatsOf(
  players: PlayerStats[],
  seasonHistory: HistoryEntry[],
): ExtendedPlayerStats[] {
  if (!players || !seasonHistory) return [];

  return players.map(player => {
    // Sezon też liczymy od dołączenia gracza — sesje sprzed jego pierwszego
    // dnia nie mogą obniżać mu frekwencji.
    const eligible = player.joinDate
      ? seasonHistory.filter(s => s.datePlayed >= player.joinDate!)
      : seasonHistory;
    const attendanceCount = eligible.filter(s => s.presentPlayers.includes(player.name)).length;

    return {
      ...player,
      attendanceCount,
      eligibleWeeks: eligible.length,
      attendancePercentage: percentage(attendanceCount, eligible.length),
      currentStreak: currentStreakOf(player.name, seasonHistory),
    };
  });
}

/**
 * Statystyki sezonowe do rankingu: tylko gracze, którzy w sezonie zagrali.
 * Ktoś, kto nie był ani razu, nie ma z czego mieć frekwencji, więc nie
 * zajmuje miejsca w tabeli.
 */
export function calculateSeasonPlayerStats(
  players: PlayerStats[],
  seasonHistory: HistoryEntry[],
): ExtendedPlayerStats[] {
  return seasonStatsOf(players, seasonHistory).filter(p => p.attendanceCount > 0);
}

/**
 * Statystyki sezonowe do kafelków na dashboardzie — tu zostają wszyscy.
 *
 * Karta gracza musi się pokazać także wtedy, gdy w bieżącym sezonie nie zagrał
 * ani razu: wisi mu przecież saldo z poprzedniego sezonu. Dostaje więc zera
 * sezonu (0% → ranga DUCH, OVR na podłodze, bez odznak), a nie dane z kariery.
 */
export function calculateSeasonCardStats(
  players: PlayerStats[],
  seasonHistory: HistoryEntry[],
): ExtendedPlayerStats[] {
  return seasonStatsOf(players, seasonHistory);
}

export function computeRankingHistory(
  players: PlayerStats[],
  history: HistoryEntry[],
): RankingHistoryEntry[] {
  if (!history || history.length === 0 || !players || players.length === 0) return [];

  const monthSet = new Set<string>();
  history.forEach(s => { if (s.datePlayed) monthSet.add(s.datePlayed.slice(0, 7)); });
  const months = [...monthSet].sort();
  const playerNames = players.map(p => p.name);

  return months.map(month => {
    const sessionsUpTo = history.filter(s => s.datePlayed?.slice(0, 7) <= month);
    const total = sessionsUpTo.length;
    if (total === 0) return null;

    const stats = playerNames.map(name => {
      const attended = sessionsUpTo.filter(s => s.presentPlayers.includes(name)).length;
      return { name, pct: percentage(attended, total), attended };
    });

    // Remis rozstrzygamy imieniem, żeby ten sam zestaw danych zawsze dawał
    // ten sam wykres — bez tego kolejność zależałaby od kolejności graczy.
    stats.sort((a, b) => b.pct - a.pct || b.attended - a.attended || a.name.localeCompare(b.name, 'pl'));
    let place = 1;
    const rankings = stats.map((p, i) => {
      if (i > 0 && p.pct < stats[i - 1].pct) place = i + 1;
      return { ...p, place };
    });

    return { month, rankings };
  }).filter((x): x is RankingHistoryEntry => x !== null);
}
