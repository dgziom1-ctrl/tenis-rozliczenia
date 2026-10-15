import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnimatedValue } from '../components/dashboard/useAnimatedValue';

function makeFrameQueue() {
  let nextId = 1;
  const callbacks = new Map();
  vi.stubGlobal('requestAnimationFrame', callback => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', id => callbacks.delete(id));

  return timestamp => {
    const current = [...callbacks.values()];
    callbacks.clear();
    act(() => current.forEach(callback => callback(timestamp)));
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useAnimatedValue', () => {
  it('przy prefers-reduced-motion aktualizuje licznik bez pętli rAF', () => {
    const requestAnimationFrame = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));

    const { result, rerender } = renderHook(({ value }) => useAnimatedValue(value), {
      initialProps: { value: 0 },
    });
    rerender({ value: 42 });

    expect(result.current).toBe(42);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('przerywa animację w wartości prezentowanej, bez cofnięcia do starego początku', () => {
    const advanceFrame = makeFrameQueue();
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const { result, rerender } = renderHook(({ value }) => useAnimatedValue(value, 450), {
      initialProps: { value: 0 },
    });

    rerender({ value: 100 });
    advanceFrame(0);
    advanceFrame(180);
    const presentationValue = result.current;
    expect(presentationValue).toBeGreaterThan(0);
    expect(presentationValue).toBeLessThan(100);

    rerender({ value: 200 });
    advanceFrame(0);
    expect(result.current).toBeCloseTo(presentationValue);

    advanceFrame(225);
    expect(result.current).toBeGreaterThan(presentationValue);
    expect(result.current).toBeLessThan(200);

    advanceFrame(450);
    expect(result.current).toBe(200);
  });
});
