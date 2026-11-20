import type { PlayerStats, ExtendedPlayerStats, RankedPlayer, RankingHistoryEntry, WeeklyRankingEntry, HistoryEntry } from '@/types/ui';
import { filterHistorySinceJoin } from './playerHistory';

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

  return players.map(player => {
    // Mianownikiem są sesje rozegrane od dołączenia gracza, a nie wszystkie
    // w historii — inaczej ktoś, kto dołączył w połowie sezonu i nie opuścił
    // ani jednej gry, miałby 50% zamiast 100%.
    const eligibleHistory = filterHistorySinceJoin(history, player.joinDate);
    return {
      ...player,
      attendancePercentage: percentage(player.attendanceCount, player.eligibleWeeks ?? totalWeeks),
      currentStreak: currentStreakOf(player.name, eligibleHistory),
    };
  });
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
    // dnia nie mogą obniżać mu frekwencji ani psuć serii.
    const eligible = filterHistorySinceJoin(seasonHistory, player.joinDate);
    const attendanceCount = eligible.filter(s => s.presentPlayers.includes(player.name)).length;

    return {
      ...player,
      attendanceCount,
      eligibleWeeks: eligible.length,
      attendancePercentage: percentage(attendanceCount, eligible.length),
      currentStreak: currentStreakOf(player.name, eligible),
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

type RankingSnapshot = RankingHistoryEntry['rankings'];

/** Ranking „na dzień”: wszystkie sesje z `sessionsUpTo`, mianownik liczony od dołączenia gracza. */
function rankingSnapshot(players: PlayerStats[], sessionsUpTo: HistoryEntry[]): RankingSnapshot | null {
  if (sessionsUpTo.length === 0) return null;

  // Każdy gracz ma własny mianownik: tylko sesje od jego dołączenia.
  // Przed dołączeniem nie ma go jeszcze w rankingu — zamiast wieszać go
  // na 0%, po prostu nie pojawia się na wykresie.
  const stats = players.flatMap(player => {
    const eligible = filterHistorySinceJoin(sessionsUpTo, player.joinDate);
    if (eligible.length === 0) return [];
    const attended = eligible.filter(s => s.presentPlayers.includes(player.name)).length;
    return [{ name: player.name, pct: percentage(attended, eligible.length), attended }];
  });
  if (stats.length === 0) return null;

  // Remis rozstrzygamy imieniem, żeby ten sam zestaw danych zawsze dawał
  // ten sam wykres — bez tego kolejność zależałaby od kolejności graczy.
  stats.sort((a, b) => b.pct - a.pct || b.attended - a.attended || a.name.localeCompare(b.name, 'pl'));
  let place = 1;
  return stats.map((p, i) => {
    if (i > 0 && p.pct < stats[i - 1].pct) place = i + 1;
    return { ...p, place };
  });
}

export function computeRankingHistory(
  players: PlayerStats[],
  history: HistoryEntry[],
): RankingHistoryEntry[] {
  if (!history || history.length === 0 || !players || players.length === 0) return [];

  const monthSet = new Set<string>();
  history.forEach(s => { if (s.datePlayed) monthSet.add(s.datePlayed.slice(0, 7)); });
  const months = [...monthSet].sort();

  return months.flatMap(month => {
    const rankings = rankingSnapshot(players, history.filter(s => s.datePlayed?.slice(0, 7) <= month));
    return rankings ? [{ month, rankings }] : [];
  });
}

/** Poniedziałek tygodnia (ISO) dla daty `YYYY-MM-DD`, liczony w UTC, żeby strefa czasowa nie przesuwała dni. */
export function weekStartOf(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/**
 * To samo co computeRankingHistory, ale klatka na każdy tydzień z sesją.
 * `date` to ostatnia sesja w danym tygodniu — tak podpisujemy klatkę.
 */
export function computeWeeklyRankingHistory(
  players: PlayerStats[],
  history: HistoryEntry[],
): WeeklyRankingEntry[] {
  if (!history || history.length === 0 || !players || players.length === 0) return [];

  const lastDateOfWeek = new Map<string, string>();
  history.forEach(s => {
    if (!s.datePlayed) return;
    const date = s.datePlayed.slice(0, 10);
    const week = weekStartOf(date);
    const prev = lastDateOfWeek.get(week);
    if (!prev || date > prev) lastDateOfWeek.set(week, date);
  });

  return [...lastDateOfWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([week, date]) => {
      const rankings = rankingSnapshot(players, history.filter(s => s.datePlayed && s.datePlayed.slice(0, 10) <= date));
      return rankings ? [{ week, date, rankings }] : [];
    });
}
