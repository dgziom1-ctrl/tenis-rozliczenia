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
