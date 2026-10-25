import { useState, useRef, useCallback, useEffect, memo } from 'react';
import type { PointerEvent } from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { getPlayerColor } from '@/constants/colors';
import { ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL, rankTint } from '@/constants';
import { FONT, CLIP } from '../../constants/styles';
import { formatAmountShort } from '@/utils/format';
import { BLIK_NUMBER } from '@/utils/blik';
import { makeId } from '@/utils/id';
import { RARITY_CARD_CLASS, RARITY_FOIL_CLASS, RARITY_LABEL } from '@/utils/playerCard';
import { usePaymentUndo } from '@/hooks/usePaymentUndo';
import { useIsMobile } from '@/hooks/useIsMobile';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal, { type PaymentModalType } from './PaymentModal';
import HoldToSettleButton from './HoldToSettleButton';
import UndoBar from '../common/UndoBar';
import Modal from '../common/Modal';
import TreasurerPanel from './TreasurerPanel';

import StreakBadge from '../attendance/StreakBadge';
import type { DebtDisplayData, HistoryEntry, PlayerCardMeta, PlayerStats, SoundType } from '@/types/ui';
import type { AddPaymentResult, TransactionResult } from '@/types/domain';
import type { StyleWithVars } from '@/types/css';
import { useAnimatedValue } from './useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Barcode } from './Barcode';
import { CornerBrackets } from './CornerBrackets';
import { PlayerAvatar } from './PlayerAvatar';
import { RankBadge } from './RankBadge';

interface PlayerCardProps {
  player: PlayerStats;
  /** Sesje bieżącego sezonu — ostatnie kropki i licznik obecności. */
  history: HistoryEntry[];
  meta: PlayerCardMeta;
  openDetails: boolean;
  onToggleDetails: (playerName: string) => void;
  breakdown: DebtDisplayData | null;
  onAddPayment: (playerName: string, amount: number, paymentId: string) => Promise<AddPaymentResult>;
  onRemovePayment: (playerName: string, paymentId: string) => Promise<TransactionResult>;
  playSound: (type: SoundType) => void;
  playerIndex?: number;
  /** Podawane tylko dla skarbnika — zasila panel „kto ile winien”. */
  allPlayers?: PlayerStats[];
}

