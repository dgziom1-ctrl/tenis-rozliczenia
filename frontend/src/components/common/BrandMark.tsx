import { useId } from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Gdy podany, znak jest obrazem z nazwą. Bez niego jest czystą dekoracją. */
  title?: string;
}

/**
 * Znak marki Cyber-Ponk: rakietka z piłką na szklanej płytce.
 *
 * Wcześniej w tym miejscu było emoji 🏓 — w favikonie, na ekranie startowym
 * i w pustym stanie. Emoji zależy od fontu systemowego (na Windowsie wygląda
 * jak inny sport niż na iOS), nie da się go pokolorować tokenem i rozpada się
 * w wysokim kontraście. Ten sam kształt jest w `public/brand-mark.svg`
 * (favikona), więc karta przeglądarki i ekran startowy mówią jednym głosem.
 */
export default function BrandMark({ size = 64, className, title }: BrandMarkProps) {
  // Znak może wystąpić na ekranie kilka razy (np. ekran startowy i baner PWA).
  // Wspólne `id` gradientów są wtedy zduplikowane w dokumencie — przeglądarka
  // użyje pierwszego, ale to niepoprawny HTML i psuje się przy testach a11y.
  const uid = useId().replace(/:/g, '');
  const plateId = `brand-plate-${uid}`;
  const rimId = `brand-rim-${uid}`;
  const bladeId = `brand-blade-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      focusable="false"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      <defs>
        <linearGradient id={bladeId} x1="18" y1="16" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5CF2FF" />
          <stop offset="1" stopColor="#00B4D8" />
        </linearGradient>
        <linearGradient id={plateId} x1="32" y1="2" x2="32" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B1A28" />
          <stop offset="1" stopColor="#050B12" />
        </linearGradient>
        <linearGradient id={rimId} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E5FF" />
          <stop offset="1" stopColor="#0083A0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${plateId})`} />
      <rect x="2.8" y="2.8" width="58.4" height="58.4" rx="14.4" fill="none" stroke={`url(#${rimId})`} strokeWidth="1.6" />
      <g transform="translate(28,30) rotate(-25)">
        <ellipse cx="0" cy="-8" rx="15.5" ry="17.5" fill={`url(#${bladeId})`} />
        <ellipse cx="0" cy="-8" rx="9.5" ry="11" fill="#07131C" opacity="0.85" />
        <rect x="-4.2" y="8" width="8.4" height="21" rx="4.2" fill="#BEF5FF" />
      </g>
      <circle cx="46.5" cy="18" r="5.4" fill="#FF2090" />
      <circle cx="44.8" cy="16.4" r="1.5" fill="#FFD6E8" opacity="0.8" />
    </svg>
  );
}
