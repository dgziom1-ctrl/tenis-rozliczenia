import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CheckCircle2, Receipt, ChevronDown, ChevronUp, RotateCcw, TrendingUp, Users, CalendarDays } from 'lucide-react';
import { settlePlayer, undoSettle } from '../../firebase/index';
import { getRank, UNDO_TIMEOUT_SECONDS, SOUND_TYPES, ORGANIZER_NAME } from '../../constants';
import { calculateDebtBreakdown } from '../../utils/calculations';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';

// ─── CSS animations injected once ────────────────────────────────────────────
const SETTLE_STYLES = `
  @keyframes settleFlash {
    0%   { box-shadow: 0 0 0px rgba(16,185,129,0); border-color: inherit; }
    20%  { box-shadow: 0 0 30px rgba(16,185,129,0.9), inset 0 0 20px rgba(16,185,129,0.15); border-color: #10b981; }
    60%  { box-shadow: 0 0 20px rgba(16,185,129,0.5); border-color: #10b981; }
    100% { box-shadow: 0 0 0px rgba(16,185,129,0); border-color: inherit; }
  }
  @keyframes checkPop {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    60%  { transform: scale(1.3) rotate(5deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes debtFadeOut {
    0%   { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-8px); }
  }
  .settle-flash {
    animation: settleFlash 0.8s ease-out forwards !important;
  }
`;

