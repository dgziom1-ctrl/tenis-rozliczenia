import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Nawigacja w SPA nie przeładowuje dokumentu, więc bez jawnej pracy:
 *  - użytkownik klawiatury musi móc pominąć nagłówek i pięć zakładek,
 *  - tytuł karty musi mówić, gdzie jesteśmy (WCAG 2.4.2),
 *  - czytnik ekranu musi usłyszeć, że treść się zmieniła.
 * Ten test pilnuje wszystkich trzech rzeczy w jednym miejscu.
 */
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(),
  set: vi.fn(),
  runTransaction: vi.fn(),
  goOffline: vi.fn(),
  goOnline: vi.fn(),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
}));
vi.mock('../lib/firebase/index', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, subscribeToData: vi.fn(() => () => {}) };
});

const { default: Layout } = await import('../app/Layout');
const { ThemeProvider } = await import('../app/providers/ThemeProvider');
const { AppDataProvider } = await import('../app/providers/AppDataProvider');
const { ToastProvider } = await import('../components/common/Toast');
const { APP_NAME } = await import('../app/pageMeta');

function renderLayout(path = '/attendance') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ThemeProvider>
          <AppDataProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/attendance" element={<h1>Ranking</h1>} />
                <Route path="/" element={<h1>Pulpit</h1>} />
              </Route>
            </Routes>
          </AppDataProvider>
        </ThemeProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Layout — nawigacja i dostępność', () => {
  it('zaczyna się od linku pomijającego nawigację', () => {
    const { container } = renderLayout();
    const skip = screen.getByRole('link', { name: 'Przejdź do treści' });
    expect(skip).toHaveAttribute('href', '#main-content');
    // Musi być pierwszym elementem w DOM, żeby Tab trafił w niego od razu.
    expect(container.querySelector('a.skip-link')).toBe(skip);
    expect(container.firstElementChild?.firstElementChild).toBe(skip);
  });

  it('cel skip linku jest oznaczony i osiągalny programowo', () => {
    renderLayout();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('ustawia tytuł dokumentu na nazwę aktywnej zakładki', () => {
    renderLayout('/attendance');
    expect(document.title).toBe(`Ranking · ${APP_NAME}`);
  });

  it('ma region aria-live na zmianę trasy', () => {
    const { container } = renderLayout();
    const announcer = container.querySelector('p[aria-live="polite"]');
    expect(announcer).toBeInTheDocument();
    expect(announcer).toHaveAttribute('role', 'status');
  });
});
