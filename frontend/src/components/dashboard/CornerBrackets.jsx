// ── Corner brackets ──────────────────────────────────────────────
export function CornerBrackets({ color, size = 12, thickness = 1 }) {
  const s = { position: 'absolute', width: size, height: size, pointerEvents: 'none' };
  const b = `${thickness}px solid ${color}`;
  return (
    <>
      <div style={{ ...s, top: -1, left: -1, borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: -1, right: -1, borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: -1, left: -1, borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: -1, right: -1, borderBottom: b, borderRight: b }} />
    </>
  );
}
