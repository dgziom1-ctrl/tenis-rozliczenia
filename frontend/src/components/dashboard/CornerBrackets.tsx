import type { CSSProperties } from 'react';

interface CornerBracketsProps {
  color: string;
  size?: number;
  thickness?: number;
  /** Odsunięcie od krawędzi rodzica — dla nakładek pełnoekranowych. */
  inset?: number;
}

// ── Corner brackets ──────────────────────────────────────────────
export function CornerBrackets({ color, size = 12, thickness = 1, inset = -1 }: CornerBracketsProps) {
  const s: CSSProperties = { position: 'absolute', width: size, height: size, pointerEvents: 'none' };
  const b = `${thickness}px solid ${color}`;
  return (
    <>
      <div aria-hidden="true" style={{ ...s, top: inset, left: inset, borderTop: b, borderLeft: b }} />
      <div aria-hidden="true" style={{ ...s, top: inset, right: inset, borderTop: b, borderRight: b }} />
      <div aria-hidden="true" style={{ ...s, bottom: inset, left: inset, borderBottom: b, borderLeft: b }} />
      <div aria-hidden="true" style={{ ...s, bottom: inset, right: inset, borderBottom: b, borderRight: b }} />
    </>
  );
}
