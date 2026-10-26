import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { HistoryEntry } from '../../types/ui';
import { CLIP } from '@/constants/styles';
import { SectionHeader } from '../common/SharedUI';
import { useElementWidth } from '@/hooks/useElementWidth';
import { CHART_WIDTH, CHART_LABEL_SIZE, CHART_GRID_DASH, linePath, spacedLabelIndices } from '@/utils/chart';

interface AttendanceTrendChartProps {
  history: HistoryEntry[];
}

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

  // Ten sam wykres 1:1 z szerokością kontenera co w rankingu — na telefonie
  // etykiety osi i wartości nie są już pomniejszane razem z viewBoxem.
  const compact = chartWidth < 480;
  const W = Math.max(chartWidth, 280);
  const H = compact ? 250 : 212;
  // Górny margines musi pomieścić etykiety jednostek („os.”, „zł”) nad
  // najwyższą linią siatki. Przy 20 px jednostki nachodziły na wartość
  // szczytową i na etykiety punktów.
  const PAD = compact
    ? { top: 34, right: 34, bottom: 30, left: 26 }
    : { top: 32, right: 46, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const maxCost  = Math.max(...data.map(d => d.cost), 1);
  const n = data.length;
  // Podpisy liczb nad punktami mogą być gęstsze niż daty — mieszczą się w ok. 34 px.
  const valueLabels = new Set(spacedLabelIndices(n, innerW, 60));
  const dateLabels = new Set(spacedLabelIndices(n, innerW, 58));
  // Najwyższa frekwencja sezonu — wyróżniona, żeby „rekord” był widoczny
  // bez czytania liczb pod wykresem.
  const recordCount = maxCount;

  const xPos   = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const yCount = (v: number) => PAD.top + innerH - (v / maxCount) * innerH;
  const yCost  = (v: number) => PAD.top + innerH - (v / maxCost)  * innerH;

  const countPts = data.map(d => [xPos(d.i), yCount(d.count)] as const);
  const costPts  = data.map(d => [xPos(d.i), yCost(d.cost)] as const);
  const areaPath = `${linePath(countPts)} L${xPos(n-1)},${PAD.top+innerH} L${xPos(0)},${PAD.top+innerH} Z`;

  const fmtCost = (v: number) => (v >= 10 ? Math.round(v).toString() : v.toFixed(1));

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PAD.top + innerH * (1 - p),
    label: Math.round(maxCount * p),
    costLabel: fmtCost(maxCost * p),
  }));

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Chart header */}
      <SectionHeader
        icon={TrendingUp}
        title="Trend frekwencji"
        aside={
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { color: 'var(--co-cyan)', label: 'obecni' },
              { color: 'var(--co-rose)', label: 'koszt/os.' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div aria-hidden="true" style={{ width: 20, height: 2, background: color }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', letterSpacing: 'normal' }}>{label}</span>
              </div>
            ))}
          </div>
        }
      />

      {/* SVG chart */}
      <div ref={chartRef} style={{ position: 'relative', background: 'var(--co-tint)', border: '1px solid var(--co-border)', clipPath: CLIP.smallCard, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wykres trendu frekwencji" style={{ display: 'block', width: '100%', height: 'auto' }}>
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

          {gridLines.map(({ y, label, costLabel }) => (
            <g key={y}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="var(--co-tint)" strokeWidth="1" strokeDasharray={CHART_GRID_DASH} />
              {/* Lewa oś — obecni (cyan) */}
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fill="var(--co-cyan)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                {label}
              </text>
              {/* Prawa oś — koszt/os. w zł (różowy), własna skala */}
              <text x={W - PAD.right + 6} y={y + 4} textAnchor="start"
                fill="var(--co-rose)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
                {costLabel}
              </text>
            </g>
          ))}

          {/* Podpisy osi */}
          <text x={PAD.left - 6} y={12} textAnchor="end"
            fill="var(--co-cyan)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
            os.
          </text>
          <text x={W - PAD.right + 6} y={12} textAnchor="start"
            fill="var(--co-rose)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
            zł
          </text>

          {/* Linia pionowa dla każdego punktu tylko zaśmieca wykres — zostaje
              sama linia trendu i punkty. Siatka pozioma wystarczy do odczytu. */}
          <path d={areaPath} fill="url(#areaGrad)" />

          <path d={linePath(costPts)} fill="none"
            stroke="var(--co-rose)" strokeWidth="1.5"
            strokeDasharray="5 3" opacity="0.7"
            filter="url(#lineGlow)" />

          <path d={linePath(countPts)} fill="none"
            stroke="var(--co-cyan)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            filter="url(#lineGlow)" />

          {countPts.map(([x, y], i) => {
            const isRecord = data[i].count === recordCount;
            if (!isRecord) return null;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="7" fill="none" stroke="var(--co-green)" strokeWidth="1.5" opacity="0.5" />
                <circle cx={x} cy={y} r="4" fill="var(--co-green)" />
                {(valueLabels.has(i) || isRecord) && (
                  <text x={x} y={y - 12} textAnchor="middle"
                    fill="var(--co-green)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)" opacity="0.9">
                    {data[i].count}
                  </text>
                )}
              </g>
            );
          })}

          {/* Koszt: tylko linia, bez kropek — mniej szumu, wykres płynniejszy. */}

          {/* Ostatnia etykieta zawsze zostaje jako punkt odniesienia, ale bez
              wchodzenia na poprzednią — patrz `spacedLabelIndices`. */}
          {data.map((d, i) => (
            dateLabels.has(i) && (
              <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle"
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
          { label: 'Śr. obecność', value: (data.reduce((s, d) => s + d.count, 0) / data.length).toFixed(1) + ' os.', color: 'var(--co-cyan)' },
          { label: 'Śr. koszt',    value: (data.reduce((s, d) => s + d.cost,  0) / data.length).toFixed(2) + ' zł', color: 'var(--co-rose)' },
          { label: 'Max sesja',    value: Math.max(...data.map(d => d.count)) + ' os.', color: 'var(--co-green)' },
          { label: 'Sesji',        value: `${data.length}`, color: 'var(--co-ice)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: '8px 10px', background: 'var(--co-panel)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color, margin: 0, lineHeight: 1, textShadow: 'var(--glow-cyan-sm)' }}>{value}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', margin: '4px 0 0', letterSpacing: 'normal', textTransform: 'none' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
