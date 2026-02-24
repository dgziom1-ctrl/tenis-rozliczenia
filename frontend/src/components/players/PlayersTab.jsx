import { useState } from 'react';
import { Users, UserPlus, Cpu, Trash2, RotateCcw, AlertTriangle, Lock, Check, X } from 'lucide-react';
import { addPlayer, softDeletePlayer, restorePlayer, permanentDeletePlayer } from '../../firebase';

const ADMIN_PASSWORD = 'ponk2026';

function PasswordModal({ playerName, onConfirm, onCancel }) {
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
        <div className="flex items-center gap-3 mb-4">
          <Lock className="text-cyan-400 flex-shrink-0" size={22}/>
          <h3 className="font-black text-cyan-300 text-lg">Autoryzacja</h3>
        </div>
        <p className="text-cyan-700 text-sm mb-4">Podaj hasło żeby usunąć gracza: <span className="text-cyan-300 font-bold">{playerName}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Hasło..." autoFocus
            className={`cyber-input w-full p-3 rounded-xl text-sm transition-all ${error ? 'border-rose-500 shadow-[0_0_10px_#f4333360]' : ''}`}
          />
          {error && <p className="text-rose-400 text-xs font-bold text-center">❌ Złe hasło</p>}
          <div className="flex gap-3">
            <button type="submit" className="flex-1 py-3 rounded-xl border-2 border-cyan-500 text-cyan-300 bg-cyan-950/50 hover:bg-cyan-500 hover:text-black font-bold text-sm transition-all flex items-center justify-center gap-2">
              <Check size={16}/> POTWIERDŹ
            </button>
            <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border-2 border-cyan-900 text-cyan-700 hover:border-cyan-700 font-bold text-sm transition-all flex items-center justify-center gap-2">
              <X size={16}/> ANULUJ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlayersTab({ players, deletedPlayers, refreshData, playSound }) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pwModal,       setPwModal]       = useState(null);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    playSound('success');
    await addPlayer(newPlayerName.trim());
    setNewPlayerName('');
  };

  const handleSoftDelete = async (playerName) => {
    playSound('delete');
    await softDeletePlayer(playerName);
    setPwModal(null);
  };

  const handleRestore = async (playerName) => {
    playSound('success');
    await restorePlayer(playerName);
  };

  const handlePermanentDelete = async (playerName) => {
    playSound('delete');
    await permanentDeletePlayer(playerName);
    setConfirmDelete(null);
  };

  return (
    <>
      {pwModal && (
        <PasswordModal playerName={pwModal} onConfirm={() => handleSoftDelete(pwModal)} onCancel={() => setPwModal(null)} />
      )}

      <div className="cyber-box rounded-2xl p-4 sm:p-8 max-w-3xl mx-auto animate-in slide-in-from-left-5 duration-300">
        <h2 className="text-2xl font-black text-cyan-300 mb-8 flex items-center gap-3 border-b-2 border-cyan-800 pb-4">
          <Users className="text-magenta-500" /> Zarządzanie graczami
        </h2>

        <form onSubmit={handleAddPlayer} className="flex flex-col sm:flex-row gap-3 mb-10 p-4 sm:p-6 bg-black/40 rounded-xl border-2 border-cyan-900">
          <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Imię nowego gracza..." className="cyber-input flex-1 p-4 rounded-xl text-lg w-full" required />
          <button type="submit" className="cyber-button-blue px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto">
            <UserPlus size={20}/> DODAJ
          </button>
        </form>

        {/* Wszyscy gracze — jednolity styl, bez wyróżnienia Kamila */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {players?.map(p => (
            <div key={p.name} className="flex items-center justify-between p-5 rounded-xl border-2 bg-cyan-950/30 border-cyan-800 hover:border-cyan-500 hover:bg-cyan-900/40 transition-all group">
              <span className="font-bold text-xl flex items-center gap-2 truncate text-cyan-100">
                <Cpu size={18} className="flex-shrink-0 text-cyan-600 group-hover:text-cyan-400" />
                {p.name}
              </span>
              <button onClick={() => setPwModal(p.name)}
                className="flex-shrink-0 bg-magenta-950 p-3 rounded-lg text-magenta-500 hover:bg-magenta-600 hover:text-black border-2 border-magenta-800 transition-all hover:shadow-[0_0_10px_#ff00ff]"
                title="Usuń gracza">
                <Trash2 size={20}/>
              </button>
            </div>
          ))}
        </div>

        {deletedPlayers?.length > 0 && (
          <div className="border-t-2 border-cyan-900 pt-6">
            <h3 className="text-lg font-black text-cyan-700 mb-4 flex items-center gap-2">
              <Trash2 size={18}/> Kosz
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {deletedPlayers.map(name => (
                <div key={name}>
                  {confirmDelete === name ? (
                    <div className="p-4 rounded-xl border-2 border-rose-600 bg-rose-950/20">
                      <p className="text-rose-300 text-sm font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle size={14}/> Usunąć {name} na zawsze?
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => handlePermanentDelete(name)}
                          className="flex-1 py-2 rounded-lg border-2 border-rose-500 text-rose-300 hover:bg-rose-500 hover:text-black font-bold text-sm transition-all">
                          USUŃ NA ZAWSZE
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          className="flex-1 py-2 rounded-lg border-2 border-cyan-900 text-cyan-700 hover:border-cyan-700 font-bold text-sm transition-all">
                          ANULUJ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-cyan-900/50 bg-black/20 text-cyan-700">
                      <span className="font-bold flex items-center gap-2 truncate">
                        <Cpu size={16} className="opacity-40 flex-shrink-0"/> {name}
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleRestore(name)}
                          className="p-2 rounded-lg border-2 border-emerald-800 text-emerald-600 hover:border-emerald-500 hover:text-emerald-300 hover:bg-emerald-950/50 transition-all" title="Przywróć">
                          <RotateCcw size={16}/>
                        </button>
                        <button onClick={() => setConfirmDelete(name)}
                          className="p-2 rounded-lg border-2 border-rose-900 text-rose-700 hover:border-rose-500 hover:text-rose-300 hover:bg-rose-950/50 transition-all" title="Usuń na zawsze">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
