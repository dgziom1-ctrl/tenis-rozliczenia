import { calculateDebt, roundToTwoDecimals } from '@/utils/debt';
import { getSessionShares } from '@/utils/sessionCost';
import { isValidISODate, isValidMoney } from '@/utils/validation';
import { ORGANIZER_NAME, SPORT, SPORT_LABEL } from '@/constants';
import type { Week, NormalizedData, Payment, PlayerJoinDates, Sport } from '@/types/domain';
import type { PlayerStats, HistoryEntry, Summary, UIData } from '@/types/ui';

/** Data, której nie osiągnie żadna sesja — gracz zapisany „od następnej sesji". */
const NEVER = '9999-12-31';

/**
 * Ustala datę, od której graczowi liczą się sesje.
 *
 * Nowe rekordy trzymają wprost datę (`playerJoinDate`). Starsze trzymały indeks
 * w tablicy sesji (`playerJoinWeek`) — tłumaczymy go na datę sesji, która pod
 * tym indeksem leży. Indeks poza zakresem znaczył „dopiero od kolejnej sesji",
 * więc odwzorowujemy go datą, której żadna sesja nie osiągnie.
 */
function resolveJoinDate(
  playerName: string,
  weeks: Week[],
  joinDates: PlayerJoinDates,
  legacyJoinWeek: Record<string, number> | undefined,
): string | null {
  const explicit = joinDates?.[playerName];
  if (isValidISODate(explicit)) return explicit;

  const legacyIndex = legacyJoinWeek?.[playerName];
  if (typeof legacyIndex !== 'number' || !Number.isFinite(legacyIndex) || legacyIndex <= 0) {
    return null;
  }
  return weeks[Math.floor(legacyIndex)]?.date ?? NEVER;
}

function buildPlayerStats(
  playerName: string,
  weeks: Week[],
  joinDate: string | null,
  payments: Record<string, Payment[]>,
): PlayerStats {
  const eligibleWeeks = joinDate === null ? weeks : weeks.filter(w => w.date >= joinDate);
  const attendanceCount = eligibleWeeks.filter(w =>
    (w.present || []).includes(playerName),
  ).length;
  const currentDebt = calculateDebt(playerName, { weeks, payments });
  return {
    name: playerName,
    attendanceCount,
    currentDebt,
    eligibleWeeks: eligibleWeeks.length,
    joinDate,
  };
}

function buildSummary(playerStats: PlayerStats[], weeksLength: number): Summary {
  const nonOrgPlayers = playerStats.filter(p => p.name !== ORGANIZER_NAME);
  const totalToCollect = nonOrgPlayers.reduce((sum, p) => sum + p.currentDebt, 0);
  const settledCount = nonOrgPlayers.filter(p => p.currentDebt <= 0.01).length;
  return {
    totalToCollect: roundToTwoDecimals(totalToCollect),
    settledPlayers: settledCount,
    totalPlayers: nonOrgPlayers.length,
    totalWeeks: weeksLength,
  };
}

function buildHistory(weeks: Week[]): HistoryEntry[] {
  return [...weeks].reverse().map(w => {
    // Kwoty biorą się z tego samego podziału, którego używa saldo gracza,
    // więc historia i rozliczenie nie mogą się rozjechać.
    const shares = getSessionShares(w);
    const racketCost = w.racketCost ?? 0;
    const ownRacket = w.ownRacketPlayers ?? [];

    return {
      id: w.id,
      datePlayed: w.date,
      // Zaszłość po dogrywce doliczamy do kwoty sesji, tak jak robi to podział
      // kosztów — inaczej historia pokazywałaby mniej, niż gracze faktycznie płacą.
      totalCost: w.cost + (w.overtimeCost ?? 0),
      sport: w.sport || SPORT.PINGPONG,
      costPerPerson: shares.baseCourt,
      costPerPersonMulti: shares.baseCourtMulti,
      presentPlayers: w.present || [],
      multisportPlayers: w.multiPlayers || [],
      racketCost: racketCost > 0 ? racketCost : undefined,
      ownRacketPlayers: ownRacket.length > 0 ? ownRacket : undefined,
      courtCount: w.courtCount,
      durationHours: w.durationHours,
    };
  });
}

