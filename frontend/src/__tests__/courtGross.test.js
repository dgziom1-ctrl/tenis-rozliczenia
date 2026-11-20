/**
 * Cena kortu przed zwrotem (`courtGross`): silnik bierze pulę zniżek z faktu
 * (cena − kwota po zwrocie), a nie ze stałej. Gdy zwrot zgadza się z regułami,
 * wynik musi być identyczny z dawnym liczeniem samej kwoty po zwrocie.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { getSessionShares, getExpectedRefund, getCourtRefund } from '../utils/sessionCost';
import { resolveCourtRefund } from '../utils/courtRefund';
import { getLastCourtRate } from '../utils/sessions';
import { normalizeRawData } from '../lib/firebase/transforms';
import { buildGroupMessage } from '../utils/message';

const require = createRequire(import.meta.url);
const fns = require('../../../functions/sessionCost.js');

const NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];

function build({ players, cards, single, hours, courts, sport, net }) {
  const present = NAMES.slice(0, players);
  const multi = present.slice(0, cards);
  return {
    sport, cost: net, present, multiPlayers: multi,
    singleScanPlayers: multi.slice(0, single),
    courtCount: courts, durationHours: hours, discountModel: 'perScan',
  };
}

describe('getExpectedRefund', () => {
  const base = { sport: 'squash', present: ['A', 'B', 'C'], courtCount: 1 };

  it('Multisport odbija się co godzinę, Medicover raz', () => {
    const session = { ...base, multiPlayers: ['A', 'B'], singleScanPlayers: ['B'], durationHours: 2, cost: 50 };
    // godz. 1: A + B, godz. 2: tylko A → 3 odbicia
    expect(getExpectedRefund(session)).toBe(45);
  });

  it('limit obiektu przycina odbicia w danej godzinie', () => {
    const session = { ...base, present: ['A', 'B', 'C', 'D'], multiPlayers: ['A', 'B', 'C', 'D'], durationHours: 1, cost: 30 };
    expect(getExpectedRefund(session)).toBe(30); // squash: 2 / kort / godz.
  });

  it('bez kart nie ma zwrotu', () => {
    expect(getExpectedRefund({ ...base, multiPlayers: [], durationHours: 1, cost: 30 })).toBe(0);
  });
});

describe('courtGross zgodny z regułami == dawne liczenie samej kwoty', () => {
  it('daje identyczne udziały na siatce konfiguracji', () => {
    for (const sport of ['pingpong', 'squash', 'badminton', 'padel']) {
      for (let players = 1; players <= 6; players++) {
        for (let cards = 0; cards <= players; cards++) {
          for (let single = 0; single <= Math.min(cards, 2); single++) {
            for (const hours of [1, 2, 3]) {
              for (const courts of [1, 2, 3]) {
                const old = build({ players, cards, single, hours, courts, sport, net: 83.37 });
                const expected = getExpectedRefund(old);
                const withGross = { ...old, courtGross: Math.round((old.cost + expected) * 100) / 100 };
                const a = getSessionShares(old);
                const b = getSessionShares(withGross);
                expect(b.byPlayer).toEqual(a.byPlayer);
                expect(fns.getSessionShares(withGross).byPlayer).toEqual(b.byPlayer);
              }
            }
          }
        }
      }
    }
  });
});

describe('zwrot inny niż wg reguł', () => {
  const session = {
    sport: 'squash', present: ['A', 'B', 'C', 'D'], multiPlayers: ['A', 'B'],
    courtCount: 1, durationHours: 1, discountModel: 'perScan',
  };

  it('suma udziałów równa się kwocie, a baza to cena / liczba graczy', () => {
    // cena 80, zwrot tylko 20 (zamiast 30) → płacą 60
    const s = { ...session, cost: 60, courtGross: 80 };
    const shares = getSessionShares(s);
    const total = Object.values(shares.byPlayer).reduce((sum, p) => sum + Math.round(p.total * 100), 0);
    expect(total).toBe(6000);
    expect(shares.byPlayer.A.total).toBe(10); // 20 − 10 zwrotu
    expect(shares.byPlayer.C.total).toBe(20); // bez karty: 80 / 4
    expect(getCourtRefund(s)).toBe(20);
  });

  it('zwrot 0 zł: wszyscy płacą po równo z ceny pełnej', () => {
    const shares = getSessionShares({ ...session, cost: 80, courtGross: 80 });
    expect(Object.values(shares.byPlayer).map(p => p.total)).toEqual([20, 20, 20, 20]);
  });

  it('zmiana stałej zniżki nie rusza sesji z ceną (pula z faktu)', () => {
    const s = { ...session, cost: 50, courtGross: 80 }; // zwrot 30 = 2 × 15
    expect(getSessionShares(s).byPlayer.A.total).toBe(20 - 15);
  });
});

describe('courtGross jest ignorowany, gdy nie ma sensu', () => {
  const legacy = { sport: 'squash', cost: 41, present: ['A', 'B'], multiPlayers: ['A'] };

  it('w sesji bez zasady perScan', () => {
    expect(getSessionShares({ ...legacy, courtGross: 56 })).toEqual(getSessionShares({ ...legacy }));
    expect(getCourtRefund({ ...legacy, courtGross: 56 })).toBeNull();
  });

  it('gdy cena jest mniejsza niż kwota po zwrocie', () => {
    const s = { ...legacy, discountModel: 'perScan', courtCount: 1, durationHours: 1 };
    expect(getSessionShares({ ...s, courtGross: 10 })).toEqual(getSessionShares({ ...s }));
    expect(getCourtRefund({ ...s, courtGross: 10 })).toBeNull();
  });

  it('zwrot bez posiadaczy kart nie zmienia podziału', () => {
    const s = { sport: 'squash', cost: 30, present: ['A', 'B'], multiPlayers: [], discountModel: 'perScan', courtCount: 1, durationHours: 1 };
    expect(getSessionShares({ ...s, courtGross: 50 }).byPlayer).toEqual(getSessionShares({ ...s }).byPlayer);
  });
});

describe('resolveCourtRefund', () => {
  it('automat: oczekiwany zwrot przycięty do ceny', () => {
    expect(resolveCourtRefund('56', undefined, 45)).toMatchObject({ refund: 45, net: 11, isManual: false, error: null });
    expect(resolveCourtRefund('20', undefined, 45)).toMatchObject({ refund: 20, net: 0 });
  });

  it('ręczny zwrot: wygrywa z regułą i ostrzega o różnicy', () => {
    const r = resolveCourtRefund('56', '30', 45);
    expect(r).toMatchObject({ refund: 30, net: 26, isManual: true, mismatch: true });
    expect(resolveCourtRefund('56', '45', 45).mismatch).toBe(false);
  });

  it('błędy blokujące', () => {
    expect(resolveCourtRefund('56', '60', 45)).toMatchObject({ net: null });
    expect(resolveCourtRefund('56', '60', 45).error).toMatch(/większy niż cena/);
    expect(resolveCourtRefund('56', 'abc', 45).net).toBeNull();
    expect(resolveCourtRefund('', undefined, 45).net).toBeNull();
  });
});

describe('getLastCourtRate', () => {
  const history = [
    { datePlayed: '2026-01-01', sport: 'squash', courtGross: 60, courtCount: 1, durationHours: 1 },
    { datePlayed: '2026-02-01', sport: 'squash', courtGross: 112, courtCount: 2, durationHours: 1 },
    { datePlayed: '2026-03-01', sport: 'squash', totalCost: 41 },
    { datePlayed: '2026-04-01', sport: 'padel', courtGross: 100, courtCount: 1, durationHours: 1 },
  ];
  it('bierze najnowszą sesję danego sportu z ceną', () => {
    expect(getLastCourtRate(history, 'squash')).toBe(56);
    expect(getLastCourtRate(history, 'badminton')).toBeNull();
  });
});

describe('sanitizeWeek zachowuje courtGross tylko gdy poprawny', () => {
  const week = { id: 'w', date: '2026-05-01', cost: 41, present: ['A'], multiPlayers: [], discountModel: 'perScan' };
  const out = (extra) => normalizeRawData({ weeks: [{ ...week, ...extra }] }).weeks[0];

  it('poprawny', () => expect(out({ courtGross: 56 }).courtGross).toBe(56));
  it('za mały', () => expect(out({ courtGross: 10 }).courtGross).toBeUndefined());
  it('bez perScan', () => expect(out({ courtGross: 56, discountModel: undefined }).courtGross).toBeUndefined());
  it('nie-liczba', () => expect(out({ courtGross: 'x' }).courtGross).toBeUndefined());
});

describe('wiadomość na grupkę', () => {
  const params = {
    date: '2026-05-01', totalCost: 41, presentPlayers: ['A', 'B'], multisportPlayers: ['A'],
    sport: 'squash', courtCount: 1, durationHours: 1, discountModel: 'perScan',
  };
  it('z ceną przed zwrotem pokazuje zwrot osobno', () => {
    const msg = buildGroupMessage({ ...params, courtGross: 56 });
    expect(msg).toContain('💰 Kort 56 zł − zwrot za karty 15 zł = 41 zł');
  });
  it('zwrot 0 zł: sama cena kortu, bez odejmowania', () => {
    const msg = buildGroupMessage({ ...params, totalCost: 56, courtGross: 56 });
    expect(msg).toContain('💰 Kort 56 zł\n');
  });
  it('stara sesja z kartami: znana tylko kwota po zniżkach', () => {
    const { discountModel: _omit, ...legacy } = params;
    expect(buildGroupMessage(legacy)).toContain('💰 Do rozdzielenia: 41 zł (po zniżkach kart)');
  });
});
