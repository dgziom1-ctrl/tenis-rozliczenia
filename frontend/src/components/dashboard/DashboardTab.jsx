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
import { Terminal, Zap } from 'lucide-react';

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

  // Count debtor status
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Status header bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#08080d',
          border: '1px solid #1a1a2e',
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1rem' }}>🏓</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cyber-accent)', textTransform: 'uppercase' }}>
              Rozliczenia graczy
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cyber-red)', boxShadow: '0 0 6px var(--cyber-red)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#aaa' }}>
                Do wpłaty: {debtCount}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cyber-green)', boxShadow: '0 0 6px var(--cyber-green)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#aaa' }}>
                Rozliczeni: {settledCount}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Zap size={11} style={{ color: 'var(--cyber-accent)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#aaa' }}>
                Sesji: {totalWeeks}
              </span>
            </div>
          </div>
        </div>

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
            background: '#0d0d12', border: '1px solid #1a1a2e',
            clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
            padding: 40, textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 12 }}>🏓</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', color: 'var(--cyber-accent)', marginBottom: 8 }}>
              BRAK ROZGRYWEK
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyber-text-dim)' }}>
              {'>'} Dodaj pierwszą sesję w zakładce{' '}
              <span style={{ color: 'var(--cyber-accent)' }}>LOG</span>
            </p>
          </div>
        )}

        {/* Player cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
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
