/**
 * Eksport CSV i bezpieczny dostęp do localStorage — moduły wydzielone
 * z komponentów, żeby dało się je sprawdzić bez renderowania widoków.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sanitizeCsvCell, toCsv, buildSessionsCsv, safeFileName, downloadCsv } from '../utils/csv';
import { readStorage, writeStorage, STORAGE_KEYS } from '../utils/storage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('sanitizeCsvCell — ochrona przed CSV injection', () => {
  it.each(['=SUM(A1)', '+1', '-1+2', '@cmd', '  =1+1', '\t=1', '\rx'])(
    '„%s” dostaje apostrof, żeby arkusz nie wykonał formuły',
    (value) => expect(sanitizeCsvCell(value)).toBe(`'${value}`),
  );

  it('zwykły tekst i liczby zostają bez zmian', () => {
    expect(sanitizeCsvCell('Kamil')).toBe('Kamil');
    expect(sanitizeCsvCell(42.5)).toBe('42.5');
    expect(sanitizeCsvCell(null)).toBe('');
    expect(sanitizeCsvCell(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('cytuje każdą komórkę i podwaja cudzysłów w treści', () => {
    expect(toCsv([['a', 'b"c'], [1, null]])).toBe('"a","b""c"\n"1",""');
  });
});

describe('buildSessionsCsv', () => {
  it('ma nagłówek i jeden wiersz na sesję', () => {
    const csv = buildSessionsCsv([{
      id: 'w1', datePlayed: '2026-03-01', sport: 'squash', totalCost: 80,
      costPerPerson: 20, costPerPersonMulti: 5, presentPlayers: ['Ala', '=Ola'],
      multisportPlayers: ['Ala'], racketCost: 10,
    }]);
    const [header, row] = csv.split('\n');

    expect(header).toMatch(/^"Data","Sport"/);
    expect(row).toBe('"2026-03-01","squash","80","10","20.00","5.00","2","Ala; =Ola","Ala"');
  });

  it('imię zaczynające listę od znaku formuły jest neutralizowane', () => {
    const csv = buildSessionsCsv([{
      id: 'w1', datePlayed: '2026-03-01', sport: 'pingpong', totalCost: 0,
      presentPlayers: ['=HYPERLINK("x")'], multisportPlayers: [],
    }]);

    expect(csv.split('\n')[1]).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('safeFileName', () => {
  it('zastępuje znaki niedozwolone w nazwie pliku', () => {
    expect(safeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });
});

describe('downloadCsv', () => {
  it('pobiera plik z BOM i zwalnia adres dopiero po chwili', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadCsv('sesje.csv', '"a"');

    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});

describe('storage — bezpieczny dostęp do localStorage', () => {
  it('zapisuje i odczytuje wartość', () => {
    expect(writeStorage('k', 'v')).toBe(true);
    expect(readStorage('k')).toBe('v');
  });

  it('zablokowany magazyn nie wywraca odczytu ani zapisu', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });

    expect(readStorage('k')).toBeNull();
    expect(writeStorage('k', 'v')).toBe(false);
  });

  it('klucz tokenu push jest zgodny z zapisanym na urządzeniach', () => {
    // Zmiana nazwy osierociłaby rejestracje push zapisane przez starsze wersje.
    expect(STORAGE_KEYS.pushTokenKey).toBe('push-token-key');
  });
});
