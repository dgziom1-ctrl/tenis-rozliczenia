import { Trophy, CalendarDays } from 'lucide-react';

export default function AttendanceTab({ players, history, summary }) {
  const totalWeeks = summary?.total_weeks || 0;

  const getMonthlyStats = () => {
    const months = {};
    history.forEach(session => {
      const m = session.date_played.slice(0, 7); 
      if(!months[m]) months[m] = { total: 0, players: {} };
      months[m].total += 1;
      session.present_players.forEach(p => {
        months[m].players[p] = (months[m].players[p] || 0) + 1;
      });
    });
    return Object.entries(months).sort((a,b) => b[0].localeCompare(a[0]));
  };

  const monthlyStats = getMonthlyStats();

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Legends Section */}
        <div className="cyber-box rounded-2xl p-6 lg:col-span-1">
          <h2 className="text-xl font-black text-cyan-300 mb-6 flex items-center gap-3 border-b-2 border-cyan-800 pb-3">
            <Trophy className="text-yellow-500" /> Rangi wg % obecności
          </h2>
          <div className="space-y-4">
            {[
              { pct: '90%+', emoji: '🏆', name: 'LEGENDA', color: 'text-yellow-400' },
              { pct: '75%+', emoji: '⭐', name: 'Mistrz', color: 'text-orange-400' },
              { pct: '50%+', emoji: '🔥', name: 'Stały', color: 'text-rose-400' },
              { pct: '25%+', emoji: '👀', name: 'Gość', color: 'text-cyan-400' },
              { pct: '<25%', emoji: '👻', name: 'Duch', color: 'text-slate-500' }
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-cyan-900/50">
                <span className={`font-bold ${r.color} flex items-center gap-2`}>{r.emoji} {r.name}</span>
                <span className="text-cyan-600 font-mono text-sm">{r.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="cyber-box rounded-2xl p-6 lg:col-span-2 overflow-hidden">
          <h2 className="text-xl font-black text-cyan-300 mb-6 flex items-center gap-3 border-b-2 border-cyan-800 pb-3">
            <CalendarDays className="text-magenta-500" /> Raport Miesięczny
          </h2>

          {monthlyStats.length === 0 ? (
            <p className="text-cyan-700 text-center py-10">Brak logów z gier. Dodaj pierwszy tydzień!</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-black">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-cyan-950 text-cyan-300 tracking-wider">
                    <th className="p-3 rounded-tl-lg">Miesiąc</th>
                    <th className="p-3">Gier</th>
                    {players?.map(p => (
                      <th key={p.name} className="p-3 text-center text-sm">{p.name.slice(0, 3)}.</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-cyan-900/50">
                  {monthlyStats.map(([month, data]) => (
                    <tr key={month} className="hover:bg-cyan-900/20 transition-colors">
                      <td className="p-3 font-bold text-cyan-100">{month}</td>
                      <td className="p-3 text-magenta-400 font-black">{data.total}</td>
                      {players?.map(p => {
                        const presence = data.players[p.name] || 0;
                        const isMax = presence === data.total;
                        return (
                          <td key={p.name} className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${isMax ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500' : (presence > 0 ? 'text-cyan-400' : 'text-cyan-800')}`}>
                              {presence}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}