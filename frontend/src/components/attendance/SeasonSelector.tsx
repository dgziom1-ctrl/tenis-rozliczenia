import { CLIP, FONT, TEXT, TRACK } from '../../constants/styles';

const ALL_TIME = null;

interface SeasonSelectorProps {
  seasons: number[];
  selected: number | null;
  onChange: (season: number | null) => void;
}

/**
 * Cyberpunk-styled year/season selector.
 * Shows "WSZYSTKIE" + one button per available year.
 */
export default function SeasonSelector({ seasons, selected, onChange }: SeasonSelectorProps) {
  if (!seasons || seasons.length <= 1) return null;

  const options = [{ label: 'WSZYSTKIE', value: ALL_TIME }, ...seasons.map(y => ({ label: String(y), value: y }))];

  return (
    // Odstęp bierze rodzic (gap 20 w AttendanceTab) — własny marginBottom 16
    // dawał pod tym paskiem inny rytm niż pod każdym innym elementem zakładki.
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    }}>
      {/* Etykieta była mono, a przyciski obok display — dwa kroje w jednym
          pasku kontrolek. */}
      <span style={{ ...FONT.display(TEXT.tiny, TRACK.wide), color: 'var(--co-dim)', marginRight: 4 }}>
        SEZON:
      </span>
      {options.map(opt => {
        const active = opt.value === selected;
        return (
          <button
            key={opt.label}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            style={{
              minHeight: 36, padding: '6px 12px',
              ...FONT.display(TEXT.base, TRACK.normal),
              background: active ? 'var(--co-tint-hi)' : 'transparent',
              border: `1px solid ${active ? 'var(--co-tint-line)' : 'var(--co-border)'}`,
              color: active ? 'var(--co-cyan)' : 'var(--co-text)',
              clipPath: CLIP.badge,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textShadow: active ? 'var(--glow-cyan-sm)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
