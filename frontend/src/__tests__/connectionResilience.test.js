/**
 * ODPORNOŚĆ NA UTRATĘ POŁĄCZENIA
 *
 * Scenariusz z życia: telefon bez zasięgu, użytkownik rozlicza gracza, po chwili
 * wraca internet. Wcześniej kończyło się to aplikacją, która nie potrafiła już
 * pobrać danych — zapis porzucony offline zostawiał w SDK wiszącą transakcję
 * blokującą odczyt węzła, a sam SDK nie zauważał powrotu sieci.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { runTransactionMock, goOfflineMock, goOnlineMock } = vi.hoisted(() => ({
  runTransactionMock: vi.fn(),
  goOfflineMock: vi.fn(),
  goOnlineMock: vi.fn(),
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(),
  set: vi.fn(),
  runTransaction: runTransactionMock,
  goOffline: goOfflineMock,
  goOnline: goOnlineMock,
}));
vi.mock('../lib/firebase/config', () => ({ database: {}, dataRef: {} }));

const { withTransaction } = await import('../lib/firebase/transaction');
const { saveSnapshot, loadSnapshot, clearSnapshot } = await import('../lib/firebase/snapshotCache');
const { forceReconnect, resetReconnectCooldown } = await import('../lib/firebase/connection');

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

const SAMPLE = {
  players: ['Krzysiek', 'Kamil'],
  weeks: [{ id: 'w1', date: '2026-08-01', cost: 40, present: ['Krzysiek'] }],
  defaultMultiPlayers: [],
  playerJoinDate: {},
  deletedPlayers: [],
  payments: { Krzysiek: [{ id: 'p1', amount: 20, date: '2026-08-02' }] },
};

beforeEach(() => {
  localStorage.clear();
  runTransactionMock.mockReset();
  goOfflineMock.mockReset();
  goOnlineMock.mockReset();
  resetReconnectCooldown();
  setOnline(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('zapis bez sieci', () => {
  /**
   * Sedno usterki. `runTransaction` wywołane offline nigdy się nie kończy, ale
   * zostaje w SDK jako transakcja oczekująca — a dopóki wisi, Firebase wstrzymuje
   * dla tego węzła dane z serwera. Po powrocie internetu aplikacja nie dostawała
   * już nic i zostawała na pustym ekranie.
   */
  it('nie zaczyna transakcji, gdy urządzenie jest offline', async () => {
    setOnline(false);

    const result = await withTransaction((current) => current, 'Nie udało się');

    expect(runTransactionMock).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/brak połączenia/i);
  });

  it('z siecią zapisuje normalnie', async () => {
    runTransactionMock.mockResolvedValue(undefined);

    const result = await withTransaction((current) => ({ ...current, ok: true }), 'Nie udało się');

    expect(runTransactionMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  // Odmowa musi być jednoznaczna: użytkownik ma wiedzieć, że wpłata NIE została
  // zapisana, a nie zgadywać, czy może doszła.
  it('odmowa nie jest oznaczana jako wynik niepewny', async () => {
    setOnline(false);

    const result = await withTransaction((current) => current, 'Nie udało się');

    expect(result.indeterminate).toBeUndefined();
  });
});

describe('pamięć ostatnich danych', () => {
  // Bez tego każde uruchomienie bez sieci pokazuje puste listy i wygląda
  // na zepsutą aplikację.
  it('zapamiętuje i odtwarza stan', () => {
    saveSnapshot(SAMPLE);

    expect(loadSnapshot()).toEqual(SAMPLE);
  });

  it('bez zapisanego stanu zwraca null', () => {
    expect(loadSnapshot()).toBeNull();
  });

  it('czyszczenie usuwa zapamiętany stan', () => {
    saveSnapshot(SAMPLE);
    clearSnapshot();

    expect(loadSnapshot()).toBeNull();
  });

  // Uszkodzony wpis nie może stać się nowym sposobem na zepsucie startu —
  // dokładnie tego rodzaju awarię naprawia cała reszta tej zmiany.
  it('odrzuca uszkodzony wpis zamiast rzucać', () => {
    localStorage.setItem('cyber-ponk-data-snapshot', '{to nie jest json');

    expect(() => loadSnapshot()).not.toThrow();
    expect(loadSnapshot()).toBeNull();
  });

  it('odrzuca wpis o nieznanym kształcie', () => {
    localStorage.setItem('cyber-ponk-data-snapshot', JSON.stringify({ version: 1, data: { players: 'nie tablica' } }));

    expect(loadSnapshot()).toBeNull();
  });

  // Po wdrożeniu zmieniającym kształt danych stary wpis musi zostać zignorowany,
  // a nie wczytany do kodu, który spodziewa się czegoś innego.
  it('odrzuca wpis z poprzedniej wersji schematu', () => {
    localStorage.setItem('cyber-ponk-data-snapshot', JSON.stringify({ version: 0, data: SAMPLE }));

    expect(loadSnapshot()).toBeNull();
  });

  it('brak dostępu do magazynu nie wywraca zapisu', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveSnapshot(SAMPLE)).not.toThrow();
  });
});

describe('wznawianie połączenia', () => {
  /**
   * SDK Firebase ponawia próby z coraz dłuższym odstępem i nie słucha zdarzeń
   * sieciowych przeglądarki. Po przełączeniu internetu w telefonie potrafi czekać
   * kilkadziesiąt sekund, mimo że sieć już działa.
   */
  it('zamyka i otwiera połączenie od nowa', () => {
    expect(forceReconnect()).toBe(true);

    expect(goOfflineMock).toHaveBeenCalledTimes(1);
    expect(goOnlineMock).toHaveBeenCalledTimes(1);
  });

  // Nadzór woła to co kilka sekund i przy każdym zdarzeniu sieciowym — bez
  // odstępu zrywalibyśmy własne, właśnie nawiązywane połączenie.
  it('nie zrywa połączenia częściej niż co kilka sekund', () => {
    forceReconnect();

    expect(forceReconnect()).toBe(false);
    expect(goOfflineMock).toHaveBeenCalledTimes(1);
  });

  // Nadzór woła to z efektu Reacta — wyjątek stąd wywróciłby cały interfejs.
  it('błąd SDK nie wywraca aplikacji', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    goOfflineMock.mockImplementation(() => { throw new Error('SDK padło'); });

    let result;
    expect(() => { result = forceReconnect(); }).not.toThrow();
    expect(result).toBe(false);
  });
});
