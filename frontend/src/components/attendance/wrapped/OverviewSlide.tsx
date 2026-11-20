import SportGlyph from '../../common/icons/SportGlyph';
import { useCountUp } from '@/hooks/useCountUp';
import { TEXT } from '@/constants/styles';
import type { WrappedStats } from '@/types/ui';
import { display, mono, tech } from './styles';

interface SportColumn {
  sport: string;
  label: string;
  color: string;
  count: number;
  /** Ping-pong jest w grupie zawsze; pozostałe sporty tylko, gdy ktoś w nie grał. */
  always?: boolean;
}

/** Jedna kolumna rozbicia na sporty — własny licznik, bo hooków nie wołamy w pętli. */
function SportCount({ sport, label, color, count }: SportColumn) {
  const animated = useCountUp(count, 1200);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color }}>
        <SportGlyph sport={sport} size={30} />
      </div>
      <div style={{ ...tech('clamp(1.2rem, 4vw, 2rem)'), color }}>{animated}</div>
      <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: 'normal' }}>{label}</div>
    </div>
  );
}

export default function OverviewSlide({ stats }: { stats: WrappedStats }) {
  const sessions = useCountUp(stats.totalSessions, 1400);
  const averagePlayers = useCountUp(stats.avgPlayersPerSession, 1000);

  const columns: SportColumn[] = [
    { sport: 'pingpong', label: 'Ping pong', color: 'var(--co-cyan)', count: stats.pingpongSessions, always: true },
    { sport: 'squash', label: 'Squash', color: 'var(--co-green)', count: stats.squashSessions },
    { sport: 'badminton', label: 'Badminton', color: 'var(--co-pink)', count: stats.badmintonSessions },
    { sport: 'padel', label: 'Padel', color: 'var(--co-amber)', count: stats.padelSessions },
  ];

  return (
    <div style={{ textAlign: 'center', maxWidth: 500, width: '100%' }}>
      <div style={{
        ...mono('clamp(0.6rem, 2vw, 0.85rem)', { letterSpacing: 'normal' }),
        color: 'var(--co-dim)', marginBottom: 12,
      }}>
        Razem zagraliśmy
      </div>
      <div style={{
        ...tech('clamp(4rem, 14vw, 8rem)'),
        color: 'var(--co-cyan)',
        textShadow: 'var(--glow-cyan-lg)',
      }}>
        {sessions}
      </div>
      <div style={{
        ...display('clamp(1rem, 3.5vw, 1.6rem)', { letterSpacing: 'normal' }),
        color: 'var(--co-text-hi)', marginBottom: 32,
      }}>
        sesji w {stats.year} roku
      </div>

      {/* Sport breakdown */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 6vw, 48px)', marginBottom: 28 }}>
        {columns.filter(column => column.always || column.count > 0).map(column => (
          <SportCount key={column.sport} {...column} />
        ))}
      </div>

      {/* Avg players */}
      <div style={{ ...mono('clamp(0.65rem, 2vw, 0.85rem)'), color: 'var(--co-text)' }}>
        <span style={{ color: 'var(--co-cyan)', fontWeight: 'bold' }}>{averagePlayers}</span> graczy na sesję
      </div>
    </div>
  );
}
