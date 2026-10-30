import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AnnualRecapNotice from '../components/attendance/AnnualRecapNotice';

vi.mock('../components/common/Modal', () => ({
  default: ({ title, children, footer, onClose }) => <div role="dialog" aria-label={title}>{children}{footer}<button onClick={onClose}>Zamknij</button></div>,
}));
vi.mock('../components/attendance/WrappedModal', () => ({
  default: ({ stats, onClose }) => <div>Podsumowanie roku {stats.year}<button onClick={onClose}>Zamknij podsumowanie</button></div>,
}));

const session = year => ({ id: `${year}`, datePlayed: `${year}-12-20`, presentPlayers: [], sport: 'pingpong' });
const props = { players: [], enabled: true };

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2027, 0, 1, 12));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('zaproszenie do podsumowania rocznego', () => {
  it('czeka na dane i przewodnik, pokazuje poprzedni rok również po dodaniu nowej sesji', () => {
    const { rerender } = render(<AnnualRecapNotice {...props} history={[]} enabled={false} />);
    rerender(<AnnualRecapNotice {...props} history={[session(2026), session(2027)]} enabled={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<AnnualRecapNotice {...props} history={[session(2026), session(2027)]} />);
    expect(screen.getByRole('dialog', { name: 'Podsumowanie 2026 jest gotowe!' })).toBeInTheDocument();
    expect(screen.getByText(/znajdziesz je w sekcji/i)).toHaveTextContent('Ranking');
    expect(screen.getByText(/znajdziesz je w sekcji/i)).toHaveTextContent('wybierz 2026');
  });

  it('otwiera istniejące podsumowanie, a po ponownym wejściu już nie zaprasza', () => {
    const { unmount } = render(<AnnualRecapNotice {...props} history={[session(2026)]} />);
    fireEvent.click(screen.getByText('Zobacz podsumowanie'));
    expect(screen.getByText('Podsumowanie roku 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Zamknij podsumowanie'));
    unmount();
    render(<AnnualRecapNotice {...props} history={[session(2026)]} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('odłożenie też jest jednorazowe, ale kolejny rok ma własne zaproszenie', () => {
    const { unmount } = render(<AnnualRecapNotice {...props} history={[session(2026)]} />);
    fireEvent.click(screen.getByText('Później'));
    unmount();
    render(<AnnualRecapNotice {...props} history={[session(2026)]} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    vi.setSystemTime(new Date(2028, 0, 1, 12));
    render(<AnnualRecapNotice {...props} history={[session(2027)]} />);
    expect(screen.getByRole('dialog', { name: 'Podsumowanie 2027 jest gotowe!' })).toBeInTheDocument();
  });

  it('nie zaprasza, jeśli w poprzednim roku nie było sesji', () => {
    render(<AnnualRecapNotice {...props} history={[session(2025), session(2027)]} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it('nie wyświetla błędu przy zablokowanym storage i nie ponawia w tej samej stronie', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const { unmount } = render(<AnnualRecapNotice {...props} history={[session(2026)]} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();
    render(<AnnualRecapNotice {...props} history={[session(2026)]} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
