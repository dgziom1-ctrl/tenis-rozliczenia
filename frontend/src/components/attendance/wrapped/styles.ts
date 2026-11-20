import type { CSSProperties } from 'react';
import { FONT } from '@/constants/styles';

// Cienkie nakładki na wspólne tokeny — slajdy mają wspólny rytm wysokości linii.
export const display = (size: string, extra?: CSSProperties): CSSProperties => ({
  ...FONT.display(size), lineHeight: 1.1, ...extra,
});
export const mono = (size: string, extra?: CSSProperties): CSSProperties => ({
  ...FONT.mono(size), ...extra,
});
/** Wielkie liczby w HUD-zie — pochyły, ostry krój do danych. */
export const tech = (size: string, extra?: CSSProperties): CSSProperties => ({
  ...FONT.tech(size, 700), lineHeight: 1, ...extra,
});
