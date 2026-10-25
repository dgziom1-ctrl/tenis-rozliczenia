import { useId } from 'react';
import { Check, X, Zap, Users, Hand } from 'lucide-react';
import { InlineSpinner } from '../common/LoadingSkeleton';
import ShareBreakdown from '../common/ShareBreakdown';
import CyberDateInput from '../admin/CyberDateInput';
import SportSelector from '../admin/SportSelector';
import PlayerToggleGrid from '../admin/PlayerToggleGrid';
import { RACKET_PRICE, MULTISPORT_DISCOUNT, MULTISPORT_PER_COURT_HOUR, hasRacketRental } from '@/constants';
import { CLIP } from '@/constants/styles';
import { parseAmount, formatAmountShort } from '@/utils/format';
import { getRacketSelection, getShareGroups, getTotalWithRackets } from '@/utils/sessionCost';
import type { Sport } from '@/types/domain';
import type { SessionEditForm } from '../../types/ui';

interface EditSessionFormProps {
  editForm: SessionEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<SessionEditForm>>;
  playerNames: string[];
  isSaving: boolean;
  isEditCostValid: boolean;
  editCostError: string | null;
  onSave: () => void;
  onCancel: () => void;
  onTogglePresent: (name: string) => void;
  onToggleMulti: (name: string) => void;
}

/** Mały, wspólny styl etykiety sekcji w formularzu edycji. */
const sectionLabel = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.875rem',
  letterSpacing: 'normal',
  color: 'var(--co-dim)',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  textTransform: 'none',
} as const;

