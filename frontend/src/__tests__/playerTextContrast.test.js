import { describe, it, expect } from 'vitest';
import { createPlayerColorMap, TEXT_TINT_PERCENT } from '../constants/colors';

// Tekst gracza to `color-mix(in srgb, <kolor> 62%, var(--co-text-hi))`.
// `--co-text-hi` to #D0E8F5 w ciemnym motywie i #0F172A w jasnym. Test liczy ten
// sam miks i sprawdza kontrast WCAG AA (4,5:1) na powierzchniach obu motywów —
// stała luminancja samego koloru tożsamości tego nie gwarantuje.

const THEMES = {
  dark:  { textHi: '#D0E8F5', surfaces: ['#030508', '#060C12', '#090F18', '#0C1420'] },
  light: { textHi: '#0F172A', surfaces: ['#FFFFFF', '#F8FAFC', '#F1F5F9'] },
};

const hexToRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const luminance = rgb => {
  const [r, g, b] = rgb.map(c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (colorRgb, otherRgb, percent) =>
  colorRgb.map((c, i) => Math.round((c * percent + otherRgb[i] * (100 - percent)) / 100));

describe('kolor tekstu gracza', () => {
  const names = Array.from({ length: 40 }, (_, i) => `Gracz ${i}`);
  const colors = [...createPlayerColorMap(names).values()];

  it('używa miksu z --co-text-hi, a ramka zostaje kolorem tożsamości', () => {
    for (const color of colors) {
      expect(color.text).toBe(`color-mix(in srgb, ${color.border} ${TEXT_TINT_PERCENT}%, var(--co-text-hi))`);
      expect(color.border).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  for (const [theme, { textHi, surfaces }] of Object.entries(THEMES)) {
    it(`daje co najmniej 4,5:1 na powierzchniach motywu ${theme}`, () => {
      for (const color of colors) {
        const text = mix(hexToRgb(color.border), hexToRgb(textHi), TEXT_TINT_PERCENT);
        for (const surface of surfaces) {
          expect(contrast(text, hexToRgb(surface))).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});
