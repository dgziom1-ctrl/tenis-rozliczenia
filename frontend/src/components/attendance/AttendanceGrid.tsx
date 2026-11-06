import { useMemo } from 'react';
import { FONT, TEXT, TRACK } from '@/constants/styles';
import { formatDate } from '@/utils/format';
import { buildAttendanceGrid, type GridCell } from '@/utils/attendanceGrid';
import type { HistoryEntry, PlayerColor } from '@/types/ui';

interface AttendanceGridProps {
  history: HistoryEntry[];
  playerName: string;
  color: PlayerColor;
  weeks?: number;
}

// ─── Grid frekwencji ──────────────────────────────────────────────
export default function AttendanceGrid({ history, playerName, color, weeks = 20 }: AttendanceGridProps) {
  const cells = useMemo(() => buildAttendanceGrid(history, playerName, weeks), [history, playerName, weeks]);
  if (cells.length === 0) return null;

  const present = cells.filter(c => c.state === 'present').length;
  const missed = cells.filter(c => c.state === 'missed').length;

  const fill = (c: GridCell) =>
    c.state === 'present' ? color.border
      : c.state === 'missed' ? 'var(--co-dim)'
        : 'var(--co-border)';

  return (
    <div style={{ padding: '10px 16px', borderBottom: `1px solid ${color.border}15` }}>
      <p style={{ ...FONT.monoLabel, marginBottom: 8 }}>Siatka frekwencji · ostatnie {weeks} tyg.</p>
      <div
        role="img"
        aria-label={`Frekwencja gracza ${playerName} w ostatnich ${weeks} tygodniach: obecny ${present} razy, nieobecny ${missed} razy`}
        style={{
          display: 'grid', gap: 2,
          gridTemplateColumns: `repeat(${weeks}, 1fr)`,
          gridTemplateRows: 'repeat(7, auto)',
          gridAutoFlow: 'column',
        }}
      >
        {cells.map(c => (
          <span
            key={c.key}
            title={c.state === 'none' ? undefined : `${formatDate(c.date)}: ${c.state === 'present' ? 'obecny' : 'nieobecny'}`}
            className={c.latest ? 'attendance-cell attendance-cell-latest' : 'attendance-cell'}
            style={{
              aspectRatio: '1', display: 'block',
              background: fill(c),
              opacity: c.state === 'none' ? 0.45 : c.state === 'missed' ? 0.7 : 1,
              boxShadow: c.state === 'present' ? `0 0 6px ${color.border}` : 'none',
              // Pulsuje kolor poświaty ostatniej obecności (zmienna dla keyframes).
              ['--cell-glow' as string]: color.border,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', letterSpacing: TRACK.tight }}>
        <Legend swatch={color.border} label="obecny" />
        <Legend swatch="var(--co-dim)" label="nieobecny" />
        <Legend swatch="var(--co-border)" label="brak sesji" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, background: swatch, display: 'inline-block' }} />
      {label}
    </span>
  );
}
