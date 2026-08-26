/**
 * ODPORNOŚĆ NA UTRATĘ POŁĄCZENIA
 *
 * Scenariusz z życia: telefon bez zasięgu, użytkownik rozlicza gracza, po chwili
 * wraca internet. Wcześniej kończyło się to aplikacją, która nie potrafiła już
 * pobrać danych — zapis porzucony offline zostawiał w SDK wiszącą transakcję
 * blokującą odczyt węzła, a sam SDK nie zauważał powrotu sieci.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { runTransactionMock } = vi.hoisted(() => ({
  runTransactionMock: vi.fn(),
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(),
  set: vi.fn(),
  runTransaction: runTransactionMock,
}));
vi.mock('../lib/firebase/config', () => ({ database: {}, dataRef: {} }));

const { withTransaction } = await import('../lib/firebase/transaction');
const { saveSnapshot, loadSnapshot, clearSnapshot } = await import('../lib/firebase/snapshotCache');
const { clearStaleTransportPreference } = await import('../lib/firebase/transport');

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

/**
 * TRWAŁE ZEJŚCIE BAZY W TRYB OFFLINE
 *
 * SDK Firebase zapisuje `firebase:previous_websocket_failure` w `localStorage`
 * PRZED każdą próbą połączenia WebSocketem („zakładamy porażkę, dopóki nie okaże
 * się inaczej”) i usuwa dopiero po udanym połączeniu. Zniknięcie sieci w trakcie
 * łączenia zostawiało tę flagę na stałe, a przy kolejnym starcie SDK wybierało
 * długie odpytywanie — które działa przez wstrzykiwanie znaczników `<script>`
 * z hostów Firebase i było blokowane przez naszą politykę bezpieczeństwa.
 *
 * Efekt: aplikacja wpadała w tryb offline i nie wychodziła z niego nawet po
 * zamknięciu. Pomagało tylko wyczyszczenie danych przeglądarki, bo usuwało flagę.
 */
describe('transport bazy', () => {
  it('kasuje zapisaną informację o nieudanym WebSockecie', () => {
    localStorage.setItem('firebase:previous_websocket_failure', 'true');

    clearStaleTransportPreference();

    expect(localStorage.getItem('firebase:previous_websocket_failure')).toBeNull();
  });

  it('nie rusza pozostałych wpisów Firebase', () => {
    localStorage.setItem('firebase:host:tenis', 'jakis-host');

    clearStaleTransportPreference();

    expect(localStorage.getItem('firebase:host:tenis')).toBe('jakis-host');
  });

  it('brak magazynu nie wywraca startu', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => clearStaleTransportPreference()).not.toThrow();
  });

  /**
   * Wymóg niewidoczny w kodzie aplikacji, dlatego pilnowany testem. Gdy SDK
   * przełączy się na długie odpytywanie (samo, albo bo `localStorage` jest
   * niedostępny w trybie prywatnym), ładuje dane znacznikami `<script>` z hostów
   * Firebase. Bez nich w `script-src` przeglądarka je blokuje i baza nie łączy się
   * już nigdy — a to jest awaria nie do naprawienia z wnętrza aplikacji.
   */
  it('polityka bezpieczeństwa dopuszcza skrypty z hostów Firebase', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const config = JSON.parse(fs.readFileSync(
      path.resolve(import.meta.dirname, '../../../firebase.json'), 'utf8',
    ));
    const csp = config.hosting.headers
      .flatMap((rule) => rule.headers)
      .find((header) => header.key === 'Content-Security-Policy').value;

    const scriptSrc = csp.split(';').map(s => s.trim()).find(s => s.startsWith('script-src'));

    expect(scriptSrc).toContain('https://*.firebasedatabase.app');
    expect(scriptSrc).toContain('https://*.firebaseio.com');
  });
});

/**
 * Aplikacja nie ma prawa sama zamykać połączenia z bazą.
 *
 * Ten test istnieje po konkretnej awarii. Był tu nadzór, który przy braku
 * połączenia wołał `goOffline` + `goOnline`, żeby obudzić SDK po powrocie sieci.
 * Przy starcie połączenia jeszcze nie ma, więc uruchamiał się natychmiast i
 * przerywał SDK dokładnie w chwili uzgadniania łącza — a ponawiany co kilka
 * sekund nie dawał mu nigdy dojść do końca. Apka przestała się łączyć na każdym
 * urządzeniu, również po wyczyszczeniu danych i w trybie prywatnym.
 *
 * Gdyby ktoś kiedyś chciał wrócić do tego pomysłu: wolno to zrobić najwyżej po
 * długiej karencji od startu i tylko wtedy, gdy połączenie wcześniej działało.
 */
describe('nietykalność połączenia', () => {
  it('kod aplikacji nigdzie nie zamyka połączenia z bazą', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const sources = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !full.includes('__tests__')) {
          sources.push([full, fs.readFileSync(full, 'utf8')]);
        }
      }
    })(path.resolve(import.meta.dirname, '..'));

    // Szukamy wywołania, nie samej nazwy: komentarz w `AppDataProvider`
    // celowo opisuje, dlaczego tego nie robimy.
    const offenders = sources
      .filter(([, code]) => /\bgoOffline\s*\(/.test(code))
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });
});
