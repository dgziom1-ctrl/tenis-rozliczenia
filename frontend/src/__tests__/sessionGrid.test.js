// Testy charakteryzujące silnik rozliczeń na siatce konfiguracji sesji.
//
// Trzy warstwy, każda łapie inny rodzaj błędu przy refaktorze:
//   (a) zgodność aplikacji z Cloud Functions na CAŁEJ siatce — nie na kilkudziesięciu
//       ręcznie wybranych sesjach (patrz też `functionsParity.test.js`);
//   (b) niezmienniki pieniężne — suma udziałów = kwota sesji, nic ujemnego;
//   (c) złoty plik: wyniki zapisane obecnym kodem, porównywane co do grosza.
//
// Złoty plik odtwarza się CELOWO i tylko wtedy, gdy zasady rozliczeń zmieniają się
// z zamysłem (nie przy refaktorze):
//   UPDATE_GOLDEN=1 npx vitest run src/__tests__/sessionGrid.test.js

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import {
  getSessionShares, getShareGroups, getExpectedRefund, getCourtRefund,
} from '../utils/sessionCost';
import { buildGroupMessage } from '../utils/message';
import { toGrosze } from '../utils/money';
import {
  buildGrid, isGoldenSample, messageParams, normalize, toUiShape,
} from './fixtures/sessionGrid';

const require = createRequire(import.meta.url);
const fns = require('../../../functions/sessionCost.js');

// Vitest startuje z katalogu `frontend/` (skrypty npm), a w środowisku jsdom
// `import.meta.url` nie jest adresem `file:`, więc ścieżkę liczymy od katalogu roboczego.
const GOLDEN_PATH = path.resolve(process.cwd(), 'src/__tests__/fixtures/sessionGrid.golden.json');
const GRID = buildGrid();

// Siatka to dziesiątki tysięcy sesji liczonych dwiema implementacjami; przy
// równoległym uruchomieniu innych plików domyślne 5 s bywa za krótkie.
vi.setConfig({ testTimeout: 120_000 });

/** Zbiera pierwsze rozbieżności zamiast zatrzymywać się na pierwszej. */
function collect(check) {
  const problems = [];
  for (const [index, session] of GRID.entries()) {
    const problem = check(session, index);
    if (problem && problems.length < 5) problems.push({ index, session, ...problem });
  }
  return problems;
}

function snapshotOf(session) {
  let message;
  try {
    message = buildGroupMessage(messageParams(session));
  } catch (error) {
    message = `__error__: ${error instanceof Error ? error.message : String(error)}`;
  }
  return normalize({
    shares: getSessionShares(session),
    groups: getShareGroups(session),
    expectedRefund: getExpectedRefund(session),
    courtRefund: getCourtRefund(session),
    message,
  });
}

describe('siatka sesji — kształt', () => {
  it('jest duża, bez duplikatów i obejmuje wszystkie warianty', () => {
    expect(GRID.length).toBeGreaterThan(50_000);
    expect(new Set(GRID.map(s => JSON.stringify(s))).size).toBe(GRID.length);
    expect(new Set(GRID.map(s => s.sport)).size).toBe(4);
    expect(GRID.some(s => s.discountModel === undefined)).toBe(true);
    expect(GRID.some(s => s.discountModel === 'perScan' && s.courtGross !== undefined)).toBe(true);
    expect(GRID.some(s => s.singleScanPlayers !== undefined)).toBe(true);
    expect(GRID.some(s => s.courtCount === undefined && s.durationHours === undefined)).toBe(true);
  });
});

describe('(a) Cloud Functions liczą jak aplikacja na całej siatce', () => {
  it('getSessionShares jest identyczne dla każdej konfiguracji', () => {
    const problems = collect((session) => {
      const app = getSessionShares(session);
      const server = fns.getSessionShares(session);
      return JSON.stringify(normalize(app)) === JSON.stringify(normalize(server))
        ? null
        : { app, server };
    });
    expect(problems).toEqual([]);
  });

  it('aliasy pól z warstwy UI dają ten sam wynik w obu implementacjach', () => {
    const problems = collect((session, index) => {
      if (index % 7 !== 0) return null;
      const ui = toUiShape(session);
      const same = JSON.stringify(normalize(getSessionShares(ui)))
          === JSON.stringify(normalize(getSessionShares(session)))
        && JSON.stringify(normalize(fns.getSessionShares(ui)))
          === JSON.stringify(normalize(fns.getSessionShares(session)));
      return same ? null : { ui };
    });
    expect(problems).toEqual([]);
  });
});

