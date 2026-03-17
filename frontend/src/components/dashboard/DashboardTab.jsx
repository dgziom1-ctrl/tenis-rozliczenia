import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { settlePlayer, undoSettle, addPayment, removePayment } from '../../firebase/index';
import { SOUND_TYPES, ORGANIZER_NAME, SETTLED_THRESHOLD } from '../../constants';
import { buildDebtDisplayData } from '../../utils/calculations';
import { useToast } from '../common/Toast';
import { useUndoTimer } from '../../hooks/useUndoTimer';
import { useThemeTokens } from '../../context/ThemeContext';
import ConfettiOverlay, { CONFETTI_POOLS, generateConfetti } from './ConfettiOverlay';
import PlayerCard from './PlayerCard';
import SettleConfirmModal from './SettleConfirmModal';
import UndoBar from '../common/UndoBar';
import { Activity, Radio, Zap, AlertTriangle, Database } from 'lucide-react';

// ── Live status ticker ──────────────────────────────────────────────
function SystemStatusBar({ debtCount, settledCount, totalWeeks }) {
  const allClear = debtCount === 0 && settledCount > 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px',
      background: '#0B0015',
      border: '1px solid var(--sw-border)',
      borderLeft: `3px solid ${allClear ? 'var(--sw-settled)' : debtCount > 0 ? 'var(--sw-pending)' : 'var(--sw-pink)'}`,
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      flexWrap: 'wrap', gap: 8,
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Database size={12} style={{ color: 'var(--sw-pink)', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1rem',
          fontWeight: 400, letterSpacing: '0.1em',
          color: 'var(--sw-pink)', textTransform: 'uppercase',
        }}>
          Rozliczenia Graczy
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 6, height: 6, background: 'var(--sw-pending)',
            boxShadow: '0 0 5px var(--sw-pending)',
            clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#AAA' }}>
            Zaległości: <span style={{ color: debtCount > 0 ? 'var(--sw-pending)' : '#AAA' }}>{debtCount}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--sw-settled)', boxShadow: '0 0 5px var(--sw-settled)',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#AAA' }}>
            Rozliczeni: <span style={{ color: 'var(--sw-settled)' }}>{settledCount}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Zap size={10} style={{ color: 'var(--sw-pink)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#AAA' }}>
            Sesje: <span style={{ color: 'var(--sw-pink)' }}>{totalWeeks}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardTab({ data, history, playSound }) {
  const [openDetails,   setOpenDetails]   = useState(null);
  const [justSettled,   setJustSettled]   = useState(null);
  const [confirmSettle, setConfirmSettle] = useState(null);
  const [pinnedPlayer,  setPinnedPlayer]  = useState(null);
  const [confetti,      setConfetti]      = useState([]);

  const { showSuccess, showError }                          = useToast();
  const { undoToast, progressPct, startUndo, dismissUndo } = useUndoTimer(8);
  const tokens = useThemeTokens();

  const totalWeeks    = data.summary?.totalWeeks ?? 0;
  const confettiTimer = useRef(null);
  useEffect(() => () => clearTimeout(confettiTimer.current), []);

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

    const pool       = CONFETTI_POOLS.cyber;
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
    startUndo({ playerName, previousValue: result.previousValue, previousPayments: result.previousPayments });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [confirmSettle, data.players, playSound, showError, startUndo]);

  const handleUndo = useCallback(async () => {
    if (!undoToast) return;
    playSound(SOUND_TYPES.CLICK);
    const { playerName, previousValue, previousPayments } = undoToast.payload;
    const result = await undoSettle(playerName, previousValue, previousPayments);
    if (!result.success) { showError(result.error || 'Nie udało się cofnąć'); return; }
    dismissUndo();
    showSuccess('Rozliczenie cofnięte');
  }, [undoToast, playSound, showError, showSuccess, dismissUndo]);

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

  const getBreakdown = useCallback(
    (player) => buildDebtDisplayData(player, history, data.payments, data.paidUntilWeek),
    [history, data.payments, data.paidUntilWeek],
  );

  const sortedPlayers = useMemo(() => {
    if (!data.players) return [];
    const nonOrg   = data.players
      .filter(p => p.name !== ORGANIZER_NAME)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    const organizer = data.players.filter(p => p.name === ORGANIZER_NAME);
    return [...nonOrg, ...organizer];
  }, [data.players]);

  const debtCount   = sortedPlayers.filter(p => p.currentDebt > SETTLED_THRESHOLD && p.name !== ORGANIZER_NAME).length;
  const settledCount = sortedPlayers.filter(p => p.currentDebt <= SETTLED_THRESHOLD && p.name !== ORGANIZER_NAME).length;

  return (
    <>
      <ConfettiOverlay pieces={confetti} />
      <SettleConfirmModal
        playerName={confirmSettle?.playerName}
        debt={confirmSettle?.debt}
        onConfirm={handleConfirmSettle}
        onCancel={() => setConfirmSettle(null)}
        tokens={tokens}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <SystemStatusBar
          debtCount={debtCount}
          settledCount={settledCount}
          totalWeeks={totalWeeks}
        />

        {/* Undo toast */}
        {undoToast && (
          <UndoBar
            message={<>Opłacono: <span style={{ color: tokens.bodyText }}>{undoToast.payload.playerName}</span></>}
            secondsLeft={undoToast.secondsLeft}
            progressPct={progressPct}
            onUndo={handleUndo}
          />
        )}

        {/* Empty state */}
        {totalWeeks === 0 && (
          <div style={{
            background: 'var(--sw-panel)', border: '1px solid var(--sw-border)',
            clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
            padding: 40, textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.1em', color: 'var(--sw-pink)', marginBottom: 8 }}>
              BRAK ROZGRYWEK
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--sw-dim)' }}>
              {'>'} Dodaj pierwszą sesję w zakładce{' '}
              <span style={{ color: 'var(--sw-pink)' }}>LOG</span>
            </p>
          </div>
        )}

        {/* Player cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))',
          gap: 14,
        }}>
          {sortedPlayers.map((player, idx) => {
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
                playerIndex={idx}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
