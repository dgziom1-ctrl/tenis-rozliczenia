import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  CheckCircle2, HandCoins, ChevronDown, ChevronUp, RotateCcw, X,
} from 'lucide-react';
import { settlePlayer, undoSettle } from '../../firebase/index';
import { getRank, SOUND_TYPES, ORGANIZER_NAME, SETTLED_THRESHOLD } from '../../constants';
import { calculateDebtBreakdown } from '../../utils/calculations';
import { formatDate, formatAmountShort } from '../../utils/format';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { useUndoTimer } from '../../hooks/useUndoTimer';
import { useTheme, useThemeTokens } from '../../context/ThemeContext';


// ─── Canvas confetti ──────────────────────────────────────────────────────────
const CONFETTI_POOLS = {
  cyber:  ['🏓','🎉','⭐','✨','💰','🎊','🏆','🟢','🎯','💚'],
  arcade: ['👾','🏓','💥','🟩','⭐','🔥','🕹️','🏆','✨','💚'],
  zen:    ['🌿','🍃','🌳','🍀','✨','🌸','🌾','🎋','🌱','🏅'],
};

function useConfetti() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const particles = useRef([]);

  const launch = useCallback((count = 40, pool = CONFETTI_POOLS.cyber) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let i = 0; i < count; i++) {
      particles.current.push({
        emoji:  pool[Math.floor(Math.random() * pool.length)],
        x:      Math.random() * canvas.width,
        y:      -20 - Math.random() * 80,
        vy:     3 + Math.random() * 4,
        vx:     (Math.random() - 0.5) * 3,
        rot:    Math.random() * 360,
        rotV:   (Math.random() - 0.5) * 8,
        size:   16 + Math.random() * 20,
        alpha:  1,
      });
    }

    if (!rafRef.current) {
      const ctx = canvas.getContext('2d');
      const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.current = particles.current.filter(p => p.alpha > 0.05);
        for (const p of particles.current) {
          p.y   += p.vy;
          p.x   += p.vx;
          p.rot += p.rotV;
          if (p.y > canvas.height * 0.7) p.alpha -= 0.025;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.font        = `${p.size}px serif`;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillText(p.emoji, -p.size / 2, p.size / 2);
          ctx.restore();
        }
        if (particles.current.length > 0) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const canvas = (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 9999,
      }}
    />
  );

  return { launch, canvas };
}

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
  .settle-flash {
    animation: settleFlash 0.8s ease-out forwards !important;
  }
