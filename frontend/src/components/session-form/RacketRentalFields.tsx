import { useId } from 'react';
import ToggleChip from '../common/ToggleChip';
import { RACKET_PRICE } from '@/constants';
import { CLIP, FONT, SMALL_OUTLINE_BUTTON, TEXT } from '@/constants/styles';

interface RacketRentalFieldsProps {
  /** Tekst pola ceny — trzymany przez rodzica, żeby dało się go wyczyścić i wpisać przecinek. */
  priceText: string;
  onPriceTextChange: (text: string) => void;
  /** Cena różni się od domyślnej — pokazujemy przycisk jej przywrócenia. */
  priceIsCustom: boolean;
  onPriceReset: () => void;
  /** Komunikat o błędnej cenie; `null`, gdy poprawna. */
  priceError: string | null;
  /** Ile rakiet można wypożyczyć (liczba graczy bez własnej rakietki). */
  maxRackets: number;
  selectedCount: number;
  onCountChange: (count: number) => void;
  /** Opis kosztu pod przyciskami; `null` — bez opisu. */
  caption: string | null;
}

/**
 * Wypożyczone rakiety: cena za sztukę, przycisk jej przywrócenia, błąd i wybór
 * liczby sztuk. Wspólne dla formularza dodawania i edycji — nagłówek sekcji
 * rysuje wołający, bo tam formularze różnią się wyglądem.
 */
export default function RacketRentalFields({
  priceText, onPriceTextChange, priceIsCustom, onPriceReset, priceError,
  maxRackets, selectedCount, onCountChange, caption,
}: RacketRentalFieldsProps) {
  const priceId = useId();
  const priceErrorId = useId();

  return (
    <>
      {/* Price per racket */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <label htmlFor={priceId} style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', whiteSpace: 'nowrap' }}>
          Cena / szt.:
        </label>
        <input
          id={priceId}
          type="text"
          inputMode="decimal"
          value={priceText}
          onChange={e => onPriceTextChange(e.target.value)}
          aria-invalid={priceError !== null}
          aria-describedby={priceError ? priceErrorId : undefined}
          className={priceError ? 'cyber-input input-error' : 'cyber-input'}
          style={{ width: 78, padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', clipPath: CLIP.badge }}
        />
        <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>zł</span>
        {priceIsCustom && (
          <button
            type="button"
            onClick={onPriceReset}
            style={SMALL_OUTLINE_BUTTON}
          >
            Przywróć {RACKET_PRICE} zł
          </button>
        )}
      </div>
      {priceError && (
        <p id={priceErrorId} role="alert" style={{ ...FONT.display(TEXT.base), color: 'var(--co-rose)', margin: '0 0 10px' }}>
          ⚠ {priceError}
        </p>
      )}

      {/* Racket count buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: maxRackets + 1 }, (_, i) => i).map(n => (
          <ToggleChip key={n} font="mono" active={selectedCount === n}
            ariaLabel={`Liczba wypożyczonych rakiet: ${n}`}
            style={{ flex: 1, minWidth: 44, padding: '8px 4px' }}
            onClick={() => onCountChange(n)}>
            {n}
          </ToggleChip>
        ))}
      </div>
      {caption !== null && (
        <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 8 }}>
          {caption}
        </p>
      )}
    </>
  );
}
