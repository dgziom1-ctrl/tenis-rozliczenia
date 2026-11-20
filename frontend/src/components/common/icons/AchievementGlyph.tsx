import { Award, Flame, Gamepad2, Gem, Medal, Star, Trophy } from 'lucide-react';

interface AchievementGlyphProps {
  id: string;
  color: string;
  size?: number;
}

/**
 * Ikona odznaki — wybierana po `id`, nie po emoji.
 *
 * Wcześniej każda odznaka niosła emoji w danych (🎮 💎 🏅 🥈 🏆 💠 🔥 ⚡),
 * więc ten sam „Perfekcyjny miesiąc” wyglądał inaczej na Windowsie i iOS,
 * a kolory nie dawały się dopasować do ramki odznaki. `id` jest stabilny,
 * więc mapowanie żyje w jednym miejscu i przetrwa zmianę copy.
 */
export default function AchievementGlyph({ id, color, size = 14 }: AchievementGlyphProps) {
  const Icon = id === 'first_session' ? Gamepad2
    : id.startsWith('perfect_month') ? Gem
      : id.startsWith('streak') ? Flame
        : id === 'sessions_10' ? Award
          : id === 'sessions_25' ? Medal
            : id === 'sessions_50' ? Trophy
              : Star;

  return (
    <Icon
      size={size}
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
      style={{ color, flexShrink: 0 }}
    />
  );
}