/** Sortuje sesje chronologicznie po dacie (rosnąco), stabilnie po id przy równych datach. */
export function sortWeeksByDate(weeks: Week[]): Week[] {
  return [...(weeks || [])].sort((a, b) => {
    const byDate = String(a?.date ?? '').localeCompare(String(b?.date ?? ''));
    return byDate !== 0 ? byDate : String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

export function buildUIData(rawData: NormalizedData): UIData {
  const {
    players = [],
    weeks = [],
    playerJoinDate = {},
    playerJoinWeek,
    defaultMultiPlayers = [],
    deletedPlayers = [],
    payments = {},
  } = rawData;

  const playerStats = players
    .map(name => buildPlayerStats(
      name,
      weeks,
      resolveJoinDate(name, weeks, playerJoinDate, playerJoinWeek),
      payments,
    ))
    .sort((a, b) => b.currentDebt - a.currentDebt || a.name.localeCompare(b.name, 'pl'));

  // ── Skarbnik logic ──────────────────────────────────────────────────────────
  // Kamil fronts 100% of every session at the reception.
  // His "do odzyskania" = sum of what everyone else still owes.
  // Stored as negative currentDebt → hasCredit=true → green display in PlayerCard.
  const totalOwed = roundToTwoDecimals(
    playerStats
      .filter(p => p.name !== ORGANIZER_NAME)
      .reduce((sum, p) => sum + p.currentDebt, 0),
  );
  // Pełne saldo bez clampowania: jeśli nadpłaty przewyższają zaległości,
  // currentDebt > 0 → isPending=true → PersonCard pokazuje stan "saldo" zamiast "wszyscy rozliczeni".
  const playersWithTreasurer = playerStats.map(p =>
    p.name === ORGANIZER_NAME
      ? { ...p, currentDebt: roundToTwoDecimals(-totalOwed) }
      : p,
  );

  return {
    summary: buildSummary(playerStats, weeks.length),
    players: playersWithTreasurer,
    playerNames: players,
    defaultMultiPlayers,
    deletedPlayers,
    history: buildHistory(weeks),
    payments,
  };
}

/** Czy wartość jest zwykłym obiektem (bez tablic i null). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Klucze, które w zwykłym obiekcie mogłyby podmienić prototyp. Dane z bazy są
 * publiczne i mogą pochodzić spoza aplikacji, więc nie wolno ich przepisywać
 * wprost do obiektu wynikowego.
 */
function isSafeKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/** Lista imion: tylko tekstowe, niepuste wpisy bez duplikatów. */
function sanitizeNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim().length > 0 && entry.length <= 40) {
      seen.add(entry);
    }
  }
  return [...seen];
}

const SPORT_VALUES = new Set(Object.keys(SPORT_LABEL));

function sanitizeSport(value: unknown): Sport {
  return typeof value === 'string' && SPORT_VALUES.has(value)
    ? value as Sport
    : SPORT.PINGPONG;
}

/** Liczba kortów/godzin: całkowita 1–12, inaczej `undefined` (stare sesje bez limitu). */
function sanitizeCourtUnit(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12
    ? value
    : undefined;
}

/**
 * Pojedyncza sesja z bazy. Uszkodzone rekordy są odrzucane, a pojedyncze pola
 * naprawiane do wartości, które reguły bazy i silnik kosztów na pewno przyjmą.
 */
function sanitizeWeek(value: unknown): Week | null {
  if (!isRecord(value)) return null;

  const id = value.id;
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) return null;
  if (!isValidISODate(value.date)) return null;

  const cost = isValidMoney(value.cost) ? value.cost : 0;
  const present = sanitizeNames(value.present);
  const multiPlayers = sanitizeNames(value.multiPlayers).filter(p => present.includes(p));
  const ownRacketPlayers = sanitizeNames(value.ownRacketPlayers).filter(p => present.includes(p));
  const racketCost = isValidMoney(value.racketCost)
    ? Math.min(value.racketCost, cost)
    : undefined;
  const overtimeCost = isValidMoney(value.overtimeCost) ? value.overtimeCost : undefined;
  const overtimePlayers = sanitizeNames(value.overtimePlayers);
  const courtCount = sanitizeCourtUnit(value.courtCount);
  const durationHours = sanitizeCourtUnit(value.durationHours);

  return {
    id,
    date: value.date,
    cost,
    sport: sanitizeSport(value.sport),
    present,
    multiPlayers,
    ...(racketCost !== undefined && racketCost > 0 ? { racketCost } : {}),
    ...(ownRacketPlayers.length > 0 ? { ownRacketPlayers } : {}),
    ...(courtCount !== undefined ? { courtCount } : {}),
    ...(durationHours !== undefined ? { durationHours } : {}),
    ...(overtimeCost !== undefined && overtimeCost > 0 ? { overtimeCost } : {}),
    ...(overtimePlayers.length > 0 ? { overtimePlayers } : {}),
  };
}

