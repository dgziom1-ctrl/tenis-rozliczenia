import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CheckCircle2, Receipt, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { settlePlayer, undoSettle } from '../../firebase';
import { getRank, UNDO_TIMEOUT_SECONDS, SOUND_TYPES, ORGANIZER_NAME } from '../../constants';
import { calculateDebtBreakdown } from '../../utils/calculations';

export default function DashboardTab({ data, history, playSound }) {
  const [openDetails, setOpenDetails] = useState(null);
  const [undoToast, setUndoToast] = useState(null);

  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const totalWeeks = data.summary?.totalWeeks || 0;

  const clearUndoTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  useEffect(() => {
    return () => clearUndoTimers();
  }, [clearUndoTimers]);

  const handleSettleDebt = useCallback(async (playerName) => {
    clearUndoTimers();
    playSound(SOUND_TYPES.SUCCESS);
    const previousValue = await settlePlayer(playerName);
    setUndoToast({ playerName, previousValue, secondsLeft: UNDO_TIMEOUT_SECONDS });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    intervalRef.current = setInterval(() => {
      setUndoToast(prev => {
        if (!prev || prev.secondsLeft <= 1) {
          clearUndoTimers();
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  }, [clearUndoTimers, playSound]);

  const handleUndo = useCallback(async () => {
    if (!undoToast) return;
    clearUndoTimers();
    playSound(SOUND_TYPES.CLICK);
    await undoSettle(undoToast.playerName, undoToast.previousValue);
    setUndoToast(null);
  }, [undoToast, clearUndoTimers, playSound]);

  const getDebtBreakdown = useCallback((playerName, currentDebt) => {
    return calculateDebtBreakdown(playerName, currentDebt, history);
  }, [history]);

  const toggleDetails = useCallback((playerName) => {
    playSound(SOUND_TYPES.CLICK);
    setOpenDetails(prev => prev === playerName ? null : playerName);
  }, [playSound]);

  const progressPct = undoToast ? (undoToast.secondsLeft / UNDO_TIMEOUT_SECONDS) * 100 : 0;

  const sortedPlayers = useMemo(() => {
    if (!data.players) return [];
    
    return [
      ...data.players
        .filter(p => p.name !== ORGANIZER_NAME)
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
      ...data.players.filter(p => p.name === ORGANIZER_NAME),
    ];
  }, [data.players]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {undoToast && (
        <div className="cyber-box border-emerald-600 rounded-2xl p-4 flex items-center justify-between gap-4 relative overflow-hidden bg-emerald-950/30">
          <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-1000" style={{ width: `${progressPct}%` }} />
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={20} />
            <span className="text-emerald-300 font-bold text-sm">
              Opłacono: <span className="text-white">{undoToast.playerName}</span>
            </span>
            <span className="text-emerald-700 font-mono text-xs flex-shrink-0">({undoToast.secondsLeft}s)</span>
          </div>
          <button
            onClick={handleUndo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-emerald-500 text-emerald-300 hover:bg-emerald-500 hover:text-black font-bold text-sm transition-all flex-shrink-0"
          >
            <RotateCcw size={14} /> COFNIJ
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedPlayers.map((player) => {
          const isOrganizer = player.name === ORGANIZER_NAME;
          const hasDebt = player.currentDebt > 0.01;
          const showBreakdown = openDetails === player.name;
          const breakdownList = hasDebt ? getDebtBreakdown(player.name, player.currentDebt) : [];
          const pct = totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0;
          const rank = getRank(pct);

          const cardBorder = hasDebt ? 'border-magenta-800 hover:border-magenta-500' : 'border-cyan-800 hover:border-cyan-500';
          const headerBg = hasDebt ? 'bg-magenta-950/50' : 'bg-cyan-950/50';
          const headerText = hasDebt ? 'text-magenta-300 text-neon-pink' : 'text-cyan-300 text-neon-blue';
          const debtBox = hasDebt ? 'bg-magenta-950/30 border-magenta-800 text-magenta-300' : 'bg-cyan-950/30 border-cyan-800 text-cyan-300';
          const btnStyle = hasDebt
            ? 'bg-magenta-950 border-magenta-500 text-magenta-300 hover:bg-magenta-500 hover:text-black hover:shadow-[0_0_15px_#ff00ff]'
            : 'bg-black border-cyan-900 text-cyan-700 opacity-50 cursor-not-allowed';

          return (
            <div key={player.name} className={`cyber-box ${cardBorder} rounded-2xl overflow-hidden transition-all`}>
              <div className={`${headerBg} p-4 border-b-2 ${hasDebt ? 'border-magenta-600' : 'border-cyan-600'}`}>
                <h3 className={`font-black text-xl ${headerText} flex items-center gap-2`}>
                  <span className="mini-paddle"></span> {player.name}
                </h3>
              </div>
              <div className="p-6 text-center">
                <div className="text-sm text-cyan-700 mb-4 flex flex-col gap-1 items-center">
                  <span>
                    Obecność: <span className="text-cyan-300 text-lg">{player.attendanceCount}</span> / {totalWeeks} ({pct}%)
                  </span>
                  <span className={`font-bold ${rank.color}`}>{rank.emoji} {rank.name}</span>
                </div>

                {isOrganizer ? (
                  <div className="bg-cyan-950/30 border-cyan-800 text-cyan-600 p-4 rounded-xl border-2 shadow-inner mb-4 mt-10">
                    <p className="text-sm font-bold tracking-widest">SKARBNIK</p>
                  </div>
                ) : (
                  <>
                    <div className={`${debtBox} p-4 rounded-xl border-2 shadow-inner mb-4`}>
                      <p className="text-3xl neon-amount">
                        {player.currentDebt.toFixed(2)} <span className="text-sm">PLN</span>
                      </p>
                    </div>

                    {hasDebt && (
                      <div className="mb-6">
                        <button
                          onClick={() => toggleDetails(player.name)}
                          className="text-xs font-bold text-cyan-500 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto py-1 px-2 rounded hover:bg-cyan-900/30 transition-colors"
                        >
                          {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          SZCZEGÓŁY ZALEGŁOŚCI
                        </button>
                        {showBreakdown && (
                          <div className="mt-2 bg-black/60 p-3 rounded-lg text-xs border border-cyan-900/50 text-left space-y-1 shadow-inner">
                            {breakdownList.length > 0 ? (
                              breakdownList.map((item, idx) => (
                                <div key={idx} className="flex justify-between border-b border-cyan-900/30 pb-1 last:border-0 pt-1 first:pt-0">
                                  <span className="text-cyan-600 tracking-wider">{item.date}</span>
                                  <span className="text-rose-400 font-bold">{item.amount.toFixed(2)} PLN</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center text-cyan-800">Przeliczam dane...</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {hasDebt ? (
                      <button
                        onClick={() => handleSettleDebt(player.name)}
                        className={`w-full py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${btnStyle}`}
                      >
                        <Receipt size={18} /> OZNACZ OPŁACONE
                      </button>
                    ) : (
                      <button
                        disabled
                        className={`w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 mt-10 ${btnStyle}`}
                      >
                        <CheckCircle2 size={18} /> ROZLICZONY
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