export default function EditSessionForm({
  editForm,
  setEditForm,
  playerNames,
  isSaving,
  isEditCostValid,
  editCostError,
  onSave,
  onCancel,
  onTogglePresent,
  onToggleMulti,
}: EditSessionFormProps) {
  const costId = useId();
  const costErrorId = useId();
  const racketPriceId = useId();

  const present = editForm.present ?? [];
  const multiPlayers = editForm.multiPlayers ?? [];
  const ownRacketPlayers = editForm.ownRacketPlayers ?? [];
  const withRackets = hasRacketRental(editForm.sport);

  const parsedCost = parseAmount(editForm.cost);
  const racketSelection = getRacketSelection(
    editForm.sport,
    present,
    ownRacketPlayers,
    editForm.racketCount ?? 0,
    editForm.racketPrice ?? RACKET_PRICE,
  );
  const totalWithRackets = getTotalWithRackets(parsedCost, racketSelection.cost);

  const perCourtHour = MULTISPORT_PER_COURT_HOUR[editForm.sport] ?? MULTISPORT_PER_COURT_HOUR.pingpong;
  const hasCourtConfig = editForm.courtCount != null && editForm.durationHours != null;
  const maxMulti = hasCourtConfig
    ? editForm.courtCount! * editForm.durationHours! * perCourtHour
    : null;
  const multiPresentCount = multiPlayers.filter(p => present.includes(p)).length;
  const multiOverLimit = maxMulti != null && multiPresentCount > maxMulti && multiPresentCount > 0;
  const isPresentValid = present.length > 0;

  // Podgląd liczy tym samym silnikiem co zapisane salda, więc po zmianie kwoty
  // od razu widać, ile faktycznie wyjdzie każdej grupie. Stara sesja bez
  // `courtCount`/`durationHours` zostaje bez limitu kart.
  const previewGroups = isEditCostValid && isPresentValid
    ? getShareGroups({
      totalCost: totalWithRackets,
      racketCost: racketSelection.cost,
      presentPlayers: present,
      multisportPlayers: multiPlayers,
      ownRacketPlayers,
      courtCount: editForm.courtCount,
      durationHours: editForm.durationHours,
      sport: editForm.sport,
    })
    : [];

  const handleSportChange = (sport: Sport) => {
    setEditForm(prev => ({
      ...prev,
      sport,
      racketCount: hasRacketRental(sport) ? (prev.racketCount ?? 0) : 0,
      racketPrice: hasRacketRental(sport) ? (prev.racketPrice ?? RACKET_PRICE) : RACKET_PRICE,
      ownRacketPlayers: hasRacketRental(sport) ? (prev.ownRacketPlayers ?? []) : [],
    }));
  };

  const handleCourtCount = (n: number) => {
    setEditForm(prev => ({
      ...prev,
      courtCount: n,
      // Wybór kortu w starej sesji włącza też domyślną godzinę, żeby limit
      // kart był od razu kompletny i widoczny w podglądzie.
      durationHours: prev.durationHours ?? 1,
    }));
  };

  const handleDuration = (n: number) => {
    setEditForm(prev => ({
      ...prev,
      durationHours: n,
      courtCount: prev.courtCount ?? 1,
    }));
  };

  const toggleOwnRacket = (name: string) => {
    setEditForm(prev => {
      const current = prev.ownRacketPlayers ?? [];
      return {
        ...prev,
        ownRacketPlayers: current.includes(name)
          ? current.filter(p => p !== name)
          : [...current, name],
      };
    });
  };

  return (
    <div style={{
      background: 'var(--co-dark)', border: '1px solid var(--co-tint-line)',
      clipPath: CLIP.smallCard,
      padding: 16, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Sport */}
      <div>
        <span style={sectionLabel}>Sport</span>
        <SportSelector value={editForm.sport} onChange={handleSportChange} />
      </div>

      <div className="field-pair">
        <div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: 'normal', color: 'var(--co-cyan)', display: 'block', marginBottom: 6, textTransform: 'none' }}>Data</span>
          <CyberDateInput compact label="Data sesji" value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} />
        </div>
        <div>
          <label htmlFor={costId} style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: 'normal', color: 'var(--co-cyan)', display: 'block', marginBottom: 6, textTransform: 'none' }}>
            Koszt kortu
          </label>
          <input id={costId} type="text" inputMode="decimal" value={editForm.cost}
            onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))}
            aria-invalid={!isEditCostValid}
            aria-describedby={isEditCostValid ? undefined : costErrorId}
            className="cyber-input"
            style={{ width: '100%', padding: '10px 12px', clipPath: CLIP.tag }}
          />
          {!isEditCostValid ? (
            <p id={costErrorId} role="alert" style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: 'normal', textTransform: 'none', color: 'var(--co-rose)' }}>
              ⚠ {editCostError}
            </p>
          ) : (
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
              {racketSelection.cost > 0
                ? `> Kwota za kort. Rakiety ${formatAmountShort(racketSelection.cost)} zł doliczone osobno — razem ${formatAmountShort(totalWithRackets)} zł`
                : '> Kwota za kort, po odliczeniu kart Multisport'}
            </p>
          )}
        </div>
      </div>

      {/* Korty + godziny — wpływają na limit Multisportu */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <span style={{ ...sectionLabel, marginBottom: 6 }}>Korty / stoły</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3].map(n => {
              const active = editForm.courtCount === n;
              return (
                <button type="button" key={n} onClick={() => handleCourtCount(n)}
                  style={{
                    flex: 1, padding: '8px 4px', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.875rem',
                    clipPath: CLIP.badge,
                    ...(active ? {
                      background: 'var(--co-tint-hi)', border: '1px solid var(--co-tint-line)',
                      color: 'var(--co-cyan)', boxShadow: 'var(--glow-box-cyan)',
                    } : {
                      background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
                    }),
                  }}>
                  {n}
                </button>
              );
            })}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', marginTop: 6 }}>
            {maxMulti != null
              ? `> Limit kart: ${maxMulti} (${perCourtHour}/kort/h)`
              : '> Stara sesja: bez limitu kart'}
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ ...sectionLabel, marginBottom: 6 }}>Godziny</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3].map(n => {
              const active = editForm.durationHours === n;
              return (
                <button type="button" key={n} onClick={() => handleDuration(n)}
                  style={{
                    flex: 1, padding: '8px 4px', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.875rem',
                    clipPath: CLIP.badge,
                    ...(active ? {
                      background: 'var(--co-tint-hi)', border: '1px solid var(--co-tint-line)',
                      color: 'var(--co-cyan)', boxShadow: 'var(--glow-box-cyan)',
                    } : {
                      background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
                    }),
                  }}>
                  {n}h
                </button>
              );
            })}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', marginTop: 6 }}>
            {hasCourtConfig
              ? `> ${editForm.durationHours}h × ${perCourtHour}/kort/h = ${maxMulti} kart`
              : '> Wybierz korty i godziny, aby włączyć limit'}
          </p>
        </div>
      </div>

      {/* Obecni */}
      <div>
        <p style={sectionLabel}><Users size={11} /> Obecni</p>
        <PlayerToggleGrid names={playerNames} selected={present} onToggle={onTogglePresent} accent="yellow" />
        {!isPresentValid && (
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: 'normal', textTransform: 'none', color: 'var(--co-rose)', marginTop: 10, textAlign: 'center' }}>
            ⚠ Wybierz przynajmniej jednego gracza
          </p>
        )}
      </div>

      {/* Multisport */}
      {isPresentValid && (
        <div>
          <p style={{ ...sectionLabel, color: 'var(--co-green)' }}>
            <Zap size={11} /> MULTISPORT (zniżka -{MULTISPORT_DISCOUNT} zł)
          </p>
          <PlayerToggleGrid names={present} selected={multiPlayers} onToggle={onToggleMulti} accent="green" />
          {multiOverLimit && (
            <p role="alert" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-amber)', marginTop: 8 }}>
              ⚠ Limit {maxMulti} kart przekroczony — zniżka zostanie proporcjonalnie podzielona na {multiPresentCount} osób ({Math.floor((maxMulti ?? 0) * MULTISPORT_DISCOUNT / multiPresentCount)} zł/os. zamiast {MULTISPORT_DISCOUNT} zł)
            </p>
          )}
        </div>
      )}

      {/* Własne rakietki */}
      {withRackets && isPresentValid && (
        <div>
          <p style={{ ...sectionLabel, color: 'var(--co-amber)' }}>
            <Hand size={11} /> Własna rakietka
          </p>
          <PlayerToggleGrid names={present} selected={ownRacketPlayers} onToggle={toggleOwnRacket} accent="amber" />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', marginTop: 8 }}>
            {'>'} Zaznacz graczy, którzy przynieśli własną rakietkę — nie płacą za wypożyczenie
          </p>
        </div>
      )}

      {/* Wypożyczone rakiety */}
      {withRackets && (
        <div>
          <p style={sectionLabel}>
            <Hand size={11} /> Wypożyczone rakiety
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <label htmlFor={racketPriceId} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', whiteSpace: 'nowrap' }}>
              Cena / szt.:
            </label>
            <input
              id={racketPriceId}
              type="number"
              min="0"
              step="0.5"
              value={racketSelection.price}
              onChange={e => setEditForm(p => ({ ...p, racketPrice: parseAmount(e.target.value) || 0 }))}
              className="cyber-input"
              style={{ width: 78, padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', clipPath: CLIP.badge }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>zł</span>
            {racketSelection.price !== RACKET_PRICE && (
              <button
                type="button"
                onClick={() => setEditForm(p => ({ ...p, racketPrice: RACKET_PRICE }))}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)',
                  background: 'transparent', border: '1px solid var(--co-border)', cursor: 'pointer',
                  padding: '2px 8px', clipPath: CLIP.badge,
                }}
              >
                reset ({RACKET_PRICE} zł)
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: racketSelection.maxRackets + 1 }, (_, i) => i).map(n => {
              const active = racketSelection.effectiveCount === n;
              return (
                <button type="button" key={n} onClick={() => setEditForm(p => ({ ...p, racketCount: n }))}
                  style={{
                    flex: 1, padding: '8px 4px', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.875rem',
                    clipPath: CLIP.badge,
                    ...(active ? {
                      background: 'var(--co-tint-hi)', border: '1px solid var(--co-tint-line)',
                      color: 'var(--co-cyan)', boxShadow: 'var(--glow-box-cyan)',
                    } : {
                      background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
                    }),
                  }}>
                  {n}
                </button>
              );
            })}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', marginTop: 8 }}>
            {racketSelection.effectiveCount > 0
              ? `> ${racketSelection.effectiveCount} × ${formatAmountShort(racketSelection.price)} zł = ${formatAmountShort(racketSelection.cost)} zł, dzielone między graczy bez własnej rakietki`
              : '> 0 zł — nikt nie wypożycza rakiet'}
          </p>
        </div>
      )}

      {previewGroups.length > 0 && (
        <div style={{ padding: '10px 12px', background: 'var(--co-tint)', border: '1px solid var(--co-tint-line)', clipPath: CLIP.tag }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: 'normal', color: 'var(--co-dim)', marginBottom: 6, textTransform: 'none' }}>
            Po zmianie na osobę
          </p>
          <ShareBreakdown groups={previewGroups} sport={editForm.sport} size="sm" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onSave} disabled={isSaving || !isEditCostValid || !isPresentValid}
          aria-label="Zapisz zmiany"
          className="cyber-button-yellow" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {isSaving ? <><InlineSpinner size="sm" /> Zapisuję...</> : <><Check size={14} aria-hidden="true" /> Zapisz</>}
        </button>
        <button onClick={onCancel} disabled={isSaving}
          aria-label="Anuluj edycję"
          className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <X size={14} aria-hidden="true" /> Anuluj
        </button>
      </div>
    </div>
  );
}
