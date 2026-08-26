import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { HistoryEntry } from '../../types/ui';
import { CLIP } from '@/constants/styles';
import { SectionHeader } from '../common/SharedUI';
import { CHART_WIDTH, CHART_LABEL_SIZE, CHART_GRID_DASH, linePath, labelStep } from '@/utils/chart';

interface AttendanceTrendChartProps {
  history: HistoryEntry[];
}

export default function AttendanceTrendChart({ history }: AttendanceTrendChartProps) {
  // Prawy margines robi miejsce na drugą oś (koszt w zł).
  const W = CHART_WIDTH, H = 200, PAD = { top: 20, right: 46, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const data = useMemo(() => {
    if (!history || history.length === 0) return [];
    const recent = [...history].slice(0, 12).reverse();
    return recent.map((s, i) => ({
      i,
      date: s.datePlayed,
      count: s.presentPlayers.length,
      cost: s.costPerPerson || 0,
      label: new Date(s.datePlayed).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
    }));
  }, [history]);

  if (data.length < 2) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const maxCost  = Math.max(...data.map(d => d.cost), 1);
  const n = data.length;

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
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>{label}</span>
              </div>
            ))}
          </div>
        }
      />

      {/* SVG chart */}
      <div style={{ position: 'relative', background: 'var(--co-tint)', border: '1px solid var(--co-border)', clipPath: CLIP.smallCard, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wykres trendu frekwencji" style={{ display: 'block', width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--co-cyan)" stopOpacity="0.18" />
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
          <text x={PAD.left - 6} y={PAD.top - 6} textAnchor="end"
            fill="var(--co-cyan)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
            os.
          </text>
          <text x={W - PAD.right + 6} y={PAD.top - 6} textAnchor="start"
            fill="var(--co-rose)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
            zł
          </text>

          {data.map(d => (
            <line key={d.i} x1={xPos(d.i)} y1={PAD.top} x2={xPos(d.i)} y2={PAD.top + innerH}
              stroke="var(--co-separator)" strokeWidth="1" />
          ))}

          <path d={areaPath} fill="url(#areaGrad)" />

          <path d={linePath(costPts)} fill="none"
            stroke="var(--co-rose)" strokeWidth="1.5"
            strokeDasharray="5 3" opacity="0.7"
            filter="url(#lineGlow)" />

          <path d={linePath(countPts)} fill="none"
            stroke="var(--co-cyan)" strokeWidth="2"
            filter="url(#lineGlow)" />

          {countPts.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="var(--co-panel)" stroke="var(--co-cyan)" strokeWidth="1.5" />
              <circle cx={x} cy={y} r="2.5" fill="var(--co-cyan)" />
              <text x={x} y={y - 9} textAnchor="middle"
                fill="var(--co-cyan)" fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)" opacity="0.8">
                {data[i].count}
              </text>
            </g>
          ))}

          {costPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="var(--co-panel)" stroke="var(--co-rose)" strokeWidth="1.5" opacity="0.8" />
          ))}

          {/* `floor(n / 6)` dawało krok 1 dla n = 7, czyli wszystkie siedem
              podpisów na raz — gwarantowane nachodzenie. `ceil` wymusza rzadszy
              krok, a ostatnia etykieta zawsze zostaje jako punkt odniesienia. */}
          {data.map((d, i) => (
            (i % labelStep(n) === 0 || i === n - 1) && (
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
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', margin: '4px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
