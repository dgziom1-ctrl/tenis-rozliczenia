import { useId } from 'react';
import { Check, X, Zap, Users } from 'lucide-react';
import { InlineSpinner } from '../common/LoadingSkeleton';
import ShareBreakdown from '../common/ShareBreakdown';
import CyberDateInput from '../admin/CyberDateInput';
import { SPORT_EMOJI } from '@/constants';
import { CLIP } from '@/constants/styles';
import { parseAmount, formatAmountShort } from '@/utils/format';
import { getShareGroups } from '@/utils/sessionCost';
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

  const racketCost = editForm.racketCost ?? 0;
  const parsedCost = parseAmount(editForm.cost);
  // Podgląd liczy tym samym silnikiem co zapisane salda, więc po zmianie kwoty
  // od razu widać, ile faktycznie wyjdzie każdej grupie.
  const previewGroups = isEditCostValid && editForm.present?.length > 0
    ? getShareGroups({
      totalCost: parsedCost,
      racketCost,
      presentPlayers: editForm.present,
      multisportPlayers: editForm.multiPlayers ?? [],
      ownRacketPlayers: editForm.ownRacketPlayers ?? [],
    })
    : [];

  return (
    <div style={{
      background: 'var(--co-dark)', border: '1px solid var(--co-tint-line)',
      clipPath: CLIP.smallCard,
      padding: 16, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div className="field-pair">
        <div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>DATA</span>
          <CyberDateInput compact label="Data sesji" value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} />
        </div>
        <div>
          <label htmlFor={costId} style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Koszt całkowity
          </label>
          <input id={costId} type="text" inputMode="decimal" value={editForm.cost}
            onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))}
            aria-invalid={!isEditCostValid}
            aria-describedby={isEditCostValid ? undefined : costErrorId}
            className="cyber-input"
            style={{ width: '100%', padding: '10px 12px', clipPath: CLIP.tag }}
          />
          {!isEditCostValid ? (
            <p id={costErrorId} role="alert" style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--co-rose)' }}>
              ⚠ {editCostError}
            </p>
          ) : (
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
              {racketCost > 0
                ? `> Zapłacone w recepcji, w tym rakiety ${formatAmountShort(racketCost)} zł`
                : '> Zapłacone w recepcji, po odliczeniu kart Multisport'}
            </p>
          )}
        </div>
      </div>

      {previewGroups.length > 0 && (
        <div style={{ padding: '10px 12px', background: 'var(--co-tint)', border: '1px solid var(--co-tint-line)', clipPath: CLIP.tag }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-dim)', marginBottom: 6, textTransform: 'uppercase' }}>
            Po zmianie na osobę
          </p>
          <ShareBreakdown groups={previewGroups} sportEmoji={SPORT_EMOJI[editForm.sport] ?? '🏓'} size="sm" />
        </div>
      )}
      <div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.18em', color: 'var(--co-dim)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
          <Users size={11} /> OBECNI
        </p>
        <div className="player-grid">
          {playerNames.map(name => (
            <button type="button" key={name} onClick={() => onTogglePresent(name)}
              style={{
                padding: '6px 8px', fontSize: '0.75rem', fontFamily: 'var(--font-display)', 
                letterSpacing: '0.06em', cursor: 'pointer', border: '1px solid',
                clipPath: CLIP.badge,
                transition: 'all 0.15s',
                ...(editForm.present?.includes(name) ? {
                  borderColor: 'var(--co-tint-line)', background: 'var(--co-tint-hi)', color: 'var(--co-cyan)',
                } : {
                  borderColor: 'var(--co-border)', background: 'transparent', color: 'var(--co-dim)',
                }),
              }}>
              {name}
            </button>
          ))}
        </div>
      </div>
      {editForm.present?.length > 0 && (
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.18em', color: 'var(--co-green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
            <Zap size={11} /> MULTISPORT
          </p>
          <div className="player-grid">
            {editForm.present.map(name => (
              <button type="button" key={name} onClick={() => onToggleMulti(name)}
                style={{
                  padding: '6px 8px', fontSize: '0.75rem', fontFamily: 'var(--font-display)', 
                  letterSpacing: '0.06em', cursor: 'pointer', border: '1px solid',
                  clipPath: CLIP.badge,
                  transition: 'all 0.15s',
                  ...(editForm.multiPlayers?.includes(name) ? {
                    borderColor: 'var(--co-tint-line)', background: 'var(--co-tint)', color: 'var(--co-green)',
                  } : {
                    borderColor: 'var(--co-border)', background: 'transparent', color: 'var(--co-dim)',
                  }),
                }}>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onSave} disabled={isSaving || !isEditCostValid}
          aria-label="Zapisz zmiany"
          className="cyber-button-yellow" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {isSaving ? <><InlineSpinner size="sm" /> Zapisuję...</> : <><Check size={14} aria-hidden="true" /> Zapisz</>}
        </button>
        <button onClick={onCancel} disabled={isSaving}
          aria-label="Anuluj edycję"
          className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <X size={14} aria-hidden="true" /> ANULUJ
        </button>
      </div>
    </div>
  );
}