function PlayerCard({
  player, history, meta,
  openDetails, onToggleDetails, breakdown,
  onAddPayment, onRemovePayment,
  playSound,
  playerIndex = 0,
  allPlayers,
}: PlayerCardProps) {
  const isMobile = useIsMobile();
  const isOrganizer = player.name === ORGANIZER_NAME;
  const debt        = player.currentDebt;
  const isPending   = debt > SETTLED_THRESHOLD;
  const hasCredit   = debt < -SETTLED_THRESHOLD;
  const isSettled   = !isPending && !hasCredit;
  const pct         = meta.attendancePercentage;
  const rank        = meta.rank;
  const c           = getPlayerColor(player.name, playerIndex);

  const [modal,     setModal]     = useState<PaymentModalType | null>(null);
  const [customAmt, setCustomAmt] = useState('');
  const [isSaving,  setIsSaving]  = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [flash,     setFlash]     = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [settling, setSettling] = useState(false);
  const [confirmSettle, setConfirmSettle] = useState(false);

  const reducedMotion = useReducedMotion();

  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDebt   = useRef(debt);
  const cardRef    = useRef<HTMLDivElement | null>(null);
  const foilRef    = useRef<HTMLDivElement | null>(null);
  const tiltFrameRef = useRef<number | null>(null);
  const releaseTiltTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const touchTiltActiveRef = useRef(false);
  const savingRef  = useRef(false);
  const pendingPaymentIdRef = useRef<string | null>(null);

  // 850 ms zamiast 450: po zapisie kwota ma widocznie zjechać do zera, a nie
  // mrugnąć. Ten sam licznik animuje też powrót długu po „cofnij”.
  const animatedAbs = useAnimatedValue(Math.abs(debt), 850);

  useEffect(() => {
    if (prevDebt.current === debt) return undefined;
    setFlash(true);
    prevDebt.current = debt;
    const t = setTimeout(() => setFlash(false), 750);
    return () => clearTimeout(t);
  }, [debt]);

  useEffect(() => {
    if (!justCleared) return undefined;
    const t = setTimeout(() => setJustCleared(false), 2800);
    return () => clearTimeout(t);
  }, [justCleared]);

  // Pieczątka pojawia się dopiero, gdy licznik naprawdę dojechał do zera.
  // Wcześniej timer startował w momencie zapisu i po 850 ms nakładał
  // „ROZLICZONY” na jeszcze animującą się kwotę (0,07 zł).
  useEffect(() => {
    if (!settling || debt > SETTLED_THRESHOLD) return undefined;
    const t = setTimeout(() => {
      setSettling(false);
      setJustCleared(true);
      // Dźwięk przy płatności gra już wcześniej (COIN) — drugi byłby nadmiarowy.
    }, reducedMotion ? 0 : 900);
    return () => clearTimeout(t);
  }, [settling, debt, reducedMotion, playSound]);

  const { lastPayment, secondsLeft, progressPct, startPaymentUndo, handleUndoPayment } =
    usePaymentUndo({ playerName: player.name, onRemovePayment });

  const handleAmountClick = useCallback(() => {
    clickCount.current += 1;
    clearTimeout(clickTimer.current ?? undefined);
    if (clickCount.current >= 5) { clickCount.current = 0; setAdminMode(prev => !prev); }
    else clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 1000);
  }, []);
  useEffect(() => () => clearTimeout(clickTimer.current ?? undefined), []);

  const cancelModal = useCallback(() => {
    setPaymentError(null);
    setModal(null);
    setCustomAmt('');
    pendingPaymentIdRef.current = null;
  }, []);

  const savePayment = useCallback(async (amount: number) => {
    if (savingRef.current) return;
    savingRef.current = true;

    const paymentId = pendingPaymentIdRef.current ?? makeId();
    pendingPaymentIdRef.current = paymentId;

    setPaymentError(null);
    setIsSaving(true);

    try {
      const result = await onAddPayment(player.name, amount, paymentId);
      if (result?.paymentId && result?.success !== false) {
        pendingPaymentIdRef.current = null;
        startPaymentUndo({ id: result.paymentId, amount });
        if (debt > SETTLED_THRESHOLD && debt - amount <= SETTLED_THRESHOLD) {
          // Sam licznik zjeżdża do zera; pieczątka i dźwięk czekają na efekt
          // powyżej, żeby nie nakładały się na animację.
          setJustCleared(false);
          setSettling(true);
        }
        cancelModal();
        setConfirmSettle(false);
      } else {
        setPaymentError(result?.error || 'Nie udało się zapisać wpłaty');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setPaymentError(message || 'Nie udało się zapisać wpłaty');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [player.name, debt, onAddPayment, startPaymentUndo, cancelModal]);

  const handleUndo = useCallback(async () => {
    setSettling(false);
    setJustCleared(false);
    await handleUndoPayment();
  }, [handleUndoPayment]);

  const accentColor = c.border;
  const cardBorder = isSettled && !isOrganizer
    ? `${c.border}25`
    : `${c.border}30`;
  const playerId = `P${String((player.name.charCodeAt(0) * 31 + playerIndex * 17) % 9000 + 1000)}`;

  const scheduleCardTilt = useCallback((clientX: number, clientY: number) => {
    if (reducedMotion) return;
    pendingPointerRef.current = { x: clientX, y: clientY };
    if (tiltFrameRef.current !== null) return;

    tiltFrameRef.current = requestAnimationFrame(() => {
      tiltFrameRef.current = null;
      const point = pendingPointerRef.current;
      const card = cardRef.current;
      if (!point || !card) return;

      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = Math.max(0, Math.min(1, (point.x - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (point.y - rect.top) / rect.height));

      if (releaseTiltTimerRef.current) clearTimeout(releaseTiltTimerRef.current);
      card.style.transition = 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0s';
      card.style.transform = `perspective(920px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg)`;
      card.style.borderColor = `${c.border}70`;
      card.style.boxShadow = isPending && !isOrganizer
        ? 'var(--glow-box-rose)'
        : 'var(--glow-box-cyan)';
      foilRef.current?.style.setProperty('--foil-x', `${x * 100}%`);
      foilRef.current?.style.setProperty('--foil-y', `${y * 100}%`);
    });
  }, [c.border, isOrganizer, isPending, reducedMotion]);

  const handleCardPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && !touchTiltActiveRef.current) return;
    scheduleCardTilt(event.clientX, event.clientY);
  }, [scheduleCardTilt]);

  const handleCardPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || reducedMotion) return;
    touchTiltActiveRef.current = true;
    scheduleCardTilt(event.clientX, event.clientY);
  }, [reducedMotion, scheduleCardTilt]);

  const resetCardTilt = useCallback(() => {
    touchTiltActiveRef.current = false;
    pendingPointerRef.current = null;
    if (tiltFrameRef.current !== null) {
      cancelAnimationFrame(tiltFrameRef.current);
      tiltFrameRef.current = null;
    }
    if (releaseTiltTimerRef.current) clearTimeout(releaseTiltTimerRef.current);

    const card = cardRef.current;
    if (!card) return;
    foilRef.current?.style.setProperty('--foil-x', '50%');
    foilRef.current?.style.setProperty('--foil-y', '22%');

    if (reducedMotion) {
      // Przy zmianie preferencji resetuj bez animacji i bez pozostawiania timera.
      card.style.removeProperty('transition');
      card.style.removeProperty('transform');
      card.style.removeProperty('border-color');
      card.style.removeProperty('box-shadow');
      return;
    }

    card.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms ease, box-shadow 200ms ease';
    card.style.transform = 'none';
    card.style.borderColor = cardBorder;
    card.style.boxShadow = isPending && !isOrganizer ? 'var(--glow-box-rose)' : 'none';

    releaseTiltTimerRef.current = setTimeout(() => {
      card.style.removeProperty('transition');
      card.style.removeProperty('transform');
      card.style.removeProperty('border-color');
      card.style.removeProperty('box-shadow');
      releaseTiltTimerRef.current = null;
    }, 300);
  }, [cardBorder, isOrganizer, isPending, reducedMotion]);

  const handleCardPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') resetCardTilt();
  }, [resetCardTilt]);

  useEffect(() => {
    if (reducedMotion) resetCardTilt();
  }, [reducedMotion, resetCardTilt]);

  useEffect(() => () => {
    if (tiltFrameRef.current !== null) cancelAnimationFrame(tiltFrameRef.current);
    if (releaseTiltTimerRef.current) clearTimeout(releaseTiltTimerRef.current);
  }, []);

  const foilStyle: StyleWithVars = {
    '--foil-x': '50%',
    '--foil-y': '22%',
    '--foil-tint': rankTint(rank, 60),
  };

  return (
    <div
      ref={cardRef}
      className={`crt-card glass-card ${RARITY_CARD_CLASS[meta.rarity]}`}
      style={{
        position: 'relative',
        border: `1px solid ${cardBorder}`,
        display: 'flex', flexDirection: 'column',
        flex: 1, height: '100%',
        animation: 'none',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        transformStyle: 'preserve-3d',
        boxShadow: isPending && !isOrganizer
          ? 'var(--glass-shadow), var(--glass-rim), var(--glow-box-rose)'
          : 'var(--glass-shadow), var(--glass-rim)',
      }}
      onPointerMove={handleCardPointerMove}
      onPointerDown={handleCardPointerDown}
      onPointerUp={handleCardPointerUp}
      onPointerCancel={handleCardPointerUp}
      onPointerLeave={resetCardTilt}
    >
      <div ref={foilRef} className={RARITY_FOIL_CLASS[meta.rarity]} style={foilStyle} aria-hidden="true" />
      <CornerBrackets color={accentColor} size={14} thickness={1} />
      <div className="glass-shine-overlay" aria-hidden="true" />
      <span className="sr-only" role="status" aria-live="polite">
        {isSaving ? 'Zapisywanie wpłaty…' : settling ? 'Rozliczanie…' : justCleared ? 'Wpłata zapisana. Karta rozliczona.' : ''}
      </span>

      <div style={{
        padding: '6px 14px',
        background: (!isOrganizer && isPending)
          ? 'var(--co-tint-rose)'
          : hasCredit ? 'var(--co-tint-green)'
          : 'var(--co-tint)',
        borderBottom: '1px solid var(--co-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 1,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          color: (!isOrganizer && isPending) ? `${c.border}99` : hasCredit ? 'var(--co-green)' : 'var(--co-dim)',
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          {isOrganizer
            ? (hasCredit ? '↑ Do zebrania' : isPending ? '↕ Saldo' : '✓ Skarbnik')
            : isPending ? 'Do wpłaty'
            : isSettled ? 'Rozliczony'
            : '↑ Nadpłata'}
        </span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.75rem',
          color: rank.hex, letterSpacing: '0.18em',
        }}>{RARITY_LABEL[meta.rarity]}</span>
      </div>

      <div style={{
        padding: '14px',
        borderBottom: '1px solid var(--co-separator)',
        display: 'flex', gap: 14, alignItems: 'stretch',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'space-between', gap: 6, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span className="card-ovr" style={{ color: rank.hex }}>{meta.overall}</span>
            <span style={{ ...FONT.monoMicro, letterSpacing: '0.14em', color: rank.hex, lineHeight: 1 }}>OVR</span>
          </div>
          <PlayerAvatar
            name={player.name}
            index={playerIndex}
            isPending={isOrganizer ? undefined : isPending}
          />
        </div>
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8,
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 5vw, 1.85rem)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--co-text-hi)',
              margin: 0, lineHeight: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{player.name}</h3>

            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <RankBadge rank={rank} pct={pct} showHint={!isMobile} />
              {meta.currentStreak >= 2 && <StreakBadge streak={meta.currentStreak} />}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ ...FONT.monoLabel }}>
                Obecność
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
                {meta.attendanceCount}/{meta.eligibleWeeks}
              </span>
            </div>
            <div style={{ height: 2, background: 'var(--co-bar-track)', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
                background: pct >= 75
                  ? 'linear-gradient(90deg, var(--co-cyan), var(--co-green))'
                  : pct >= 45
                  ? 'linear-gradient(90deg, var(--co-green), var(--co-cyan))'
                  : `linear-gradient(90deg, ${c.border}CC, ${c.border}66)`,
                transition: 'width 0.8s ease',
              }} />
            </div>
            {history && history.length > 0 && (
              <div
                title={`Ostatnie ${[...history].slice(0, isMobile ? 6 : 10).length} sesji`}
                style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {[...history].slice(0, isMobile ? 6 : 10).reverse().map((session, i) => {
                  const attended = session.presentPlayers.includes(player.name);
                  return (
                    <div
                      key={session.id || i}
                      title={session.datePlayed}
                      style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: attended ? c.border : 'transparent',
                        border: `1px solid ${attended ? c.border : 'var(--co-dot-empty)'}`,
                        boxShadow: attended ? `0 0 4px ${c.border}80` : 'none',
                        transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isOrganizer && (
        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

          <div
            className={`${flash ? 'debt-flash' : ''} ${settling ? 'debt-settling' : ''}`.trim()}
            onClick={handleAmountClick}
            style={{
              minHeight: 84,
              padding: '12px',
              marginBottom: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: isPending
                ? 'var(--co-tint-rose)'
                : hasCredit ? 'var(--co-tint-green)'
                : 'var(--co-tint)',
              border: `1px solid ${isPending
                ? 'var(--co-rose)'
                : hasCredit ? 'var(--co-green)'
                : 'var(--co-tint-line)'}`,
              clipPath: CLIP.tag,
              cursor: 'default', userSelect: 'none',
              position: 'relative', overflow: 'hidden',
              textAlign: 'center',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
          >


            {hasCredit ? (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-green)', letterSpacing: '0.18em', marginBottom: 2 }}>
                  ↑ NADPŁATA
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--co-green)', margin: 0, lineHeight: 1 }}>
                  +{formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '1rem', color: 'var(--co-dim)', marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: '2.5rem',
                  margin: 0, lineHeight: 1.1,
                  color: isPending ? 'var(--co-rose)' : 'var(--co-green)',
                  textShadow: isPending ? 'var(--glow-rose-md)' : 'var(--glow-cyan-md)',
                }}>
                  {formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '1rem', color: 'var(--co-dim)', marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
                </p>
              </div>
            )}
            {adminMode && (
              <p style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-rose)', letterSpacing: '0.1em', marginTop: 4, position: 'relative', zIndex: 1 }}>
                <TriangleAlert size={12} aria-hidden="true" /> TRYB EDYCJI
              </p>
            )}
          </div>

          <BreakdownPanel
            playerName={player.name}
            open={openDetails}
            onToggle={() => onToggleDetails(player.name)}
            breakdown={breakdown}
            adminMode={adminMode}
            onRemovePayment={onRemovePayment}
          />

          {lastPayment && (
            <div style={{ marginBottom: 10 }}>
              <UndoBar
                message={<>{formatAmountShort(lastPayment.amount)} zł zapisane</>}
                secondsLeft={secondsLeft}
                progressPct={progressPct}
                onUndo={handleUndo}
                buttonLabel="cofnij"
                compact
              />
            </div>
          )}

          <PaymentModal
            type={modal} hasCredit={hasCredit}
            customAmt={customAmt} onAmtChange={setCustomAmt}
            onSave={savePayment} onCancel={cancelModal}
            isSaving={isSaving}
            errorMsg={paymentError}
          />

          <Modal
            open={confirmSettle}
            onClose={() => setConfirmSettle(false)}
            title="Zapisać wpłatę?"
            icon={CheckCircle2}
            align={isMobile ? 'bottom' : 'center'}
            maxWidth={420}
            footer={
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setConfirmSettle(false); setPaymentError(null); }}
                  disabled={isSaving}
                  className="cyber-button-outline"
                  style={{ flex: 1, minHeight: 44, padding: '10px 14px' }}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => void savePayment(debt)}
                  disabled={isSaving}
                  className="cyber-button-yellow"
                  style={{ flex: 1, minHeight: 44, padding: '10px 14px' }}
                >
                  {isSaving ? 'Zapisywanie…' : 'Tak, zapisz'}
                </button>
              </div>
            }
          >
            <p style={{ ...FONT.monoSmall, color: 'var(--co-text)', margin: '0 0 10px', lineHeight: 1.6 }}>
              Zapisać <strong style={{ color: 'var(--co-green)' }}>{formatAmountShort(debt)} zł</strong> jako wpłatę od {player.name}?
            </p>
            <p style={{ ...FONT.monoMicro, color: 'var(--co-dim)', margin: 0, lineHeight: 1.6 }}>
              To tylko wpis w aplikacji — nie wykonuje przelewu. Przelew BLIK zrób osobno na numer {BLIK_NUMBER}.
            </p>
            {paymentError && (
              <p role="alert" style={{ ...FONT.monoMicro, color: 'var(--co-rose)', margin: '10px 0 0', lineHeight: 1.6 }}>
                {paymentError}
              </p>
            )}
          </Modal>

          {modal === null && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isPending && (
                <>
                  <HoldToSettleButton
                    amount={debt}
                    disabled={isSaving}
                    onConfirm={() => void savePayment(debt)}
                    onKeyboardRequest={() => setConfirmSettle(true)}
                  />
                  <button onClick={() => setModal(PAYMENT_MODAL.CUSTOM)} className="cyber-button-outline" style={{ padding: '8px 12px', width: '100%' }} aria-label="Wpłać inną kwotę">
                    + Inna kwota
                  </button>
                </>
              )}
              {hasCredit && (
                <button onClick={() => setModal(PAYMENT_MODAL.CUSTOM)} className="cyber-button-outline" style={{ padding: '8px 12px', width: '100%' }}>
                  + Wpłać więcej
                </button>
              )}
              {isSettled && (
                <button onClick={() => setModal(PAYMENT_MODAL.CUSTOM)} className="cyber-button-outline" style={{ padding: '8px 12px', width: '100%' }}>
                  + Wpłać na zapas
                </button>
              )}
            </div>
          )}

          {!isMobile && (
            <div style={{ marginTop: modal === null ? 12 : 'auto', paddingTop: 10, borderTop: '1px solid var(--co-separator)' }}>
              <Barcode name={player.name} color={accentColor} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ ...FONT.monoMicro, letterSpacing: '0.1em' }}>
                  {playerId}-{player.name.toUpperCase().replace(/\s/g, '')}
                </span>
                <span style={{ ...FONT.monoMicro, letterSpacing: '0.06em' }}>
                  SW-NET
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {isOrganizer && (
        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

          <div
            className={flash ? 'debt-flash' : ''}
            style={{
              minHeight: 84,
              padding: '12px',
              marginBottom: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: hasCredit ? 'var(--co-tint-green)' : 'var(--co-tint)',
              border: `1px solid ${hasCredit ? 'var(--co-green)' : 'var(--co-tint-line)'}`,
              clipPath: CLIP.tag,
              textAlign: 'center',
              position: 'relative', overflow: 'hidden',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
          >
            {hasCredit ? (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-green)', letterSpacing: '0.18em', marginBottom: 2 }}>
                  ↑ DO ZEBRANIA
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--co-green)', margin: 0, lineHeight: 1, textShadow: 'var(--glow-green-md)' }}>
                  +{formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '1rem', color: 'var(--co-dim)', marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-green)', letterSpacing: '0.1em', margin: '4px 0 0' }}>
                  suma wpłat do zebrania od graczy
                </p>
              </div>
            ) : isPending ? (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-cyan)', letterSpacing: '0.18em', marginBottom: 2 }}>
                  ↕ SALDO
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--co-cyan)', margin: 0, lineHeight: 1, textShadow: 'var(--glow-cyan-md)' }}>
                  {formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '1rem', color: 'var(--co-dim)', marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-cyan)', letterSpacing: '0.1em', margin: '4px 0 0' }}>
                  nadwyżka ponad zaległości
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--co-green)', margin: 0, letterSpacing: '0.1em', textShadow: 'var(--glow-green-md)' }}>
                  ✓ WSZYSCY ROZLICZENI
                </p>
              </div>
            )}
          </div>

          {allPlayers && (
            <TreasurerPanel
              players={allPlayers}
              open={openDetails}
              onToggle={() => onToggleDetails(player.name)}
            />
          )}

          {!isMobile && (
            <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--co-separator)' }}>
              <Barcode name={player.name} color={c.border} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ ...FONT.monoMicro, letterSpacing: '0.1em' }}>
                  {playerId}-{player.name.toUpperCase().replace(/\s/g, '')}
                </span>
                <span style={{ ...FONT.monoMicro, letterSpacing: '0.06em' }}>
                  SW-NET
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Design system hooks (kept for lint:css reachability):
   status-chip neon-status-debt neon-status-credit neon-status-multisport neon-status-streak */
export default memo(PlayerCard);
