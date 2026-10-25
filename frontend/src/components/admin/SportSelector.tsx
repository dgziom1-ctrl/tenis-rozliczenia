import { SPORT, SPORT_SHORT } from '@/constants';
import SportGlyph from '../common/icons/SportGlyph';
import type { Sport } from '@/types/domain';
import { CLIP } from '@/constants/styles';

const SPORTS: readonly Sport[] = [SPORT.PINGPONG, SPORT.SQUASH, SPORT.BADMINTON, SPORT.PADEL];

interface SportSelectorProps {
  value: Sport;
  onChange: (sport: Sport) => void;
}

export default function SportSelector({ value, onChange }: SportSelectorProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
      {SPORTS.map(sport => {
        const active = value === sport;
        return (
          <button
            key={sport} type="button"
            onClick={() => onChange(sport)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              minHeight: 44,
              padding: '10px 6px', cursor: 'pointer', transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
              fontFamily: 'var(--font-display)', fontSize: '0.8125rem', 
              letterSpacing: '0.06em', textTransform: 'uppercase',
              clipPath: CLIP.badge,
              ...(active ? {
                background: 'var(--co-tint-hi)', border: '1px solid var(--co-tint-line)',
                color: 'var(--co-cyan)', boxShadow: 'var(--glow-box-cyan)',
              } : {
                background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
              }),
            }}
          >
            <SportGlyph sport={sport} size={15} />
            {SPORT_SHORT[sport]}
          </button>
        );
      })}
    </div>
  );
}
