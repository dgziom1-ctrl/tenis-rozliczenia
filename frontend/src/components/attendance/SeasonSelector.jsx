import { CLIP, FONT } from '../../constants/styles';

const ALL_TIME = null;

/**
 * Cyberpunk-styled year/season selector.
 * Shows "WSZYSTKIE" + one button per available year.
 */
export default function SeasonSelector({ seasons, selected, onChange }) {
  if (!seasons || seasons.length <= 1) return null;

  const options = [{ label: 'WSZYSTKIE', value: ALL_TIME }, ...seasons.map(y => ({ label: String(y), value: y }))];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      marginBottom: 16,
    }}>
      <span style={{
        ...FONT.mono('0.58rem'),
        color: 'var(--co-dim)',
        letterSpacing: '0.15em',
        marginRight: 4,
      }}>
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
              padding: '4px 12px',
              fontFamily: 'var(--font-display)',
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              background: active ? 'rgba(0,229,255,0.12)' : 'transparent',
              border: `1px solid ${active ? 'rgba(0,229,255,0.5)' : 'var(--co-border)'}`,
              color: active ? 'var(--co-cyan)' : 'var(--co-dim)',
              clipPath: CLIP.badge,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textShadow: active ? '0 0 8px rgba(0,229,255,0.4)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
