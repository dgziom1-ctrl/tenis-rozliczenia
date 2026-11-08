import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { HistoryEntry } from '../../types/ui';
import { CLIP, FONT, TEXT } from '@/constants/styles';
import { SectionHeader } from '../common/SharedUI';
import { useElementWidth } from '@/hooks/useElementWidth';
import { CHART_WIDTH, CHART_LABEL_SIZE, CHART_GRID_DASH, linePath, spacedLabelIndices } from '@/utils/chart';

interface AttendanceTrendChartProps {
  history: HistoryEntry[];
}

interface BandSpec {
  key: 'count' | 'cost';
  color: string;
  title: string;
  values: number[];
  max: number;
  format: (v: number) => string;
}

const fmtCost = (v: number) => (v >= 10 ? Math.round(v).toString() : v.toFixed(1));

/**
 * Trend frekwencji i kosztu jako dwa małe wykresy jeden pod drugim, ze wspólną
 * osią dat. Wcześniej jedna ramka miała dwie niezależne osie Y (cyan z lewej,
 * rose z prawej) — łatwo było odczytać koszt na skali liczby osób.
 */
export default function AttendanceTrendChart({ history }: AttendanceTrendChartProps) {
  const data = useMemo(() => {
    if (!history || history.length === 0) return [];
    // Wykres i statystyki pod nim opisują CAŁĄ historię wybranego sezonu, nie
    // jej ostatnie 12 sesji. Wcześniej „Max sesja" liczyło się tylko z wycinka,
    // więc sesja z 6 osobami sprzed trzech miesięcy znikała z podsumowania.
    // Jawnie sortujemy po dacie: tabela może być ustawiona rosnąco lub malejąco.
    return [...history]
      .sort((a, b) => a.datePlayed.localeCompare(b.datePlayed))
      .map((s, i) => ({
        i,
        date: s.datePlayed,
        count: s.presentPlayers.length,
        cost: s.costPerPerson || 0,
        // Data w bazie jest dniem kalendarzowym, nie chwilą w UTC. Bez `T00:00:00`
        // przeglądarki na zachód od UTC pokazywałyby poprzedni dzień.
        label: new Date(`${s.datePlayed}T00:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
      }));
  }, [history]);

  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>(CHART_WIDTH);

  if (data.length < 2) return null;

  const compact = chartWidth < 480;
  const W = Math.max(chartWidth, 280);
  const PAD = compact
    ? { left: 30, right: 14, bottom: 28 }
    : { left: 38, right: 18, bottom: 30 };
  const BAND_H = compact ? 84 : 78;      // wysokość pola wykresu jednego panelu
  const BAND_TITLE_H = 22;               // wiersz z tytułem panelu
  const BAND_GAP = 10;
  const innerW = W - PAD.left - PAD.right;
  const n = data.length;
  const H = 2 * (BAND_TITLE_H + BAND_H) + BAND_GAP + PAD.bottom;

  const counts = data.map(d => d.count);
  const costs = data.map(d => d.cost);
  const maxCount = Math.max(...counts, 1);
  const minCount = Math.min(...counts);
  const maxCost = Math.max(...costs, 1);
  const avgCount = counts.reduce((s, v) => s + v, 0) / n;
  const avgCost = costs.reduce((s, v) => s + v, 0) / n;
  const dateLabels = new Set(spacedLabelIndices(n, innerW, 58));
  // „Rekord” ma sens tylko wtedy, gdy frekwencja się różni — przy równych
  // wartościach każdy punkt byłby rekordem.
  const hasRecord = maxCount > minCount;

  const xPos = (i: number) => PAD.left + (i / (n - 1)) * innerW;

  const bands: BandSpec[] = [
    { key: 'count', color: 'var(--co-cyan)', title: 'Obecni (os.)', values: counts, max: maxCount, format: v => String(Math.round(v)) },
    { key: 'cost', color: 'var(--co-rose)', title: 'Koszt na osobę (zł)', values: costs, max: maxCost, format: fmtCost },
  ];

  const summary = `Wykres trendu frekwencji: ${n} sesji od ${data[0].label} do ${data[n - 1].label}. `
    + `Średnio ${avgCount.toFixed(1)} osoby, najwięcej ${maxCount}, najmniej ${minCount}. `
    + `Średni koszt ${avgCost.toFixed(2)} zł na osobę, najwyższy ${maxCost.toFixed(2)} zł.`;

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeader icon={TrendingUp} title="Trend frekwencji" />

      <div ref={chartRef} style={{ position: 'relative', background: 'var(--co-tint)', border: '1px solid var(--co-border)', clipPath: CLIP.smallCard, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} style={{ display: 'block', width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--co-cyan)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--co-cyan)" stopOpacity="0.01" />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {bands.map((band, bandIndex) => {
            const top = bandIndex * (BAND_TITLE_H + BAND_H + BAND_GAP) + BAND_TITLE_H;
            const y = (v: number) => top + BAND_H - (v / band.max) * BAND_H;
            const pts = band.values.map((v, i) => [xPos(i), y(v)] as const);
            const isCount = band.key === 'count';
            const grid = [0, 0.5, 1].map(p => ({ yy: top + BAND_H * (1 - p), label: band.format(band.max * p) }));

            return (
              <g key={band.key}>
                {/* Tytuł panelu — nazywa oś, więc nie trzeba legendy z kolorami */}
                <text x={PAD.left} y={top - 8} textAnchor="start"
                  fill={band.color} fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                  {band.title}
                </text>

                {grid.map(({ yy, label }) => (
                  <g key={yy}>
                    <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy}
                      stroke="var(--co-border)" strokeWidth="1" strokeDasharray={CHART_GRID_DASH} opacity="0.7" />
                    <text x={PAD.left - 6} y={yy + 4} textAnchor="end"
                      fill="var(--co-dim)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                      {label}
                    </text>
                  </g>
                ))}

                {isCount && (
                  <path d={`${linePath(pts)} L${xPos(n - 1)},${top + BAND_H} L${xPos(0)},${top + BAND_H} Z`} fill="url(#areaGrad)" />
                )}

                <path d={linePath(pts)} fill="none"
                  stroke={band.color} strokeWidth={isCount ? 2.5 : 2}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={isCount ? undefined : '5 3'}
                  filter="url(#lineGlow)" />

                {/* Rekord frekwencji — marker plus podpis, a nie sam kolor */}
                {isCount && hasRecord && pts.map(([x, py], i) => (
                  data[i].count === maxCount && (
                    <g key={i}>
                      <circle cx={x} cy={py} r="7" fill="none" stroke="var(--co-green)" strokeWidth="1.5" opacity="0.5" />
                      <circle cx={x} cy={py} r="4" fill="var(--co-green)" />
                      <text x={x} y={py - 12} textAnchor="middle"
                        fill="var(--co-green)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                        {data[i].count}
                      </text>
                    </g>
                  )
                ))}
              </g>
            );
          })}

          {/* Wspólna oś dat pod dolnym panelem. Ostatnia etykieta zawsze zostaje
              jako punkt odniesienia, ale bez wchodzenia na poprzednią — patrz
              `spacedLabelIndices`. */}
          {data.map((d, i) => (
            dateLabels.has(i) && (
              <text key={i} x={xPos(i)} y={H - 8} textAnchor="middle"
                fill="var(--co-dim)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                {d.label}
              </text>
            )
          ))}
        </svg>
      </div>

      {/* Mini stats bar — `gap: 1` między kartami, z których każda ma własne
          obramowanie 1px, dawało 3-pikselowy szew zamiast wspólnej kreski.
          Teraz tło kontenera robi hairline, a karty nie mają krawędzi. */}
      <div style={{ display: 'flex', gap: 1, marginTop: 8, background: 'var(--co-border)', border: '1px solid var(--co-border)' }}>
        {[
          { label: 'Śr. obecność', value: avgCount.toFixed(1) + ' os.', color: 'var(--co-cyan)' },
          { label: 'Śr. koszt',    value: avgCost.toFixed(2) + ' zł', color: 'var(--co-rose)' },
          { label: 'Max sesja',    value: maxCount + ' os.', color: 'var(--co-green)' },
          { label: 'Sesji',        value: `${data.length}`, color: 'var(--co-ice)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: '8px 10px', background: 'var(--co-panel)', textAlign: 'center' }}>
            <p style={{ ...FONT.display(TEXT.lead), color, margin: 0, lineHeight: 1, textShadow: 'var(--glow-cyan-sm)' }}>{value}</p>
            <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '4px 0 0', letterSpacing: 'normal', textTransform: 'none' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