// ─── Summary banner ───────────────────────────────────────────────────────────
function SummaryBanner({ summary }) {
  const { totalToCollect = 0, settledPlayers = 0, totalPlayers = 0, totalWeeks = 0 } = summary || {};
  const allSettled = totalPlayers > 0 && settledPlayers === totalPlayers;

  return (
    <div className="cyber-box rounded-2xl p-4 sm:p-5 grid grid-cols-3 gap-3 sm:gap-6">
      <div className="text-center">
        <p className="text-cyan-700 text-xs tracking-widest mb-1 flex items-center justify-center gap-1">
          <TrendingUp size={11} /> DO ZEBRANIA
        </p>
        <p className={`font-mono font-black text-2xl sm:text-3xl ${allSettled ? 'text-emerald-400' : 'text-magenta-400'}`}
           style={{ textShadow: allSettled ? '0 0 12px rgba(52,211,153,0.6)' : '0 0 12px rgba(255,0,255,0.5)' }}>
          {totalToCollect.toFixed(2)}
          <span className="text-sm font-bold ml-1 opacity-70">PLN</span>
        </p>
      </div>
      <div className="text-center border-x-2 border-cyan-900">
        <p className="text-cyan-700 text-xs tracking-widest mb-1 flex items-center justify-center gap-1">
          <Users size={11} /> ROZLICZENI
        </p>
        <p className="font-mono font-black text-2xl sm:text-3xl text-cyan-300">
          {settledPlayers}<span className="text-cyan-700 text-lg">/{totalPlayers}</span>
        </p>
      </div>
      <div className="text-center">
        <p className="text-cyan-700 text-xs tracking-widest mb-1 flex items-center justify-center gap-1">
          <CalendarDays size={11} /> TYGODNI
        </p>
        <p className="font-mono font-black text-2xl sm:text-3xl text-cyan-300">{totalWeeks}</p>
      </div>
    </div>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────
function PlayerCard({ player, totalWeeks, onSettle, isSettling, justSettled, openDetails, onToggleDetails }) {
  const isOrganizer = player.name === ORGANIZER_NAME;
  const hasDebt = player.currentDebt > 0.01;
  const pct = totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0;
  const rank = getRank(pct);

  const cardBorder = hasDebt ? 'border-magenta-800 hover:border-magenta-500' : 'border-cyan-800 hover:border-cyan-500';
  const headerBg   = hasDebt ? 'bg-magenta-950/50' : 'bg-cyan-950/50';
  const headerBord = hasDebt ? 'border-magenta-600' : 'border-cyan-600';
  const headerText = hasDebt ? 'text-magenta-300 text-neon-pink' : 'text-cyan-300 text-neon-blue';

  return (
    <div className={`cyber-box ${cardBorder} rounded-2xl overflow-hidden transition-all flex flex-col ${justSettled ? 'settle-flash' : ''}`}>
      {/* Header */}
      <div className={`${headerBg} p-4 border-b-2 ${headerBord}`}>
        <h3 className={`font-black text-xl ${headerText} flex items-center gap-2`}>
          <span className="mini-paddle" /> {player.name}
        </h3>
      </div>

      {/* Body – flex-1 so all cards stretch equally */}
      <div className="p-5 flex flex-col flex-1">
        {/* Attendance */}
        <div className="text-sm text-cyan-700 mb-4 flex flex-col gap-1 items-center text-center">
          <span>Obecność: <span className="text-cyan-300 text-lg">{player.attendanceCount}</span> / {totalWeeks} ({pct}%)</span>
          <span className={`font-bold ${rank.color}`}>{rank.emoji} {rank.name}</span>
        </div>

        {isOrganizer ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-cyan-950/30 border-cyan-800 text-cyan-600 px-6 py-4 rounded-xl border-2 w-full text-center">
              <p className="text-sm font-bold tracking-widest">SKARBNIK</p>
            </div>
          </div>
        ) : (
          <>
            {/* Debt amount */}
            <div className={`p-4 rounded-xl border-2 shadow-inner mb-3 text-center
              ${hasDebt ? 'bg-magenta-950/30 border-magenta-800' : 'bg-emerald-950/30 border-emerald-900'}`}>
              {justSettled ? (
                <div style={{ animation: 'checkPop 0.4s ease-out forwards' }}>
                  <CheckCircle2 className="text-emerald-400 mx-auto" size={32} />
                </div>
              ) : (
                <p className={`text-3xl neon-amount ${hasDebt ? '' : 'text-emerald-400'}`}
                   style={hasDebt ? {} : { textShadow: '0 0 8px rgba(52,211,153,0.5)' }}>
                  {hasDebt ? player.currentDebt.toFixed(2) : '0.00'}
                  <span className="text-sm ml-1">PLN</span>
                </p>
              )}
            </div>

            {/* Breakdown toggle */}
            {hasDebt && !justSettled && (
              <div className="mb-3">
                <button
                  onClick={() => onToggleDetails(player.name)}
                  className="text-xs font-bold text-cyan-500 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto py-1 px-2 rounded hover:bg-cyan-900/30 transition-colors"
                >
                  {openDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  SZCZEGÓŁY ZALEGŁOŚCI
                </button>
                {openDetails && (
                  <BreakdownList playerName={player.name} currentDebt={player.currentDebt} />
                )}
              </div>
            )}

            {/* Push button to bottom */}
            <div className="mt-auto pt-2">
              {hasDebt && !justSettled ? (
                <button
                  onClick={() => onSettle(player.name)}
                  disabled={isSettling}
                  className="w-full py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 bg-magenta-950 border-magenta-500 text-magenta-300 hover:bg-magenta-500 hover:text-black hover:shadow-[0_0_15px_#ff00ff] disabled:opacity-50 disabled:cursor-wait"
                  aria-label={`Oznacz ${player.name} jako opłaconego`}
                >
                  {isSettling ? <><InlineSpinner size="sm" /> Zapisuję...</> : <><Receipt size={18} /> OZNACZ OPŁACONE</>}
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 bg-black border-cyan-900 text-cyan-700 opacity-60 select-none">
                  <CheckCircle2 size={18} /> ROZLICZONY
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BreakdownList({ playerName, currentDebt }) {
  // This component gets breakdown from parent via prop-drilling would be ugly,
  // so we recalculate via context passed from parent. Instead pass it directly.
  return null; // will be replaced below
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardTab({ data, history, playSound }) {
  const [openDetails,    setOpenDetails]    = useState(null);
  const [undoToast,      setUndoToast]      = useState(null);
  const [settlingPlayer, setSettlingPlayer] = useState(null);
  const [justSettled,    setJustSettled]    = useState(null); // name of recently settled player

  const { showSuccess, showError } = useToast();
  const timerRef    = useRef(null);
  const intervalRef = useRef(null);

  const totalWeeks = data.summary?.totalWeeks || 0;

  const clearUndoTimers = useCallback(() => {
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = intervalRef.current = null;
  }, []);

  useEffect(() => () => clearUndoTimers(), [clearUndoTimers]);

  const handleSettleDebt = useCallback(async (playerName) => {
    clearUndoTimers();

    // Immediate visual feedback
    setJustSettled(playerName);
    playSound(SOUND_TYPES.SUCCESS);

    const result = await settlePlayer(playerName);

    if (!result.success) {
      setJustSettled(null);
      showError(result.error || 'Nie udało się rozliczyć gracza');
      return;
    }

    // Clear flash after 1.5s
    setTimeout(() => setJustSettled(null), 1500);

    setUndoToast({ playerName, previousValue: result.previousValue, secondsLeft: UNDO_TIMEOUT_SECONDS });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    intervalRef.current = setInterval(() => {
      setUndoToast(prev => {
        if (!prev || prev.secondsLeft <= 1) { clearUndoTimers(); return null; }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  }, [clearUndoTimers, playSound, showError]);

  const handleUndo = useCallback(async () => {
    if (!undoToast) return;
    clearUndoTimers();
    playSound(SOUND_TYPES.CLICK);

    const result = await undoSettle(undoToast.playerName, undoToast.previousValue);
    if (!result.success) { showError(result.error || 'Nie udało się cofnąć rozliczenia'); return; }

    setUndoToast(null);
    showSuccess('Rozliczenie cofnięte');
  }, [undoToast, clearUndoTimers, playSound, showError, showSuccess]);

  const toggleDetails = useCallback((playerName) => {
    playSound(SOUND_TYPES.CLICK);
    setOpenDetails(prev => prev === playerName ? null : playerName);
  }, [playSound]);

  const getBreakdown = useCallback((name, debt) => calculateDebtBreakdown(name, debt, history), [history]);

  const progressPct = undoToast ? (undoToast.secondsLeft / UNDO_TIMEOUT_SECONDS) * 100 : 0;

  const sortedPlayers = useMemo(() => {
    if (!data.players) return [];
    return [
      ...data.players.filter(p => p.name !== ORGANIZER_NAME).sort((a, b) => a.name.localeCompare(b.name, 'pl')),
      ...data.players.filter(p => p.name === ORGANIZER_NAME),
    ];
  }, [data.players]);

  return (
    <>
      <style>{SETTLE_STYLES}</style>

      <div className="space-y-6 animate-in fade-in duration-300">

        {/* ── Hero summary banner ── */}
        <SummaryBanner summary={data.summary} />

        {/* ── Undo toast ── */}
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

        {/* ── Player cards grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {sortedPlayers.map((player) => {
            const showBreakdown = openDetails === player.name;
            const breakdown = showBreakdown && player.currentDebt > 0.01
              ? getBreakdown(player.name, player.currentDebt) : [];

            return (
              <div key={player.name} className={`cyber-box rounded-2xl overflow-hidden transition-all flex flex-col
                ${player.currentDebt > 0.01 ? 'border-magenta-800 hover:border-magenta-500' : 'border-cyan-800 hover:border-cyan-500'}
                ${justSettled === player.name ? 'settle-flash' : ''}`}>

                {/* Header */}
                <div className={`p-4 border-b-2 ${player.currentDebt > 0.01 ? 'bg-magenta-950/50 border-magenta-600' : 'bg-cyan-950/50 border-cyan-600'}`}>
                  <h3 className={`font-black text-xl flex items-center gap-2 ${player.currentDebt > 0.01 ? 'text-magenta-300 text-neon-pink' : 'text-cyan-300 text-neon-blue'}`}>
                    <span className="mini-paddle" /> {player.name}
                  </h3>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Attendance */}
                  <div className="text-sm text-cyan-700 mb-4 flex flex-col gap-1 items-center text-center">
                    <span>Obecność: <span className="text-cyan-300 text-lg">{player.attendanceCount}</span> / {totalWeeks} ({totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0}%)</span>
                    <span className={`font-bold ${getRank(totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0).color}`}>
                      {getRank(totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0).emoji}{' '}
                      {getRank(totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0).name}
                    </span>
                  </div>

                  {player.name === ORGANIZER_NAME ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="bg-cyan-950/30 border-cyan-800 text-cyan-600 px-6 py-4 rounded-xl border-2 w-full text-center">
                        <p className="text-sm font-bold tracking-widest">SKARBNIK</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Debt box */}
                      <div className={`p-4 rounded-xl border-2 shadow-inner mb-3 text-center
                        ${player.currentDebt > 0.01 ? 'bg-magenta-950/30 border-magenta-800' : 'bg-emerald-950/30 border-emerald-900'}`}>
                        {justSettled === player.name ? (
                          <div style={{ animation: 'checkPop 0.4s ease-out forwards' }}>
                            <CheckCircle2 className="text-emerald-400 mx-auto" size={32} />
                          </div>
                        ) : (
                          <p className={`text-3xl neon-amount ${player.currentDebt <= 0.01 ? 'text-emerald-400' : ''}`}
                             style={player.currentDebt <= 0.01 ? { textShadow: '0 0 8px rgba(52,211,153,0.5)' } : {}}>
                            {player.currentDebt.toFixed(2)}<span className="text-sm ml-1">PLN</span>
                          </p>
                        )}
                      </div>

                      {/* Breakdown */}
                      {player.currentDebt > 0.01 && justSettled !== player.name && (
                        <div className="mb-3">
                          <button
                            onClick={() => toggleDetails(player.name)}
                            className="text-xs font-bold text-cyan-500 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto py-1 px-2 rounded hover:bg-cyan-900/30 transition-colors"
                          >
                            {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            SZCZEGÓŁY ZALEGŁOŚCI
                          </button>
                          {showBreakdown && (
                            <div className="mt-2 bg-black/60 p-3 rounded-lg text-xs border border-cyan-900/50 text-left space-y-1 shadow-inner">
                              {breakdown.length > 0 ? breakdown.map((item, idx) => (
                                <div key={idx} className="flex justify-between border-b border-cyan-900/30 pb-1 last:border-0 pt-1 first:pt-0">
                                  <span className="text-cyan-600 tracking-wider">{item.date}</span>
                                  <span className="text-rose-400 font-bold">{item.amount.toFixed(2)} PLN</span>
                                </div>
                              )) : <div className="text-center text-cyan-800">Przeliczam dane...</div>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTA button — always at bottom via mt-auto */}
                      <div className="mt-auto pt-2">
                        {player.currentDebt > 0.01 && justSettled !== player.name ? (
                          <button
                            onClick={() => handleSettleDebt(player.name)}
                            disabled={settlingPlayer === player.name}
                            className="w-full py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 bg-magenta-950 border-magenta-500 text-magenta-300 hover:bg-magenta-500 hover:text-black hover:shadow-[0_0_15px_#ff00ff] disabled:opacity-50 disabled:cursor-wait"
                          >
                            {settlingPlayer === player.name
                              ? <><InlineSpinner size="sm" /> Zapisuję...</>
                              : <><Receipt size={18} /> OZNACZ OPŁACONE</>}
                          </button>
                        ) : (
                          <div className="w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 bg-black border-cyan-900 text-cyan-700 opacity-60">
                            <CheckCircle2 size={18} /> ROZLICZONY
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
