/**
 * TESTY HOOKÓW — API PRZEGLĄDARKI
 *
 * Cel: testowanie hooków, które dotykają API przeglądarki (Notification,
 * localStorage, AudioContext). To jest kategoria testów, która BY ZŁAPAŁA
 * oryginalnego buga — `useState(Notification.permission)` bez sprawdzenia
 * czy API w ogóle istnieje.
 *
 * Każdy test w sekcji "browser API guards" sprawdza, czy hook nie eksploduje
 * gdy odpowiednie API przeglądarki jest niedostępne.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mocki Firebase ──────────────────────────────────────────────────────────
vi.mock('firebase/app',      () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref:         vi.fn(() => ({})),
  set:         vi.fn().mockResolvedValue(undefined),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken:     vi.fn().mockResolvedValue('mock-fcm-token'),
  onMessage:    vi.fn(),
}));
vi.mock('../firebase/config', () => ({ database: {}, dataRef: {} }));

// ════════════════════════════════════════════════════════════════════════════
// usePushNotifications
// Ten hook złapałby oryginalny bug — dostęp do Notification.permission
// bez sprawdzenia czy API istnieje
// ════════════════════════════════════════════════════════════════════════════

describe('usePushNotifications — ochrona przed brakiem API', () => {
  let originalNotification;
  let originalPushManager;

  beforeEach(() => {
    originalNotification = globalThis.Notification;
    originalPushManager  = globalThis.PushManager;
  });

  afterEach(() => {
    // Zawsze przywróć oryginalne API po każdym teście
    if (originalNotification !== undefined) {
      globalThis.Notification = originalNotification;
    } else {
      delete globalThis.Notification;
    }
    if (originalPushManager !== undefined) {
      globalThis.PushManager = originalPushManager;
    } else {
      delete globalThis.PushManager;
    }
  });

  it('🔴 NIE CRASHUJE gdy Notification API jest niedostępne (useState)', async () => {
    // Scenariusz: iOS Safari w trybie przeglądarki (nie PWA).
    // useState(Notification.permission) bez guard exploduje przy inicjalizacji.
    delete globalThis.Notification;

    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    expect(() => renderHook(() => usePushNotifications())).not.toThrow();
  });

  it('🔴 NIE CRASHUJE gdy Notification API jest niedostępne (useEffect)', async () => {
    // Drugi bug: setPermission(Notification.permission) wewnątrz useEffect
    // wykonuje się po zamontowaniu — bez guard też rzucał TypeError na iOS.
    delete globalThis.Notification;

    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    let hook;
    // act() zapewnia że useEffect wykona się przed asercją
    await act(async () => {
      hook = renderHook(() => usePushNotifications());
    });
    // Jeśli doszliśmy tutaj — useEffect nie rzucił wyjątku
    expect(hook.result.current.permission).toBe('default');
    expect(hook.result.current.isSupported).toBe(false);
  });

  it('zwraca permission="default" gdy Notification API jest niedostępne', async () => {
    delete globalThis.Notification;

    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('default');
  });

  it('zwraca isSupported=false gdy brakuje Notification', async () => {
    delete globalThis.Notification;

    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(false);
  });

  it('zwraca isSupported=false gdy brakuje PushManager', async () => {
    delete globalThis.PushManager;

    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(false);
  });

  it('czyta permission gdy Notification API jest dostępne', async () => {
    globalThis.Notification = { permission: 'granted' };
    globalThis.PushManager  = {};

    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('granted');
  });

  it('czyta permission="denied" gdy użytkownik odrzucił', async () => {
    globalThis.Notification = { permission: 'denied' };
    globalThis.PushManager  = {};

    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('denied');
  });

  it('zwraca registerToken jako funkcję', async () => {
    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.registerToken).toBeTypeOf('function');
  });

  it('registerToken zwraca error gdy isSupported=false', async () => {
    delete globalThis.Notification;

    const { usePushNotifications } = await import('../hooks/usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());

    let outcome;
    await act(async () => {
      outcome = await result.current.registerToken('Alice');
    });
    expect(outcome.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// useTheme
// ════════════════════════════════════════════════════════════════════════════

describe('useTheme — localStorage i klasy body', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
  });

  it('domyślnie zwraca motyw "dark"', async () => {
    const { useTheme } = await import('../hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggle przełącza z dark na light', async () => {
    const { useTheme } = await import('../hooks/useTheme');
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
  });

  it('toggle z powrotem na dark', async () => {
    const { useTheme } = await import('../hooks/useTheme');
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
  });

  it('dodaje klasę theme-light do body przy motywie light', async () => {
    const { useTheme } = await import('../hooks/useTheme');
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggle()); // → light
    expect(document.body.classList.contains('theme-light')).toBe(true);
  });

  it('usuwa klasę theme-light przy powrocie do dark', async () => {
    const { useTheme } = await import('../hooks/useTheme');
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggle()); // → light
    act(() => result.current.toggle()); // → dark
    expect(document.body.classList.contains('theme-light')).toBe(false);
  });

  it('zapisuje wybór do localStorage', async () => {
    const { useTheme } = await import('../hooks/useTheme');
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggle()); // → light
    expect(localStorage.getItem('cyber-pong-theme')).toBe('light');
  });

  it('odczytuje zapisany motyw z localStorage', async () => {
    localStorage.setItem('cyber-pong-theme', 'light');
    const { useTheme } = await import('../hooks/useTheme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('nie crashuje gdy localStorage jest niedostępny', async () => {
    // Symulacja przeglądarki z zablokowanym localStorage (prywatne okno, iframe)
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });

    const { useTheme } = await import('../hooks/useTheme');
    expect(() => renderHook(() => useTheme())).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// useDebounce
// ════════════════════════════════════════════════════════════════════════════

describe('useDebounce — opóźnianie wartości', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('zwraca wartość początkową natychmiast', async () => {
    const { useDebounce } = await import('../hooks/useDebounce');
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('nie aktualizuje wartości przed upłynięciem czasu', async () => {
    const { useDebounce } = await import('../hooks/useDebounce');
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });
    expect(result.current).toBe('initial'); // jeszcze nie zmieniona
  });

  it('aktualizuje wartość po upłynięciu czasu', async () => {
    const { useDebounce } = await import('../hooks/useDebounce');
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('changed');
  });

  it('resetuje timer przy kolejnych zmianach (tylko ostatnia się liczy)', async () => {
    const { useDebounce } = await import('../hooks/useDebounce');
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(200)); // łącznie 400ms, ale timer zresetowany
    expect(result.current).toBe('a'); // 'c' jeszcze nie gotowe

    act(() => vi.advanceTimersByTime(100)); // teraz 300ms od ostatniej zmiany
    expect(result.current).toBe('c');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// useUndoTimer
// ════════════════════════════════════════════════════════════════════════════

describe('useUndoTimer — odliczanie i resetowanie', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('undoToast jest null na początku', async () => {
    const { useUndoTimer } = await import('../hooks/useUndoTimer');
    const { result } = renderHook(() => useUndoTimer(5));
    expect(result.current.undoToast).toBeNull();
  });

  it('startUndo ustawia undoToast z payload', async () => {
    const { useUndoTimer } = await import('../hooks/useUndoTimer');
    const { result } = renderHook(() => useUndoTimer(5));

    act(() => result.current.startUndo({ playerName: 'Alice' }));
    expect(result.current.undoToast).not.toBeNull();
    expect(result.current.undoToast.payload.playerName).toBe('Alice');
  });

  it('odlicza sekundy co sekundę', async () => {
    const { useUndoTimer } = await import('../hooks/useUndoTimer');
    const { result } = renderHook(() => useUndoTimer(5));

    act(() => result.current.startUndo({ playerName: 'Bob' }));
    expect(result.current.undoToast.secondsLeft).toBe(5);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.undoToast.secondsLeft).toBe(4);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.undoToast.secondsLeft).toBe(3);
  });

  it('resetuje do null po wygaśnięciu czasu', async () => {
    const { useUndoTimer } = await import('../hooks/useUndoTimer');
    const { result } = renderHook(() => useUndoTimer(3));

    act(() => result.current.startUndo({}));
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.undoToast).toBeNull();
  });

  it('dismissUndo natychmiast resetuje stan', async () => {
    const { useUndoTimer } = await import('../hooks/useUndoTimer');
    const { result } = renderHook(() => useUndoTimer(5));

    act(() => result.current.startUndo({ playerName: 'Carol' }));
    act(() => result.current.dismissUndo());
    expect(result.current.undoToast).toBeNull();
  });

  it('progressPct zaczyna od 100 i spada', async () => {
    const { useUndoTimer } = await import('../hooks/useUndoTimer');
    const { result } = renderHook(() => useUndoTimer(4));

    act(() => result.current.startUndo({}));
    expect(result.current.progressPct).toBe(100);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.progressPct).toBe(75);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.progressPct).toBe(50);
  });

  it('startUndo anuluje poprzedni timer', async () => {
    const { useUndoTimer } = await import('../hooks/useUndoTimer');
    const { result } = renderHook(() => useUndoTimer(5));

    act(() => result.current.startUndo({ playerName: 'Alice' }));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.startUndo({ playerName: 'Bob' })); // nowy timer

    // Nowy timer zaczyna od 5, nie kontynuuje od 3
    expect(result.current.undoToast.secondsLeft).toBe(5);
    expect(result.current.undoToast.payload.playerName).toBe('Bob');
  });
});
