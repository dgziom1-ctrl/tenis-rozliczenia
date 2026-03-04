import { useState } from 'react';
import { History, Pencil, Trash2, Check, X, Zap, Users, Lock, CalendarDays } from 'lucide-react';
import { updateWeek, deleteWeek } from '../../firebase/index';
import { ADMIN_PASSWORD } from '../../constants';
import { groupHistoryByMonth } from '../../utils/calculations';
import { formatDate, formatAmount } from '../../utils/format';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';

function EditDateInput({ value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        className="cyber-input w-full p-3 rounded-xl text-sm flex items-center justify-between gap-3"
        style={{ pointerEvents: 'none' }}
      >
        <span>{formatDate(value)}</span>
        <CalendarDays size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
      </div>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="date-overlay"
        onClick={e => e.currentTarget.showPicker?.()}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 2,
          padding: 0, border: 'none', boxSizing: 'border-box',
          fontSize: '16px',
        }}
      />
    </div>
  );
}

function PasswordModal({ action, onConfirm, onCancel }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      onConfirm();
    } else {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="cyber-box rounded-2xl p-6 w-full max-w-sm border-cyan-500">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="text-cyan-400 flex-shrink-0" size={22}/>
          <h3 className="font-black text-cyan-300 text-lg">Podaj hasło admina</h3>
        </div>
        <p className="text-cyan-700 text-sm mb-4">{action}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Hasło..."
            autoFocus
            className={`cyber-input w-full p-3 rounded-xl text-sm transition-all ${
              error ? 'border-rose-500 shadow-[0_0_10px_#f4333360]' : ''
            }`}
          />
          {error && <p className="text-rose-400 text-xs font-bold text-center">❌ Złe hasło</p>}
          <div className="flex gap-3">
            <button type="submit"
              className="flex-1 py-3 rounded-xl border-2 border-cyan-500 text-cyan-300 bg-cyan-950/50 hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all flex items-center justify-center gap-2">
              <Check size={16}/> POTWIERDŹ
            </button>
            <button type="button" onClick={onCancel}
              className="flex-1 py-3 rounded-xl border-2 border-cyan-900 text-cyan-700 hover:border-cyan-700 font-bold text-sm transition-all flex items-center justify-center gap-2">
              <X size={16}/> ANULUJ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HistoryTab({ history, playerNames, playSound }) {
  const [editingId,   setEditingId]   = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [deletingId,  setDeletingId]  = useState(null);
  const [isSaving,    setIsSaving]    = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(null); // id sesji aktualnie usuwanej

  const [pwModal, setPwModal] = useState(null); // { type: 'edit'|'delete', rowId, row? }

  const { showError } = useToast();

  // ── Akcje po podaniu hasła ─────────────────────────
  const requestEdit = (row) => setPwModal({ type: 'edit', row });
  const requestDelete = (id) => setPwModal({ type: 'delete', rowId: id });

  const handlePasswordConfirm = () => {
    if (pwModal.type === 'edit') {
      const row = pwModal.row;
      setEditingId(row.id);
      setEditForm({
        date:         row.datePlayed,
        cost:         row.totalCost,
        present:      [...row.presentPlayers],
        multiPlayers: [...row.multisportPlayers],
      });
    } else if (pwModal.type === 'delete') {
      setDeletingId(pwModal.rowId);
    }
    setPwModal(null);
  };

  // ── Edit handlers ──────────────────────────────────
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await updateWeek(editingId, {
        date:         editForm.date,
        cost:         parseFloat(editForm.cost),
        present:      editForm.present,
        multiPlayers: editForm.multiPlayers,
      });
      if (!result.success) {
        showError(result.error || 'Nie udało się zapisać sesji');
        return;
      }
      setEditingId(null);
      setEditForm({});
    } finally {
      setIsSaving(false);
    }
  };

  const togglePresent = (name) => {
    setEditForm(prev => {
      const inList = (prev.present || []).includes(name);
      return {
        ...prev,
        present:      inList ? prev.present.filter(p => p !== name) : [...prev.present, name],
        multiPlayers: inList ? (prev.multiPlayers || []).filter(p => p !== name) : prev.multiPlayers,
      };
    });
  };

  const toggleMulti = (name) => {
    setEditForm(prev => {
      const inList = (prev.multiPlayers || []).includes(name);
      return { ...prev, multiPlayers: inList ? prev.multiPlayers.filter(p => p !== name) : [...prev.multiPlayers, name] };
    });
  };

  const handleDelete = async (id) => {
    if (isDeleting) return;
    setIsDeleting(id);
    try {
      const result = await deleteWeek(id);
      if (!result.success) {
        showError(result.error || 'Nie udało się usunąć sesji');
        return;
      }
      setDeletingId(null);
    } finally {
      setIsDeleting(null);
    }
  };

  const grouped = groupHistoryByMonth(history);

  return (
    <>
      {pwModal && (
        <PasswordModal
          action={pwModal.type === 'edit' ? 'Podaj hasło żeby edytować tę sesję.' : 'Podaj hasło żeby usunąć tę sesję.'}
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      <div className="cyber-box rounded-2xl p-4 sm:p-6 overflow-hidden animate-in slide-in-from-right-5 duration-300">
        <h2 className="text-xl font-black text-cyan-300 mb-8 flex items-center gap-3 border-b-2 border-cyan-800 pb-4">
          <History className="text-magenta-500" /> Historia rozgrywek
        </h2>

        {history.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <CalendarDays className="mx-auto text-cyan-900" size={48} />
            <p className="text-cyan-700 font-bold">Brak historii rozgrywek.</p>
            <p className="text-cyan-800 text-sm">Dodaj pierwszą sesję w zakładce Dodaj sesję!</p>
          </div>
        )}

        <div className="space-y-8">
          {grouped.map(({ label, rows }) => (
            <div key={label}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-cyan-800 bg-cyan-950/50">
                  <CalendarDays size={13} className="text-cyan-600" />
                  <span className="text-cyan-500 font-black text-xs tracking-widest uppercase">{label}</span>
                  <span className="text-cyan-800 font-mono text-xs ml-1">{rows.length}×</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-cyan-800 to-transparent" />
              </div>

              <div className="space-y-3">
                {rows.map((row) => {
                  const isEditingRow  = editingId  === row.id;
                  const isDeletingRow = deletingId === row.id;

                  if (isEditingRow) return (
                    <div key={row.id} className="cyber-box border-cyan-500 rounded-xl p-4 space-y-4 bg-cyan-950/10">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-cyan-600 text-xs font-bold mb-1 tracking-wider">DATA</label>
                          <EditDateInput value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} />
                        </div>
                        <div>
                          <label className="block text-cyan-600 text-xs font-bold mb-1 tracking-wider">KOSZT (PLN)</label>
                          <input type="number" value={editForm.cost}
                            onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))}
                            className="cyber-input w-full p-3 rounded-xl text-sm"/>
                        </div>
                      </div>
                      <div>
                        <p className="text-cyan-500 text-xs font-bold mb-2 tracking-wider flex items-center gap-1"><Users size={13}/> OBECNI</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {playerNames.map(name => (
                            <button type="button" key={name} onClick={() => togglePresent(name)}
                              className={`p-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                editForm.present?.includes(name)
                                  ? 'border-cyan-500 bg-cyan-950 text-cyan-200'
                                  : 'border-cyan-900 bg-black text-cyan-800 hover:border-cyan-700'
                              }`}>{name}</button>
                          ))}
                        </div>
                      </div>
                      {editForm.present?.length > 0 && (
                        <div>
                          <p className="text-emerald-500 text-xs font-bold mb-2 tracking-wider flex items-center gap-1"><Zap size={13}/> MULTISPORT</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {editForm.present.map(name => (
                              <button type="button" key={name} onClick={() => toggleMulti(name)}
                                className={`p-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                  editForm.multiPlayers?.includes(name)
                                    ? 'border-emerald-500 bg-emerald-950 text-emerald-200'
                                    : 'border-emerald-900 bg-black text-emerald-800 hover:border-emerald-700'
                                }`}>{name}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button onClick={saveEdit} disabled={isSaving}
                          className="flex-1 py-2 rounded-xl border-2 border-cyan-500 text-cyan-300 bg-cyan-950/50 hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                          {isSaving ? <><InlineSpinner size="sm" /> Zapisuję...</> : <><Check size={16}/> ZAPISZ</>}
                        </button>
                        <button onClick={cancelEdit} disabled={isSaving}
                          className="flex-1 py-2 rounded-xl border-2 border-cyan-900 text-cyan-700 hover:border-cyan-700 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          <X size={16}/> ANULUJ
                        </button>
                      </div>
                    </div>
                  );

                  if (isDeletingRow) return (
                    <div key={row.id} className="cyber-box border-rose-600 rounded-xl p-5 bg-rose-950/20">
                      <p className="text-rose-300 font-bold mb-1">Usunąć sesję z dnia <span className="text-white">{formatDate(row.datePlayed)}</span>?</p>
                      <p className="text-rose-700 text-sm mb-4">Ta operacja jest nieodwracalna.</p>
                      <div className="flex gap-3">
                        <button onClick={() => handleDelete(row.id)} disabled={isDeleting === row.id}
                          className="flex-1 py-2 rounded-xl border-2 border-rose-500 text-rose-300 bg-rose-950/50 hover:bg-rose-500 hover:text-black font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                          {isDeleting === row.id ? <><InlineSpinner size="sm" /> Usuwam...</> : <><Trash2 size={16}/> USUŃ</>}
                        </button>
                        <button onClick={() => setDeletingId(null)} disabled={isDeleting === row.id}
                          className="flex-1 py-2 rounded-xl border-2 border-cyan-900 text-cyan-700 hover:border-cyan-700 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          <X size={16}/> ANULUJ
                        </button>
                      </div>
                    </div>
                  );

                  return (
                    <div key={row.id} className="cyber-box rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-cyan-600 transition-all">
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm min-w-0">
                        <div>
                          <p className="text-cyan-700 text-xs tracking-wider">DATA</p>
                          <p className="text-cyan-100 font-bold">{formatDate(row.datePlayed)}</p>
                        </div>
                        <div>
                          <p className="text-cyan-700 text-xs tracking-wider">KOSZT</p>
                          <p className="text-magenta-400 font-black text-neon-pink">{formatAmount(row.totalCost)}</p>
                        </div>
                        <div>
                          <p className="text-cyan-700 text-xs tracking-wider">NA OSOBĘ</p>
                          <p className="text-cyan-400 font-bold">{formatAmount(row.costPerPerson)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-cyan-700 text-xs tracking-wider">OBECNI ({row.presentPlayers.length})</p>
                          <p className="text-cyan-600 text-xs truncate">{row.presentPlayers.join(', ')}</p>
                          {row.multisportPlayers.length > 0 && (
                            <p className="text-emerald-600 text-xs truncate">⚡ {row.multisportPlayers.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => requestEdit(row)}
                          className="p-3 rounded-lg border-2 border-cyan-800 text-cyan-600 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 transition-all" title="Edytuj" aria-label="Edytuj sesję">
                          <Pencil size={16}/>
                        </button>
                        <button onClick={() => requestDelete(row.id)}
                          className="p-3 rounded-lg border-2 border-magenta-900 text-magenta-700 hover:border-magenta-500 hover:text-magenta-300 hover:bg-magenta-950/50 transition-all" title="Usuń" aria-label="Usuń sesję">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
