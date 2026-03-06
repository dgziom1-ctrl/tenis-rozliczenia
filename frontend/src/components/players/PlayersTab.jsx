import { useState, useCallback } from 'react';
import { Users, UserPlus, Cpu, Trash2, RotateCcw, AlertTriangle, Lock, Check, X, Zap } from 'lucide-react';
import { addPlayer, softDeletePlayer, restorePlayer, permanentDeletePlayer, saveDefaultMulti } from '../../firebase/index';
import { ADMIN_PASSWORD, SOUND_TYPES } from '../../constants';
import { useToast } from '../common/Toast';
import { useThemeTokens } from '../../context/ThemeContext';

function PasswordModal({ playerName, onConfirm, onCancel, T }) {
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
    <div style={{ background: T.overlayBg }} className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div style={{ background: T.modalBg, border: `2px solid ${T.accentBorder}`, borderRadius: T.modalRadius, boxShadow: T.modalShadow }} className="p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <Lock style={{ color: T.accentColor }} className="flex-shrink-0" size={22}/>
          <h3 style={{ color: T.accentColor, fontFamily: T.fontFamily }} className="font-black text-lg">Podaj hasło admina</h3>
        </div>
        <p style={{ color: T.mutedText }} className="text-sm mb-4">Podaj hasło żeby usunąć gracza: <span style={{ color: T.accentColor }} className="font-bold">{playerName}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Hasło..." autoFocus
            className={`cyber-input w-full p-3 rounded-xl text-sm transition-all ${error ? 'border-rose-500 shadow-[0_0_10px_#f4333360]' : ''}`}
          />
          {error && <p className="text-rose-400 text-xs font-bold text-center">❌ Złe hasło</p>}
          <div className="flex gap-3">
            <button type="submit" style={{ border: `2px solid ${T.accentBorder}`, color: T.accentColor, background: T.accentBg, borderRadius: T.modalRadius }} className="flex-1 py-3 font-bold text-sm transition-all flex items-center justify-center gap-2 hover:opacity-80">
              <Check size={16}/> POTWIERDŹ
            </button>
            <button type="button" onClick={onCancel} style={{ border: `2px solid ${T.cancelBorder}`, color: T.cancelText, borderRadius: T.modalRadius }} className="flex-1 py-3 font-bold text-sm transition-all flex items-center justify-center gap-2 hover:opacity-80">
              <X size={16}/> ANULUJ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlayersTab({ players, deletedPlayers, defaultMultiPlayers, playSound }) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [savingMulti, setSavingMulti] = useState(false);
  const [localMulti, setLocalMulti] = useState(null); // null = use prop
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pwModal,       setPwModal]       = useState(null);
  const { showSuccess, showError } = useToast();
  const T = useThemeTokens();

  const currentMulti = localMulti ?? (defaultMultiPlayers || []);

  const toggleDefaultMulti = async (name) => {
    const next = currentMulti.includes(name)
      ? currentMulti.filter(p => p !== name)
      : [...currentMulti, name];
    setLocalMulti(next);
    setSavingMulti(true);
    const result = await saveDefaultMulti(next);
    setSavingMulti(false);
    if (!result.success) {
      showError('Nie udało się zapisać');
      setLocalMulti(currentMulti); // rollback
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const result = await addPlayer(newPlayerName.trim());
    if (!result.success) {
      showError(result.error || 'Nie udało się dodać gracza');
      return;
    }
    playSound(SOUND_TYPES.SUCCESS);
    showSuccess(`✓ Dodano gracza: ${newPlayerName.trim()}`);
    setNewPlayerName('');
  };

  const handleSoftDelete = async (playerName) => {
    const result = await softDeletePlayer(playerName);
    if (!result.success) {
      showError(result.error || 'Nie udało się usunąć gracza');
      return;
    }
    playSound(SOUND_TYPES.DELETE);
    showSuccess(`Gracz ${playerName} przeniesiony do kosza`);
    setPwModal(null);
  };

  const handleRestore = async (playerName) => {
    const result = await restorePlayer(playerName);
    if (!result.success) {
      showError(result.error || 'Nie udało się przywrócić gracza');
      return;
    }
    playSound(SOUND_TYPES.SUCCESS);
    showSuccess(`✓ Przywrócono: ${playerName}`);
  };

  const handlePermanentDelete = async (playerName) => {
    const result = await permanentDeletePlayer(playerName);
    if (!result.success) {
      showError(result.error || 'Nie udało się trwale usunąć gracza');
      return;
    }
    playSound(SOUND_TYPES.DELETE);
    setConfirmDelete(null);
  };

  return (
    <>
      {pwModal && (
        <PasswordModal playerName={pwModal} onConfirm={() => handleSoftDelete(pwModal)} onCancel={() => setPwModal(null)} T={T} />
      )}

      <div className="cyber-box rounded-2xl p-4 sm:p-8 max-w-3xl mx-auto animate-in slide-in-from-left-5 duration-300">
        <h2 className="text-xl font-black text-cyan-300 mb-8 flex items-center gap-3 border-b-2 border-cyan-800 pb-4">
          <Users className="text-magenta-500" /> Gracze
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
                className="flex-shrink-0 bg-magenta-950 p-3 rounded-lg text-magenta-500 hover:bg-magenta-600 hover:text-black border-2 border-magenta-800 transition-all hover:shadow-magenta-glow"
                title="Usuń gracza">
                <Trash2 size={20}/>
              </button>
            </div>
          ))}
        </div>

        {/* Domyślny Multisport */}
        {players && players.length > 0 && (
          <div className="border-t-2 border-cyan-900 pt-6 mb-8">
            <h3 className="text-lg font-black text-cyan-300 mb-2 flex items-center gap-2">
              <Zap size={18} className="text-emerald-400" /> Multisport na stałe
            </h3>
            <p className="text-cyan-700 text-xs mb-4">Zaznaczeni gracze będą automatycznie oznaczeni jako Multisport przy każdej nowej sesji.</p>
            <div className="grid grid-cols-2 gap-3">
              {players.map(p => (
                <button
                  key={p.name}
                  onClick={() => toggleDefaultMulti(p.name)}
                  disabled={savingMulti}
                  className={`p-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center gap-2 ${
                    currentMulti.includes(p.name)
                      ? 'border-emerald-400 bg-emerald-950 text-emerald-200 shadow-[0_0_8px_#10b981]'
                      : 'border-cyan-900 bg-black text-cyan-700 hover:border-cyan-700'
                  }`}
                >
                  <Zap size={14} className={currentMulti.includes(p.name) ? 'text-emerald-400' : 'text-cyan-800'} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

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
                          className="p-3 rounded-lg border-2 border-emerald-800 text-emerald-600 hover:border-emerald-500 hover:text-emerald-300 hover:bg-emerald-950/50 transition-all" title="Przywróć">
                          <RotateCcw size={16}/>
                        </button>
                        <button onClick={() => setConfirmDelete(name)}
                          className="p-3 rounded-lg border-2 border-rose-900 text-rose-700 hover:border-rose-500 hover:text-rose-300 hover:bg-rose-950/50 transition-all" title="Usuń na zawsze">
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
