/**
 * Reguły bazy kontra to, co aplikacja faktycznie zapisuje.
 *
 * `database.rules.json` odrzuca nieznane pola („$other”: { „.validate”: false }),
 * a każda mutacja zapisuje CAŁY węzeł `appData` w jednej transakcji. Jedno pole,
 * którego reguły nie znają, blokuje więc nie jedną akcję, a wszystkie naraz —
 * SDK zwraca wtedy surowe „PERMISSION_DENIED: Permission denied”.
 *
 * Dokładnie taki rozjazd zdarzył się przy kortach i godzinach: kod zaczął
 * zapisywać `courtCount` i `durationHours`, a reguły ich nie znały, więc
 * zapisywanie sesji (i edycja, która też przepisuje całe `weeks`) kończyło się
 * odmową. Ten test uruchamia prawdziwe mutacje na atrapie transakcji,
 * przechwytuje to, co poszłoby do bazy, i przepuszcza każdy taki zapis przez
 * reguły z pliku. Rozjazd wychodzi w CI, a nie u użytkownika.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Ścieżka liczona od katalogu uruchomienia, a nie od `import.meta.url`: w jsdom
 * to nie jest adres plikowy. Obsługujemy oba miejsca, z których startują testy —
 * `frontend/` (skrypty npm) i katalog główny repo.
 */
const RULES_FILE = ['../database.rules.json', 'database.rules.json']
  .map((relative) => path.resolve(relative))
  .find((absolute) => existsSync(absolute));

/** Reguły oceniają węzeł tak, jak zrobiłaby to baza — patrz `evaluateRule`. */
const RULES = JSON.parse(readFileSync(RULES_FILE, 'utf8')).rules;

// ─── Atrapa `runTransaction`: przechwytuje każdy zapisany węzeł `appData` ─────
const h = vi.hoisted(() => {
  const written = [];
  const state = { current: null };

  const runTransactionImpl = vi.fn(async (_ref, updateFn) => {
    const current = state.current ? JSON.parse(JSON.stringify(state.current)) : null;
    const result = updateFn(current);
    if (result !== undefined) {
      state.current = result;
      written.push(JSON.parse(JSON.stringify(result)));
    }
    return { committed: true, snapshot: {} };
  });

  return { written, state, runTransactionImpl };
});

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  runTransaction: h.runTransactionImpl,
}));

vi.mock('../lib/firebase/config', () => ({ database: {}, dataRef: {} }));

// ─── Import po atrapach ───────────────────────────────────────────────────────
const { addSession, updateWeek, deleteWeek } = await import('../lib/firebase/mutations/sessions');
const { addPlayer, softDeletePlayer, restorePlayer, permanentDeletePlayer, saveDefaultMulti } =
  await import('../lib/firebase/mutations/players');
const { addPayment, removePayment } = await import('../lib/firebase/mutations/payments');
const { buildTokenEntry } = await import('../utils/pushToken');

// ══════════════════════════════════════════════════════════════════════════════
//  Mini-silnik reguł: tyle semantyki RTDB, ile trzeba, żeby wykryć rozjazd
// ══════════════════════════════════════════════════════════════════════════════

/** Reguła dla dziecka `key`: stały klucz → wildcard ($…) → `$other`. */
function ruleFor(node, key) {
  if (Object.prototype.hasOwnProperty.call(node, key)) return { rule: node[key], kind: 'exact' };

  const wildcards = Object.keys(node).filter((k) => k.startsWith('$') && k !== '$other');
  if (wildcards.length > 0) return { rule: node[wildcards[0]], kind: 'wildcard' };

  // `$other` łapie wszystko, czego nie ma wśród stałych kluczy. Z walidacją
  // `false` oznacza „takiego pola baza nie przyjmie” — i to jest cała pułapka.
  if (node.$other) {
    return {
      rule: node.$other,
      kind: node.$other['.validate'] === false ? 'forbidden' : 'wildcard',
    };
  }

  return null; // brak reguły = brak ograniczeń
}

/** Atrapa `RuleDataSnapshot` — tylko metody używane w tym pliku reguł. */
function snapshot(value) {
  const exists = value !== null && value !== undefined;
  const isObject = exists && typeof value === 'object';
  const hasChild = (key) => isObject && value[key] !== null && value[key] !== undefined;

  return {
    val: () => value,
    exists: () => exists,
    isString: () => typeof value === 'string',
    isNumber: () => typeof value === 'number' && Number.isFinite(value),
    isBoolean: () => typeof value === 'boolean',
    hasChild,
    hasChildren: (keys) =>
      Array.isArray(keys) ? keys.every(hasChild) : isObject && Object.keys(value).length > 0,
  };
}

const compiled = new Map();

