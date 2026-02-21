import { useState } from 'react';
import { Users, UserPlus, Cpu, Trash2 } from 'lucide-react';
import { addPlayer, deletePlayer } from '../../firebase';   // ← FIREBASE

export default function PlayersTab({ players, refreshData, playSound }) {
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    playSound('success');
    await addPlayer(newPlayerName.trim());   // ← zamiast fetch('/api/players', POST)
    setNewPlayerName('');
    // refreshData() nie potrzebne — Firebase odświeży automatycznie
  };

  const handleDeletePlayer = async (playerName) => {
    if (window.confirm(`Czy na pewno usunąć gracza: ${playerName}?`)) {
      playSound('delete');
      await deletePlayer(playerName);   // ← zamiast fetch('/api/players/name', DELETE)
    }
  };

  return (
    <div className="cyber-box rounded-2xl p-8 max-w-3xl mx-auto animate-in slide-in-from-left-5 duration-300">
      <h2 className="text-2xl font-black text-cyan-300 mb-8 flex items-center gap-3 border-b-2 border-cyan-800 pb-4">
        <Users className="text-magenta-500" /> Zarządzanie graczami
      </h2>
      <form onSubmit={handleAddPlayer} className="flex gap-4 mb-10 p-6 bg-black/40 rounded-xl border-2 border-cyan-900 relative overflow-hidden">
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="Imię nowego gracza..."
          className="cyber-input flex-1 p-4 rounded-xl text-lg relative z-10"
          required
        />
        <button type="submit" className="cyber-button-blue px-8 rounded-xl font-bold flex items-center gap-2 relative z-10">
          <UserPlus size={20}/> DODAJ
        </button>
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {players?.map(p => (
          <div
            key={p.name}
            className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all group ${
              p.name === 'Kamil'
                ? 'bg-yellow-950/30 border-yellow-600 text-yellow-300'
                : 'bg-cyan-950/30 border-cyan-800 hover:border-cyan-500 hover:bg-cyan-900/40 text-cyan-100'
            }`}
          >
            <span className="font-bold text-xl flex items-center gap-2">
              <Cpu size={18} className={p.name === 'Kamil' ? 'text-yellow-500' : 'text-cyan-600 group-hover:text-cyan-400'} />
              {p.name} {p.name === 'Kamil' && '👑'}
            </span>
            {p.name !== 'Kamil' && (
              <button
                onClick={() => handleDeletePlayer(p.name)}
                className="bg-magenta-950 p-3 rounded-lg text-magenta-500 hover:bg-magenta-600 hover:text-black border-2 border-magenta-800 transition-all hover:shadow-[0_0_10px_#ff00ff]"
                title="Usuń gracza"
              >
                <Trash2 size={20}/>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
