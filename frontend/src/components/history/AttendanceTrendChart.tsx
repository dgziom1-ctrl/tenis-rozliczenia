import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { HistoryEntry } from '../../types/ui';

interface AttendanceTrendChartProps {
  history: HistoryEntry[];
}

export default function AttendanceTrendChart({ history }: AttendanceTrendChartProps) {
  const W = 560, H = 140, PAD = { top: 18, right: 16, bottom: 32, left: 36 };
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

  const linePath = (pts: number[][]) => pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const prev = pts[i - 1];
    const cpx = (prev[0] + x) / 2;
    return `${acc} C${cpx},${prev[1]} ${cpx},${y} ${x},${y}`;
  }, '');

  const countPts = data.map(d => [xPos(d.i), yCount(d.count)]);
  const costPts  = data.map(d => [xPos(d.i), yCost(d.cost)]);
  const areaPath = `${linePath(countPts)} L${xPos(n-1)},${PAD.top+innerH} L${xPos(0)},${PAD.top+innerH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PAD.top + innerH * (1 - p),
    label: Math.round(maxCount * p),
  }));

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Chart header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: '5px 7px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
            <TrendingUp size={13} style={{ color: 'var(--co-cyan)', display: 'block' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', textTransform: 'uppercase' }}>
            Trend frekwencji
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { color: '#00E5FF', label: 'obecni' },
            { color: '#FF2090', label: 'koszt/os.' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 2, background: color, boxShadow: `0 0 4px ${color}` }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <div style={{ position: 'relative', background: 'rgba(0,229,255,0.015)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wykres trendu frekwencji" style={{ display: 'block', width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.01" />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {gridLines.map(({ y, label }) => (
            <g key={y}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="rgba(0,229,255,0.07)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fill="rgba(0,229,255,0.3)" fontSize="9" fontFamily="Space Mono, monospace">
                {label}
              </text>
            </g>
          ))}

          {data.map(d => (
            <line key={d.i} x1={xPos(d.i)} y1={PAD.top} x2={xPos(d.i)} y2={PAD.top + innerH}
              stroke="var(--co-separator)" strokeWidth="1" />
          ))}

          <path d={areaPath} fill="url(#areaGrad)" />

          <path d={linePath(costPts)} fill="none"
            stroke="#FF2090" strokeWidth="1.5"
            strokeDasharray="5 3" opacity="0.7"
            filter="url(#lineGlow)" />

          <path d={linePath(countPts)} fill="none"
            stroke="#00E5FF" strokeWidth="2"
            filter="url(#lineGlow)" />

          {countPts.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="var(--co-panel)" stroke="#00E5FF" strokeWidth="1.5" />
              <circle cx={x} cy={y} r="2.5" fill="#00E5FF" />
              <text x={x} y={y - 9} textAnchor="middle"
                fill="#00E5FF" fontSize="9" fontFamily="Space Mono, monospace" opacity="0.8">
                {data[i].count}
              </text>
            </g>
          ))}

          {costPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="var(--co-panel)" stroke="#FF2090" strokeWidth="1.5" opacity="0.8" />
          ))}

          {data.map((d, i) => (
            (i % Math.max(1, Math.floor(n / 6)) === 0) && (
              <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle"
                fill="rgba(168,192,212,0.5)" fontSize="8" fontFamily="Space Mono, monospace">
                {d.label}
              </text>
            )
          ))}
        </svg>
      </div>

      {/* Mini stats bar */}
      <div style={{ display: 'flex', gap: 1, marginTop: 8 }}>
        {[
          { label: 'Śr. obecność', value: (data.reduce((s, d) => s + d.count, 0) / data.length).toFixed(1) + ' os.', color: 'var(--co-cyan)' },
          { label: 'Śr. koszt',    value: (data.reduce((s, d) => s + d.cost,  0) / data.length).toFixed(2) + ' zł', color: '#FF2090' },
          { label: 'Max sesja',    value: Math.max(...data.map(d => d.count)) + ' os.', color: 'var(--co-green)' },
          { label: 'Sesji',        value: `${data.length}`, color: 'var(--co-ice, #0080FF)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: '8px 10px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color, margin: 0, lineHeight: 1, textShadow: `0 0 8px ${color}40` }}>{value}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)', margin: '4px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
