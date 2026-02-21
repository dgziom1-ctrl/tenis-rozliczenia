import { useState } from 'react';
import { CheckCircle2, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { settlePlayer } from '../../firebase';   // ← FIREBASE

export default function DashboardTab({ data, history, refreshData, playSound }) {
  const [openDetails, setOpenDetails] = useState(null);

  const totalWeeks = data.summary?.total_weeks || 0;

  const handleSettleDebt = async (playerName) => {
    playSound('success');
    await settlePlayer(playerName);   // ← zamiast fetch('/api/players/settle')
    // refreshData() nie potrzebne — Firebase odświeży automatycznie
  };

  const getRank = (percentage) => {
    if (percentage >= 90) return { emoji: '🏆', name: 'LEGENDA',  color: 'text-yellow-400' };
    if (percentage >= 75) return { emoji: '⭐',  name: 'Mistrz',   color: 'text-orange-400' };
    if (percentage >= 50) return { emoji: '🔥', name: 'Stały',    color: 'text-rose-400' };
    if (percentage >= 25) return { emoji: '👀', name: 'Gość',     color: 'text-cyan-400' };
    return                       { emoji: '👻', name: 'Duch',     color: 'text-slate-500' };
  };

  const getDebtBreakdown = (playerName, currentDebt) => {
    if (currentDebt <= 0 || !history) return [];
    let accumulated = 0;
    const breakdown = [];
    for (const session of history) {
      const isPresent = session.present_players.includes(playerName);
      const hasMulti  = session.multisport_players.includes(playerName);
      if (isPresent && !hasMulti) {
        accumulated += session.cost_per_person;
        breakdown.push({ date: session.date_played, amount: session.cost_per_person });
        if (accumulated >= currentDebt - 0.05) break;
      }
    }
    return breakdown;
  };

  const toggleDetails = (playerName) => {
    playSound('click');
    setOpenDetails(prev => prev === playerName ? null : playerName);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="cyber-box bg-gradient-to-br from-magenta-950 to-black rounded-2xl p-6 text-center border-magenta-800 hover:border-magenta-500 transition-all">
          <p className="text-magenta-400 tracking-wider mb-2 font-bold">DO ZEBRANIA</p>
          <p className="text-4xl font-black text-neon-pink">{data.summary?.total_to_collect?.toFixed(2)} PLN</p>
        </div>
        <div className="cyber-box bg-gradient-to-br from-cyan-950 to-black rounded-2xl p-6 text-center border-cyan-800 hover:border-cyan-500 transition-all">
          <p className="text-cyan-400 tracking-wider mb-2 font-bold">ILE TYGODNI</p>
          <p className="text-4xl font-black text-neon-blue">{totalWeeks}</p>
        </div>
        <div className="cyber-box bg-gradient-to-br from-emerald-950 to-black rounded-2xl p-6 text-center border-emerald-800 hover:border-emerald-500 transition-all">
          <p className="text-emerald-400 tracking-wider mb-2 font-bold">ROZLICZENI</p>
          <p className="text-4xl font-black text-emerald-400">{data.summary?.settled_players} / {data.summary?.total_players}</p>
        </div>
      </div>

      {/* PLAYER CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12">
        {data.players?.map((player) => {
          const isTreasurer    = player.name === "Kamil";
          const hasDebt        = player.current_debt > 0.01;
          const showBreakdown  = openDetails === player.name;
          const breakdownList  = hasDebt ? getDebtBreakdown(player.name, player.current_debt) : [];
          const pct            = totalWeeks > 0 ? Math.round((player.attendance_count / totalWeeks) * 100) : 0;
          const rank           = getRank(pct);

          if (isTreasurer) return (
            <div key={player.name} className="cyber-box bg-yellow-950/30 border-yellow-600 rounded-2xl overflow-hidden transform hover:scale-105 transition-all shadow-[0_0_10px_#ffd70030]">
              <div className="bg-yellow-900/50 p-4 flex justify-between items-center border-b-2 border-yellow-600">
                <h3 className="font-black text-xl text-yellow-300 flex items-center gap-2 text-neon-gold">
                  <span className="mini-paddle" style={{backgroundColor: '#ffd700'}}></span> {player.name} 👑
                </h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-sm font-bold text-yellow-500 mb-4 tracking-widest">[ SKARBNIK ]</p>
                <div className="text-yellow-600 flex flex-col gap-1 items-center">
                  <span>Obecność: <span className="text-yellow-300 text-lg">{player.attendance_count}</span> / {totalWeeks} ({pct}%)</span>
                  <span className={`font-bold ${rank.color}`}>{rank.emoji} {rank.name}</span>
                </div>
              </div>
            </div>
          );

          const cardBorder = hasDebt ? "border-magenta-800 hover:border-magenta-500" : "border-cyan-800 hover:border-cyan-500";
          const headerBg   = hasDebt ? "bg-magenta-950/50" : "bg-cyan-950/50";
          const headerText = hasDebt ? "text-magenta-300 text-neon-pink" : "text-cyan-300 text-neon-blue";
          const debtBox    = hasDebt ? "bg-magenta-950/30 border-magenta-800 text-magenta-300" : "bg-cyan-950/30 border-cyan-800 text-cyan-300";
          const btnStyle   = hasDebt
            ? "bg-magenta-950 border-magenta-500 text-magenta-300 hover:bg-magenta-500 hover:text-black hover:shadow-[0_0_15px_#ff00ff]"
            : "bg-black border-cyan-900 text-cyan-700 opacity-50 cursor-not-allowed";

          return (
            <div key={player.name} className={`cyber-box ${cardBorder} rounded-2xl overflow-hidden transition-all group`}>
              <div className={`${headerBg} p-4 border-b-2 ${hasDebt ? 'border-magenta-600' : 'border-cyan-600'}`}>
                <h3 className={`font-black text-xl ${headerText} flex items-center gap-2`}>
                  <span className="mini-paddle"></span> {player.name}
                </h3>
              </div>
              <div className="p-6 text-center">
                <div className="text-sm text-cyan-700 mb-4 flex flex-col gap-1 items-center">
                  <span>Obecność: <span className="text-cyan-300 text-lg">{player.attendance_count}</span> / {totalWeeks} ({pct}%)</span>
                  <span className={`font-bold ${rank.color}`}>{rank.emoji} {rank.name}</span>
                </div>

                <div className={`${debtBox} p-4 rounded-xl border-2 shadow-inner mb-4`}>
                  <p className="text-3xl neon-amount">{player.current_debt.toFixed(2)} <span className="text-sm">PLN</span></p>
                </div>

                {hasDebt && (
                  <div className="mb-6">
                    <button
                      onClick={() => toggleDetails(player.name)}
                      className="text-xs font-bold text-cyan-500 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto py-1 px-2 rounded hover:bg-cyan-900/30 transition-colors"
                    >
                      {showBreakdown ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      SZCZEGÓŁY ZALEGŁOŚCI
                    </button>
                    {showBreakdown && (
                      <div className="mt-2 bg-black/60 p-3 rounded-lg text-xs border border-cyan-900/50 text-left space-y-1 shadow-inner">
                        {breakdownList.length > 0 ? breakdownList.map((item, idx) => (
                          <div key={idx} className="flex justify-between border-b border-cyan-900/30 pb-1 last:border-0 last:pb-0 pt-1 first:pt-0">
                            <span className="text-cyan-600 tracking-wider">{item.date}</span>
                            <span className="text-rose-400 font-bold">{item.amount.toFixed(2)} PLN</span>
                          </div>
                        )) : (
                          <div className="text-center text-cyan-800">Przeliczam dane...</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {hasDebt ? (
                  <button onClick={() => handleSettleDebt(player.name)} className={`w-full py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${btnStyle}`}>
                    <Receipt size={18} /> OZNACZ OPŁACONE
                  </button>
                ) : (
                  <button disabled className={`w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 mt-10 ${btnStyle}`}>
                    <CheckCircle2 size={18} /> ROZLICZONY
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
