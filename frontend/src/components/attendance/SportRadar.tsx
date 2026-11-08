import { useMemo } from 'react';
import { SPORT_LABEL } from '@/constants';
import { FONT, TEXT } from '@/constants/styles';
import { CHART_LABEL_SIZE } from '@/utils/chart';
import { buildSportProfile, RADAR_SPORTS } from '@/utils/sportProfile';
import type { HistoryEntry, PlayerColor } from '@/types/ui';

interface SportRadarProps {
  history: HistoryEntry[];
  playerName: string;
  color: PlayerColor;
}

const MIN_SESSIONS = 3;
const W = 300;
const H = 230;
const CX = W / 2;
const CY = 112;
const R = 66;

// Oś i: góra, prawo, dół, lewo.
const ANGLES = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
const point = (i: number, ratio: number): [number, number] => [
  CX + Math.cos(ANGLES[i]) * R * ratio,
  CY + Math.sin(ANGLES[i]) * R * ratio,
];
const polygon = (ratios: number[]) => ratios.map((r, i) => point(i, r).join(',')).join(' ');

// ─── Radar sportów ────────────────────────────────────────────────
export default function SportRadar({ history, playerName, color }: SportRadarProps) {
  const profile = useMemo(() => buildSportProfile(history, playerName), [history, playerName]);

  if (profile.total === 0) return null;

  const wrapStyle = { padding: '10px 16px', borderBottom: `1px solid ${color.border}15` };

  if (profile.total < MIN_SESSIONS) {
    return (
      <div style={wrapStyle}>
        <p style={{ ...FONT.monoLabel, marginBottom: 6 }}>Profil sportowy</p>
        <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', margin: 0 }}>
          Za mało sesji na profil (minimum {MIN_SESSIONS}).
        </p>
      </div>
    );
  }

  const playerR = RADAR_SPORTS.map(s => profile.playerShare[s]);
  const groupR = RADAR_SPORTS.map(s => profile.groupShare[s]);
  // Skala do największego udziału, żeby kształt nie był ściśnięty przy równym rozkładzie.
  const scale = Math.max(...playerR, ...groupR, 0.25);
  const norm = (rs: number[]) => rs.map(r => r / scale);
  const summary = RADAR_SPORTS.map(s => `${SPORT_LABEL[s]} ${profile.counts[s]}`).join(', ');

  const labelPos = (i: number): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } => {
    const [x, y] = point(i, 1);
    if (i === 0) return { x, y: y - 12, anchor: 'middle' };
    if (i === 2) return { x, y: y + 20, anchor: 'middle' };
    return { x: x + (i === 1 ? 10 : -10), y: y + 4, anchor: i === 1 ? 'start' : 'end' };
  };

  return (
    <div style={wrapStyle}>
      <p style={{ ...FONT.monoLabel, marginBottom: 4 }}>Profil sportowy</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Profil sportowy gracza ${playerName}: ${summary}`}
        style={{ display: 'block', width: '100%', maxWidth: 360, height: 'auto', margin: '0 auto' }}
      >
        {[0.5, 1].map(level => (
          <polygon key={level} points={polygon(RADAR_SPORTS.map(() => level))}
            fill="none" stroke="var(--co-border)" strokeWidth="1" />
        ))}
        {ANGLES.map((_, i) => {
          const [x, y] = point(i, 1);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--co-border)" strokeWidth="1" />;
        })}
        <polygon points={polygon(norm(groupR))} fill="none"
          stroke="var(--co-dim)" strokeWidth="1.5" strokeDasharray="4 3" />
        <polygon points={polygon(norm(playerR))} fill={color.border} fillOpacity="0.28"
          stroke={color.border} strokeWidth="2" strokeLinejoin="round" />
        {norm(playerR).map((r, i) => {
          const [x, y] = point(i, r);
          return <circle key={i} cx={x} cy={y} r="3.5" fill="var(--co-panel)" stroke={color.border} strokeWidth="1.5" />;
        })}
        {RADAR_SPORTS.map((s, i) => {
          const p = labelPos(i);
          return (
            <text key={s} x={p.x} y={p.y} textAnchor={p.anchor} fill="var(--co-text)"
              fontSize={CHART_LABEL_SIZE} fontFamily="var(--font-mono)">
              {SPORT_LABEL[s]} · {profile.counts[s]}
            </text>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', letterSpacing: 'normal' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, background: color.border, display: 'inline-block' }} />
          {playerName}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span aria-hidden="true" style={{ width: 12, borderTop: '2px dashed var(--co-dim)', display: 'inline-block' }} />
          średnia grupy
        </span>
      </div>
    </div>
  );
}
