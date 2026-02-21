import { History } from 'lucide-react';

export default function HistoryTab({ history }) {
  return (
    <div className="cyber-box rounded-2xl p-6 overflow-hidden animate-in slide-in-from-right-5 duration-300">
      <h2 className="text-2xl font-black text-cyan-300 mb-8 flex items-center gap-3 border-b-2 border-cyan-800 pb-4">
        <History className="text-magenta-500" /> Historia rozgrywek
      </h2>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-black">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cyan-950 text-cyan-300 tracking-wider">
              <th className="p-4 rounded-tl-xl">DATA</th>
              <th className="p-4">KOSZT CAŁK.</th>
              <th className="p-4">NA OSOBĘ</th>
              <th className="p-4">OBECNI</th>
              <th className="p-4 rounded-tr-xl">MULTISPORT</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-cyan-900/50">
            {history.map((row) => (
              <tr key={row.id} className="hover:bg-cyan-900/20 transition-colors">
                <td className="p-4 font-bold text-cyan-100">{row.date_played}</td>
                <td className="p-4 text-magenta-400 font-black text-lg text-neon-pink">{row.total_cost} PLN</td>
                <td className="p-4 text-cyan-400 font-bold">{row.cost_per_person.toFixed(2)} PLN</td>
                <td className="p-4 text-sm text-cyan-600">{row.present_players.join(', ')}</td>
                <td className="p-4 text-sm text-emerald-500 font-bold">{row.multisport_players.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}