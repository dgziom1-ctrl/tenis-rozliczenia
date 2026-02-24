import { useState } from 'react';
import { History, Pencil, Trash2, Check, X, Zap, Users, Lock } from 'lucide-react';
import { updateWeek, deleteWeek } from '../../firebase';

// Hasło do edycji/usuwania
const ADMIN_PASSWORD = 'ponk2026';

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
          <h3 className="font-black text-cyan-300 text-lg">Autoryzacja</h3>
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

  // Password modal state
  const [pwModal, setPwModal] = useState(null); // { type: 'edit'|'delete', rowId, row? }

  // ── Akcje po podaniu hasła ─────────────────────────
  const requestEdit = (row) => {
    setPwModal({ type: 'edit', row });
  };

  const requestDelete = (id) => {
    setPwModal({ type: 'delete', rowId: id });
  };

  const handlePasswordConfirm = () => {
    if (pwModal.type === 'edit') {
      const row = pwModal.row;
      setEditingId(row.id);
      setEditForm({
        date:         row.date_played,
        cost:         row.total_cost,
        present:      [...row.present_players],
        multiPlayers: [...row.multisport_players],
      });
    } else if (pwModal.type === 'delete') {
      setDeletingId(pwModal.rowId);
    }
    setPwModal(null);
  };

  // ── Edit handlers ──────────────────────────────────
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    await updateWeek(editingId, {
      date:         editForm.date,
      cost:         parseFloat(editForm.cost),
      present:      editForm.present,
      multiPlayers: editForm.multiPlayers,
    });
    setEditingId(null);
    setEditForm({});
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
    await deleteWeek(id);
    setDeletingId(null);
  };

  return (
    <>
      {/* Modal hasła */}
      {pwModal && (
        <PasswordModal
          action={pwModal.type === 'edit' ? 'Podaj hasło żeby edytować ten tydzień.' : 'Podaj hasło żeby usunąć ten tydzień.'}
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      <div className="cyber-box rounded-2xl p-4 sm:p-6 overflow-hidden animate-in slide-in-from-right-5 duration-300">
        <h2 className="text-2xl font-black text-cyan-300 mb-8 flex items-center gap-3 border-b-2 border-cyan-800 pb-4">
          <History className="text-magenta-500" /> Historia rozgrywek
        </h2>

        <div className="space-y-4">
          {history.length === 0 && (
            <p className="text-cyan-800 text-center py-10">Brak historii rozgrywek. Dodaj pierwszy tydzień w Panelu Admina!</p>
          )}

          {history.map((row) => {
            const isEditing  = editingId  === row.id;
            const isDeleting = deletingId === row.id;

            if (isEditing) return (
              <div key={row.id} className="cyber-box border-cyan-500 rounded-xl p-4 space-y-4 bg-cyan-950/10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-cyan-600 text-xs font-bold mb-1 tracking-wider">DATA</label>
                    <input type="date" value={editForm.date}
                      onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                      className="cyber-input w-full p-3 rounded-xl text-sm" style={{ maxWidth: '100%', boxSizing: 'border-box' }}/>
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
                  <button onClick={saveEdit}
                    className="flex-1 py-2 rounded-xl border-2 border-cyan-500 text-cyan-300 bg-cyan-950/50 hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all flex items-center justify-center gap-2">
                    <Check size={16}/> ZAPISZ
                  </button>
                  <button onClick={cancelEdit}
                    className="flex-1 py-2 rounded-xl border-2 border-cyan-900 text-cyan-700 hover:border-cyan-700 font-bold text-sm transition-all flex items-center justify-center gap-2">
                    <X size={16}/> ANULUJ
                  </button>
                </div>
              </div>
            );

            if (isDeleting) return (
              <div key={row.id} className="cyber-box border-rose-600 rounded-xl p-5 bg-rose-950/20">
                <p className="text-rose-300 font-bold mb-1">Usunąć tydzień z dnia <span className="text-white">{row.date_played}</span>?</p>
                <p className="text-rose-700 text-sm mb-4">Ta operacja jest nieodwracalna.</p>
                <div className="flex gap-3">
                  <button onClick={() => handleDelete(row.id)}
                    className="flex-1 py-2 rounded-xl border-2 border-rose-500 text-rose-300 bg-rose-950/50 hover:bg-rose-500 hover:text-black font-bold text-sm transition-all flex items-center justify-center gap-2">
                    <Trash2 size={16}/> USUŃ
                  </button>
                  <button onClick={() => setDeletingId(null)}
                    className="flex-1 py-2 rounded-xl border-2 border-cyan-900 text-cyan-700 hover:border-cyan-700 font-bold text-sm transition-all flex items-center justify-center gap-2">
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
                    <p className="text-cyan-100 font-bold">{row.date_played}</p>
                  </div>
                  <div>
                    <p className="text-cyan-700 text-xs tracking-wider">KOSZT</p>
                    <p className="text-magenta-400 font-black text-neon-pink">{row.total_cost} PLN</p>
                  </div>
                  <div>
                    <p className="text-cyan-700 text-xs tracking-wider">NA OSOBĘ</p>
                    <p className="text-cyan-400 font-bold">{row.cost_per_person.toFixed(2)} PLN</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-cyan-700 text-xs tracking-wider">OBECNI</p>
                    <p className="text-cyan-600 text-xs truncate">{row.present_players.join(', ')}</p>
                    {row.multisport_players.length > 0 && (
                      <p className="text-emerald-600 text-xs truncate">Multi: {row.multisport_players.join(', ')}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => requestEdit(row)}
                    className="p-2 rounded-lg border-2 border-cyan-800 text-cyan-600 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 transition-all" title="Edytuj">
                    <Pencil size={16}/>
                  </button>
                  <button onClick={() => requestDelete(row.id)}
                    className="p-2 rounded-lg border-2 border-magenta-900 text-magenta-700 hover:border-magenta-500 hover:text-magenta-300 hover:bg-magenta-950/50 transition-all" title="Usuń">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
