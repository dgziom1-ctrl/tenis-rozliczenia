/**
 * Szkielet strony na czas pobierania paczki zakładki: trzy karty szkła o
 * wysokości typowej karty gracza, więc układ nie skacze po wczytaniu.
 * Ruch to tylko `opacity` (`skeleton-pulse`), a przy reduced-motion nie ma go
 * wcale.
 */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div aria-hidden="true" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="glass-card skeleton-card" style={{ height: 132, animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

// Inline spinner — Cold Operator theme. Keyframes `cyber-spin` żyją w index.css.
export function InlineSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  return (
    <span aria-hidden="true" style={{
      display: 'inline-block',
      width: px, height: px,
      border: '1.5px solid var(--co-tint-line)',
      borderTop: '1.5px solid currentColor',
      borderRadius: '50%',
      animation: 'cyber-spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}
