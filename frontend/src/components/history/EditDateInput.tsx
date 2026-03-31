import { CalendarDays } from 'lucide-react';
import { formatDate } from '@/utils/format';

interface EditDateInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function EditDateInput({ value, onChange }: EditDateInputProps) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="cyber-input" style={{
        width: '100%', padding: '10px 12px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 10,
        fontSize: '0.8rem', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        pointerEvents: 'none',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(value)}</span>
        <CalendarDays size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>
      <input
        type="date" value={value} onChange={e => onChange(e.target.value)}
        onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* showPicker not supported */ } }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', zIndex: 2, padding: 0, border: 'none',
          boxSizing: 'border-box', fontSize: '16px',
        }}
      />
    </div>
  );
}
