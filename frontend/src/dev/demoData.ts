import { buildUIData } from '@/lib/firebase/transforms';
import { getPlayerSessionCost } from '@/utils/sessionCost';
import type { NormalizedData, Payment, Sport, Week } from '@/types/domain';
import type { UIData } from '@/types/ui';

/**
 * Dane demonstracyjne do przeglądu interfejsu BEZ bazy Firebase.
 *
 * Włączane wyłącznie w trybie deweloperskim, zmienną `VITE_DEMO_DATA=1`
 * (patrz `.env.development`). Produkcyjna paczka nie zawiera tej ścieżki:
 * `import.meta.env.DEV` jest w niej stałą `false`, więc gałąź znika
 * w tree-shakingu.
 *
 * Po co: bez działającego projektu Firebase aplikacja pokazuje ekran
 * „CONNECTION FAILURE”, więc nie da się obejrzeć ani pustych stanów, ani
 * kart zawodników, podium, wykresów i historii — czyli dokładnie tych miejsc,
 * które zmienia każda poprawka UI. Wcześniej trzeba było budować osobną kopię
 * z podmienionym `firebase/database`; teraz wystarczy jeden przełącznik.
 */

/** Osiem osób — tyle, ile ma realna grupa (i tyle, ile mieści się na podium + liście). */
const PLAYERS = ['Kamil', 'Ala', 'Bartek', 'Celina', 'Dawid', 'Ewa', 'Filip', 'Gosia'];

/** Organizator (skarbnik) — jego saldo liczy się odwrotnie (do odzyskania). */
const ORGANIZER = 'Kamil';

const CARD_HOLDERS = ['Ala', 'Celina', 'Ewa', 'Gosia'];
const OWN_RACKET = ['Bartek', 'Dawid'];

const SPORTS: Sport[] = ['pingpong', 'squash', 'badminton', 'padel'];

const COURT_COST: Record<Sport, number> = {
  pingpong: 100,
  squash: 120,
  badminton: 140,
  padel: 160,
};

/**
 * Ile z własnego udziału zapłaciła każda osoba (1 = rozliczona, 0 = cały dług,
 * >1 = nadpłata). Dzięki temu na jednym ekranie widać wszystkie stany karty:
 * dług, rozliczenie i nadpłatę.
 */
const PAID_FRACTION: Record<string, number> = {
  Ala: 0.6,
  Bartek: 1,
  Celina: 0,
  Dawid: 1.2,
  Ewa: 0.85,
  Filip: 0.25,
  Gosia: 1,
};

/** Prosty generator z ziarnem — dane demo muszą być takie same przy każdym otwarciu. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysBefore(start: string, days: number): string {
  const date = new Date(`${start}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildDemoRawData(): NormalizedData {
  const random = seeded(20261025);
  const weeks: Week[] = [];

  // 22 sesje co 3–4 dni — od sierpnia do października 2026. Bieżący sezon
  // wystarcza, żeby podium, seria i miesięczny raport mieli co pokazać.
  let dayOffset = 4;
  for (let i = 0; i < 22; i += 1) {
    const date = isoDaysBefore('2026-10-24', dayOffset);
    const sport = SPORTS[i % SPORTS.length];

    const present = PLAYERS.filter(name => {
      if (name === ORGANIZER) return true;
      return random() > 0.24;
    });
    // Kilka sesji w pełnym składzie — bez nich ranking nie ma czym oddychać.
    if (i % 5 === 0 && !present.includes('Gosia')) present.push('Gosia');

    const multiPlayers = present.filter(name => CARD_HOLDERS.includes(name) && random() > 0.3);
    const racketSport = sport !== 'pingpong';
    const ownRacketPlayers = racketSport ? present.filter(name => OWN_RACKET.includes(name)) : [];
    const racketCount = racketSport ? 2 : 0;

    weeks.push({
      id: `demo-${String(i + 1).padStart(3, '0')}`,
      date,
      sport,
      cost: COURT_COST[sport],
      present,
      multiPlayers,
      courtCount: sport === 'badminton' ? 2 : 1,
      durationHours: sport === 'pingpong' ? 1 : 1.5,
      ...(racketCount > 0 ? { racketCost: racketCount * 8, ownRacketPlayers } : {}),
    });

    dayOffset += 3 + Math.round(random() * 2);
  }

  weeks.sort((a, b) => a.date.localeCompare(b.date));

  // Wpłaty liczone z realnych udziałów, a nie „na oko” — dzięki temu karta
  // Bartka naprawdę jest rozliczona, a Dawid naprawdę ma nadpłatę.
  const payments: Record<string, Payment[]> = {};
  const paidOnline = new Set(['Ala', 'Bartek', 'Dawid', 'Ewa', 'Gosia']);
  for (const name of PLAYERS) {
    if (name === ORGANIZER) continue;
    if (!paidOnline.has(name)) continue;
    const owed = weeks.reduce((sum, week) => sum + getPlayerSessionCost(week, name), 0);
    const amount = round(owed * (PAID_FRACTION[name] ?? 0));
    if (amount <= 0) continue;
    payments[name] = [{
      id: `demo-pay-${name}-1`,
      amount,
      date: '2026-10-12',
    }];
  }

  return {
    players: PLAYERS,
    weeks,
    payments,
    defaultMultiPlayers: ['Ala', 'Celina', 'Ewa'],
    deletedPlayers: ['Tomek'],
    playerJoinDate: {
      // Filip doszedł w trakcie sezonu — jego frekwencja liczy się od września.
      Filip: '2026-09-05',
    },
  };
}

export function buildDemoUIData(): UIData {
  return buildUIData(buildDemoRawData());
}
