import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Nawigacja w SPA nie przeładowuje dokumentu, więc bez jawnej pracy:
 *  - tytuł karty musi mówić, gdzie jesteśmy (WCAG 2.4.2),
 *  - czytnik ekranu musi usłyszeć, że treść się zmieniła,
 *  - `<main>` musi istnieć jako punkt odniesienia dla nawigacji po nagłówkach.
 * Ten test pilnuje tych trzech rzeczy w jednym miejscu.
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
  it('ma landmark <main> na treść zakładki', () => {
    renderLayout();
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toContainElement(screen.getByRole('heading', { name: 'Ranking' }));
  });

  // Skip link był tu wcześniej, ale został usunięty decyzją produktową:
  // nawigacja ma pięć pozycji, a link przykrywał nagłówek po Tabie.
  // Ten test pilnuje, że nie wróci przez przypadek.
  it('nie renderuje linku „Przejdź do treści”', () => {
    renderLayout();
    expect(screen.queryByRole('link', { name: /przejdź do treści/i })).toBeNull();
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
