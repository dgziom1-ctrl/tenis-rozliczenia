// Siatka konfiguracji sesji do testów charakteryzujących silnik rozliczeń.
//
// Cel: jedno, deterministyczne źródło „wszystkich sensownych" sesji, na którym
// porównujemy (a) aplikację z Cloud Functions, (b) niezmienniki pieniężne i
// (c) zapisane wyniki sprzed refaktoru. Siatka nie zależy od silnika —
// kwoty `courtGross` to stałe przesunięcia względem kwoty kortu, a nie wynik
// `getExpectedRefund`, żeby zmiana silnika nie mogła po cichu zmienić samej siatki.

const NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

const SPORTS = ['pingpong', 'squash', 'badminton', 'padel'];

/** Pary [korty, godziny]; `undefined` = stara sesja bez konfiguracji (brak limitów). */
const UNITS = [
  [undefined, undefined],
  [1, 1], [1, 2], [1, 3],
  [2, 1], [2, 2],
  [3, 1], [3, 3],
  [1, undefined],
  [undefined, 2],
];

/** Zasada podziału zniżek: `undefined` = dawna zasada, `'perScan'` = nowa. */
const MODELS = [undefined, 'perScan'];

/** Przesunięcia ceny przed zwrotem względem kwoty kortu (zł); `undefined` = brak pola. */
const GROSS_OFFSETS = [undefined, 0, 15, 40.5, -1];

/** Kwoty kortu po zwrocie (zł): zero, grosz na granicy zaokrąglenia, kwota z resztą i duża. */
const NETS = [0, 1.005, 97.33, 170.96];

const LAYOUTS = [
  { players: 0, cards: 0, single: 0 },
  { players: 1, cards: 0, single: 0 },
  { players: 1, cards: 1, single: 0 },
  { players: 2, cards: 1, single: 0 },
  { players: 2, cards: 2, single: 2 },
  { players: 3, cards: 0, single: 0 },
  { players: 3, cards: 3, single: 0 },
  { players: 4, cards: 2, single: 1 },
  { players: 4, cards: 4, single: 1 },
  { players: 5, cards: 3, single: 2 },
  { players: 5, cards: 5, single: 0 },
  { players: 6, cards: 3, single: 0 },
  { players: 6, cards: 5, single: 1 },
  { players: 6, cards: 6, single: 2 },
  // Powyżej sześciu graczy pula zniżek (n × 15 zł) przestaje dzielić się przez
  // liczbę odbijających bez reszty — dopiero tu działa rozdawanie groszy resztą.
  { players: 7, cards: 7, single: 0 },
  { players: 7, cards: 5, single: 2 },
  { players: 8, cards: 7, single: 3 },
  { players: 9, cards: 9, single: 3 },
  { players: 11, cards: 11, single: 0 },
];

const RACKETS = [
  { cost: 0, own: () => [] },
  { cost: 10, own: present => present.slice(0, 1) },
  { cost: 15, own: present => present },
];

/** Karty i Medicover bierzemy od początku albo od końca listy — od kolejności zależy, kto dostanie resztę groszy. */
const ORDERS = ['first', 'last'];

function pick(list, count, order) {
  return order === 'first' ? list.slice(0, count) : list.slice(list.length - count);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Jedna sesja w kształcie z bazy (`present` / `multiPlayers` / `cost`). */
function buildSession({ sport, units, model, grossOffset, layout, order, racket, net }) {
  const present = NAMES.slice(0, layout.players);
  const multiPlayers = pick(present, layout.cards, order);
  const singleScanPlayers = pick(multiPlayers, layout.single, order);
  const ownRacketPlayers = racket.cost > 0 ? racket.own(present) : [];
  const [courtCount, durationHours] = units;

  return {
    sport,
    cost: round2(net + racket.cost),
    present,
    multiPlayers,
    ...(singleScanPlayers.length > 0 ? { singleScanPlayers } : {}),
    ...(racket.cost > 0 ? { racketCost: racket.cost } : {}),
    ...(ownRacketPlayers.length > 0 ? { ownRacketPlayers } : {}),
    ...(courtCount !== undefined ? { courtCount } : {}),
    ...(durationHours !== undefined ? { durationHours } : {}),
    ...(model ? { discountModel: model } : {}),
    ...(grossOffset !== undefined ? { courtGross: round2(net + grossOffset) } : {}),
  };
}

/** Ten sam rekord w kształcie wpisu historii zbudowanego dla UI. */
export function toUiShape(session) {
  const { present, multiPlayers, cost, ...rest } = session;
  return { ...rest, presentPlayers: present, multisportPlayers: multiPlayers, totalCost: cost };
}

/** Argumenty `buildGroupMessage` dla sesji z siatki. */
export function messageParams(session) {
  return {
    date: '2025-03-14',
    totalCost: session.cost,
    presentPlayers: session.present,
    multisportPlayers: session.multiPlayers,
    sport: session.sport,
    racketCost: session.racketCost,
    ownRacketPlayers: session.ownRacketPlayers,
    courtCount: session.courtCount,
    durationHours: session.durationHours,
    singleScanPlayers: session.singleScanPlayers,
    discountModel: session.discountModel,
    courtGross: session.courtGross,
  };
}

/**
 * Cała siatka. Dublujące się sesje (np. karty „od końca" przy kartach u
 * wszystkich) są pomijane, żeby nie liczyć tego samego dwa razy.
 */
export function buildGrid() {
  const seen = new Set();
  const grid = [];

  for (const sport of SPORTS) {
    for (const units of UNITS) {
      for (const model of MODELS) {
        // Cena przed zwrotem ma sens tylko przy nowej zasadzie.
        const grossOffsets = model === 'perScan' ? GROSS_OFFSETS : [undefined];
        for (const grossOffset of grossOffsets) {
          for (const layout of LAYOUTS) {
            for (const order of ORDERS) {
              for (const racket of RACKETS) {
                for (const net of NETS) {
                  const session = buildSession({ sport, units, model, grossOffset, layout, order, racket, net });
                  const key = JSON.stringify(session);
                  if (seen.has(key)) continue;
                  seen.add(key);
                  grid.push(session);
                }
              }
            }
          }
        }
      }
    }
  }

  return grid;
}

/** Deterministyczna, równomierna próbka (~1 na 211) — do złotego pliku. */
export function isGoldenSample(index) {
  return ((index * 2654435761) >>> 0) % 211 === 0;
}

/**
 * Sprowadza wynik do postaci, która przeżywa JSON: `Infinity`, `NaN` i `-0`
 * zwykły `JSON.stringify` zamienia na `null` albo `0`, a to są różne wartości.
 */
export function normalize(value) {
  return JSON.parse(JSON.stringify(value, (_key, x) => {
    if (x === Infinity) return '__Infinity__';
    if (x === -Infinity) return '__-Infinity__';
    if (typeof x === 'number' && Number.isNaN(x)) return '__NaN__';
    if (Object.is(x, -0)) return '__-0__';
    return x;
  }));
}
