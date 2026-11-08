import { CalendarDays } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { CLIP } from '@/constants/styles';

interface CyberDateInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Etykieta dla czytników ekranu — pole daty jest wizualnie przykryte. */
  label: string;
  /** Węższy wariant używany w formularzu edycji sesji. */
  compact?: boolean;
}

/** Dziś w lokalnej strefie (nie UTC), żeby wieczorna sesja nie była „z przyszłości”. */
function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// iOS Safari: showPicker() nie istnieje i rzuca TypeError.
// opacity:0 na iOS blokuje zdarzenia dotknięcia — używamy opacity:0.01
// zamiast 0, co sprawia że input jest "widoczny" dla silnika zdarzeń iOS.
// font-size:16px zapobiega automatycznemu zoomowi pola na iOS.
export default function CyberDateInput({ value, onChange, label, compact = false }: CyberDateInputProps) {
  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try { e.currentTarget.showPicker?.(); } catch { /* showPicker not supported */ }
  };

  return (
    // `:focus-within` na wrapperze: natywny input jest niewidoczny (opacity
    // 0.01), więc to dekoracyjna warstwa pokazuje pierścień fokusa.
    <div className="cyber-date-wrap" style={{ position: 'relative' }}>
      <div aria-hidden="true" className="cyber-input" style={{
        width: '100%', padding: compact ? '10px 12px' : '10px 14px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 10,
        clipPath: CLIP.tag,
        pointerEvents: 'none', fontFamily: 'var(--font-mono)',
      }}>
        <span>{formatDate(value)}</span>
        <CalendarDays size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>
      <input
        type="date"
        aria-label={label}
        value={value}
        max={todayIso()}
        onChange={e => onChange(e.target.value)}
        onClick={handleClick}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0.01,
          cursor: 'pointer', zIndex: 2, padding: 0, border: 'none',
          boxSizing: 'border-box',
          fontSize: '16px',
        }}
      />
    </div>
  );
}
