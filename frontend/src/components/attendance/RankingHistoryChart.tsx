import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { computeRankingHistory } from '@/utils/rankings';
import { getPlayerColor } from '@/constants/colors';
import { FONT, TEXT, TRACK, CLIP, PANEL } from '@/constants/styles';
import { SectionHeader } from '../common/SharedUI';
import { useElementWidth } from '@/hooks/useElementWidth';
import { CHART_WIDTH, CHART_LABEL_SIZE, CHART_GRID_DASH, linePath, labelStep, type ChartPoint } from '@/utils/chart';
import type { HistoryEntry, PlayerStats } from '@/types/ui';

interface RankingHistoryChartProps {
  players: PlayerStats[];
  history: HistoryEntry[];
}

// ─── Ranking History Chart ────────────────────────────────────────
export default function RankingHistoryChart({ players, history }: RankingHistoryChartProps) {
  const data = useMemo(() => computeRankingHistory(players, history), [players, history]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>(CHART_WIDTH);

  const playerNames = useMemo(() => players?.map(p => p.name) ?? [], [players]);
  // Wcześniej ten plik miał własną, prywatną paletę o innych wartościach niż
  // `getPlayerColor`, więc ten sam gracz miał jeden kolor w raporcie
  // miesięcznym i inny na wykresie obok, na tym samym ekranie.
  const colorAt = (i: number) => getPlayerColor(playerNames[i] ?? '', i).border;

  // Wykres skaluje się do szerokości kontenera (viewBox 1:1), więc etykiety
  // nie kurczą się do 7 px na telefonie. Niższe PAD-y zostawiają miejsce na
  // oś Y i podpisy miesięcy przy 390 px.
  const compact = chartWidth < 480;
  const W = Math.max(chartWidth, 280);
  const H = compact ? 230 : 200;
  const PAD = compact
    ? { top: 18, right: 14, bottom: 30, left: 32 }
    : { top: 20, right: 20, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (!data || data.length < 2) return null;

  const n = data.length;
  const maxPlace = Math.max(...data.flatMap(d => d.rankings.map(r => r.place)));
  const visibleNames = playerNames.filter(name => !hidden.has(name));

  const xPos = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const yPos = (place: number) => PAD.top + ((place - 1) / Math.max(maxPlace - 1, 1)) * innerH;

  const togglePlayer = (name: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      // Nie pozwalamy ukryć ostatniej linii — pusty wykres nie jest odpowiedzią.
      else if (prev.size < playerNames.length - 1) next.add(name);
      return next;
    });
  };

  const lastPositions = data[data.length - 1]?.rankings ?? [];
  const finalSummary = [...lastPositions]
    .sort((a, b) => a.place - b.place)
    .map(r => `${r.name} miejsce ${r.place}`)
    .join(', ');

  return (
    <div style={PANEL.cyberCut}>
      <SectionHeader icon={TrendingUp} title="Historia rankingu" sub="pozycja graczy w czasie" />
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {playerNames.map((name, i) => {
          const isHidden = hidden.has(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => togglePlayer(name)}
              aria-pressed={!isHidden}
              title={isHidden ? `Pokaż linię: ${name}` : `Ukryj linię: ${name}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                minHeight: 44, padding: '5px 8px',
                background: isHidden ? 'transparent' : 'var(--co-tint)',
                border: `1px solid ${isHidden ? 'var(--co-border)' : 'var(--co-tint-line)'}`,
                color: isHidden ? 'var(--co-dim)' : 'var(--co-text)',
                cursor: 'pointer', clipPath: CLIP.badge,
                opacity: isHidden ? 0.55 : 1,
              }}
            >
              <span aria-hidden="true" style={{
                width: 16, height: 2, flexShrink: 0,
                background: colorAt(i), borderRadius: 1,
              }} />
              <span style={{ ...FONT.mono(TEXT.small), textDecoration: isHidden ? 'line-through' : 'none' }}>
                {name}
              </span>
            </button>
          );
        })}
      </div>
      <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '0 0 10px', letterSpacing: TRACK.tight }}>
        {'>'} Dotknij nazwę, aby ukryć linię
      </p>
      <div ref={chartRef} style={{ position: 'relative', background: 'var(--co-tint)', border: '1px solid var(--co-border)', clipPath: CLIP.smallCard, overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Wykres historii rankingu: ${n} miesięcy, widoczni gracze: ${visibleNames.join(', ')}`}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        >
          {/* Place labels on Y axis */}
          {Array.from({ length: maxPlace }, (_, i) => i + 1).map(place => (
            <g key={place}>
              <line x1={PAD.left} y1={yPos(place)} x2={W - PAD.right} y2={yPos(place)}
                stroke="var(--co-border)" strokeWidth="1" strokeDasharray={CHART_GRID_DASH} />
              <text x={PAD.left - 6} y={yPos(place) + 4} textAnchor="end"
                fill="var(--co-dim)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                #{place}
              </text>
            </g>
          ))}
          {/* Player lines */}
          {playerNames.map((name, i) => {
            if (hidden.has(name)) return null;
            const points = data.map((d, di) => {
              const r = d.rankings.find(r => r.name === name);
              if (!r) return null;
              return { x: xPos(di), y: yPos(r.place), month: d.month, place: r.place };
            }).filter((pt): pt is { x: number; y: number; month: string; place: number } => pt !== null);
            if (points.length < 2) return null;
            const pts: ChartPoint[] = points.map(p => [p.x, p.y]);
            const col = colorAt(i);
            return (
              <g key={name}>
                <path d={linePath(pts)} fill="none" stroke={col} strokeWidth="2" opacity="0.85" />
                {points.map((point, pi) => (
                  <circle key={pi} cx={point.x} cy={point.y} r="3.5" fill="var(--co-panel)" stroke={col} strokeWidth="1.5">
                    <title>{`${name} — ${point.month}: #${point.place}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {/* X axis month labels */}
          {data.map((d, i) => (
            (i % labelStep(n, Math.max(2, Math.floor(innerW / 58))) === 0 || i === n - 1) && (
              <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle"
                fill="var(--co-dim)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                {d.month.slice(2).replace('-', '/')}
              </text>
            )
          ))}
        </svg>
      </div>
      <p className="sr-only">Ostatnie pozycje: {finalSummary}</p>
      <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 8, letterSpacing: TRACK.tight }}>
        * pozycja liczona na podstawie frekwencji po każdym miesiącu
      </p>
    </div>
  );
}
