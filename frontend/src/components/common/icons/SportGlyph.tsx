import type { CSSProperties } from 'react';

export type SportGlyphName = 'pingpong' | 'squash' | 'badminton' | 'padel';

interface SportGlyphProps {
  sport?: string;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
  /** Gdy podany, ikona dostaje rolę obrazu i nazwę. Bez niego jest dekoracją. */
  title?: string;
}

/**
 * Ikony dyscyplin rysowane jako wektory.
 *
 * Emoji (🏓 🎾 🏸 🥎) wygląda inaczej na każdym systemie — na Windowsie to
 * kolorowe obrazki, na Androidzie inny zestaw, a w trybie wysokiego
 * kontrastu niektóre znikają. Jeden zestaw ścieżek w stylu Lucide (stroke 1,8,
 * zaokrąglone końce) trzyma spójność z ikonami nawigacji i skaluje się bez
 * rozmycia. Kształty są celowo różne na poziomie sylwetki, nie detalu —
 * muszą być rozpoznawalne przy 12 px, gdzie odróżnienie „rakietka do squasha”
 * od „rakietki do ping-ponga” opiera się tylko na proporcjach:
 *
 *  - ping-pong — okrągłe, szerokie drewno, krótki uchwyt, piłka u góry,
 *  - squash   — długie, wąskie drewno, długi uchwyt, piłka u dołu,
 *  - badminton — lotka (kapsułka + pióra),
 *  - padel    — rakieta bez otworu, z siatką otworów, piłka u góry.
 *
 * Wersja tekstowa (np. w wiadomości do grupy) nadal może używać emoji — tam
 * jest treścią, nie elementem interfejsu.
 */
export default function SportGlyph({
  sport = 'pingpong', size = 16, strokeWidth = 1.8, style, className, title,
}: SportGlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
    className,
    focusable: 'false' as const,
    ...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true }),
  };
  const handleWidth = strokeWidth + 0.8;

  switch (sport) {
    case 'squash':
      return (
        <svg {...common}>
          <ellipse cx="9.6" cy="9.4" rx="4.3" ry="7" transform="rotate(-22 9.6 9.4)" />
          <path d="M12.8 15.6 20 21.2" strokeWidth={handleWidth} />
          <circle cx="5" cy="20.4" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'badminton':
      return (
        <svg {...common}>
          <circle cx="12" cy="17.8" r="2.6" />
          <path d="M10.2 15.8 6.4 4.6M12 15.4V4M13.8 15.8l3.8-11.2" />
          <path d="M6.4 4.6 12 3.4l5.6 1.2" />
        </svg>
      );
    case 'padel':
      return (
        <svg {...common}>
          <path d="M9.6 2.2c4 0 6.6 3.3 6.6 7.7 0 5-3 8.3-6.6 8.3S3 14.9 3 9.9c0-4.4 2.6-7.7 6.6-7.7Z" />
          <path d="M12.4 17 17.6 21.6" strokeWidth={handleWidth} />
          <circle cx="9.6" cy="7.4" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="6.9" cy="10.4" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="12.3" cy="10.4" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="9.6" cy="13.2" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'pingpong':
    default:
      return (
        <svg {...common}>
          <circle cx="9.5" cy="10.5" r="6.4" />
          <path d="M14 15.2 19.4 20.4" strokeWidth={handleWidth} />
          <circle cx="19.6" cy="4.6" r="1.9" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
