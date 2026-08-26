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
