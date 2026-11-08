/**
 * Wspólny zakres sesji dla gracza.
 *
 * `joinDate` to pierwszy dzień, od którego graczowi liczą się sesje. Sesje
 * wcześniejsze nie są jego nieobecnościami — nie mogą więc obniżać frekwencji,
 * psuć serii ani odblokowywać odznak. Ten sam filtr muszą stosować wszystkie
 * widoki: ranking, Wrapped, modal gracza i osiągnięcia.
 */
export function filterHistorySinceJoin<T extends { datePlayed: string }>(
  history: T[],
  joinDate: string | null | undefined,
): T[] {
  if (!joinDate) return history;
  return history.filter(session => session.datePlayed >= joinDate);
}

/**
 * Najdłuższa seria kolejnych sesji z obecnością gracza.
 * `history` jest posortowana od najnowszej do najstarszej (jak w całej apce),
 * więc liczymy od końca — od najstarszej sesji.
 */
export function longestStreakOf(
  playerName: string,
  history: ReadonlyArray<{ presentPlayers: string[] }>,
): number {
  let longest = 0;
  let current = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].presentPlayers.includes(playerName)) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}
