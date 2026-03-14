import { useState, useRef, useCallback, useEffect } from 'react';
import { CheckCircle2, Coins } from 'lucide-react';
import { getRank, ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL } from '../../constants';
import { formatAmountShort } from '../../utils/format';
import { useThemeTokens } from '../../context/ThemeContext';
import { usePaymentUndo } from '../../hooks/usePaymentUndo';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal from './PaymentModal';
import UndoBar from '../common/UndoBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDebtStateStyles(debt) {
  if (debt > SETTLED_THRESHOLD) return {
    cardBorder: 'border-magenta-800 hover:border-magenta-500',
    headerBg:   'bg-magenta-950/50',
    headerBord: 'border-magenta-600',
    headerText: 'text-magenta-300 text-neon-pink',
    balanceBg:  'bg-magenta-950/30 border-magenta-800',
  };
  if (debt < -SETTLED_THRESHOLD) return {
    cardBorder: 'border-yellow-700 hover:border-yellow-500',
    headerBg:   'bg-yellow-950/40',
    headerBord: 'border-yellow-700',
    headerText: 'text-yellow-300',
    balanceBg:  'bg-yellow-950/30 border-yellow-800',
  };
  return {
    cardBorder: 'border-cyan-800 hover:border-cyan-500',
    headerBg:   'bg-cyan-950/50',
    headerBord: 'border-cyan-600',
    headerText: 'text-cyan-300 text-neon-blue',
    balanceBg:  'bg-emerald-950/30 border-emerald-900',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlayerCard({
  player, totalWeeks, onSettle, justSettled,
  openDetails, onToggleDetails, breakdown,
  onAddPayment, onRemovePayment, onPin, onUnpin,
}) {
  const isOrganizer = player.name === ORGANIZER_NAME;
  const debt        = player.currentDebt;
  const hasDebt     = debt > SETTLED_THRESHOLD;
  const hasCredit   = debt < -SETTLED_THRESHOLD;
  const pct         = totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0;
  const rank        = getRank(pct);
  const tokens      = useThemeTokens();
  const styles      = getDebtStateStyles(debt);

  const [modal,     setModal]     = useState(null);
  const [customAmt, setCustomAmt] = useState('');
  const [isSaving,  setIsSaving]  = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);
  const cardRef    = useRef(null);

  const { lastPayment, secondsLeft, progressPct, startPaymentUndo, handleUndoPayment } =
    usePaymentUndo({ playerName: player.name, onPin, onUnpin, onRemovePayment });

  // 5-tap secret admin mode
  const handleAmountClick = useCallback(() => {
    clickCount.current += 1;
    clearTimeout(clickTimer.current);
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      setAdminMode(prev => !prev);
    } else {
      clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 1000);
    }
  }, []);

  useEffect(() => () => clearTimeout(clickTimer.current), []);

  const cancelModal = useCallback(() => { setModal(null); setCustomAmt(''); }, []);

  const savePayment = useCallback(async (amount) => {
    cancelModal();
    setIsSaving(true);
    onPin(player.name);
    const result = await onAddPayment(player.name, amount);
    if (result?.paymentId) {
      startPaymentUndo({ id: result.paymentId, amount });
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } else {
      onUnpin();
    }
    setIsSaving(false);
  }, [player.name, onAddPayment, onPin, onUnpin, startPaymentUndo, cancelModal]);

  return (
    <div
      ref={cardRef}
      className={`cyber-box ${styles.cardBorder} rounded-2xl overflow-hidden transition-all flex flex-col ${justSettled ? 'settle-flash' : ''}`}
    >
      {/* Header */}
      <div className={`${styles.headerBg} p-4 border-b-2 ${styles.headerBord}`}>
        <h3 className={`font-black text-xl ${styles.headerText} flex items-center gap-2`}>
          <span className="mini-paddle" /> {player.name}
        </h3>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Attendance */}
        <div className="text-sm text-cyan-700 mb-4 flex flex-col gap-1 items-center text-center">
          <span>Obecność: <span className="text-cyan-300 text-lg">{player.attendanceCount}</span> / {totalWeeks} ({pct}%)</span>
          <span className={`font-bold ${rank.color}`}>{rank.emoji} {rank.name}</span>
        </div>

        {isOrganizer ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-cyan-400 text-sm font-bold tracking-wide">📋 ogarnia rezerwacje 🏓</p>
          </div>
        ) : (
          <>
            {/* Balance display */}
            <div
              className={`p-4 rounded-xl border-2 shadow-inner mb-4 text-center cursor-default select-none ${styles.balanceBg}`}
              onClick={handleAmountClick}
            >
              {justSettled ? (
                <div style={{ animation: 'checkPop 0.4s ease-out forwards' }}>
                  <CheckCircle2 className="text-emerald-400 mx-auto" size={32} />
                </div>
              ) : hasCredit ? (
                <>
                  <p className="text-xs text-yellow-600 tracking-widest mb-1 font-bold">NADPŁATA — zaliczona na kolejne sesje</p>
                  <p className="text-3xl font-black text-yellow-300" style={{ textShadow: '0 0 10px rgba(253,224,71,0.4)' }}>
                    +{formatAmountShort(Math.abs(debt))}<span className="text-sm ml-1">zł</span>
                  </p>
                </>
              ) : (
                <>
                  {hasDebt && <p className="text-xs text-cyan-700 tracking-widest mb-1">DO ZAPŁATY</p>}
                  <p className={`text-3xl neon-amount ${hasDebt ? '' : 'text-emerald-400'}`}
                    style={hasDebt ? {} : { textShadow: '0 0 8px rgba(52,211,153,0.5)' }}>
                    {formatAmountShort(Math.abs(debt))}<span className="text-sm ml-1">zł</span>
                  </p>
                </>
              )}
              {adminMode && (
                <p className="text-xs text-rose-500 font-bold tracking-widest mt-1">🔓 tryb edycji</p>
              )}
            </div>

            {/* Breakdown */}
            {!justSettled && (
              <BreakdownPanel
                playerName={player.name}
                open={openDetails}
                onToggle={() => onToggleDetails(player.name)}
                breakdown={breakdown}
                adminMode={adminMode}
                onRemovePayment={onRemovePayment}
              />
            )}

            {/* Payment undo bar */}
            {lastPayment && (
              <div className="mb-3">
                <UndoBar
                  message={<>{formatAmountShort(lastPayment.amount)} zł zapisane</>}
                  secondsLeft={secondsLeft}
                  progressPct={progressPct}
                  onUndo={handleUndoPayment}
                  buttonLabel="cofnij"
                  compact
                />
              </div>
            )}

            {/* Payment modal (exact debt or custom amount) */}
            <PaymentModal
              type={modal}
              debt={debt}
              hasCredit={hasCredit}
              customAmt={customAmt}
              onAmtChange={setCustomAmt}
              onSave={savePayment}
              onCancel={cancelModal}
              isSaving={isSaving}
              tokens={tokens}
            />

            {/* Action buttons — hidden while a modal is open */}
            {!justSettled && modal === null && (
              <div className="mt-auto flex flex-col gap-2">
                {hasDebt && (
                  <>
                    <button
                      onClick={() => setModal(PAYMENT_MODAL.EXACT)}
                      className="w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 transition-all"
                      style={{ background: tokens.confirmBg, border: `2px solid ${tokens.confirmBorder}`, color: tokens.confirmText }}
                    >
                      <Coins size={18} /> Wysyłam {formatAmountShort(debt)} zł na BLIK 💸
                    </button>
                    <button
                      onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                      className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                      style={{ border: `1px dashed ${tokens.accentBorder}`, color: tokens.accentText, opacity: 0.7 }}
                    >
                      + inna kwota
                    </button>
                  </>
                )}
                {hasCredit && (
                  <button
                    onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                    className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ border: `1px dashed ${tokens.accentBorder}`, color: tokens.accentText, opacity: 0.7 }}
                  >
                    + wpłać więcej
                  </button>
                )}
                {!hasDebt && !hasCredit && (
                  <>
                    <div
                      className="w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 opacity-60 select-none"
                      style={{ border: `2px solid ${tokens.mutedBorder}`, color: tokens.mutedText }}
                    >
                      <CheckCircle2 size={18} /> wszystko zapłacone ✓
                    </div>
                    <button
                      onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                      className="w-full py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ border: `1px dashed ${tokens.accentBorder}`, color: tokens.accentText, opacity: 0.7 }}
                    >
                      + wpłać na zapas
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
