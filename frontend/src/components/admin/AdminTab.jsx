import { useState } from 'react';
import { Settings, Users, Zap, Database } from 'lucide-react';
import { addSession } from '../../firebase';   // ← FIREBASE

export default function AdminTab({ players, refreshData, setActiveTab, playSound }) {
  const [datePlayed,       setDatePlayed]       = useState(new Date().toISOString().split('T')[0]);
  const [totalCost,        setTotalCost]        = useState('');
  const [presentPlayers,   setPresentPlayers]   = useState([]);
  const [multisportPlayers, setMultisportPlayers] = useState([]);

  const toggleList = (list, setList, item) => {
    playSound('click');
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    playSound('success');

    await addSession({           // ← zamiast fetch('http://localhost:8000/api/sessions')
      date_played:        datePlayed,
      total_cost:         parseFloat(totalCost),
      present_players:    presentPlayers,
      multisport_players: multisportPlayers,
    });

    // Reset formularza i wróć do dashboardu
    setTotalCost('');
    setPresentPlayers([]);
    setMultisportPlayers([]);
    setActiveTab('dashboard');
    // refreshData() nie potrzebne — Firebase odświeży automatycznie
  };

  return (
    <div className="cyber-box rounded-2xl p-8 max-w-3xl mx-auto animate-in slide-in-from-bottom-5 duration-300">
      <h2 className="text-2xl font-black text-cyan-300 mb-8 flex items-center gap-3">
        <Settings className="text-magenta-500" /> Dodaj nowy tydzień
      </h2>
      <form onSubmit={handleSaveSession} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-bold text-cyan-600 mb-3 tracking-wider">Data gry:</label>
            <input
              type="date"
              value={datePlayed}
              onChange={(e) => setDatePlayed(e.target.value)}
              className="cyber-input w-full p-4 rounded-xl text-lg"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-cyan-600 mb-3 tracking-wider">Koszt całkowity (PLN):</label>
            <input
              type="number"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder="np. 120.00"
              className="cyber-input w-full p-4 rounded-xl text-lg"
              required
            />
          </div>
        </div>

        <div className="cyber-box bg-black/50 p-6 rounded-xl">
          <label className="block font-bold text-cyan-400 mb-6 flex items-center gap-2">
            <Users size={20} className="text-magenta-500" /> Kto był obecny?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {players?.map((p) => (
              <label
                key={p.name}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${
                  presentPlayers.includes(p.name)
                    ? 'border-cyan-500 bg-cyan-950 text-cyan-200 shadow-[0_0_5px_#00f3ff]'
                    : 'border-cyan-900 bg-black hover:border-cyan-700 text-cyan-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-sm border-2 ${presentPlayers.includes(p.name) ? 'bg-cyan-500 border-cyan-500' : 'border-cyan-800'}`}></div>
                <input type="checkbox" className="hidden" checked={presentPlayers.includes(p.name)} onChange={() => toggleList(presentPlayers, setPresentPlayers, p.name)} />
                <span className="font-bold">{p.name} {p.name === 'Kamil' && '👑'}</span>
              </label>
            ))}
          </div>
        </div>

        {presentPlayers.length > 0 && (
          <div className="cyber-box bg-black/50 p-6 rounded-xl border-emerald-900">
            <label className="block font-bold text-emerald-400 mb-6 flex items-center gap-2">
              <Zap size={20} className="text-emerald-500" /> Kto miał Multisport (0 zł)?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {presentPlayers.map((pName) => (
                <label
                  key={pName}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${
                    multisportPlayers.includes(pName)
                      ? 'border-emerald-500 bg-emerald-950 text-emerald-200 shadow-[0_0_5px_#10b981]'
                      : 'border-emerald-900 bg-black hover:border-emerald-700 text-emerald-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-sm border-2 ${multisportPlayers.includes(pName) ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-800'}`}></div>
                  <input type="checkbox" className="hidden" checked={multisportPlayers.includes(pName)} onChange={() => toggleList(multisportPlayers, setMultisportPlayers, pName)} />
                  <span className="font-bold">{pName}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="cyber-button-blue w-full py-5 rounded-xl text-xl font-black flex justify-center items-center gap-3">
          <Database /> ZAPISZ TYDZIEŃ
        </button>
      </form>
    </div>
  );
}
