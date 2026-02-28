import { useMemo } from 'react';
import { Trophy, CalendarDays, Flame, TrendingUp } from 'lucide-react';
import { getRank, RANKS, PODIUM, PODIUM_ORDER } from '../../constants';
import { calculatePlayerStats, assignRankingPlaces, groupSessionsByMonth, getSpecialTitle } from '../../utils/calculations';

function StreakBadge({ streak }) {
  if (streak < 2) return null;
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-orange-600 bg-orange-950/50 text-orange-400 text-xs font-black">
      <Flame size={10} className="text-orange-500" />
      <span>SERIA {streak}</span>
    </div>
  );
}

function SpecialTitle({ title }) {
  if (!title) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${title.color}`}>
      {title.icon} {title.label}
    </span>
  );
}

export default function AttendanceTab({ players, history, summary }) {
  const totalWeeks = summary?.totalWeeks || 0;

  const stats = useMemo(() => {
    return calculatePlayerStats(players, history, totalWeeks);
  }, [players, history, totalWeeks]);

  const ranked = useMemo(() => {
    return assignRankingPlaces(stats);
  }, [stats]);

  const monthlyStats = useMemo(() => {
    return groupSessionsByMonth(history);
  }, [history]);

  const byPlace = useMemo(() => {
    const result = {};
    ranked.forEach(p => {
      if (!result[p.place]) result[p.place] = [];
      result[p.place].push(p);
    });
    return result;
  }, [ranked]);

  const hasTop3 = ranked.some(p => p.place <= 3);
  const theRest = ranked.filter(p => p.place > 3);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-300">
      <div className="cyber-box rounded-2xl p-6">
        <h2 className="text-xl font-black text-cyan-300 mb-8 flex items-center gap-3 border-b-2 border-cyan-800 pb-3">
          <TrendingUp className="text-magenta-500" /> Leaderboard
        </h2>

        {hasTop3 && (
          <div className="flex items-end justify-center gap-2 sm:gap-4 mb-8">
            {PODIUM_ORDER.map((place) => {
              const pod = PODIUM[place];
              const podPlayers = byPlace[place] || [];
              
              if (podPlayers.length === 0) {
                return <div key={place} className="flex-1 max-w-[180px]" />;
              }

              const exAequo = podPlayers.length > 1;

              return (
                <div key={place} className="flex flex-col items-center flex-1 max-w-[180px]">
                  <div className="w-full space-y-2 mb-0">
                    {podPlayers.map(player => {
                      const rank = getRank(player.attendancePercentage);
                      return (
                        <div key={player.name} className={`w-full rounded-xl border-2 p-3 text-center ${pod.cardStyle}`}>
                          <div className="text-xl mb-1">{rank.emoji}</div>
                          <div className={`font-black text-sm sm:text-base truncate ${pod.textColor}`}>
                            {player.name}
                          </div>
                          <div className={`font-mono text-xl font-black ${pod.textColor}`}>
                            {player.attendancePercentage}%
                          </div>
                          <div className="text-xs opacity-60 text-cyan-500 mb-1">
                            {player.attendanceCount}/{totalWeeks}
                          </div>
                          {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
                        </div>
                      );
                    })}
                    {exAequo && (
                      <div className="text-center text-xs text-cyan-600 font-bold tracking-widest">EX AEQUO</div>
                    )}
                  </div>

                  <div
                    className={`w-full rounded-t-xl border-2 flex flex-col items-center justify-center gap-1 ${pod.cardStyle}`}
                    style={{ height: `${pod.barHeight}px` }}
                  >
                    <span className="text-3xl">{pod.medal}</span>
                    <span className={`font-black text-xs opacity-70 ${pod.textColor}`}>
                      #{place}{exAequo ? ` ×${podPlayers.length}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {theRest.length > 0 && (
          <div className="border-t-2 border-cyan-900/50 pt-5 space-y-2">
            {theRest.map((player) => {
              const rank = getRank(player.attendancePercentage);
              const specialTitle = getSpecialTitle(player, stats);
              
              return (
                <div
                  key={player.name}
                  className={`rounded-xl border-2 px-4 py-3 flex items-center gap-3 ${rank.bg} ${rank.border} transition-all hover:scale-[1.005]`}
                >
                  <span className="text-cyan-700 font-mono text-sm w-6 flex-shrink-0">
                    #{player.place}
                  </span>
                  <span className="text-xl flex-shrink-0">{rank.emoji}</span>
                  <span className={`font-black text-base flex-1 min-w-0 truncate ${rank.color}`}>
                    {player.name}
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
                    {specialTitle && (
                      <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${specialTitle.color}`}>
                        {specialTitle.icon} {specialTitle.label}
                      </span>
                    )}
                    {player.multisportCount > 0 && (
                      <span className="text-emerald-400 text-xs font-bold hidden sm:inline">
                        ⚡{player.multisportCount}
                      </span>
                    )}
                    <span className="text-cyan-600 text-xs">
                      {player.attendanceCount}/{totalWeeks}
                    </span>
                    <span className={`font-black text-lg w-12 text-right ${rank.color}`}>
                      {player.attendancePercentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {ranked.length === 0 && (
          <p className="text-cyan-800 text-center py-10">Dodaj sesje żeby zobaczyć ranking!</p>
        )}
      </div>

      <div className="cyber-box rounded-2xl p-6">
        <h2 className="text-xl font-black text-cyan-300 mb-4 flex items-center gap-3 border-b-2 border-cyan-800 pb-3">
          <Trophy className="text-yellow-500" /> Rangi
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {RANKS.map((r, i) => (
            <div key={i} className={`flex flex-col items-center p-3 rounded-xl border-2 bg-black/30 ${r.border}`}>
              <span className="text-2xl mb-1">{r.emoji}</span>
              <span className={`font-black text-sm ${r.color}`}>{r.name}</span>
              <span className="text-cyan-700 font-mono text-xs mt-1">
                {i === RANKS.length - 1 ? '<20%' : `${r.min}%+`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="cyber-box rounded-2xl p-4 sm:p-6 overflow-hidden">
        <h2 className="text-xl font-black text-cyan-300 mb-6 flex items-center gap-3 border-b-2 border-cyan-800 pb-3">
          <CalendarDays className="text-magenta-500" /> Raport miesięczny
        </h2>
        {monthlyStats.length === 0 ? (
          <p className="text-cyan-700 text-center py-10">Brak danych. Dodaj pierwszy tydzień!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="bg-cyan-950 text-cyan-300 tracking-wider">
                  <th className="p-3 rounded-tl-lg">Miesiąc</th>
                  <th className="p-3">Gier</th>
                  {players?.map(p => (
                    <th key={p.name} className="p-3 text-center text-sm">
                      {p.name.slice(0, 3)}.
                    </th>
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
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              isMax
                                ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500'
                                : presence > 0
                                ? 'text-cyan-400'
                                : 'text-cyan-900'
                            }`}
                          >
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
  );
}
