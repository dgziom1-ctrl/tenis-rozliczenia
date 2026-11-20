import { MULTISPORT_PER_COURT_HOUR, SPORT } from '@/constants';

/**
 * Oblicza maksymalną liczbę kart MultiSport honorowanych w danej sesji
 * na podstawie liczby kortów, godzin i limitu per sport.
 */
export function getMaxMulti(sport: string, courtCount: number, durationHours: number): number {
  return courtCount * durationHours * getMultisportPerCourtHour(sport);
}

/** Ile kart Multisport honoruje obiekt na 1 kort przez 1 godzinę w danym sporcie. */
export function getMultisportPerCourtHour(sport: string): number {
  return MULTISPORT_PER_COURT_HOUR[sport] ?? MULTISPORT_PER_COURT_HOUR[SPORT.PINGPONG];
}
