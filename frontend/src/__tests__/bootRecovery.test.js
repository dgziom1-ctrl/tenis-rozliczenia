/**
 * POMOST DO STRAŻY STARTU
 *
 * `src/utils/bootRecovery.ts` celowo nie ma własnej logiki naprawy — cała siedzi
 * w `public/boot-guard.js`, bo tylko tamten plik działa, gdy paczki aplikacji się
 * nie wczytają. Tu sprawdzamy dwie rzeczy: że pomost naprawdę deleguje i że
 * aplikacja nie wywala się, gdy strażnika nie ma pod ręką.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isStaleBuildError,
  signalAppReady,
  recoverFromStaleBuild,
  hardResetApp,
} from '../utils/bootRecovery';

let bootGuard;

beforeEach(() => {
  bootGuard = {
    ready: vi.fn(),
    heal: vi.fn().mockReturnValue(true),
    hardReset: vi.fn(),
    rescue: vi.fn(),
    isStaleBuildError: vi.fn().mockReturnValue(true),
    stage: vi.fn().mockReturnValue(0),
  };
  window.__cpBoot = bootGuard;
});

afterEach(() => {
  delete window.__cpBoot;
  vi.restoreAllMocks();
});

describe('z dostępnym strażnikiem', () => {
  it('przekazuje rozpoznanie błędu', () => {
    const error = new Error('Failed to fetch dynamically imported module');
    expect(isStaleBuildError(error)).toBe(true);
    expect(bootGuard.isStaleBuildError).toHaveBeenCalledWith(error);
  });

  it('zgłasza udany start', () => {
    signalAppReady();
    expect(bootGuard.ready).toHaveBeenCalled();
  });

  it('uruchamia naprawę z powodem', () => {
    const error = new Error('ChunkLoadError');
    expect(recoverFromStaleBuild(error)).toBe(true);
    expect(bootGuard.heal).toHaveBeenCalledWith(error);
  });

  it('uruchamia pełne czyszczenie', () => {
    hardResetApp();
    expect(bootGuard.hardReset).toHaveBeenCalled();
  });
});

describe('bez strażnika', () => {
  beforeEach(() => {
    delete window.__cpBoot;
  });

  // Gdyby `/boot-guard.js` nie dojechał, aplikacja i tak musi działać —
  // te wywołania nie mogą rzucać.
  it('nie rozpoznaje błędów, ale nie rzuca', () => {
    expect(isStaleBuildError(new Error('ChunkLoadError'))).toBe(false);
    expect(() => signalAppReady()).not.toThrow();
  });

  it('zgłasza brak możliwości naprawy', () => {
    expect(recoverFromStaleBuild(new Error('ChunkLoadError'))).toBe(false);
  });

  it('pełne czyszczenie spada do zwykłego przeładowania', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    hardResetApp();
    expect(reload).toHaveBeenCalled();
  });
});
