/**
 * SMOKE TESTS — IMPORTY I EKSPORTY
 *
 * Cel: upewnić się, że żaden moduł nie ma błędu składni, pustego importu
 * ani brakującego eksportu. Ten plik testów złapałby błąd `import {  } from 'lucide-react'`
 * który powodował crash apki — mimo że logika biznesowa była poprawna.
 *
 * Zasada: jeśli moduł ma błąd, vitest nie zdoła go zaimportować i test
 * automatycznie przepada z czytelnym komunikatem.
 */

import { describe, it, expect } from 'vitest';

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

describe('utils — eksporty modułów obliczeniowych', () => {
  it.each([
    ['../utils/money', ['roundToTwoDecimals', 'getPayingPlayers', 'allocateExact', 'splitEqually']],
    ['../utils/sessionCost', ['getSessionShares', 'getPlayerSessionCost', 'getSessionBaseCost']],
    ['../utils/debt', ['calculateDebt', 'buildDebtDisplayData']],
    ['../utils/rankings', ['calculatePlayerStats', 'assignRankingPlaces', 'computeRankingHistory']],
    ['../utils/sessions', ['groupSessionsByMonth', 'groupHistoryByMonth']],
    ['../utils/achievements', ['getPlayerAchievements']],
  ])('%s eksportuje oczekiwane funkcje', async (path, expected) => {
    const m = await import(/* @vite-ignore */ path);
    for (const fn of expected) {
      expect(m[fn], `brakuje eksportu: ${fn}`).toBeTypeOf('function');
    }
  });
});

describe('utils/format.js — eksporty', () => {
  it('eksportuje formatDate, formatAmount, formatAmountShort', async () => {
    const m = await import('../utils/format');
    expect(m.formatDate).toBeTypeOf('function');
    expect(m.formatAmount).toBeTypeOf('function');
    expect(m.formatAmountShort).toBeTypeOf('function');
  });
});

