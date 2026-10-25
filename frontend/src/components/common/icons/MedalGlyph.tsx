import { Medal } from 'lucide-react';
import type { CSSProperties } from 'react';

interface MedalGlyphProps {
  /** 1–3 = złoto/srebro/brąz. Każde inne miejsce dostaje brąz. */
  place?: number;
  size?: number;
  style?: CSSProperties;
}

const MEDAL_COLOR: Record<number, string> = {
  1: 'var(--co-gold)',
  2: 'var(--co-silver)',
  3: 'var(--co-bronze)',
};

/**
 * Medal podium jako ikona wektorowa, nie emoji.
 *
 * Emoji medalu ma własną kolorystykę, której nie da się dopasować do tokenów
 * złota/srebra/brązu — a w trybie wysokiego kontrastu i na niektórych
 * systemach zmienia kształt. Ikona bierze kolor z tokenu, więc jest zgodna
 * z obramowaniem karty i z motywem jasnym.
 */
export default function MedalGlyph({ place = 3, size = 18, style }: MedalGlyphProps) {
  return (
    <Medal
      size={size}
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
      style={{ color: MEDAL_COLOR[place] ?? MEDAL_COLOR[3], flexShrink: 0, ...style }}
    />
  );
}
