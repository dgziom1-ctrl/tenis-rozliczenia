interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Gdy podany, znak jest obrazem z nazwą. Bez niego jest czystą dekoracją. */
  title?: string;
}

/**
 * Znak marki Cyber-Ponk: stary neonowy obrazek `public/icon-512v3.png`.
 *
 * Wcześniej w tym miejscu było emoji 🏓, a potem wektorowa rakietka. Teraz
 * wszystkie miejsca w interfejsie (ekran startowy, pusty stan, baner PWA)
 * używają dokładnie tego samego pliku co favikona i ikona PWA, więc znak
 * marki jest spójny w całej aplikacji.
 */
export default function BrandMark({ size = 64, className, title }: BrandMarkProps) {
  return (
    <img
      src="/icon-512v3.png"
      width={size}
      height={size}
      className={className}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      decoding="async"
      draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}
