import { describe, it, expect } from 'vitest';
import { CHART_LABEL_SIZE } from '../utils/chart';

/**
 * P-15: automatyczny audyt (axe) nie widzi tekstu SVG pomniejszonego przez
 * skalowanie viewBoxa. Ten test pilnuje podłogi 12 px, a skrypt
 * `npm run audit:a11y` sprawdza resztę typografii w CSS.
 */
describe('typografia wykresów', () => {
  it('etykiety osi nie schodzą poniżej 12 px', () => {
    expect(CHART_LABEL_SIZE).toBeGreaterThanOrEqual(12);
  });
});
