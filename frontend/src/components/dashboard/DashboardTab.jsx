import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { settlePlayer, undoSettle, addPayment, removePayment } from '../../firebase/index';
import { SOUND_TYPES, ORGANIZER_NAME, SETTLED_THRESHOLD, RANKS } from '../../constants';
import { buildDebtDisplayData } from '../../utils/calculations';
import { useToast } from '../common/Toast';
import { useUndoTimer } from '../../hooks/useUndoTimer';
import { useThemeTokens } from '../../context/ThemeContext';
import ConfettiOverlay, { CONFETTI_POOLS, generateConfetti } from './ConfettiOverlay';
import PlayerCard from './PlayerCard';
import SettleConfirmModal from './SettleConfirmModal';
import UndoBar from '../common/UndoBar';
import { Zap, ChevronDown } from 'lucide-react';
import PushPermissionBanner from '../common/PushPermissionBanner';



export default function DashboardTab({ data, history, playSound }) {
  const [openDetails,   setOpenDetails]   = useState(null);
  const [justSettled,   setJustSettled]   = useState(null);
  const [confirmSettle, setConfirmSettle] = useState(null);
  const [pinnedPlayer,  setPinnedPlayer]  = useState(null);
  const [confetti,      setConfetti]      = useState([]);
  const [showRankGuide, setShowRankGuide] = useState(false);

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
    // Sort: alphabetical A→Z, organizer always last
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



        {/* Push notifications banner */}
        <PushPermissionBanner playerNames={sortedPlayers.map(p => p.name)} />

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
            background: 'var(--co-panel)',
            border: '1px solid var(--co-border)',
            borderLeft: '3px solid var(--co-cyan)',
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)',
            padding: '40px 32px', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Ambient scan line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--co-cyan), transparent)',
              animation: 'podium-scan 3s ease-in-out infinite',
            }} />
            <div style={{ fontSize: '2.4rem', marginBottom: 16, filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.4))' }}>🏓</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', marginBottom: 10 }}>
              BRAK ROZGRYWEK
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--co-dim)', lineHeight: 1.7 }}>
              {'>'} System gotowy.<br/>
              {'>'} Dodaj pierwszą sesję w zakładce{' '}
              <span style={{ color: 'var(--co-cyan)', borderBottom: '1px solid rgba(0,229,255,0.3)' }}>LOG</span>
              <span className="terminal-cursor" />
            </p>
          </div>
        )}

        {/* Session count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: -4 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px',
            background: 'rgba(0,229,255,0.04)',
            border: '1px solid rgba(0,229,255,0.12)',
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}>
            <Zap size={9} style={{ color: 'rgba(0,229,255,0.5)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>
              sesji: <span style={{ color: 'rgba(0,229,255,0.75)' }}>{totalWeeks}</span>
            </span>
          </div>
        </div>

        {/* Player cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))',
          gap: 14,
        }}>
          {sortedPlayers.map((player, idx) => {
            const showBreakdown = openDetails === player.name;
            const stagger = `card-stagger-${Math.min(idx + 1, 6)}`;
            return (
              <div key={player.name} className={`player-card-wrap ${stagger}`}>
              <PlayerCard
                player={player}
                totalWeeks={totalWeeks}
                history={history}
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
              </div>
            );
          })}
        </div>

        {/* ── Collapsible rank guide ── */}
        <div style={{ background: 'var(--co-panel)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)' }}>
          <button
            onClick={() => setShowRankGuide(v => !v)}
            style={{
              width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)', letterSpacing: '0.15em' }}>
              {RANKS.map(r => r.emoji).join(' ')}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', letterSpacing: '0.12em', color: 'var(--co-dim)', textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
              Co oznaczają rangi?
            </span>
            <ChevronDown size={13} style={{ color: 'var(--co-dim)', transform: showRankGuide ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
          {showRankGuide && (
            <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6, borderTop: '1px solid var(--co-border)' }}>
              {RANKS.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: `${r.hex}06`, border: `1px solid ${r.hex}20`,
                  clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                  marginTop: 6,
                }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{r.emoji}</span>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: r.hex, margin: 0, letterSpacing: '0.08em' }}>{r.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--co-dim)', margin: 0 }}>
                      {i === RANKS.length - 1 ? '<20%' : `${r.min}%+`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