/**
 * Wyrażenia reguł to ta sama składnia co JavaScript (`newData.isNumber() && …`),
 * więc wykonujemy je wprost na atrapie węzła. Wyjątek w regule = odrzucony zapis,
 * tak jak w bazie.
 */
function evaluateRule(expression, value) {
  let fn = compiled.get(expression);
  if (!fn) {
    fn = new Function('newData', `return (${expression});`);
    compiled.set(expression, fn);
  }
  try {
    return Boolean(fn(snapshot(value)));
  } catch {
    return false;
  }
}

/**
 * Pusta tablica albo pusty obiekt to w bazie brak danych — węzeł znika, więc
 * `weeks: []` po usunięciu ostatniej sesji nie jest zapisem, tylko kasowaniem.
 */
function isDeleted(value) {
  return value === null
    || value === undefined
    || (typeof value === 'object' && Object.keys(value).length === 0);
}

/**
 * Sprawdza drzewo danych regułami i zwraca listę naruszeń.
 *
 * Uwaga na semantykę: reguła `.validate` na dziecku NIE wymaga jego obecności
 * (znika razem z danymi przy usuwaniu) — dlatego sprawdzamy tylko klucze, które
 * w zapisywanych danych faktycznie są. Wymóg obecności to wyłącznie
 * `hasChildren([...])` na rodzicu.
 */
function checkNode(path, value, node, problems) {
  if (!node) return;
  // Walidacja nie dotyczy kasowania: reguły ocenia się tylko dla danych, które
  // po zapisie faktycznie istnieją.
  if (isDeleted(value)) return;

  const validate = node['.validate'];
  if (typeof validate === 'string' && !evaluateRule(validate, value)) {
    problems.push(`${path}: reguła ".validate" nie przepuszcza wartości ${JSON.stringify(value)}`);
  }

  if (typeof value !== 'object') return;

  for (const key of Object.keys(value)) {
    if (isDeleted(value[key])) continue;

    const child = ruleFor(node, key);
    if (!child) continue;

    if (child.kind === 'forbidden') {
      problems.push(`${path}/${key}: pole spoza reguł bazy — każdy zapis "appData" skończy się PERMISSION_DENIED`);
      continue;
    }

    checkNode(`${path}/${key}`, value[key], child.rule, problems);
  }
}

/** Naruszenia dla zapisanego węzła `appData`. Pusto = baza przyjmie zapis. */
function problemsIn(payload) {
  const problems = [];
  checkNode('appData', payload, RULES.appData, problems);
  return problems;
}

// `matches()` to metoda reguł, której nie ma w JavaScripcie — dokładamy ją na
// czas testów, żeby wyrażeń typu `newData.val().matches(/^\d{4}-…/)` nie trzeba
// było przepisywać na własny dialekt.
beforeAll(() => {
  String.prototype.matches = function matches(regex) {
    return regex.test(this);
  };
});

afterAll(() => {
  delete String.prototype.matches;
});

// ══════════════════════════════════════════════════════════════════════════════
//  Dane startowe: realistyczna baza, w tym stare rekordy i zaszłości
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sesje bez `sport`/`courtCount` sprzed wprowadzenia tych pól, dogrywka
 * trzymana tylko do odczytu, `playerJoinWeek` i `paidUntilWeek` z dawnych
 * wersji. Aplikacja przepisuje te rekordy przy KAŻDYM zapisie, więc reguły
 * muszą je przepuszczać — inaczej stara baza blokuje nowe funkcje.
 */
function seedLegacy() {
  h.written.length = 0;
  h.state.current = {
    players: ['Ala', 'Bolek', 'Czesiek'],
    deletedPlayers: ['Dawny'],
    defaultMultiPlayers: ['Ala'],
    playerJoinDate: { Ala: '2026-01-05', Bolek: '2026-02-02' },
    playerJoinWeek: { Czesiek: 4 },
    paidUntilWeek: { Bolek: '2026-01-04' },
    weeks: [
      { id: 'w1', date: '2026-09-16', cost: 60, present: ['Ala', 'Bolek'], multiPlayers: ['Ala'] },
      {
        id: 'w2',
        date: '2026-09-23',
        cost: 45,
        present: ['Ala', 'Bolek', 'Czesiek'],
        multiPlayers: ['Bolek'],
        overtimePlayers: ['Ala'],
        overtimeCost: 15,
      },
    ],
    payments: { Bolek: [{ id: 'p1', amount: 20, date: '2026-09-10' }] },
    lastAddedSession: { id: 'w2', ts: 1790198411380 },
  };
}

