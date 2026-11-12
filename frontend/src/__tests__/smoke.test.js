/**
 * SMOKE TESTS — STAŁE I NORMALIZACJA DANYCH
 *
 * Brakujące eksporty i puste importy łapie `npm run typecheck` (krok CI przed
 * testami), więc tu zostają tylko sprawdzenia, których typy nie widzą:
 * kolejność rang, normalizacja uszkodzonych danych z bazy, skale stylów.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── Mocki Firebase (wymagane przez wszystkie moduły firebase/*) ─────────────
vi.mock('firebase/app',      () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase:    vi.fn(() => ({})),
  ref:            vi.fn(() => ({})),
  onValue:        vi.fn(),
  runTransaction: vi.fn(),
  set:            vi.fn(),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken:     vi.fn(),
  onMessage:    vi.fn(),
}));

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

describe('utils/id — identyfikatory i dzisiejsza data', () => {
  afterEach(() => vi.useRealTimers());

  it('makeId zwraca niepusty, unikalny string przy każdym wywołaniu', async () => {
    const { makeId } = await import('../utils/id');
    const ids = Array.from({ length: 100 }, () => makeId());
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(100);
  });

  // Data lokalna, nie UTC: tuż po północy w Polsce `toISOString()` daje
  // jeszcze wczorajszy dzień, a sesja zapisałaby się z błędną datą.
  it('todayISO zwraca lokalną datę w formacie YYYY-MM-DD', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 5, 0, 30));
    const { todayISO } = await import('../utils/id');
    expect(todayISO()).toBe('2026-01-05');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

describe('constants/index.js — struktura', () => {
  it('RANKS ma 6 rang posortowanych malejąco po min', async () => {
    const { RANKS } = await import('../constants/index');
    expect(RANKS).toHaveLength(6);
    // każda ranga powinna mieć wymagane pola
    for (const rank of RANKS) {
      expect(rank.min).toBeTypeOf('number');
      expect(rank.name).toBeTypeOf('string');
      // Token motywu, nie literał hex: jeden kolor nie przejdzie 4,5:1
      // jednocześnie na ciemnym i jasnym tle (patrz scripts/check-contrast.mjs).
      expect(rank.hex).toMatch(/^var\(--rank-[a-z]+\)$/);
    }
    // rangi powinny być posortowane malejąco
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].min).toBeLessThanOrEqual(RANKS[i - 1].min);
    }
  });

  it('MONTHS ma 12 miesięcy po polsku', async () => {
    const { MONTHS } = await import('../constants/index');
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toBe('Styczeń');
    expect(MONTHS[11]).toBe('Grudzień');
  });

  it('getRank zwraca rangę pasującą do procentu', async () => {
    const { getRank, RANKS } = await import('../constants/index');
    expect(getRank(100)).toBe(RANKS[0]); // najwyższa
    expect(getRank(0)).toBe(RANKS[RANKS.length - 1]); // najniższa
    expect(getRank(75)).toBeDefined();
  });

});

// ════════════════════════════════════════════════════════════════════════════
// FIREBASE — MODUŁY
// ════════════════════════════════════════════════════════════════════════════

describe('lib/firebase/transforms.ts — normalizeRawData', () => {
  it('normalizeRawData zwraca kompletny obiekt gdy wejście jest puste', async () => {
    const { normalizeRawData } = await import('../lib/firebase/transforms');
    const result = normalizeRawData({});
    expect(result.players).toEqual([]);
    expect(result.weeks).toEqual([]);
    expect(result.payments).toEqual({});
    expect(result.deletedPlayers).toEqual([]);
  });

  it('normalizeRawData zwraca kompletny obiekt gdy wejście jest null', async () => {
    const { normalizeRawData } = await import('../lib/firebase/transforms');
    // snapshot Firebase może zwrócić null gdy baza jest pusta
    const result = normalizeRawData(null);
    expect(result.players).toEqual([]);
    expect(result.weeks).toEqual([]);
    expect(result.payments).toEqual({});
  });

  it('normalizeRawData odsiewa uszkodzone dane i zachowuje poprawne sesje', async () => {
    const { normalizeRawData, buildUIData } = await import('../lib/firebase/transforms');

    const result = normalizeRawData({
      players: ['Ala', null, 42, 'Ala', 'x'.repeat(41)],
      weeks: [
        null,
        'uszkodzona',
        {
          id: 'w1', date: '2025-01-01', cost: 60, sport: 'squash',
          present: ['Ala', 'Ala'], multiPlayers: ['Ala', 'Ghost'],
          ownRacketPlayers: ['Ghost'], courtCount: 2, durationHours: 3,
          overtimeCost: 15, overtimePlayers: ['Ala'],
        },
        { id: 'w2', date: 'nie-data', cost: 60, present: ['Ala'] },
        { id: 'w1', date: '2025-02-01', cost: 60, present: ['Ala'] },
        {
          id: 'w3', date: '2025-03-01', cost: NaN, sport: 'hacker',
          present: 'Ala', courtCount: 99, durationHours: 0,
        },
      ],
      payments: {
        Ala: [
          { id: 'p1', amount: 30, date: '2025-01-02' },
          { id: 'p1', amount: 99, date: '2025-01-03' },
          { id: 'bad', amount: NaN, date: '2025-01-04' },
          null,
        ],
        Bob: 'nie-tablica',
        ['__proto__']: [{ id: 'evil', amount: 1, date: '2025-01-01' }],
      },
      playerJoinDate: { Ala: '2025-01-01', Bob: 'wczoraj' },
      playerJoinWeek: { Ala: 2.9, Bob: Infinity, Carl: '1' },
      defaultMultiPlayers: 'nie-tablica',
      deletedPlayers: ['Dawny', null],
    });

    expect(result.players).toEqual(['Ala']);
    expect(result.weeks.map(w => w.id)).toEqual(['w1', 'w3']);

    expect(result.weeks[0]).toMatchObject({
      sport: 'squash',
      present: ['Ala'],
      multiPlayers: ['Ala'],
      courtCount: 2,
      durationHours: 3,
      overtimeCost: 15,
      overtimePlayers: ['Ala'],
    });
    expect(result.weeks[0]).not.toHaveProperty('ownRacketPlayers');

    expect(result.weeks[1]).toMatchObject({ cost: 0, sport: 'pingpong', present: [] });
    expect(result.weeks[1]).not.toHaveProperty('courtCount');
    expect(result.weeks[1]).not.toHaveProperty('durationHours');

    expect(result.payments).toEqual({ Ala: [{ id: 'p1', amount: 30, date: '2025-01-02' }] });
    expect(Object.prototype.hasOwnProperty.call(result.payments, '__proto__')).toBe(false);
    expect(result.playerJoinDate).toEqual({ Ala: '2025-01-01' });
    expect(result.playerJoinWeek).toEqual({ Ala: 2 });
    expect(result.defaultMultiPlayers).toEqual([]);
    expect(result.deletedPlayers).toEqual(['Dawny']);

    // Cały łańcuch czytania danych musi przetrwać to samo wejście.
    expect(() => buildUIData(result)).not.toThrow();
    expect(buildUIData(result).history).toHaveLength(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ════════════════════════════════════════════════════════════════════════════

describe('app/providers/themeContext.ts — bez równoległych tokenów', () => {
  // Kolory motywu żyją wyłącznie w zmiennych CSS. Równoległy zestaw tokenów
  // w TypeScripcie został usunięty: z 27 pól realnie czytane były 4, a te,
  // które miały ujednolicić modale, nie były używane w ogóle. Test pilnuje,
  // żeby duplikat nie wrócił.
  it('nie eksportuje już równoległego systemu tokenów', async () => {
    const m = await import('../app/providers/themeContext');
    expect(m.CYBER_TOKENS).toBeUndefined();
    expect(m.LIGHT_TOKENS).toBeUndefined();
    expect(m.getThemeTokens).toBeUndefined();
    expect(m.useThemeTokens).toBeUndefined();
  });
});

describe('constants/styles.ts — skala', () => {
  it('skala warstw pokrywa się z kolejnością z index.css', async () => {
    const { Z } = await import('../constants/styles');
    expect(Z.header).toBeLessThan(Z.nav);
    expect(Z.nav).toBeLessThan(Z.banner);
    // Ziarno filmowe malowało się wcześniej nad każdym dialogiem (1001 vs 200).
    expect(Z.grain).toBeLessThan(Z.modal);
    expect(Z.popover).toBeLessThan(Z.modal);
    expect(Z.modal).toBeLessThan(Z.toast);
  });

  it('najmniejszy stopień typografii nie schodzi poniżej czytelności', async () => {
    const { TEXT } = await import('../constants/styles');
    // 0.7rem = 11.2px. Wcześniej `monoMicro` miało 0.42rem, czyli ~6.7px.
    expect(parseFloat(TEXT.tiny)).toBeGreaterThanOrEqual(0.7);
  });
});
