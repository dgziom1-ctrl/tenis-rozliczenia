import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_PALETTE = ['#00E5FF', '#00FF88', '#FF2090', '#B8860B', '#9B4DE0'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

interface ConfettiBurstProps {
  /** Środek wybuchu w ułamku okna (0–1). */
  origin?: { x: number; y: number };
  palette?: string[];
  durationMs?: number;
  onDone?: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Neonowe cząsteczki na pełnym ekranie. Nie przechwytuje kliknięć —
 * celebracja nie może zablokować cofnięcia wpłaty ani kopiowania na grupę.
 */
export default function ConfettiBurst({
  origin = { x: 0.5, y: 0.28 },
  palette = DEFAULT_PALETTE,
  durationMs = 1600,
  onDone,
}: ConfettiBurstProps) {
  const paletteRef = useRef(palette);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    paletteRef.current = palette;
    onDoneRef.current = onDone;
  }, [palette, onDone]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      onDoneRef.current?.();
      return undefined;
    }

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onDoneRef.current?.();
      return undefined;
    }

    const colors = paletteRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ox = window.innerWidth * origin.x;
    const oy = window.innerHeight * origin.y;
    const particles: Particle[] = Array.from({ length: 72 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 72 + Math.random() * 0.4;
      const speed = 3.2 + Math.random() * 5.5;
      return {
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.2,
        life: 1,
        max: 0.7 + Math.random() * 0.5,
        size: 2 + Math.random() * 3.5,
        color: colors[i % colors.length],
      };
    });

    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.992;
        p.life -= 0.012;
        if (p.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x, p.y, p.size, p.size * 1.4);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (now - started < durationMs) raf = requestAnimationFrame(tick);
      else onDoneRef.current?.();
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [origin.x, origin.y, durationMs]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      className="confetti-layer"
      aria-hidden="true"
    />,
    document.body,
  );
}
