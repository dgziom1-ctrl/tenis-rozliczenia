import type { ReactNode } from 'react';
import ToggleChip from '../common/ToggleChip';
import { FONT, TEXT } from '@/constants/styles';

/** Ile kortów i godzin da się wybrać jednym kliknięciem. */
const CHOICES = [1, 2, 3];

interface CourtHoursPickerProps {
  /** `undefined` — stara sesja bez konfiguracji. */
  courtCount: number | undefined;
  durationHours: number | undefined;
  onCourtCountChange: (count: number) => void;
  onDurationChange: (hours: number) => void;
  /** Podpowiedź pod wyborem kortów (limit odbić). */
  courtHint: string;
  /** Podpowiedź pod wyborem godzin. */
  hoursHint: string;
  /** Rysuje tytuł kolumny — formularz dodawania i edycji mają inne etykiety pól. */
  renderLabel: (text: string) => ReactNode;
  /** Nazwy przycisków dla czytników ekranu; bez nich przycisk nazywa sam tekst. */
  chipLabels?: { court: (count: number) => string; hours: (hours: number) => string };
}

const hintStyle = { ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 6 } as const;

/** Wybór liczby kortów/stołów i godzin — razem wyznaczają limit odbić kart. */
export default function CourtHoursPicker({
  courtCount, durationHours, onCourtCountChange, onDurationChange,
  courtHint, hoursHint, renderLabel, chipLabels,
}: CourtHoursPickerProps) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        {renderLabel('Korty / stoły')}
        <div style={{ display: 'flex', gap: 6 }}>
          {CHOICES.map(n => (
            <ToggleChip key={n} font="mono" active={courtCount === n}
              ariaLabel={chipLabels?.court(n)}
              style={{ flex: 1, padding: '8px 4px' }}
              onClick={() => onCourtCountChange(n)}>
              {n}
            </ToggleChip>
          ))}
        </div>
        <p style={hintStyle}>{courtHint}</p>
      </div>
      <div style={{ flex: 1 }}>
        {renderLabel('Godziny')}
        <div style={{ display: 'flex', gap: 6 }}>
          {CHOICES.map(n => (
            <ToggleChip key={n} font="mono" active={durationHours === n}
              ariaLabel={chipLabels?.hours(n)}
              style={{ flex: 1, padding: '8px 4px' }}
              onClick={() => onDurationChange(n)}>
              {n}h
            </ToggleChip>
          ))}
        </div>
        <p style={hintStyle}>{hoursHint}</p>
      </div>
    </div>
  );
}
