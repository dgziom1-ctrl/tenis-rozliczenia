import { CalendarDays } from 'lucide-react';
import { formatDate } from '@/utils/format';

interface CyberDateInputProps {
  value: string;
  onChange: (value: string) => void;
}

// iOS Safari: showPicker() nie istnieje i rzuca TypeError.
// opacity:0 na iOS blokuje zdarzenia dotknięcia — używamy opacity:0.01
// zamiast 0, co sprawia że input jest "widoczny" dla silnika zdarzeń iOS.
// font-size:16px zapobiega automatycznemu zoomowi pola na iOS.
export default function CyberDateInput({ value, onChange }: CyberDateInputProps) {
  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try { (e.currentTarget as any).showPicker?.(); } catch { /* showPicker not supported */ }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="cyber-input" style={{
        width: '100%', padding: '10px 14px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 10,
        clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        pointerEvents: 'none', fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
      }}>
        <span>{formatDate(value)}</span>
        <CalendarDays size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>
      <input
        type="date"
        value={value}
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