describe('zgodność zapisów aplikacji z regułami bazy', () => {
  it('sesja z kortami i godzinami przechodzi reguły (regresja: PERMISSION_DENIED)', async () => {
    seedLegacy();

    const result = await addSession({
      datePlayed: '2026-09-30',
      totalCost: 120,
      presentPlayers: ['Ala', 'Bolek', 'Czesiek'],
      multisportPlayers: ['Ala'],
      sport: 'padel',
      racketCost: 10,
      ownRacketPlayers: ['Bolek'],
      courtCount: 2,
      durationHours: 2,
    });

    expect(result.success).toBe(true);
    const payload = h.written.at(-1);
    // Gdyby aplikacja przestała zapisywać te pola, test przestałby cokolwiek chronić.
    expect(payload.weeks.at(-1)).toMatchObject({ courtCount: 2, durationHours: 2 });
    expect(problemsIn(payload)).toEqual([]);
  });

  it('edycja starej sesji (bez sportu, bez kortów) przechodzi reguły', async () => {
    seedLegacy();

    const result = await updateWeek('w1', {
      date: '2026-09-16',
      cost: 80,
      present: ['Ala', 'Bolek'],
      sport: 'squash',
      multiPlayers: ['Ala'],
      racketCost: 0,
      ownRacketPlayers: [],
      courtCount: 1,
      durationHours: 1,
    });

    expect(result.success).toBe(true);
    expect(problemsIn(h.written.at(-1))).toEqual([]);
  });

  it('usunięcie sesji — także ostatniej — przechodzi reguły', async () => {
    seedLegacy();
    await deleteWeek('w1');
    expect(problemsIn(h.written.at(-1))).toEqual([]);

    // Ostatnia sesja: `weeks` staje się puste, więc węzeł znika z bazy.
    await deleteWeek('w2');
    const payload = h.written.at(-1);
    expect(payload.weeks ?? []).toEqual([]);
    expect(problemsIn(payload)).toEqual([]);
  });

  it('operacje na graczach przechodzą reguły', async () => {
    seedLegacy();

    await addPlayer('Dorota');
    await softDeletePlayer('Dorota');
    await restorePlayer('Dorota');
    await saveDefaultMulti(['Ala', 'Bolek']);
    await permanentDeletePlayer('Dawny');

    expect(h.written).toHaveLength(5);
    for (const payload of h.written) expect(problemsIn(payload)).toEqual([]);
  });

  it('wpłata i jej cofnięcie przechodzą reguły', async () => {
    seedLegacy();

    await addPayment('Bolek', 30, 'stale-id');
    await removePayment('Bolek', 'stale-id');

    for (const payload of h.written) expect(problemsIn(payload)).toEqual([]);
  });

  it('przepisanie starych rekordów usuwa zaszłości i nadal przechodzi reguły', async () => {
    seedLegacy();

    await addPlayer('Dorota');

    const payload = h.written.at(-1);
    // `paidUntilWeek` nie może wrócić do bazy — mutacje go nie przepisują.
    expect('paidUntilWeek' in payload).toBe(false);
    // A rekordy, których aplikacja nie rusza, muszą przejść w niezmienionej formie.
    expect(payload.weeks).toHaveLength(2);
    expect(problemsIn(payload)).toEqual([]);
  });

  it('wpis tokenu push przechodzi reguły (także po przycięciu długości)', async () => {
    const key = 'abc123';
    const entry = buildTokenEntry({
      token: 't'.repeat(5000),
      playerName: 'A'.repeat(60),
      ua: 'x'.repeat(400),
      updatedAt: 1790198411380,
    });

    const problems = [];
    checkNode('fcmTokens', { [key]: entry }, RULES.fcmTokens, problems);
    expect(problems).toEqual([]);
  });

  it('wykrywa pole, którego reguły nie znają — czyli błąd, który to spowodował', () => {
    // Reguły sprzed poprawki: bez `courtCount` i `durationHours`.
    const oldRules = {
      weeks: {
        '.validate': 'newData.hasChildren()',
        $index: {
          '.validate': "newData.hasChildren(['id', 'date', 'cost', 'present'])",
          id: { '.validate': "newData.isString() && newData.val().length > 0" },
          date: { '.validate': "newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)" },
          cost: { '.validate': 'newData.isNumber() && newData.val() >= 0' },
          present: { '.validate': 'newData.hasChildren()', $i: { '.validate': 'newData.isString()' } },
          $other: { '.validate': false },
        },
      },
    };
    const payload = {
      weeks: [
        { id: 'w3', date: '2026-09-30', cost: 120, present: ['Ala'], courtCount: 2, durationHours: 2 },
      ],
    };

    const problems = [];
    checkNode('appData', payload, oldRules, problems);
    expect(problems).toEqual([
      expect.stringContaining('appData/weeks/0/courtCount'),
      expect.stringContaining('appData/weeks/0/durationHours'),
    ]);

    // …i że te same dane przechodzą już przez reguły z repozytorium.
    expect(problemsIn(payload)).toEqual([]);
  });
});
