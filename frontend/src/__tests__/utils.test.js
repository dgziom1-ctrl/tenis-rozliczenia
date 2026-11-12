/**
 * Małe moduły, przez które przechodzi każdy zapis albo każda interakcja:
 * walidacja danych do bazy, trasa z powiadomienia push, schowek (numer BLIK)
 * i wiadomość na grupę po dodaniu sesji.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isValidMoney, isPositiveMoney, isValidISODate,
  normalizePlayerName, normalizePlayerList, MAX_PLAYER_NAME_LENGTH,
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

  it('opisuje sesję: sport w bierniku, datę, wynajem, rakiety i obecnych', () => {
    const msg = buildGroupMessage(session);
    expect(msg.split('\n').slice(0, 3)).toEqual([
      '🎾 Graliśmy w squasha! (25.08.2026)',
      '💰 Wynajem: 100,00 zł + rakiety: 16,00 zł',
      '👥 Obecni (4): Ada, Bartek, Celina, Dawid',
    ]);
  });

  it('stawki w wiadomości to dokładnie stawki z rozliczenia', () => {
    const msg = buildGroupMessage(session);
    const groups = getShareGroups(session);
    const amounts = [...msg.matchAll(/: ([\d,]+) zł\/os\./g)].map(m => parseAmount(m[1]));
    expect(amounts).toEqual(groups.map(g => g.perPerson));
    expect(msg).toContain('⚡🎾 Ada (karta + własna rakietka)');
  });

  it('bez rakiet nie dopisuje ich do kwoty, a nieznany sport traktuje jak ping-pong', () => {
    const msg = buildGroupMessage({
      date: '2026-01-05', sport: 'nieznany', totalCost: 30,
      presentPlayers: ['Ala', 'Bolek'], multisportPlayers: [],
    });
    expect(msg).toContain('🏓 Graliśmy w ping-ponga!');
    expect(msg).toContain('💰 Wynajem: 30,00 zł\n');
    expect(msg).toContain('💳 Bez karty: 15,00 zł/os.');
  });
});
