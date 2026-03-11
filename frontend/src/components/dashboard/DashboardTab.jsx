import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { settlePlayer, undoSettle, addPayment, removePayment } from '../../firebase/index';
import { SOUND_TYPES, ORGANIZER_NAME, SETTLED_THRESHOLD } from '../../constants';
import { buildDebtDisplayData } from '../../utils/calculations';
import { useToast } from '../common/Toast';
import { useUndoTimer } from '../../hooks/useUndoTimer';
import { useTheme, useThemeTokens } from '../../context/ThemeContext';
import ConfettiOverlay, { CONFETTI_POOLS, generateConfetti } from './ConfettiOverlay';
import PlayerCard from './PlayerCard';
import SettleConfirmModal from './SettleConfirmModal';

export default function DashboardTab({ data, history, playSound }) {
  const [openDetails,   setOpenDetails]   = useState(null);
  const [justSettled,   setJustSettled]   = useState(null);
  const [confirmSettle, setConfirmSettle] = useState(null); // { playerName, debt }
  const [pinnedPlayer,  setPinnedPlayer]  = useState(null);
  const [confetti,      setConfetti]      = useState([]);

  const { showSuccess, showError }                             = useToast();
  const { undoToast, progressPct, startUndo, dismissUndo }    = useUndoTimer();
  const theme = useTheme();
  const T     = useThemeTokens();

  const totalWeeks    = data.summary?.totalWeeks ?? 0;
  const confettiTimer = useRef(null);
  useEffect(() => () => clearTimeout(confettiTimer.current), []);

  // ── Settle flow ──────────────────────────────────────────────────────────
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
    setJustSettled(playerName);
    playSound(SOUND_TYPES.SUCCESS);

    const result = await settlePlayer(playerName);
    if (!result.success) {
      setJustSettled(null);
      showError(result.error || 'Nie udało się rozliczyć gracza');
      return;
    }

    setTimeout(() => setJustSettled(null), 1500);

    const pool       = CONFETTI_POOLS[theme] ?? CONFETTI_POOLS.cyber;
    const nonOrg     = data.players?.filter(p => p.name !== ORGANIZER_NAME) ?? [];
    const allSettled = nonOrg.filter(p => p.name !== playerName).every(p => p.currentDebt <= SETTLED_THRESHOLD);

    clearTimeout(confettiTimer.current);
    if (allSettled && nonOrg.length > 0) {
      setConfetti(generateConfetti(55, pool));
      confettiTimer.current = setTimeout(() => setConfetti([]), 5000);
      playSound(SOUND_TYPES.COIN);
    } else {
      setConfetti(generateConfetti(22, pool));
      confettiTimer.current = setTimeout(() => setConfetti([]), 3500);
    }

    startUndo(playerName, result.previousValue, result.previousPayments);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [confirmSettle, data.players, playSound, showError, startUndo, theme]);

  const handleUndo = useCallback(async () => {
    if (!undoToast) return;
    playSound(SOUND_TYPES.CLICK);
    const result = await undoSettle(undoToast.playerName, undoToast.previousValue, undoToast.previousPayments);
    if (!result.success) {
      showError(result.error || 'Nie udało się cofnąć rozliczenia');
      return;
    }
    dismissUndo();
    showSuccess('Rozliczenie cofnięte');
  }, [undoToast, playSound, showError, showSuccess, dismissUndo]);

  // ── Payment handlers ─────────────────────────────────────────────────────
  const handleAddPayment = useCallback(async (playerName, amount) => {
    playSound(SOUND_TYPES.COIN);
    const result = await addPayment(playerName, amount);
    if (!result.success) showError(result.error || 'Nie udało się zapisać wpłaty');
    return result;
  }, [playSound, showError]);

  const handleRemovePayment = useCallback(async (playerName, paymentId) => {
    playSound(SOUND_TYPES.CLICK);
    const result = await removePayment(playerName, paymentId);
    if (!result.success) showError(result.error || 'Nie udało się cofnąć wpłaty');
  }, [playSound, showError]);

  const toggleDetails = useCallback((playerName) => {
    playSound(SOUND_TYPES.CLICK);
    setOpenDetails(prev => (prev === playerName ? null : playerName));
  }, [playSound]);

  // Uses new unified buildDebtDisplayData — consistent with calculateDebt
  const getBreakdown = useCallback(
    (player) => buildDebtDisplayData(player, history, data.payments),
    [history, data.payments],
  );

  // ── Sorted players ───────────────────────────────────────────────────────
  const sortedPlayers = useMemo(() => {
    if (!data.players) return [];
    const debtors  = data.players.filter(p => p.name !== ORGANIZER_NAME).sort((a, b) => {
      if (a.name === pinnedPlayer) return -1;
      if (b.name === pinnedPlayer) return  1;
      return b.currentDebt - a.currentDebt || a.name.localeCompare(b.name, 'pl');
    });
    const organizer = data.players.filter(p => p.name === ORGANIZER_NAME);
    return [...debtors, ...organizer];
  }, [data.players, pinnedPlayer]);

  return (
    <>
      <ConfettiOverlay pieces={confetti} />

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
          <div
            className="p-4 flex items-center justify-between gap-4 relative overflow-hidden"
            style={{
              background:   T.undoBg,
              border:       `2px solid ${T.undoBorder}`,
              borderRadius: T.modalRadius,
              boxShadow:    T.modalShadow,
            }}
          >
            <div
              className="absolute bottom-0 left-0 h-1 transition-all duration-1000"
              style={{ width: `${progressPct}%`, background: T.undoProgressBg }}
            />
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <CheckCircle2 style={{ color: T.undoText }} className="flex-shrink-0" size={20} />
              <span
                className="font-bold text-sm"
                style={{ color: T.undoText, fontFamily: T.fontFamily, fontSize: T.fontSize }}
              >
                Opłacono: <span style={{ color: T.bodyText, fontFamily: 'inherit' }}>{undoToast.playerName}</span>
              </span>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: T.mutedText }}>
                ({undoToast.secondsLeft}s)
              </span>
            </div>
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 px-4 py-2 font-bold text-sm flex-shrink-0 hover:opacity-80 transition-all"
              style={{
                border:       `2px solid ${T.undoBorder}`,
                color:        T.undoText,
                borderRadius: T.modalRadius,
                background:   'transparent',
              }}
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
              Dodaj pierwszą sesję w zakładce{' '}
              <span className="text-cyan-400 font-bold">Dodaj sesję</span>
            </p>
          </div>
        )}

        {/* Player cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {sortedPlayers.map((player) => {
            const showBreakdown = openDetails === player.name;
            return (
              <PlayerCard
                key={player.name}
                player={player}
                totalWeeks={totalWeeks}
                onSettle={handleSettleRequest}
                justSettled={justSettled === player.name}
                openDetails={showBreakdown}
                onToggleDetails={toggleDetails}
                breakdown={showBreakdown ? getBreakdown(player) : null}
                onAddPayment={handleAddPayment}
                onRemovePayment={handleRemovePayment}
                onPin={setPinnedPlayer}
                onUnpin={() => setPinnedPlayer(null)}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
