import { useState, useEffect } from 'react';
import { Settings, Users, Zap, Database } from 'lucide-react';
import { addSession } from '../../firebase';

const MONTHS = [
  'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'
];

function DatePicker({ value, onChange }) {
  const today = new Date();
  const [day,   setDay]   = useState(() => parseInt(value.split('-')[2]));
  const [month, setMonth] = useState(() => parseInt(value.split('-')[1]));
  const [year,  setYear]  = useState(() => parseInt(value.split('-')[0]));

  const daysInMonth = new Date(year, month, 0).getDate();
  const days  = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  const emit = (d, m, y) => onChange(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);

  const handleDay   = (v) => { const d = parseInt(v); setDay(d);   emit(d, month, year); };
  const handleMonth = (v) => { const m = parseInt(v); setMonth(m); const maxD = new Date(year, m, 0).getDate(); const safeD = Math.min(day, maxD); setDay(safeD); emit(safeD, m, year); };
  const handleYear  = (v) => { const y = parseInt(v); setYear(y);  emit(day, month, y); };

  return (
    <div className="grid grid-cols-3 gap-2">
      <select value={day}   onChange={e => handleDay(e.target.value)}   className="cyber-input p-3 rounded-xl text-sm cursor-pointer w-full">
        {days.map(d => <option key={d} value={d}>{String(d).padStart(2,'0')}</option>)}
      </select>
      <select value={month} onChange={e => handleMonth(e.target.value)} className="cyber-input p-3 rounded-xl text-sm cursor-pointer w-full">
        {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
      </select>
      <select value={year}  onChange={e => handleYear(e.target.value)}  className="cyber-input p-3 rounded-xl text-sm cursor-pointer w-full">
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

const QUICK_COSTS = [0, 15, 30, 45, 60];

export default function AdminTab({ playerNames, defaultMultiPlayers, refreshData, setActiveTab, playSound }) {
  const today = new Date().toISOString().split('T')[0];
  const [datePlayed,        setDatePlayed]        = useState(today);
  const [totalCost,         setTotalCost]         = useState('');
  const [presentPlayers,    setPresentPlayers]    = useState([]);
  const [multisportPlayers, setMultisportPlayers] = useState([]);

  useEffect(() => {
    if (!playerNames || playerNames.length === 0) return;
    setPresentPlayers([...playerNames]);
    setMultisportPlayers([...(defaultMultiPlayers || [])]);
  }, [playerNames, defaultMultiPlayers]);

  const togglePresent = (name) => {
    playSound('click');
    if (presentPlayers.includes(name)) {
      setPresentPlayers(prev => prev.filter(p => p !== name));
      setMultisportPlayers(prev => prev.filter(p => p !== name));
    } else {
      setPresentPlayers(prev => [...prev, name]);
    }
  };

  const toggleMulti = (name) => {
    playSound('click');
    setMultisportPlayers(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    playSound('success');
    await addSession({
      date_played:        datePlayed,
      total_cost:         parseFloat(totalCost),
      present_players:    presentPlayers,
      multisport_players: multisportPlayers,
    });
    setTotalCost('');
    setPresentPlayers([...playerNames]);
    setMultisportPlayers([...(defaultMultiPlayers || [])]);
    setActiveTab('dashboard');
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="cyber-box rounded-2xl p-4 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3">
          <Settings className="text-magenta-500 flex-shrink-0" />
          Dodaj nowy tydzień
        </h2>

        <form onSubmit={handleSaveSession} className="space-y-5">

          {/* Data */}
          <div>
            <label className="block font-bold text-cyan-600 mb-2 tracking-wider text-sm">Data gry:</label>
            <DatePicker value={datePlayed} onChange={setDatePlayed} />
          </div>

          {/* Koszt + szybkie przyciski */}
          <div>
            <label className="block font-bold text-cyan-600 mb-2 tracking-wider text-sm">Koszt całkowity (PLN):</label>
            {/* Szybkie przyciski */}
            <div className="flex gap-2 mb-2">
              {QUICK_COSTS.map(cost => (
                <button
                  type="button"
                  key={cost}
                  onClick={() => { setTotalCost(String(cost)); playSound('click'); }}
                  className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm transition-all ${
                    totalCost === String(cost)
                      ? 'border-cyan-400 bg-cyan-950 text-cyan-200 shadow-[0_0_8px_#00f3ff]'
                      : 'border-cyan-900 bg-black text-cyan-700 hover:border-cyan-600 hover:text-cyan-400'
                  }`}
                >
                  {cost === 0 ? 'FREE' : `${cost}`}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder="lub wpisz ręcznie..."
              className="cyber-input p-3 rounded-xl text-sm w-full"
              required
            />
          </div>

          {/* Obecni — bez checkboxa, samo podświetlenie */}
          <div className="cyber-box bg-black/50 p-4 rounded-xl">
            <p className="font-bold text-cyan-400 mb-4 flex items-center gap-2 text-sm">
              <Users size={18} className="text-magenta-500 flex-shrink-0" /> Kto był obecny?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {playerNames.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => togglePresent(name)}
                  className={`p-3 rounded-lg border-2 font-bold text-sm transition-all text-center ${
                    presentPlayers.includes(name)
                      ? 'border-cyan-400 bg-cyan-950 text-cyan-200 shadow-[0_0_8px_#00f3ff]'
                      : 'border-cyan-900 bg-black hover:border-cyan-700 text-cyan-800'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Multi — bez checkboxa */}
          {presentPlayers.length > 0 && (
            <div className="cyber-box bg-black/50 p-4 rounded-xl border-emerald-900">
              <p className="font-bold text-emerald-400 mb-4 flex items-center gap-2 text-sm">
                <Zap size={18} className="text-emerald-500 flex-shrink-0" /> Kto miał Multisport (0 zł)?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {presentPlayers.map((name) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => toggleMulti(name)}
                    className={`p-3 rounded-lg border-2 font-bold text-sm transition-all text-center ${
                      multisportPlayers.includes(name)
                        ? 'border-emerald-400 bg-emerald-950 text-emerald-200 shadow-[0_0_8px_#10b981]'
                        : 'border-emerald-900 bg-black hover:border-emerald-700 text-emerald-800'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit"
            className="cyber-button-blue w-full py-4 rounded-xl text-lg font-black flex justify-center items-center gap-2">
            <Database className="flex-shrink-0" /> ZAPISZ TYDZIEŃ
          </button>
        </form>
      </div>
    </div>
  );
}
