import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PAGE_META, APP_NAME } from '../app/pageMeta';
import { TAB_PATHS } from '../constants';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Regresja: router działa po stronie klienta, więc bez tych wpisów wszystkie
 * zakładki miały tytuł „Cyber Ponk”, a czytnik ekranu nie wiedział, gdzie jest.
 */
describe('pageMeta', () => {
  it('ma tytuł dla każdej zakładki z TAB_PATHS', () => {
    for (const tab of Object.keys(TAB_PATHS)) {
      expect(PAGE_META[tab], `brak meta dla zakładki ${tab}`).toBeDefined();
      expect(PAGE_META[tab].title.length).toBeGreaterThan(0);
      expect(PAGE_META[tab].announced.length).toBeGreaterThan(0);
    }
  });

  it('nie powtarza tytułu między zakładkami', () => {
    const titles = Object.values(PAGE_META).map(meta => meta.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('ustawia tytuł dokumentu z nazwą produktu', () => {
    const { result } = renderHook(() => usePageTitle(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/attendance']}>{children}</MemoryRouter>,
    });

    expect(result.current.title).toBe('Ranking');
    expect(document.title).toBe(`Ranking · ${APP_NAME}`);
  });

  it('nieznana trasa wraca do pulpitu zamiast pustego tytułu', () => {
    const { result } = renderHook(() => usePageTitle(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/nie-ma-takiej']}>{children}</MemoryRouter>,
    });

    expect(result.current.title).toBe('Pulpit');
  });
});
