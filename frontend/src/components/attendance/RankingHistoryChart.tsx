import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { computeRankingHistory } from '@/utils/rankings';
import { getPlayerColor } from '@/constants/colors';
import { FONT, TEXT, TRACK, CLIP, PANEL } from '@/constants/styles';
import { SectionHeader } from '../common/SharedUI';
import { CHART_WIDTH, CHART_LABEL_SIZE, CHART_GRID_DASH, linePath, labelStep, type ChartPoint } from '@/utils/chart';
import type { HistoryEntry, PlayerStats } from '@/types/ui';

interface RankingHistoryChartProps {
  players: PlayerStats[];
  history: HistoryEntry[];
}

// ─── Ranking History Chart ────────────────────────────────────────
export default function RankingHistoryChart({ players, history }: RankingHistoryChartProps) {
  const data = useMemo(() => computeRankingHistory(players, history), [players, history]);
  if (!data || data.length < 2) return null;

  const playerNames = players?.map(p => p.name) || [];
  // Wcześniej ten plik miał własną, prywatną paletę o innych wartościach niż
  // `getPlayerColor`, więc ten sam gracz miał jeden kolor w raporcie
  // miesięcznym i inny na wykresie obok, na tym samym ekranie.
  const colorAt = (i: number) => getPlayerColor(playerNames[i] ?? '', i).border;

  // Ta sama wysokość i marginesy co wykres trendu — wcześniej 140 vs 200
  // i prawy margines 16 vs 46, więc obszary rysowania nie pokrywały się
  // mimo identycznej szerokości renderowanej.
  const W = CHART_WIDTH, H = 200, PAD = { top: 20, right: 46, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = data.length;
  const maxPlace = Math.max(...data.flatMap(d => d.rankings.map(r => r.place)));

  const xPos = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const yPos = (place: number) => PAD.top + ((place - 1) / Math.max(maxPlace - 1, 1)) * innerH;

  return (
    <div style={PANEL.cyberCut}>
      <SectionHeader icon={TrendingUp} title="HISTORIA RANKINGU" sub="pozycja graczy w czasie" />
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {playerNames.map((name, i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 2, background: colorAt(i), borderRadius: 1 }} />
            <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)' }}>{name}</span>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', background: 'var(--co-tint)', border: '1px solid var(--co-border)', clipPath: CLIP.smallCard, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wykres historii rankingu" style={{ display: 'block', width: '100%', height: 'auto' }}>
          {/* Place labels on Y axis */}
          {Array.from({ length: maxPlace }, (_, i) => i + 1).map(place => (
            <g key={place}>
              <line x1={PAD.left} y1={yPos(place)} x2={W - PAD.right} y2={yPos(place)}
                stroke="var(--co-border)" strokeWidth="1" strokeDasharray={CHART_GRID_DASH} />
              {/* Opisy osi to dane, nie ozdoba: 8–9px w viewBox 560 schodziło
                  na telefonie do ~4,4px. 13px daje ~7px po przeskalowaniu. */}
              <text x={PAD.left - 6} y={yPos(place) + 4} textAnchor="end"
                fill="var(--co-dim)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                #{place}
              </text>
            </g>
          ))}
          {/* Player lines */}
          {playerNames.map((name, i) => {
            const pts = data.map((d, di): ChartPoint | null => {
              const r = d.rankings.find(r => r.name === name);
              return r ? [xPos(di), yPos(r.place)] : null;
            }).filter((pt): pt is ChartPoint => pt !== null);
            if (pts.length < 2) return null;
            const col = colorAt(i);
            return (
              <g key={name}>
                <path d={linePath(pts)} fill="none" stroke={col} strokeWidth="2" opacity="0.85" />
                {pts.map(([x, y], pi) => (
                  <circle key={pi} cx={x} cy={y} r="3.5" fill="var(--co-panel)" stroke={col} strokeWidth="1.5" />
                ))}
              </g>
            );
          })}
          {/* X axis month labels */}
          {data.map((d, i) => (
            (i % labelStep(n, 5) === 0 || i === n - 1) && (
              <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle"
                fill="var(--co-dim)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                {d.month.slice(2).replace('-', '/')}
              </text>
            )
          ))}
        </svg>
      </div>
      <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 8, letterSpacing: TRACK.tight }}>
        * pozycja liczona na podstawie frekwencji po każdym miesiącu
      </p>
    </div>
  );
}
