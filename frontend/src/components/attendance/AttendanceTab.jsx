import { Trophy, CalendarDays, Flame, TrendingUp } from 'lucide-react';

const RANKS = [
  { min: 90, emoji: '🏆', name: 'LEGENDA',  color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-600' },
  { min: 75, emoji: '⭐',  name: 'MISTRZ',   color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-700' },
  { min: 60, emoji: '🎖️', name: 'WETERAN',  color: 'text-violet-400', bg: 'bg-violet-950/40', border: 'border-violet-700' },
  { min: 45, emoji: '🔥', name: 'STAŁY',    color: 'text-rose-400',   bg: 'bg-rose-950/40',   border: 'border-rose-800'   },
  { min: 20, emoji: '👀', name: 'GOŚĆ',     color: 'text-cyan-400',   bg: 'bg-cyan-950/40',   border: 'border-cyan-800'   },
  { min:  0, emoji: '👻', name: 'DUCH',     color: 'text-slate-500',  bg: 'bg-slate-900/40',  border: 'border-slate-700'  },
];

const getRank = (pct) => RANKS.find(r => pct >= r.min) || RANKS[RANKS.length - 1];

// Olimpijskie podium: lewy=srebro, środek=złoto(najwyższy), prawy=brąz
const PODIUM = {
  1: { medal: '🥇', barH: 120, card: 'border-yellow-400 bg-yellow-950/50 shadow-[0_0_25px_#ffd70045]', text: 'text-yellow-200', badge: 'border-yellow-500 bg-yellow-900/60 text-yellow-300' },
  2: { medal: '🥈', barH: 80,  card: 'border-slate-400 bg-slate-900/50 shadow-[0_0_12px_#94a3b820]',   text: 'text-slate-200',  badge: 'border-slate-500 bg-slate-800/60 text-slate-300'  },
  3: { medal: '🥉', barH: 55,  card: 'border-amber-700 bg-amber-950/50 shadow-[0_0_10px_#92400e25]',   text: 'text-amber-300',  badge: 'border-amber-600 bg-amber-900/60 text-amber-300'  },
};

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
  const totalWeeks = summary?.total_weeks || 0;

  const getPlayerStats = () => {
    if (!players || !history) return [];
    return players.map(p => {
      const pct = totalWeeks > 0 ? Math.round((p.attendance_count / totalWeeks) * 100) : 0;
      let currentStreak = 0;
      for (const s of history) {
        if (s.present_players.includes(p.name)) currentStreak++;
        else break;
      }
      const multiCount = history.filter(s => s.multisport_players.includes(p.name)).length;
      return { ...p, pct, currentStreak, multiCount };
    }).sort((a, b) => b.pct - a.pct || b.attendance_count - a.attendance_count);
  };

  const assignPlaces = (sorted) => {
    let place = 1;
    return sorted.map((p, i) => {
      if (i > 0 && sorted[i].pct < sorted[i - 1].pct) place = i + 1;
      return { ...p, place };
    });
  };

  const getSpecialTitle = (player, allStats) => {
    if (!allStats.length) return null;
    const maxStreak = Math.max(...allStats.map(p => p.currentStreak));
    const maxMulti  = Math.max(...allStats.map(p => p.multiCount));
    const maxAtt    = Math.max(...allStats.map(p => p.attendance_count));
    const minAtt    = Math.min(...allStats.map(p => p.attendance_count));

    if (player.currentStreak === maxStreak && maxStreak >= 2)
      return { icon: '🔥', label: `Seria ${maxStreak}`, color: 'text-orange-400 border-orange-700 bg-orange-950/30' };
    if (player.multiCount === maxMulti && maxMulti > 0 && allStats.filter(p => p.multiCount === maxMulti).length === 1)
      return { icon: '⚡', label: 'Multi King', color: 'text-emerald-400 border-emerald-700 bg-emerald-950/30' };
    if (player.attendance_count === maxAtt && allStats.filter(p => p.attendance_count === maxAtt).length === 1)
      return { icon: '👑', label: 'Król frekwencji', color: 'text-yellow-400 border-yellow-700 bg-yellow-950/30' };
    if (player.attendance_count === minAtt && player.pct < 40 && allStats.filter(p => p.attendance_count === minAtt).length === 1)
      return { icon: '💀', label: 'Rzadki gość', color: 'text-slate-400 border-slate-700 bg-slate-900/30' };
    return null;
  };

  const getMonthlyStats = () => {
    const months = {};
    history.forEach(s => {
      const m = s.date_played.slice(0, 7);
      if (!months[m]) months[m] = { total: 0, players: {} };
      months[m].total += 1;
      s.present_players.forEach(p => { months[m].players[p] = (months[m].players[p] || 0) + 1; });
    });
    return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const stats        = getPlayerStats();
  const ranked       = assignPlaces(stats);
  const monthlyStats = getMonthlyStats();

  // Podium: gracze z miejsc 1,2,3 (może być kilka ex aequo)
  const byPlace   = {};
  ranked.forEach(p => { if (!byPlace[p.place]) byPlace[p.place] = []; byPlace[p.place].push(p); });
  const hasTop3   = ranked.some(p => p.place <= 3);
  const theRest   = ranked.filter(p => p.place > 3);

  // Kolejność slotów: srebro (2) | złoto (1) | brąz (3)
  const podiumOrder = [2, 1, 3];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-300">

      {/* ── LEADERBOARD ─────────────────────────────────────── */}
      <div className="cyber-box rounded-2xl p-6">
        <h2 className="text-xl font-black text-cyan-300 mb-8 flex items-center gap-3 border-b-2 border-cyan-800 pb-3">
          <TrendingUp className="text-magenta-500" /> Leaderboard
        </h2>

        {/* PODIUM OLIMPIJSKIE — poziome, słupki wyrównane do dołu */}
        {hasTop3 && (
          <div className="flex items-end justify-center gap-2 sm:gap-4 mb-8">
            {podiumOrder.map((place) => {
              const pod       = PODIUM[place];
              const podPlayers = byPlace[place] || [];
              if (podPlayers.length === 0) return (
                <div key={place} className="flex-1 max-w-[180px]" />
              );
              const exAequo = podPlayers.length > 1;

              return (
                <div key={place} className="flex flex-col items-center flex-1 max-w-[180px]">
                  {/* Karta/karty gracza */}
                  <div className="w-full space-y-2 mb-0">
                    {podPlayers.map(player => {
                      const rank = getRank(player.pct);
                      return (
                        <div key={player.name} className={`w-full rounded-xl border-2 p-3 text-center ${pod.card}`}>
                          <div className="text-xl mb-1">{rank.emoji}</div>
                          <div className={`font-black text-sm sm:text-base truncate ${pod.text}`}>{player.name}</div>
                          <div className={`font-mono text-xl font-black ${pod.text}`}>{player.pct}%</div>
                          <div className="text-xs opacity-60 text-cyan-500 mb-1">{player.attendance_count}/{totalWeeks}</div>
                          {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
                        </div>
                      );
                    })}
                    {exAequo && (
                      <div className="text-center text-xs text-cyan-600 font-bold tracking-widest">EX AEQUO</div>
                    )}
                  </div>

                  {/* Słupek podium */}
                  <div
                    className={`w-full rounded-t-xl border-2 flex flex-col items-center justify-center gap-1 ${pod.card}`}
                    style={{ height: `${pod.barH}px` }}
                  >
                    <span className="text-3xl">{pod.medal}</span>
                    <span className={`font-black text-xs opacity-70 ${pod.text}`}>
                      #{place}{exAequo ? ` ×${podPlayers.length}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RESZTA RANKINGU — kompaktowe wiersze z pełnym info */}
        {theRest.length > 0 && (
          <div className="border-t-2 border-cyan-900/50 pt-5 space-y-2">
            {theRest.map((player) => {
              const rank         = getRank(player.pct);
              const specialTitle = getSpecialTitle(player, stats);
              return (
                <div key={player.name}
                  className={`rounded-xl border-2 px-4 py-3 flex items-center gap-3 ${rank.bg} ${rank.border} transition-all hover:scale-[1.005]`}>
                  <span className="text-cyan-700 font-mono text-sm w-6 flex-shrink-0">#{player.place}</span>
                  <span className="text-xl flex-shrink-0">{rank.emoji}</span>
                  <span className={`font-black text-base flex-1 min-w-0 truncate ${rank.color}`}>{player.name}</span>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {player.currentStreak >= 2 && <StreakBadge streak={player.currentStreak} />}
                    {specialTitle && (
                      <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${specialTitle.color}`}>
                        {specialTitle.icon} {specialTitle.label}
                      </span>
                    )}
                    {player.multiCount > 0 && (
                      <span className="text-emerald-400 text-xs font-bold hidden sm:inline">⚡{player.multiCount}</span>
                    )}
                    <span className="text-cyan-600 text-xs">{player.attendance_count}/{totalWeeks}</span>
                    <span className={`font-black text-lg w-12 text-right ${rank.color}`}>{player.pct}%</span>
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

      {/* ── LEGENDA RANG ──────────────────────────────────── */}
      <div className="cyber-box rounded-2xl p-6">
        <h2 className="text-xl font-black text-cyan-300 mb-4 flex items-center gap-3 border-b-2 border-cyan-800 pb-3">
          <Trophy className="text-yellow-500" /> Rangi
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {RANKS.map((r, i) => (
            <div key={i} className={`flex flex-col items-center p-3 rounded-xl border-2 bg-black/30 ${r.border}`}>
              <span className="text-2xl mb-1">{r.emoji}</span>
              <span className={`font-black text-sm ${r.color}`}>{r.name}</span>
              <span className="text-cyan-700 font-mono text-xs mt-1">{i === RANKS.length - 1 ? '<20%' : `${r.min}%+`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RAPORT MIESIĘCZNY ─────────────────────────────── */}
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
                  {players?.map(p => <th key={p.name} className="p-3 text-center text-sm">{p.name.slice(0, 3)}.</th>)}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-cyan-900/50">
                {monthlyStats.map(([month, data]) => (
                  <tr key={month} className="hover:bg-cyan-900/20 transition-colors">
                    <td className="p-3 font-bold text-cyan-100">{month}</td>
                    <td className="p-3 text-magenta-400 font-black">{data.total}</td>
                    {players?.map(p => {
                      const presence = data.players[p.name] || 0;
                      const isMax    = presence === data.total;
                      return (
                        <td key={p.name} className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            isMax ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500'
                                  : presence > 0 ? 'text-cyan-400' : 'text-cyan-900'
                          }`}>{presence}</span>
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
