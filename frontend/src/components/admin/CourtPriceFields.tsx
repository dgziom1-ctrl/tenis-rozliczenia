import { useId } from 'react';
import { MULTISPORT_DISCOUNT } from '@/constants';
import { CLIP, FONT, SMALL_OUTLINE_BUTTON, TEXT } from '@/constants/styles';
import { formatAmountShort } from '@/utils/format';
import { grossError } from '@/utils/courtRefund';
import type { CourtRefundResolution } from '@/utils/courtRefund';
import FieldLabel from './FieldLabel';

interface CourtPriceFieldsProps {
  grossText: string | number;
  onGrossChange: (value: string) => void;
  /** Pokazuj błąd pustej/złej ceny (po opuszczeniu pola albo w edycji). */
  showGrossError: boolean;
  onGrossBlur?: () => void;
  /** Zwrot ręczny; `undefined` = automatyczny. */
  overrideText: string | number | undefined;
  onOverrideChange: (value: string | undefined) => void;
  resolution: CourtRefundResolution;
  /** Zwrot wg reguł (zł), przed przycięciem do ceny kortu. */
  expectedRefund: number;
  /** Cena za kort-godzinę z ostatniej sesji tego sportu, razem z mnożnikiem kortów × godzin. */
  lastRate?: { perUnit: number; units: number } | null;
  compact?: boolean;
}

const hintStyle = { ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: 0 } as const;

/**
 * Cena kortu z rezerwacji + zwrot za karty → kwota do rozdzielenia.
 * Zastępuje ręczne liczenie „cena minus zniżki” w kalkulatorze.
 */
export default function CourtPriceFields({
  grossText, onGrossChange, showGrossError, onGrossBlur,
  overrideText, onOverrideChange, resolution, expectedRefund, lastRate, compact = false,
}: CourtPriceFieldsProps) {
  const grossId = useId();
  const grossErrId = useId();
  const refundId = useId();
  const refundErrId = useId();

  const grossMsg = grossError(grossText);
  const showGross = showGrossError && grossMsg !== null;
  const scans = Math.round(expectedRefund / MULTISPORT_DISCOUNT);
  const suggestion = lastRate ? Math.round(lastRate.perUnit * lastRate.units * 100) / 100 : null;
  const showSuggestion = suggestion !== null && String(grossText).trim() === '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <FieldLabel htmlFor={grossId}>Cena kortu z rezerwacji (zł)</FieldLabel>
        <p style={{ ...hintStyle, marginBottom: 8 }}>
          Kwota zapłacona przy rezerwacji, jeszcze przed zwrotem za karty. Rakiety doliczysz osobno.
        </p>
        <input
          id={grossId} type="text" inputMode="decimal"
          value={grossText}
          onChange={e => onGrossChange(e.target.value)}
          onBlur={onGrossBlur}
          placeholder="np. 56"
          aria-invalid={showGross}
          aria-describedby={showGross ? grossErrId : undefined}
          className="cyber-input"
          style={{ width: '100%', padding: compact ? '10px 12px' : '10px 14px', clipPath: CLIP.tag }}
        />
        {showSuggestion && lastRate && suggestion !== null && (
          <button
            type="button"
            onClick={() => onGrossChange(String(suggestion))}
            style={{
              ...FONT.mono(TEXT.tiny), color: 'var(--co-cyan)', marginTop: 8,
              background: 'transparent', border: '1px solid var(--co-border)', cursor: 'pointer',
              padding: '2px 10px', minHeight: 44, clipPath: CLIP.badge,
            }}
          >
            Jak ostatnio: {formatAmountShort(suggestion)} zł ({formatAmountShort(lastRate.perUnit)} zł/kort/h)
          </button>
        )}
        {showGross && (
          <p id={grossErrId} role="alert" style={{ ...FONT.display(TEXT.base), color: 'var(--co-rose)', marginTop: 8 }}>
            ⚠ {grossMsg}
          </p>
        )}
      </div>

      <div style={{ padding: '10px 12px', background: 'var(--co-tint)', border: '1px solid var(--co-tint-line)', clipPath: CLIP.tag }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ ...FONT.display(TEXT.base), color: 'var(--co-dim)', textTransform: 'none' }}>
            Zwrot za karty na portfel
          </span>
          <span style={{ ...FONT.mono(TEXT.base), color: 'var(--co-green)' }}>
            −{formatAmountShort(resolution.refund)} zł
          </span>
        </div>

        {!resolution.isManual ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <p style={hintStyle}>
              {scans > 0
                ? `Wg reguł: ${scans} × ${MULTISPORT_DISCOUNT} zł za odbicia kart`
                : 'Nikt nie odbijał karty — brak zwrotu'}
              {resolution.gross !== null && resolution.autoRefund < expectedRefund ? ' (przycięte do ceny kortu)' : ''}
            </p>
            <button
              type="button"
              onClick={() => onOverrideChange(String(resolution.autoRefund))}
              style={SMALL_OUTLINE_BUTTON}
            >
              Zmień
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <label htmlFor={refundId} style={{ ...hintStyle, display: 'block', marginBottom: 6 }}>
              Kwota zwrotu z portfela (zł)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id={refundId} type="text" inputMode="decimal"
                value={overrideText ?? ''}
                onChange={e => onOverrideChange(e.target.value)}
                aria-invalid={resolution.error !== null}
                aria-describedby={resolution.error ? refundErrId : undefined}
                className={resolution.error ? 'cyber-input input-error' : 'cyber-input'}
                style={{ width: 96, padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', clipPath: CLIP.badge }}
              />
              <button
                type="button"
                onClick={() => onOverrideChange(undefined)}
                style={SMALL_OUTLINE_BUTTON}
              >
                Wróć do automatu
              </button>
            </div>
            {resolution.error && (
              <p id={refundErrId} role="alert" style={{ ...FONT.display(TEXT.base), color: 'var(--co-rose)', marginTop: 8 }}>
                ⚠ {resolution.error}
              </p>
            )}
            {resolution.mismatch && (
              <p role="status" style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-amber)', marginTop: 8 }}>
                ⚠ Wg reguł zwrot powinien wynieść {formatAmountShort(resolution.autoRefund)} zł — sprawdź w portfelu, czy zwroty już doszły i czy karty są zaznaczone dobrze.
              </p>
            )}
          </div>
        )}

        {resolution.net !== null && (
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--co-border)',
          }}>
            <span style={{ ...FONT.display(TEXT.base), color: 'var(--co-dim)', textTransform: 'none' }}>
              Zostaje do rozdzielenia
            </span>
            <span style={{ ...FONT.mono(TEXT.lead), color: 'var(--co-cyan)' }}>
              {formatAmountShort(resolution.net)} zł
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
