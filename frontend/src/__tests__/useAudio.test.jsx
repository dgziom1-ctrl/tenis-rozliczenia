import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { SOUND_TYPES } from '@/constants';
import { useAudio } from '../hooks/useAudio';

let originalVibrate;

afterEach(() => {
  if (originalVibrate === undefined) delete navigator.vibrate;
  else Object.defineProperty(navigator, 'vibrate', { configurable: true, value: originalVibrate });
  originalVibrate = undefined;
  vi.restoreAllMocks();
});

describe('useAudio — haptyka', () => {
  it('nie wibruje dla tapnięć ani zakładek, ale znacząca akcja działa przy wyciszonym audio', () => {
    originalVibrate = navigator.vibrate;
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    const { result } = renderHook(() => useAudio(true));

    act(() => result.current.playSound(SOUND_TYPES.CLICK));
    act(() => result.current.playSound(SOUND_TYPES.TAB));
    expect(vibrate).not.toHaveBeenCalled();

    act(() => result.current.playSound(SOUND_TYPES.COIN));
    expect(vibrate).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledWith([60, 40, 120]);
  });
});
