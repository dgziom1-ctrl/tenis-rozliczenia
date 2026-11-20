import { Trophy } from 'lucide-react';
import { CLIP, TEXT } from '@/constants/styles';
import type { WrappedStats } from '@/types/ui';
import { display, mono } from './styles';

interface ChampionSlideProps {
  stats: WrappedStats;
  onClose: () => void;
}

export default function ChampionSlide({ stats, onClose }: ChampionSlideProps) {
  const ch = stats.champion;
  if (!ch) return null;
  return (
    <div style={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>
      <div style={{
        ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: 'normal' }),
        color: 'var(--co-dim)', marginBottom: 8,
      }}>
        MISTRZ ROKU {stats.year}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, animation: 'wm-float 3s ease-in-out 3', color: 'var(--co-gold)' }}>
        <Trophy size={68} strokeWidth={1.6} aria-hidden="true" focusable="false" />
      </div>

      <div style={{
        ...display('clamp(2.2rem, 9vw, 5rem)'),
        color: 'var(--co-cyan)',
        textShadow: 'var(--glow-cyan-md)',
        animation: 'wm-glow 2.5s ease-in-out 4',
        marginBottom: 24,
      }}>
        {ch.name}
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10, marginBottom: 28,
      }}>
        {[
          { label: 'Sesje', value: `${ch.attended}`, color: 'var(--co-cyan)' },
          { label: 'Frekwencja', value: `${ch.percentage}%`, color: 'var(--co-green)' },
          { label: 'Najdłuższa seria', value: `${ch.longestStreak}`, color: 'var(--co-pink)' },
        ].map(s => (
          <div key={s.label} style={{
            padding: 'clamp(8px, 2vw, 14px)',
            background: 'var(--co-surface-2)',
            border: '1px solid var(--co-border)',
            clipPath: CLIP.card,
          }}>
            <div style={{ ...display('clamp(1rem, 3.5vw, 1.6rem)'), color: s.color }}>
              {s.value}
            </div>
            <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: 'normal', marginTop: 4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Close button — wspólna klasa zamiast ręcznych handlerów hover,
          które na dotyku zostawały wciśnięte do kolejnego tapnięcia. */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="cyber-button-outline"
        style={{ padding: 'clamp(12px, 2.5vw, 16px) clamp(28px, 8vw, 56px)', minHeight: 44 }}
      >
        Zamknij
      </button>
    </div>
  );
}
