import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CheckCircle2, Receipt, ChevronDown, ChevronUp, RotateCcw, LayoutDashboard, X, AlertTriangle, TrendingUp, Users, CalendarDays } from 'lucide-react';
import { settlePlayer, undoSettle } from '../../firebase/index';
import { getRank, UNDO_TIMEOUT_SECONDS, SOUND_TYPES, ORGANIZER_NAME, SETTLED_THRESHOLD } from '../../constants';
import { calculateDebtBreakdown } from '../../utils/calculations';
import { formatDate, formatAmountShort } from '../../utils/format';
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
  @keyframes confettiRain {
    0%   { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
  }
`;

// ─── All-settled confetti burst ───────────────────────────────────────────────
const CONFETTI_POOL = ['🏓','🎉','⭐','✨','💚','🎊','🏆','💰','🟢','🎯'];

function generateConfetti(count = 40) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: CONFETTI_POOL[Math.floor(Math.random() * CONFETTI_POOL.length)],
    x: Math.random() * 100,
    delay: Math.random() * 1.2,
    dur: 2 + Math.random() * 2,
    size: 14 + Math.random() * 22,
    rotate: Math.random() * 360,
  }));
}

// ─── Summary banner ───────────────────────────────────────────────────────────
function SummaryBanner({ summary }) {
  const { totalToCollect = 0, settledPlayers = 0, totalPlayers = 0, totalWeeks = 0 } = summary || {};
  const allSettled = totalPlayers > 0 && settledPlayers === totalPlayers;
  const debtorsLeft = totalPlayers - settledPlayers;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
      {/* DO ZEBRANIA — najważniejsza liczba, największy font */}
      <div className={`text-center rounded-xl py-3 px-2 ${
        allSettled
          ? 'bg-emerald-950/40 border border-emerald-800'
          : 'bg-magenta-950/40 border border-magenta-900'
      }`}>
        <p className="text-xs tracking-widest mb-1.5 flex items-center justify-center gap-1 font-bold"
           style={{ color: allSettled ? '#059669' : '#9f1239' }}>
          <TrendingUp size={10} />
          {allSettled ? 'ROZLICZONE' : 'DO ZEBRANIA'}
        </p>
        {allSettled ? (
          <p className="font-mono font-black text-2xl sm:text-3xl text-emerald-400"
             style={{ textShadow: '0 0 14px rgba(52,211,153,0.7)' }}>
            ✓ 0 <span className="text-base opacity-70">zł</span>
          </p>
        ) : (
          <p className="font-mono font-black text-2xl sm:text-3xl text-magenta-300 glow-magenta">
            {formatAmountShort(totalToCollect)}
            <span className="text-sm font-bold ml-1 opacity-70">zł</span>
          </p>
        )}
        {!allSettled && debtorsLeft > 0 && (
          <p className="text-xs mt-1" style={{ color: '#9f1239' }}>
            {debtorsLeft} {debtorsLeft === 1 ? 'osoba' : 'osoby'}
          </p>
        )}
      </div>

      {/* ROZLICZENI */}
      <div className="text-center rounded-xl py-3 px-2 bg-cyan-950/20 border border-cyan-900">
        <p className="text-cyan-700 text-xs tracking-widest mb-1.5 flex items-center justify-center gap-1 font-bold">
          <Users size={10} /> ROZLICZENI
        </p>
        <p className="font-mono font-black text-2xl sm:text-3xl text-cyan-300">
          {settledPlayers}
          <span className="text-cyan-700 text-base">/{totalPlayers}</span>
        </p>
        <p className="text-xs text-cyan-800 mt-1">graczy</p>
      </div>

      {/* SESJI */}
      <div className="text-center rounded-xl py-3 px-2 bg-cyan-950/20 border border-cyan-900">
        <p className="text-cyan-700 text-xs tracking-widest mb-1.5 flex items-center justify-center gap-1 font-bold">
          <CalendarDays size={10} /> SESJI
        </p>
        <p className="font-mono font-black text-2xl sm:text-3xl text-cyan-300">{totalWeeks}</p>
        <p className="text-xs text-cyan-800 mt-1">rozegranych</p>
      </div>
    </div>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────
function PlayerCard({ player, totalWeeks, onSettle, isSettling, justSettled, openDetails, onToggleDetails, breakdown }) {
  const isOrganizer = player.name === ORGANIZER_NAME;
  const hasDebt = player.currentDebt > SETTLED_THRESHOLD;
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

      {/* Body */}
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
                  {formatAmountShort(player.currentDebt)}
                  <span className="text-sm ml-1">zł</span>
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
                  <div className="mt-2 bg-black/60 p-3 rounded-lg text-xs border border-cyan-900/50 text-left space-y-1 shadow-inner">
                    {breakdown && breakdown.length > 0 ? breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between border-b border-cyan-900/30 pb-1 last:border-0 pt-1 first:pt-0">
                        <span className="text-cyan-600 tracking-wider">{formatDate(item.date)}</span>
                        <span className="text-rose-400 font-bold">{formatAmountShort(item.amount)} zł</span>
                      </div>
                    )) : <div className="text-center text-cyan-800">Przeliczam dane...</div>}
                  </div>
                )}
              </div>
            )}

            {/* Push button to bottom */}
            <div className="mt-auto pt-2">
              {hasDebt && !justSettled ? (
                <button
                  onClick={() => onSettle(player.name)}
                  disabled={isSettling}
                  className="w-full py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 bg-magenta-950 border-magenta-500 text-magenta-300 hover:bg-magenta-500 hover:text-black hover:shadow-magenta-glow disabled:opacity-50 disabled:cursor-wait"
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

// ─── Modal potwierdzenia rozliczenia ─────────────────────────────────────────
function SettleConfirmModal({ playerName, debt, onConfirm, onCancel }) {
  if (!playerName) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="cyber-box border-magenta-500 rounded-2xl p-6 w-full max-w-sm shadow-magenta-glow">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-magenta-400 flex-shrink-0" size={24} />
          <h3 className="font-black text-magenta-300 text-lg">Potwierdzenie</h3>
        </div>
        <p className="text-cyan-400 text-sm mb-2">
          Oznaczasz <span className="text-white font-black">{playerName}</span> jako opłaconego:
        </p>
        <div className="bg-magenta-950/40 border border-magenta-800 rounded-xl p-3 mb-5 text-center">
          <span className="text-3xl font-black text-magenta-300 glow-magenta">
            {formatAmountShort(debt)} zł
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl border-2 border-magenta-500 text-magenta-300 bg-magenta-950/50 hover:bg-magenta-500 hover:text-black font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Receipt size={15} /> POTWIERDŹ
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-cyan-900 text-cyan-700 hover:border-cyan-700 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <X size={15} /> ANULUJ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardTab({ data, history, playSound }) {
  const [openDetails,    setOpenDetails]    = useState(null);
  const [undoToast,      setUndoToast]      = useState(null);
  const [settlingPlayer, setSettlingPlayer] = useState(null);
  const [justSettled,    setJustSettled]    = useState(null);
  const [confetti,       setConfetti]       = useState([]);
  const [confirmSettle,  setConfirmSettle]  = useState(null); // { playerName, debt }
  const confettiTimer = useRef(null);

  const { showSuccess, showError } = useToast();
  const timerRef    = useRef(null);
  const intervalRef = useRef(null);

  const totalWeeks = data.summary?.totalWeeks || 0;

  const clearUndoTimers = useCallback(() => {
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = intervalRef.current = null;
  }, []);

  useEffect(() => () => {
    clearUndoTimers();
    clearTimeout(confettiTimer.current);
  }, [clearUndoTimers]);

  const handleSettleDebt = useCallback((playerName) => {
    const player = data.players?.find(p => p.name === playerName);
    if (!player) return;
    playSound(SOUND_TYPES.CLICK);
    setConfirmSettle({ playerName, debt: player.currentDebt });
  }, [data.players, playSound]);

  const handleConfirmSettle = useCallback(async () => {
    if (!confirmSettle) return;
    const { playerName } = confirmSettle;
    setConfirmSettle(null);
    clearUndoTimers();

    setJustSettled(playerName);
    playSound(SOUND_TYPES.SUCCESS);

    const result = await settlePlayer(playerName);

    if (!result.success) {
      setJustSettled(null);
      showError(result.error || 'Nie udało się rozliczyć gracza');
      return;
    }

    setTimeout(() => setJustSettled(null), 1500);

    // Confetti gdy wszyscy rozliczeni
    const nonOrg = data.players?.filter(p => p.name !== ORGANIZER_NAME) || [];
    const willAllBeSettled = nonOrg.filter(p => p.name !== playerName).every(p => p.currentDebt <= SETTLED_THRESHOLD);
    if (willAllBeSettled && nonOrg.length > 0) {
      clearTimeout(confettiTimer.current);
      setConfetti(generateConfetti(50));
      confettiTimer.current = setTimeout(() => setConfetti([]), 5000);
      playSound(SOUND_TYPES.COIN);
    }

    setUndoToast({ playerName, previousValue: result.previousValue, secondsLeft: UNDO_TIMEOUT_SECONDS });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    intervalRef.current = setInterval(() => {
      setUndoToast(prev => {
        if (!prev || prev.secondsLeft <= 1) { clearUndoTimers(); return null; }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  }, [clearUndoTimers, confirmSettle, data.players, playSound, showError]);

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
      ...data.players.filter(p => p.name !== ORGANIZER_NAME).sort((a, b) => b.currentDebt - a.currentDebt || a.name.localeCompare(b.name, 'pl')),
      ...data.players.filter(p => p.name === ORGANIZER_NAME),
    ];
  }, [data.players]);

  return (
    <>
      <style>{SETTLE_STYLES}</style>

      <SettleConfirmModal
        playerName={confirmSettle?.playerName}
        debt={confirmSettle?.debt}
        onConfirm={handleConfirmSettle}
        onCancel={() => setConfirmSettle(null)}
      />

      {/* Confetti burst when everyone settled */}
      {confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-50"
          style={{
            left: `${c.x}%`, top: '-30px',
            fontSize: `${c.size}px`,
            animation: `confettiRain ${c.dur}s ${c.delay}s ease-in forwards`,
            transform: `rotate(${c.rotate}deg)`,
          }}>
          {c.emoji}
        </div>
      ))}

      <div className="space-y-6 animate-in fade-in duration-300">

        {/* Header + Summary merged — jeden kontener, dwie sekcje */}
        <div className="cyber-box rounded-2xl p-4 sm:p-6">
          <h2 className="text-xl font-black text-cyan-300 flex items-center gap-3 border-b-2 border-cyan-800 pb-4 mb-4">
            <LayoutDashboard className="text-magenta-500 flex-shrink-0" />
            Dashboard
          </h2>

        </div>

        {/* Undo toast */}
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

        {/* Empty state — brak sesji */}
        {totalWeeks === 0 && (
          <div className="cyber-box rounded-2xl p-10 text-center border-cyan-900">
            <div className="text-5xl mb-4">🎾</div>
            <p className="text-cyan-300 font-black text-lg mb-2">Brak rozgrywek</p>
            <p className="text-cyan-700 text-sm">Dodaj pierwszą sesję w zakładce <span className="text-cyan-400 font-bold">Dodaj sesję</span></p>
          </div>
        )}

        {/* Player cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {sortedPlayers.map((player) => {
            const showBreakdown = openDetails === player.name;
            const breakdown = showBreakdown && player.currentDebt > SETTLED_THRESHOLD
              ? getBreakdown(player.name, player.currentDebt)
              : [];

            return (
              <PlayerCard
                key={player.name}
                player={player}
                totalWeeks={totalWeeks}
                onSettle={handleSettleDebt}
                isSettling={settlingPlayer === player.name}
                justSettled={justSettled === player.name}
                openDetails={showBreakdown}
                onToggleDetails={toggleDetails}
                breakdown={breakdown}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
