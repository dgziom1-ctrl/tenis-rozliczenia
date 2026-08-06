import { SPORT } from '@/constants';
import type { Sport } from '@/types/domain';

interface SportSelectorProps {
  value: Sport;
  onChange: (sport: Sport) => void;
}

export default function SportSelector({ value, onChange }: SportSelectorProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
      {[
        { sport: SPORT.PINGPONG as Sport,  label: '🏓 PING', active: value === SPORT.PINGPONG },
        { sport: SPORT.SQUASH as Sport,    label: '🎾 SQUASH', active: value === SPORT.SQUASH },
        { sport: SPORT.BADMINTON as Sport, label: '🏸 BADMINTON', active: value === SPORT.BADMINTON },
      ].map(({ sport, label, active }) => (
        <button
          key={sport} type="button"
          onClick={() => onChange(sport)}
          style={{
            padding: '11px 6px', cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
            ...(active ? {
              background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.5)',
              color: 'var(--co-cyan)', boxShadow: '0 0 10px rgba(0,229,255,0.1)',
            } : {
              background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
            }),
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
