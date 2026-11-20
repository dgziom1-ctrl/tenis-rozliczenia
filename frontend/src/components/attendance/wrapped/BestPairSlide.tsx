import { useCountUp } from '@/hooks/useCountUp';
import type { WrappedStats } from '@/types/ui';
import { display, mono } from './styles';

export default function BestPairSlide({ stats }: { stats: WrappedStats }) {
  const pairCount = useCountUp(stats.bestPairCount, 1200);
  return (
    <div style={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>
      <div style={{
        ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: 'normal' }),
        color: 'var(--co-dim)', marginBottom: 28,
      }}>
        Najlepsza para
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 'clamp(12px, 4vw, 28px)', marginBottom: 28,
      }}>
        {stats.bestPair?.map((name, i) => (
          <div key={name} style={{
            ...display('clamp(1.6rem, 6vw, 3rem)'),
            color: i === 0 ? 'var(--co-cyan)' : 'var(--co-green)',
            textShadow: i === 0 ? 'var(--glow-cyan-md)' : 'var(--glow-green-md)',
            animation: `wm-float 3s ease-in-out ${i * 0.5}s 3`,
          }}>
            {name}
          </div>
        ))}
      </div>

      <div style={{
        ...display('clamp(1.2rem, 4vw, 2rem)'),
        color: 'var(--co-text-hi)', marginBottom: 12,
      }}>
        {pairCount} wspólnych sesji
      </div>

      <div style={{
        fontSize: 'clamp(1.4rem, 5vw, 2rem)',
        marginTop: 24,
      }}>
        🤝
      </div>
      <div style={{
        ...mono('clamp(0.6rem, 2vw, 0.8rem)'),
        color: 'var(--co-dim)', marginTop: 8,
      }}>
        Nie do rozdzielenia
      </div>
    </div>
  );
}