describe('(b) niezmienniki pieniężne na całej siatce', () => {
  it('suma udziałów graczy i kwoty nieprzypisanej równa się kwocie sesji, co do grosza', () => {
    const problems = collect((session) => {
      const shares = getSessionShares(session);
      const allocated = Object.values(shares.byPlayer)
        .reduce((sum, share) => sum + toGrosze(share.total), 0);
      const expected = toGrosze(session.cost);
      const actual = allocated + toGrosze(shares.unallocated);
      return actual === expected ? null : { expected, actual };
    });
    expect(problems).toEqual([]);
  });

  it('żaden udział nie jest ujemny, a całość = kort + rakiety', () => {
    const problems = collect((session) => {
      const shares = getSessionShares(session);
      for (const [name, share] of Object.entries(shares.byPlayer)) {
        const parts = toGrosze(share.court) + toGrosze(share.racket);
        if (share.court < 0 || share.racket < 0 || share.total < 0 || parts !== toGrosze(share.total)) {
          return { name, share };
        }
      }
      return shares.unallocated < 0 ? { unallocated: shares.unallocated } : null;
    });
    expect(problems).toEqual([]);
  });

  it('wynik zależy tylko od danych: świeża kopia sesji daje to samo, a ta sama sesja — ten sam obiekt', () => {
    const problems = collect((session, index) => {
      if (index % 5 !== 0) return null;
      const copy = JSON.parse(JSON.stringify(session));
      const first = getSessionShares(session);
      const sameData = JSON.stringify(normalize(getSessionShares(copy))) === JSON.stringify(normalize(first));
      return sameData && getSessionShares(session) === first ? null : { first };
    });
    expect(problems).toEqual([]);
  });

  it('grupy stawek razy liczba osób dają kwotę przypisaną graczom', () => {
    const problems = collect((session, index) => {
      if (index % 3 !== 0) return null;
      const shares = getSessionShares(session);
      const fromPlayers = Object.values(shares.byPlayer)
        .reduce((sum, share) => sum + toGrosze(share.total), 0);
      const fromGroups = getShareGroups(session)
        .reduce((sum, group) => sum + Math.round(group.perPerson * group.names.length * 100), 0);
      // Średnia na osobę gubi najwyżej ułamek grosza na grupę.
      return Math.abs(fromGroups - fromPlayers) <= 1 + getShareGroups(session).length
        ? null
        : { fromPlayers, fromGroups };
    });
    expect(problems).toEqual([]);
  });
});

describe('(c) złoty plik — wyniki sprzed refaktoru', () => {
  const sampled = GRID.map((session, index) => ({ session, index })).filter(({ index }) => isGoldenSample(index));

  it('próbka jest wystarczająco duża i pokrywa każdy sport i obie zasady', () => {
    expect(sampled.length).toBeGreaterThan(300);
    expect(new Set(sampled.map(({ session }) => session.sport)).size).toBe(4);
    expect(new Set(sampled.map(({ session }) => session.discountModel)).size).toBe(2);
    expect(sampled.some(({ session }) => session.courtGross !== undefined)).toBe(true);
  });

  it('shares, grupy, zwroty i wiadomość na grupę są identyczne co do znaku', () => {
    const actual = sampled.map(({ session }) => ({ session: normalize(session), ...snapshotOf(session) }));

    if (process.env.UPDATE_GOLDEN === '1') {
      const body = `[\n${actual.map(entry => JSON.stringify(entry)).join(',\n')}\n]\n`;
      fs.writeFileSync(GOLDEN_PATH, body);
      return;
    }

    const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
    expect(actual.length).toBe(golden.length);
    // Najpierw sama siatka: gdyby generator się zmienił, porównanie wyników nie miałoby sensu.
    expect(actual.map(entry => entry.session)).toEqual(golden.map(entry => entry.session));
    const mismatches = actual
      .map((entry, i) => ({ entry, expected: golden[i] }))
      .filter(({ entry, expected }) => JSON.stringify(entry) !== JSON.stringify(expected))
      .slice(0, 3);
    expect(mismatches).toEqual([]);
  });
});
