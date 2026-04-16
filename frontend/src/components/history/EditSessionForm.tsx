import { Check, X, Zap, Users } from 'lucide-react';
import { InlineSpinner } from '../common/LoadingSkeleton';
import EditDateInput from './EditDateInput';
import type { Sport } from '../../types/domain';

interface EditForm {
  date: string;
  cost: string | number;
  present: string[];
  multiPlayers: string[];
  sport: Sport;
  racketCost?: number;
}

interface EditSessionFormProps {
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
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
  return (
    <div style={{
      background: 'var(--co-dark)', border: '1px solid rgba(0,229,255,0.25)',
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
      padding: 16, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>DATA</label>
          <EditDateInput value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} />
        </div>
        <div>
          <label style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>KOSZT</label>
          <input type="number" value={editForm.cost}
            onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))}
            className="cyber-input"
            style={{ width: '100%', padding: '10px 12px', fontSize: '0.8rem', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
          />
          {!isEditCostValid && (
            <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--co-rose)' }}>
              ⚠ {editCostError}
            </p>
          )}
        </div>
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.15em', color: 'var(--co-dim)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
          <Users size={11} /> OBECNI
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {playerNames.map(name => (
            <button type="button" key={name} onClick={() => onTogglePresent(name)}
              style={{
                padding: '7px 8px', fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 600,
                letterSpacing: '0.06em', cursor: 'pointer', border: '1px solid',
                clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                transition: 'all 0.15s',
                ...(editForm.present?.includes(name) ? {
                  borderColor: 'rgba(0,229,255,0.5)', background: 'rgba(0,229,255,0.08)', color: 'var(--co-cyan)',
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
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.15em', color: 'var(--co-green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
            <Zap size={11} /> MULTISPORT
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {editForm.present.map(name => (
              <button type="button" key={name} onClick={() => onToggleMulti(name)}
                style={{
                  padding: '7px 8px', fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 600,
                  letterSpacing: '0.06em', cursor: 'pointer', border: '1px solid',
                  clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                  transition: 'all 0.15s',
                  ...(editForm.multiPlayers?.includes(name) ? {
                    borderColor: 'rgba(0,229,255,0.5)', background: 'rgba(0,229,255,0.07)', color: 'var(--co-green)',
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
          {isSaving ? <><InlineSpinner size="sm" /> Zapisuję...</> : <><Check size={14} /> Zapisz</>}
        </button>
        <button onClick={onCancel} disabled={isSaving}
          aria-label="Anuluj edycję"
          className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <X size={14} /> ANULUJ
        </button>
      </div>
    </div>
  );
}