/** Sesje: odrzuca śmieci i duplikaty id, zachowuje poprawne rekordy bez obecnych. */
function sanitizeWeeks(value: unknown): Week[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const weeks: Week[] = [];
  for (const entry of value) {
    const week = sanitizeWeek(entry);
    if (!week || seen.has(week.id)) continue;
    seen.add(week.id);
    weeks.push(week);
  }
  return sortWeeksByDate(weeks);
}

/** Księga wpłat: tylko poprawne, unikalne wpisy i bezpieczne klucze graczy. */
function sanitizePayments(value: unknown): Record<string, Payment[]> {
  if (!isRecord(value)) return {};
  const payments: Record<string, Payment[]> = {};

  for (const [playerName, entries] of Object.entries(value)) {
    if (!isSafeKey(playerName) || playerName.length === 0 || playerName.length > 40) continue;
    if (!Array.isArray(entries)) continue;

    const seen = new Set<string>();
    const valid: Payment[] = [];
    for (const entry of entries) {
      if (!isRecord(entry)) continue;
      const { id, amount, date } = entry;
      if (typeof id !== 'string' || id.length === 0 || id.length > 64 || seen.has(id)) continue;
      if (!isValidMoney(amount) || !isValidISODate(date)) continue;
      seen.add(id);
      valid.push({ id, amount, date });
    }
    if (valid.length > 0) payments[playerName] = valid;
  }

  return payments;
}

/** Daty dołączenia: wyłącznie poprawny format ISO, bez kluczy prototypu. */
function sanitizeJoinDates(value: unknown): PlayerJoinDates {
  if (!isRecord(value)) return {};
  const dates: PlayerJoinDates = {};
  for (const [name, date] of Object.entries(value)) {
    if (!isSafeKey(name) || name.length === 0 || name.length > 40) continue;
    if (isValidISODate(date)) dates[name] = date;
  }
  return dates;
}

/** Zaszłościowy indeks dołączenia: skończona liczba nieujemna. */
function sanitizeJoinWeeks(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) return undefined;
  const weeks: Record<string, number> = {};
  for (const [name, index] of Object.entries(value)) {
    if (!isSafeKey(name) || name.length === 0 || name.length > 40) continue;
    if (typeof index === 'number' && Number.isFinite(index) && index >= 0 && index <= 100_000) {
      weeks[name] = Math.floor(index);
    }
  }
  return Object.keys(weeks).length > 0 ? weeks : undefined;
}

/**
 * Jedyne wejście surowych danych z Firebase.
 *
 * `snapshot.val()` jest nietypowany — może zawierać wszystko, co ktoś zapisze
 * w publicznym węźle. Normalizacja odsiewa rekordy bez tożsamości (id/daty),
 * naprawia typy pól i odrzuca klucze mogące podmienić prototyp, dzięki czemu
 * jeden uszkodzony wpis nie wywraca całego interfejsu.
 */
export function normalizeRawData(rawData: unknown): NormalizedData {
  const raw = isRecord(rawData) ? rawData : {};

  // Sesje zawsze porządkujemy chronologicznie po dacie (rosnąco). Dzięki temu
  // sesja dodana z datą wsteczną nie psuje historii, wykresów ani kursora rozliczeń
  // (kolejność w tablicy przestaje zależeć od momentu wpisania sesji).
  return {
    players: sanitizeNames(raw.players),
    weeks: sanitizeWeeks(raw.weeks),
    defaultMultiPlayers: sanitizeNames(raw.defaultMultiPlayers),
    playerJoinDate: sanitizeJoinDates(raw.playerJoinDate),
    playerJoinWeek: sanitizeJoinWeeks(raw.playerJoinWeek),
    deletedPlayers: sanitizeNames(raw.deletedPlayers),
    payments: sanitizePayments(raw.payments),
  };
}
