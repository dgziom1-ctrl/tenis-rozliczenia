import { useCountUp } from '@/hooks/useCountUp';
import { plural } from '@/utils/format';
import type { WrappedStats } from '@/types/ui';
import { display, mono } from './styles';

// Skrót miesiąca → pełna nazwa (PL).
const MONTH_FULL: Record<string, string> = {
  STY: 'Styczeń', LUT: 'Luty', MAR: 'Marzec', KWI: 'Kwiecień',
  MAJ: 'Maj', CZE: 'Czerwiec', LIP: 'Lipiec', SIE: 'Sierpień',
  WRZ: 'Wrzesień', PAŹ: 'Październik', LIS: 'Listopad', GRU: 'Grudzień',
};

export default function BusiestMonthSlide({ stats }: { stats: WrappedStats }) {
  const count = useCountUp(stats.busiestMonthCount, 1000);
  return (
    <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
      {/* Busiest month */}
      <div style={{
        ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: 'normal' }),
        color: 'var(--co-dim)', marginBottom: 14,
      }}>
        Najaktywniejszy miesiąc
      </div>
      <div style={{
        ...display('clamp(1.8rem, 7vw, 3.5rem)'),
        color: 'var(--co-cyan)',
        textShadow: 'var(--glow-cyan-md)',
        marginBottom: 8,
      }}>
        {(stats.busiestMonthName && MONTH_FULL[stats.busiestMonthName]) || stats.busiestMonthName}
      </div>
      <div style={{
        ...display('clamp(1.2rem, 4vw, 2rem)', { letterSpacing: 'normal' }),
        color: 'var(--co-text-hi)',
      }}>
        {count} {plural(count, 'sesja', 'sesje', 'sesji')}
      </div>
    </div>
  );
}