`;

// ─── Player card ──────────────────────────────────────────────────────────────
function PlayerCard({ player, totalWeeks, onSettle, isSettling, justSettled, openDetails, onToggleDetails, breakdown }) {
  const isOrganizer = player.name === ORGANIZER_NAME;
  const hasDebt     = player.currentDebt > SETTLED_THRESHOLD;
  const pct         = totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0;
  const rank        = getRank(pct);

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
            <p className="text-cyan-500 text-xs tracking-widest font-bold">ogarnia rezerwację 🏓</p>
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
                <p
                  className={`text-3xl neon-amount ${hasDebt ? '' : 'text-emerald-400'}`}
                  style={hasDebt ? {} : { textShadow: '0 0 8px rgba(52,211,153,0.5)' }}
                >
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
                  Pokaż szczegóły
                </button>
                {openDetails && (
                  <div className="mt-2 bg-black/60 p-3 rounded-lg text-xs border border-cyan-900/50 text-left space-y-1 shadow-inner">
                    {breakdown?.length > 0 ? breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between border-b border-cyan-900/30 pb-1 last:border-0 pt-1 first:pt-0">
                        <span className="text-cyan-600 tracking-wider">{formatDate(item.date)}</span>
                        <span className="text-rose-400 font-bold">{formatAmountShort(item.amount)} zł</span>
                      </div>
                    )) : (
                      <div className="text-center text-cyan-800">Przeliczam dane...</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action button */}
            <div className="mt-auto pt-2">
              {hasDebt && !justSettled ? (
                <button
                  onClick={() => onSettle(player.name)}
                  disabled={isSettling}
                  className="w-full py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 bg-magenta-950 border-magenta-500 text-magenta-300 hover:bg-magenta-500 hover:text-black hover:shadow-magenta-glow disabled:opacity-50 disabled:cursor-wait"
                  aria-label={`Oznacz ${player.name} jako opłaconego`}
                >
                  {isSettling
                    ? <><InlineSpinner size="sm" /> Zapisuję...</>
                    : <><HandCoins size={18} /> Wpłacił 💸</>
                  }
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 bg-black border-cyan-900 text-cyan-700 opacity-60 select-none">
                  <CheckCircle2 size={18} /> zapłacone ✓
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────
function SettleConfirmModal({ playerName, debt, onConfirm, onCancel, T }) {
  if (!playerName) return null;
  return (
    <div style={{ background: T.overlayBg }} className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div style={{
        background: T.modalBg,
        border: `2px solid ${T.accentBorder}`,
        borderRadius: T.modalRadius,
        boxShadow: T.modalShadow,
      }} className="p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <HandCoins style={{ color: T.accentColor }} className="flex-shrink-0" size={24} />
          <h3 style={{ color: T.accentColor, fontFamily: T.fontFamily, fontSize: T.fontSize }} className="font-black text-lg">Potwierdzenie</h3>
        </div>
        <p style={{ color: T.bodyText }} className="text-sm mb-2">
          <span className="font-black">{playerName}</span> zapłacił?
        </p>
        <div style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}
          className="rounded-xl p-3 mb-5 text-center">
          <span style={{ color: T.accentColor }} className="text-3xl font-black">
            {formatAmountShort(debt)} zł
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            style={{ border: `2px solid ${T.accentBorder}`, color: T.accentColor, background: T.accentBg, borderRadius: T.modalRadius }}
            className="flex-1 py-3 font-bold text-sm transition-all flex items-center justify-center gap-2 hover:opacity-80"
          >
            <CheckCircle2 size={15} /> Tak
          </button>
          <button
            onClick={onCancel}
            style={{ border: `2px solid ${T.cancelBorder}`, color: T.cancelText, borderRadius: T.modalRadius }}
            className="flex-1 py-3 font-bold text-sm transition-all flex items-center justify-center gap-2 hover:opacity-80"
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
  const [settlingPlayer, setSettlingPlayer] = useState(null);
  const [justSettled,    setJustSettled]    = useState(null);
  const [confirmSettle,  setConfirmSettle]  = useState(null); // { playerName, debt }

  const { showSuccess, showError } = useToast();
  const { undoToast, progressPct, startUndo, dismissUndo } = useUndoTimer();

  const totalWeeks = data.summary?.totalWeeks ?? 0;
  const theme = useTheme();
  const T = useThemeTokens();
  const { launch: launchConfetti, canvas: confettiCanvas } = useConfetti();


  const handleSettleRequest = useCallback((playerName) => {
    const player = data.players?.find(p => p.name === playerName);
    if (!player) return;
    playSound(SOUND_TYPES.CLICK);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setConfirmSettle({ playerName, debt: player.currentDebt }), 150);
  }, [data.players, playSound]);

  const handleConfirmSettle = useCallback(async () => {
    if (!confirmSettle) return;
    const { playerName } = confirmSettle;
    setConfirmSettle(null);

    setSettlingPlayer(playerName);
    setJustSettled(playerName);
    playSound(SOUND_TYPES.SUCCESS);

    const result = await settlePlayer(playerName);
    setSettlingPlayer(null);

    if (!result.success) {
      setJustSettled(null);
      showError(result.error || 'Nie udało się rozliczyć gracza');
      return;
    }

    setTimeout(() => setJustSettled(null), 1500);

    const pool = CONFETTI_POOLS[theme] ?? CONFETTI_POOLS.cyber;

    // Confetti when everyone is settled
    const nonOrg = data.players?.filter(p => p.name !== ORGANIZER_NAME) ?? [];
    const willAllBeSettled = nonOrg
      .filter(p => p.name !== playerName)
      .every(p => p.currentDebt <= SETTLED_THRESHOLD);

    if (willAllBeSettled && nonOrg.length > 0) {
      launchConfetti(60, pool);
      playSound(SOUND_TYPES.COIN);
    } else {
      launchConfetti(22, pool);
    }

    startUndo(playerName, result.previousValue);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [confirmSettle, data.players, playSound, showError, startUndo]);

  const handleUndo = useCallback(async () => {
    if (!undoToast) return;
    playSound(SOUND_TYPES.CLICK);

    const result = await undoSettle(undoToast.playerName, undoToast.previousValue);
    if (!result.success) {
      showError(result.error || 'Nie udało się cofnąć rozliczenia');
      return;
    }

    dismissUndo();
    showSuccess('Rozliczenie cofnięte');
  }, [undoToast, playSound, showError, showSuccess, dismissUndo]);

  const toggleDetails = useCallback((playerName) => {
    playSound(SOUND_TYPES.CLICK);
    setOpenDetails(prev => prev === playerName ? null : playerName);
  }, [playSound]);

  const getBreakdown = useCallback(
    (name, debt) => calculateDebtBreakdown(name, debt, history, data.paidUntilWeek?.[name]),
    [history, data.paidUntilWeek],
  );

  const sortedPlayers = useMemo(() => {
    if (!data.players) return [];
    const debtors   = data.players.filter(p => p.name !== ORGANIZER_NAME).sort((a, b) =>
      b.currentDebt - a.currentDebt || a.name.localeCompare(b.name, 'pl'),
    );
    const organizer = data.players.filter(p => p.name === ORGANIZER_NAME);
    return [...debtors, ...organizer];
  }, [data.players]);

  return (
    <>
      <style>{SETTLE_STYLES}</style>
      {confettiCanvas}

      <SettleConfirmModal
        playerName={confirmSettle?.playerName}
        debt={confirmSettle?.debt}
        onConfirm={handleConfirmSettle}
        onCancel={() => setConfirmSettle(null)}
        T={T}
      />

      <div className="space-y-6 animate-in fade-in duration-300">

        {/* Undo toast */}
        {undoToast && (
          <div style={{
            background: T.undoBg,
            border: `2px solid ${T.undoBorder}`,
            borderRadius: T.modalRadius,
            boxShadow: T.modalShadow,
          }}
            className="p-4 flex items-center justify-between gap-4 relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 h-1 transition-all duration-1000"
              style={{ width: `${progressPct}%`, background: T.undoProgressBg }} />
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <CheckCircle2 style={{ color: T.undoText }} className="flex-shrink-0" size={20} />
              <span style={{ color: T.undoText, fontFamily: T.fontFamily, fontSize: T.fontSize }} className="font-bold text-sm">
                Opłacono: <span style={{ color: T.bodyText, fontFamily: 'inherit' }}>{undoToast.playerName}</span>
              </span>
              <span style={{ color: T.mutedText }} className="font-mono text-xs flex-shrink-0">({undoToast.secondsLeft}s)</span>
            </div>
            <button
              onClick={handleUndo}
              style={{
                border: `2px solid ${T.undoBorder}`,
                color: T.undoText,
                borderRadius: T.modalRadius,
                background: 'transparent',
              }}
              className="flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all flex-shrink-0 hover:opacity-80"
            >
              <RotateCcw size={14} /> COFNIJ
            </button>
          </div>
        )}

        {/* Empty state */}
        {totalWeeks === 0 && (
          <div className="cyber-box rounded-2xl p-10 text-center border-cyan-900">
            <div className="text-5xl mb-4">🏓</div>
            <p className="text-cyan-300 font-black text-lg mb-2">Brak rozgrywek</p>
            <p className="text-cyan-700 text-sm">
              Dodaj pierwszą sesję w zakładce <span className="text-cyan-400 font-bold">Dodaj sesję</span>
            </p>
          </div>
        )}

        {/* Player cards */}
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
                onSettle={handleSettleRequest}
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
