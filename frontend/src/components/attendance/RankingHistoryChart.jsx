import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { computeRankingHistory } from '../../utils/calculations';
import { SectionHeader } from '../common/SharedUI';

// ─── Ranking History Chart ────────────────────────────────────────
export default function RankingHistoryChart({ players, history }) {
  const data = useMemo(() => computeRankingHistory(players, history), [players, history]);
  if (!data || data.length < 2) return null;

  const playerNames = players?.map(p => p.name) || [];
  const COLORS = ['#00E5FF','#FF2090','#00FF88','#FF8800','#CC00FF','#0080FF','#FFD700'];

  const W = 560, H = 200, PAD = { top: 20, right: 16, bottom: 32, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = data.length;
  const maxPlace = Math.max(...data.flatMap(d => d.rankings.map(r => r.place)));

  const xPos = i => PAD.left + (i / (n - 1)) * innerW;
  const yPos = place => PAD.top + ((place - 1) / Math.max(maxPlace - 1, 1)) * innerH;

  const linePath = pts => pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const prev = pts[i - 1];
    const cpx = (prev[0] + x) / 2;
    return `${acc} C${cpx},${prev[1]} ${cpx},${y} ${x},${y}`;
  }, '');

  return (
    <div style={{ background: 'var(--co-panel)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)', padding: 24 }}>
      <SectionHeader icon={TrendingUp} title="HISTORIA RANKINGU" sub="pozycja graczy w czasie" />
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {playerNames.map((name, i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 18, height: 2, background: COLORS[i % COLORS.length], borderRadius: 1 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)' }}>{name}</span>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', background: 'rgba(0,229,255,0.015)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
          {/* Place labels on Y axis */}
          {Array.from({ length: maxPlace }, (_, i) => i + 1).map(place => (
            <g key={place}>
              <line x1={PAD.left} y1={yPos(place)} x2={W - PAD.right} y2={yPos(place)}
                stroke="rgba(0,229,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={PAD.left - 4} y={yPos(place) + 4} textAnchor="end"
                fill="rgba(0,229,255,0.3)" fontSize="9" fontFamily="Space Mono, monospace">
                #{place}
              </text>
            </g>
          ))}
          {/* Player lines */}
          {playerNames.map((name, i) => {
            const pts = data.map((d, di) => {
              const r = d.rankings.find(r => r.name === name);
              return r ? [xPos(di), yPos(r.place)] : null;
            }).filter(Boolean);
            if (pts.length < 2) return null;
            const col = COLORS[i % COLORS.length];
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
            (i % Math.max(1, Math.floor(n / 5)) === 0 || i === n - 1) && (
              <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle"
                fill="rgba(168,192,212,0.5)" fontSize="8" fontFamily="Space Mono, monospace">
                {d.month.slice(2).replace('-', '/')}
              </text>
            )
          ))}
        </svg>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--co-dim)', marginTop: 8, letterSpacing: '0.08em' }}>
        * pozycja liczona na podstawie frekwencji po każdym miesiącu
      </p>
    </div>
  );
}
