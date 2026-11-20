import { Award, Eye, Flame, Ghost, Star, Trophy } from 'lucide-react';
import type { CSSProperties } from 'react';

interface RankGlyphProps {
  rank: { name: string; hex: string };
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}

/**
 * Ikona rangi frekwencji.
 *
 * Rangi miały emoji (🏆 ⭐ 🎖️ 🔥 👀 👻). Emoji nie przyjmuje koloru rangi —
 * a kolor jest tu jedynym nośnikiem progresji (złoto → magenta → fiolet →
 * morski → szarość) — i wygląda inaczej na każdym systemie. Ikona bierze
 * `rank.hex` (token `--rank-*`, osobny dla każdego motywu), więc pasek
 * postępu, nazwa i znacznik mówią tym samym kolorem.
 */
const ICONS: Record<string, typeof Trophy> = {
  LEGENDA: Trophy,
  MISTRZ: Star,
  WETERAN: Award,
  STAŁY: Flame,
  GOŚĆ: Eye,
  DUCH: Ghost,
};

export default function RankGlyph({ rank, size = 16, strokeWidth = 2, style }: RankGlyphProps) {
  const Icon = ICONS[rank.name] ?? Star;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      style={{ color: rank.hex, flexShrink: 0, ...style }}
    />
  );
}
