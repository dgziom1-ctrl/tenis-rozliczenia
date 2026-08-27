import { render } from '@testing-library/react';
import WrappedModal from '../components/attendance/WrappedModal';
import { WRAPPED_DEMO_STATS } from '../dev/wrappedDemoStats';

describe('WrappedModal render', () => {
  it('renders slide intro text in portal', () => {
    render(<WrappedModal stats={WRAPPED_DEMO_STATS} onClose={() => {}} />);
    const overlay = document.querySelector('.modal-overlay');
    const bare = document.querySelector('.modal-bare-fill');
    expect(overlay).toBeTruthy();
    expect(bare).toBeTruthy();
    expect(document.body.textContent).toContain('2025');
    expect(document.body.textContent).toContain('PODSUMOWANIE ROKU');

    const slideWrap = bare?.querySelector('[style*="wm-fadeScale"]') ?? bare?.children[2];
    const styles = slideWrap instanceof HTMLElement ? getComputedStyle(slideWrap) : null;
    // eslint-disable-next-line no-console
    console.log('slide opacity', styles?.opacity, 'display', styles?.display);
  });
});
