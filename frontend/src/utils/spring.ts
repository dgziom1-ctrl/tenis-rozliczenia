const SPRING_RESPONSE_SECONDS = 0.3;
const SPRING_DAMPING = 0.8;

/** Sprężyna drugiego rzędu — początkowa prędkość pochodzi bezpośrednio z gestu. */
export function springTo({
  from,
  to,
  velocity,
  onUpdate,
  onComplete,
}: {
  from: number;
  to: number;
  velocity: number;
  onUpdate: (value: number) => void;
  onComplete: () => void;
}): () => void {
  const startedAt = performance.now();
  const omega = (2 * Math.PI) / SPRING_RESPONSE_SECONDS;
  const dampedOmega = omega * Math.sqrt(1 - SPRING_DAMPING ** 2);
  const offset = from - to;
  const initialVelocity = velocity * 1000;
  const sineAmplitude = (initialVelocity + SPRING_DAMPING * omega * offset) / dampedOmega;
  let frame = 0;

  const tick = (now: number) => {
    const seconds = (now - startedAt) / 1000;
    const envelope = Math.exp(-SPRING_DAMPING * omega * seconds);
    const wave = offset * Math.cos(dampedOmega * seconds)
      + sineAmplitude * Math.sin(dampedOmega * seconds);
    const current = to + envelope * wave;
    const currentVelocity = envelope * (
      -SPRING_DAMPING * omega * wave
      + (-offset * dampedOmega * Math.sin(dampedOmega * seconds)
        + sineAmplitude * dampedOmega * Math.cos(dampedOmega * seconds))
    );

    onUpdate(current);
    if ((Math.abs(current - to) < 0.5 && Math.abs(currentVelocity) < 5 && seconds > 0.08) || seconds > 1.2) {
      onUpdate(to);
      onComplete();
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
