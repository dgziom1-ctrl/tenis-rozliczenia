// ── Pseudo-barcode (seeded by name) ─────────────────────────────
export function Barcode({ name, color }) {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const code = name.charCodeAt(i % name.length) + i * 7;
    return { width: (code % 3) + 1, gap: (code % 5) === 0 };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: 18, gap: '1px', overflow: 'hidden', opacity: 0.35 }}>
      {bars.map((b, i) => (
        <div key={i} style={{
          width: b.width * 2, flexShrink: 0,
          background: b.gap ? 'transparent' : color,
          opacity: b.gap ? 0 : (0.4 + (i % 3) * 0.2),
        }} />
      ))}
    </div>
  );
}
