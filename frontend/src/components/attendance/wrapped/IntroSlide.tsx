import type { WrappedStats } from '@/types/ui';
import { display, mono } from './styles';

export default function IntroSlide({ stats }: { stats: WrappedStats }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        ...display('clamp(5rem, 18vw, 12rem)'),
        color: 'var(--co-cyan)',
        textShadow: 'var(--glow-cyan-md)',
        animation: 'wm-glow 3s ease-in-out 4',
        marginBottom: 16,
      }}>
        {stats.year}
      </div>
      <div style={{
        ...display('clamp(1.2rem, 4vw, 2rem)', { letterSpacing: 'normal' }),
        color: 'var(--co-text-hi)',
        marginBottom: 40,
      }}>
        {stats.year === new Date().getFullYear() ? 'Sezon na żywo' : 'Podsumowanie roku'}
      </div>
      <div style={{
        ...mono('clamp(0.6rem, 2vw, 0.8rem)'),
        color: 'var(--co-dim)',
        animation: 'wm-pulse 2s ease-in-out 5',
      }}>
        Dotknij aby kontynuować →
      </div>
    </div>
  );
}
