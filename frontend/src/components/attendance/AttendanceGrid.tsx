import { useMemo } from 'react';
import { FONT, TEXT } from '@/constants/styles';
import { formatDate } from '@/utils/format';
import { buildAttendanceGrid, type GridCell } from '@/utils/attendanceGrid';
import type { HistoryEntry, PlayerColor } from '@/types/ui';

interface AttendanceGridProps {
  history: HistoryEntry[];
  playerName: string;
  color: PlayerColor;
  weeks?: number;
  /** Tygodni w jednym rzędzie; 13 daje na telefonie pola ~25 px. */
  perRow?: number;
}

// ─── Grid frekwencji ──────────────────────────────────────────────
export default function AttendanceGrid({ history, playerName, color, weeks = 26, perRow = 13 }: AttendanceGridProps) {
  const cells = useMemo(() => buildAttendanceGrid(history, playerName, weeks, perRow), [history, playerName, weeks, perRow]);
  if (cells.length === 0) return null;

  const present = cells.filter(c => c.state === 'present').length;
  const missed = cells.filter(c => c.state === 'missed').length;

  const fill = (c: GridCell) =>
    c.state === 'present' ? color.border
      : c.state === 'missed' ? 'var(--co-dim)'
        : 'var(--co-border)';

  // Stan nie może zależeć tylko od koloru: „nieobecny” dostaje kreskowanie,
  // „obecny” pełne wypełnienie, a „brak grania” zostaje gładki i blady.
  const hatch = 'repeating-linear-gradient(135deg, transparent 0 3px, var(--co-void) 3px 5px)';

  return (
    <div style={{ padding: '10px 16px', borderBottom: `1px solid ${color.border}15` }}>
      <p style={{ ...FONT.monoLabel, marginBottom: 8 }}>Siatka frekwencji · ostatnie {weeks} tyg. (1 pole = 1 tydzień)</p>
      <div
        role="img"
        aria-label={`Frekwencja gracza ${playerName} w ostatnich ${weeks} tygodniach: obecny ${present} razy, nieobecny ${missed} razy`}
        style={{
          display: 'grid', gap: 4,
          gridTemplateColumns: `repeat(${perRow}, 1fr)`,
        }}
      >
        {cells.map(c => (
          <span
            key={c.key}
            title={c.state === 'none' ? undefined : `${formatDate(c.date)}: ${c.state === 'present' ? 'obecny' : 'nieobecny'}`}
            className={c.latest ? 'attendance-cell attendance-cell-latest' : 'attendance-cell'}
            style={{
              aspectRatio: '1', display: 'block',
              backgroundColor: fill(c),
              backgroundImage: c.state === 'missed' ? hatch : undefined,
              opacity: c.state === 'none' ? 0.45 : c.state === 'missed' ? 0.7 : 1,
              boxShadow: c.state === 'present' ? `0 0 6px ${color.border}` : 'none',
              // Pulsuje kolor poświaty ostatniej obecności (zmienna dla keyframes).
              ['--cell-glow' as string]: color.border,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', letterSpacing: 'normal' }}>
        <Legend swatch={color.border} label="obecny" />
        <Legend swatch="var(--co-dim)" hatch={hatch} label="nieobecny" />
        <Legend swatch="var(--co-border)" label="brak grania w tygodniu" />
      </div>
    </div>
  );
}

function Legend({ swatch, hatch, label }: { swatch: string; hatch?: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, backgroundColor: swatch, backgroundImage: hatch, display: 'inline-block' }} />
      {label}
    </span>
  );
}