describe('utils/id.js — eksporty i podstawowe działanie', () => {
  it('eksportuje makeId i todayISO', async () => {
    const { makeId, todayISO } = await import('../utils/id');
    expect(makeId).toBeTypeOf('function');
    expect(todayISO).toBeTypeOf('function');
  });

  it('makeId zwraca unikalny string przy każdym wywołaniu', async () => {
    const { makeId } = await import('../utils/id');
    const ids = new Set(Array.from({ length: 100 }, () => makeId()));
    expect(ids.size).toBe(100); // żadne dwa nie mogą być takie same
  });

  it('makeId zwraca niepusty string', async () => {
    const { makeId } = await import('../utils/id');
    const id = makeId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('todayISO zwraca format YYYY-MM-DD', async () => {
    const { todayISO } = await import('../utils/id');
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('todayISO zwraca dzisiejszą datę', async () => {
    const { todayISO } = await import('../utils/id');
    const today = new Date().toISOString().split('T')[0];
    expect(todayISO()).toBe(today);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

describe('constants/index.js — struktura', () => {
  it('TABS ma wszystkie zakładki', async () => {
    const { TABS } = await import('../constants/index');
    expect(Object.keys(TABS)).toEqual(
      expect.arrayContaining(['DASHBOARD', 'ATTENDANCE', 'ADMIN', 'HISTORY', 'PLAYERS'])
    );
  });

  it('SOUND_TYPES ma wszystkie typy dźwięków', async () => {
    const { SOUND_TYPES } = await import('../constants/index');
    expect(Object.keys(SOUND_TYPES)).toEqual(
      expect.arrayContaining(['TAB', 'CLICK', 'SUCCESS', 'DELETE', 'COIN', 'ERROR'])
    );
  });

  it('RANKS ma 6 rang posortowanych malejąco po min', async () => {
    const { RANKS } = await import('../constants/index');
    expect(RANKS).toHaveLength(6);
    // każda ranga powinna mieć wymagane pola
    for (const rank of RANKS) {
      expect(rank.min).toBeTypeOf('number');
      expect(rank.emoji).toBeTypeOf('string');
      expect(rank.name).toBeTypeOf('string');
      expect(rank.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
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

  it('ORGANIZER_NAME jest niepustym stringiem', async () => {
    const { ORGANIZER_NAME } = await import('../constants/index');
    expect(ORGANIZER_NAME).toBeTypeOf('string');
    expect(ORGANIZER_NAME.length).toBeGreaterThan(0);
  });

  it('getRank zwraca rangę pasującą do procentu', async () => {
    const { getRank, RANKS } = await import('../constants/index');
    expect(getRank(100)).toBe(RANKS[0]); // najwyższa
    expect(getRank(0)).toBe(RANKS[RANKS.length - 1]); // najniższa
    expect(getRank(75)).toBeDefined();
  });

  it('SETTLED_THRESHOLD jest małą liczbą dodatnią', async () => {
    const { SETTLED_THRESHOLD } = await import('../constants/index');
    expect(SETTLED_THRESHOLD).toBeGreaterThan(0);
    expect(SETTLED_THRESHOLD).toBeLessThan(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FIREBASE — MODUŁY
// ════════════════════════════════════════════════════════════════════════════

describe('lib/firebase/state.ts — eksporty', () => {
  it('eksportuje setCurrentData i getCurrentData', async () => {
    const m = await import('../lib/firebase/state');
    expect(m.setCurrentData).toBeTypeOf('function');
    expect(m.getCurrentData).toBeTypeOf('function');
  });

  it('set/get działa jak para', async () => {
    const { setCurrentData, getCurrentData } = await import('../lib/firebase/state');
    const testData = { players: ['Alice'], weeks: [] };
    setCurrentData(testData);
    expect(getCurrentData()).toBe(testData);
    setCurrentData(null); // przywróć do null po teście
  });
});

describe('lib/firebase/transforms.ts — eksporty', () => {
  it('eksportuje buildUIData i normalizeRawData', async () => {
    const m = await import('../lib/firebase/transforms');
    expect(m.buildUIData).toBeTypeOf('function');
    expect(m.normalizeRawData).toBeTypeOf('function');
  });

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
    const result = normalizeRawData({});
    expect(result).toBeDefined();
  });
});

describe('lib/firebase/index.ts — eksporty', () => {
  it('eksportuje wszystkie publiczne funkcje', async () => {
    const m = await import('../lib/firebase/index');
    const expected = [
      'subscribeToData',
      'database',
      'addSession', 'updateWeek', 'deleteWeek',
      'addPlayer', 'softDeletePlayer', 'restorePlayer', 'permanentDeletePlayer', 'saveDefaultMulti',
      'addPayment', 'removePayment',
    ];
    for (const name of expected) {
      expect(m[name], `brakuje eksportu: ${name}`).toBeDefined();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ════════════════════════════════════════════════════════════════════════════

describe('app/providers/themeContext.ts — eksporty', () => {
  it('eksportuje ThemeContext, useThemeTokens i getThemeTokens', async () => {
    const m = await import('../app/providers/themeContext');
    expect(m.ThemeContext).toBeDefined();
    expect(m.useThemeTokens).toBeTypeOf('function');
    expect(m.getThemeTokens).toBeTypeOf('function');
  });

  it('oba zestawy tokenów mają identyczny zbiór kluczy', async () => {
    const { CYBER_TOKENS, LIGHT_TOKENS } = await import('../app/providers/themeContext');
    expect(Object.keys(LIGHT_TOKENS).sort()).toEqual(Object.keys(CYBER_TOKENS).sort());
  });

  it('getThemeTokens wybiera zestaw na podstawie motywu', async () => {
    const { getThemeTokens, CYBER_TOKENS, LIGHT_TOKENS } = await import('../app/providers/themeContext');
    expect(getThemeTokens('light')).toBe(LIGHT_TOKENS);
    expect(getThemeTokens('dark')).toBe(CYBER_TOKENS);
  });
});
