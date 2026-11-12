import { render } from '@testing-library/react';
import WrappedModal from '../components/attendance/WrappedModal';
import { WRAPPED_DEMO_STATS } from './fixtures/wrappedDemoStats';

describe('WrappedModal render', () => {
  it('renderuje pierwszy slajd w portalu pełnoekranowego okna', () => {
    render(<WrappedModal stats={WRAPPED_DEMO_STATS} onClose={() => {}} />);
    expect(document.querySelector('.modal-overlay')).toBeTruthy();
    expect(document.querySelector('.modal-bare-fill')).toBeTruthy();
    expect(document.body.textContent).toContain('2025');
    expect(document.body.textContent).toMatch(/podsumowanie roku/i);
  });
});
