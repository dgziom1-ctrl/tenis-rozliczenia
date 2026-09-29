/**
 * Baner „Brak połączenia” nie może mrugać przy starcie aplikacji: łącze z bazą
 * zestawia się dopiero po chwili, więc flaga „offline” pojawia się dopiero po
 * utrzymaniu się przez zadany czas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettledFlag } from '../hooks/useSettledFlag';

describe('useSettledFlag', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('nie zapala flagi od razu', () => {
    const { result } = renderHook(() => useSettledFlag(true, 4000));
    expect(result.current).toBe(false);
  });

  it('zapala flagę po upływie zwłoki', () => {
    const { result } = renderHook(() => useSettledFlag(true, 4000));
    act(() => { vi.advanceTimersByTime(4000); });
    expect(result.current).toBe(true);
  });

  it('krótki brak połączenia na starcie nie zapala flagi', () => {
    const { result, rerender } = renderHook(({ a }) => useSettledFlag(a, 4000), {
      initialProps: { a: true },
    });
    act(() => { vi.advanceTimersByTime(1500); });
    rerender({ a: false });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current).toBe(false);
  });

  it('gasi flagę natychmiast po powrocie połączenia', () => {
    const { result, rerender } = renderHook(({ a }) => useSettledFlag(a, 4000), {
      initialProps: { a: true },
    });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(result.current).toBe(true);
    rerender({ a: false });
    expect(result.current).toBe(false);
  });
});
