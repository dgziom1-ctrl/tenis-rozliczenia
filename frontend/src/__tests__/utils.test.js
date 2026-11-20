/**
 * Małe moduły, przez które przechodzi każdy zapis albo każda interakcja:
 * walidacja danych do bazy, trasa z powiadomienia push, schowek (numer BLIK)
 * i wiadomość na grupę po dodaniu sesji.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isValidMoney, isPositiveMoney, isValidISODate,
  normalizePlayerName, normalizePlayerList, MAX_PLAYER_NAME_LENGTH, hasForbiddenKeyChars,
} from '../utils/validation';
import { routeFromNotificationUrl } from '../utils/notificationRoute';
import { copyToClipboard } from '../utils/clipboard';
import { buildGroupMessage } from '../utils/message';
import { getShareGroups } from '../utils/sessionCost';
import { parseAmount } from '../utils/format';

describe('walidacja kwot', () => {
  it('przepuszcza zero i zwykłe kwoty, odrzuca NaN, nieskończoność, ujemne i absurdalne', () => {
    expect(isValidMoney(0)).toBe(true);
    expect(isValidMoney(41.5)).toBe(true);
    expect(isValidMoney(100_000)).toBe(true);
    for (const bad of [NaN, Infinity, -0.01, 100_000.01, '10', null, undefined]) {
      expect(isValidMoney(bad)).toBe(false);
    }
  });

  it('wpłata musi być większa od zera', () => {
    expect(isPositiveMoney(0)).toBe(false);
    expect(isPositiveMoney(0.01)).toBe(true);
    expect(isPositiveMoney(-5)).toBe(false);
  });
});

describe('walidacja daty', () => {
  it('przyjmuje istniejące daty, także 29 lutego w roku przestępnym', () => {
    expect(isValidISODate('2025-01-31')).toBe(true);
    expect(isValidISODate('2024-02-29')).toBe(true);
  });

  it('odrzuca daty spoza kalendarza i zły format', () => {
    for (const bad of ['2025-02-29', '2025-04-31', '2025-13-01', '2025-00-10', '2025-1-5', '05.01.2025', '', null, 20250105]) {
      expect(isValidISODate(bad)).toBe(false);
    }
  });
});

describe('nazwy graczy', () => {
  it('przycina spacje i odrzuca puste albo za długie imię', () => {
    expect(normalizePlayerName('  Ala  ')).toBe('Ala');
    expect(normalizePlayerName('   ')).toBeNull();
    expect(normalizePlayerName(42)).toBeNull();
    expect(normalizePlayerName('x'.repeat(MAX_PLAYER_NAME_LENGTH))).toHaveLength(MAX_PLAYER_NAME_LENGTH);
    expect(normalizePlayerName('x'.repeat(MAX_PLAYER_NAME_LENGTH + 1))).toBeNull();
  });

  // Imię jest kluczem w `payments` i `playerJoinDate` — Firebase odrzuca w
  // kluczach `. # $ / [ ]` i znaki sterujące surowym błędem po angielsku.
  it('wykrywa znaki niedozwolone w kluczu Firebase', () => {
    for (const bad of ['Kuba K.', 'A#1', 'Ola$', 'Ala/Ola', '[Ala]', 'Ala\tOla']) {
      expect(hasForbiddenKeyChars(bad)).toBe(true);
    }
    for (const ok of ['Kuba K', 'Łukasz', 'Ana-María', "O'Neil", 'Ala (rezerwa)']) {
      expect(hasForbiddenKeyChars(ok)).toBe(false);
    }
  });

  it('lista bez duplikatów (także po przycięciu), pustych wpisów i nie-tekstów', () => {
    expect(normalizePlayerList(['Ala', ' Ala', null, '', 7, 'Bolek'])).toEqual(['Ala', 'Bolek']);
    expect(normalizePlayerList('Ala')).toEqual([]);
  });
});

describe('trasa z powiadomienia push', () => {
  const route = path => routeFromNotificationUrl(new URL(path, 'https://app.test'));

  it('zamienia zakładkę z adresu na trasę routera', () => {
    expect(route('/?tab=dashboard')).toBe('/');
    expect(route('/?tab=admin')).toBe('/admin');
    expect(route('/?tab=attendance')).toBe('/attendance');
  });

  it('przenosi gracza i bezpiecznie koduje polskie znaki', () => {
    expect(route('/?tab=attendance&player=Ola')).toBe('/attendance?player=Ola');
    expect(route('/?tab=attendance&player=Rafa%C5%82%20K')).toBe('/attendance?player=Rafa%C5%82%20K');
  });

  it('bez znanej zakładki nic nie przekierowuje', () => {
    expect(route('/')).toBeNull();
    expect(route('/?tab=history')).toBeNull();
    expect(route('/?tab=https://evil.test')).toBeNull();
  });
});

describe('copyToClipboard', () => {
  const originalExecCommand = document.execCommand;
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
    document.execCommand = originalExecCommand;
    vi.restoreAllMocks();
  });

  const stubClipboard = writeText => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText },
  });

  it('używa Clipboard API, gdy jest dostępne', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    await expect(copyToClipboard('600 000 000')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('600 000 000');
  });

  it('po odmowie API kopiuje starą metodą i sprząta pole tekstowe', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    document.execCommand = vi.fn(() => true);
    await expect(copyToClipboard('600')).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('nigdy nie rzuca — nieudane kopiowanie to po prostu false', async () => {
    document.execCommand = vi.fn(() => { throw new Error('brak'); });
    await expect(copyToClipboard('600')).resolves.toBe(false);
    await expect(copyToClipboard(undefined)).resolves.toBe(false);
  });
});

describe('wiadomość na grupę', () => {
  const session = {
    date: '2026-08-25',
    sport: 'squash',
    totalCost: 116,
    racketCost: 16,
    presentPlayers: ['Ada', 'Bartek', 'Celina', 'Dawid'],
    multisportPlayers: ['Ada', 'Bartek'],
    ownRacketPlayers: ['Ada'],
  };

  it('opisuje sesję: sport w bierniku, datę, korty i godziny, kort, rakiety i obecnych', () => {
    const msg = buildGroupMessage(session);
    expect(msg.split('\n').slice(0, 4)).toEqual([
      '🎾 Graliśmy w squasha! (25.08.2026)',
      '🕒 Rezerwacja: 1 kort, 1 h',
      '💰 Do rozdzielenia: 100 zł (po zniżkach kart) + rakiety 16 zł',
      '👥 Obecni (4): Ada, Bartek, Celina, Dawid',
    ]);
  });

  it('stawki w wiadomości to dokładnie stawki z rozliczenia', () => {
    const msg = buildGroupMessage(session);
    const groups = getShareGroups(session);
    const amounts = [...msg.matchAll(/: ([\d,]+) zł\/os\./g)].map(m => parseAmount(m[1]));
    expect(amounts).toEqual(groups.map(g => g.perPerson));
    expect(msg).toContain('⚡🎾 Multisport + własna rakietka (Ada)');
  });

  it('bez rakiet nie dopisuje ich do kwoty, a nieznany sport traktuje jak ping-pong', () => {
    const msg = buildGroupMessage({
      date: '2026-01-05', sport: 'nieznany', totalCost: 30,
      presentPlayers: ['Ala', 'Bolek'], multisportPlayers: [],
    });
    expect(msg).toContain('🏓 Graliśmy w ping-ponga! (05.01.2026)\n🕒 Rezerwacja: 1 stół, 1 h');
    expect(msg).toContain('💰 Stół 30 zł\n');
    expect(msg).toContain('💳 Bez karty (Ala, Bolek): 15 zł/os.');
  });

  it('gracz bez karty płaci pełny udział, a rachunek idzie od ceny do kwoty do podziału', () => {
    const arek = {
      date: '2026-11-18', sport: 'badminton', totalCost: 35, courtGross: 80,
      presentPlayers: ['Kamil', 'Przemek', 'Krzysiek', 'Arek'],
      multisportPlayers: ['Kamil', 'Przemek', 'Krzysiek'], singleScanPlayers: ['Przemek'],
      courtCount: 1, durationHours: 1, discountModel: 'perScan',
    };
    expect(buildGroupMessage(arek).split('\n')).toEqual([
      '🏸 Graliśmy w badmintona! (18.11.2026)',
      '🕒 Rezerwacja: 1 kort, 1 h',
      '💰 Kort 80 zł − zwrot za karty 45 zł = 35 zł',
      '👥 Obecni (4): Kamil, Przemek, Krzysiek, Arek',
      '💳 Bez karty (Arek): 20 zł/os.',
      '⚡ Multisport (Kamil, Krzysiek): 5 zł/os.',
      '🎟️ Medicover (Przemek): 5 zł/os.',
    ]);
  });

  it('wiele kortów i godzin odmienia poprawnie', () => {
    const msg = buildGroupMessage({
      date: '2026-11-18', sport: 'padel', totalCost: 100,
      presentPlayers: ['A', 'B'], multisportPlayers: [], courtCount: 2, durationHours: 3,
    });
    expect(msg.split('\n').slice(1, 3)).toEqual(['🕒 Rezerwacja: 2 korty, 3 h', '💰 Korty 100 zł']);
  });

  it('korty i stoły: liczba mnoga w nazwie kosztu i pełna odmiana w rezerwacji', () => {
    const base = { date: '2026-11-18', totalCost: 40, presentPlayers: ['A', 'B'], multisportPlayers: [] };
    const lines = (extra) => buildGroupMessage({ ...base, ...extra }).split('\n').slice(1, 3);
    expect(lines({ sport: 'pingpong', courtCount: 2 })).toEqual(['🕒 Rezerwacja: 2 stoły, 1 h', '💰 Stoły 40 zł']);
    expect(lines({ sport: 'pingpong', courtCount: 1 })).toEqual(['🕒 Rezerwacja: 1 stół, 1 h', '💰 Stół 40 zł']);
    expect(lines({ sport: 'squash', courtCount: 1 })).toEqual(['🕒 Rezerwacja: 1 kort, 1 h', '💰 Kort 40 zł']);
    expect(lines({ sport: 'squash', courtCount: 5 })[0]).toBe('🕒 Rezerwacja: 5 kortów, 1 h');
  });
});

describe('wiadomość na grupę — Multisport i Medicover', () => {
  // Sesja z 18.11.2026, na której wyszło „Cena z kartą” zamiast „Multisport”.
  const session = {
    date: '2026-11-18', sport: 'badminton', totalCost: 50.48, racketCost: 10,
    presentPlayers: ['Kamil', 'Przemek', 'Krzysiek', 'Rafał'],
    multisportPlayers: ['Kamil', 'Przemek', 'Krzysiek', 'Rafał'],
    singleScanPlayers: ['Przemek'], ownRacketPlayers: ['Rafał'],
    courtCount: 1, durationHours: 2, discountModel: 'perScan',
  };

  it('każda grupa nazywa swoją kartę wprost', () => {
    const lines = buildGroupMessage(session).split('\n').slice(4);
    expect(lines).toEqual([
      '⚡ Multisport (Kamil, Krzysiek): 9,71 zł/os.',
      '🎟️ Medicover (Przemek): 24,70 zł/os.',
      '⚡🏸 Multisport + własna rakietka (Rafał): 6,37 zł/os.',
    ]);
    expect(buildGroupMessage(session)).not.toMatch(/z kartą|karta \+/);
  });
});
