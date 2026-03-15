import { useState, useRef, useCallback, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getRank, RANK_BAR_COLOR, ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL } from '../../constants';
import { formatAmountShort } from '../../utils/format';
import { useTheme, useThemeTokens } from '../../context/ThemeContext';
import { usePaymentUndo } from '../../hooks/usePaymentUndo';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal from './PaymentModal';
import UndoBar from '../common/UndoBar';
import { InlineSpinner } from '../common/LoadingSkeleton';

// ─── Animated counter ────────────────────────────────────────────────────────
function useAnimatedValue(value, duration = 550) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef  = useRef(null);
  useEffect(() => {
    const from = fromRef.current;
    const to   = value;
    if (from === to) return;
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now) => {
      const t     = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
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
  const isSettled   = !hasDebt && !hasCredit;
  const pct         = totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0;
  const rank        = getRank(pct);
  const rankBarColor = RANK_BAR_COLOR(pct);
  const theme       = useTheme();
  const tokens      = useThemeTokens();
  const isCyber     = theme !== 'arcade' && theme !== 'zen';

  const [modal,     setModal]     = useState(null);
  const [customAmt, setCustomAmt] = useState('');
  const [isSaving,  setIsSaving]  = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [flash,     setFlash]     = useState(false);

  const clickCount  = useRef(0);
  const clickTimer  = useRef(null);
  const prevDebtRef = useRef(debt);
  const cardRef     = useRef(null);

  const animatedAbs = useAnimatedValue(Math.abs(debt));

  useEffect(() => {
    if (prevDebtRef.current !== debt) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 750);
      prevDebtRef.current = debt;
      return () => clearTimeout(t);
    }
  }, [debt]);

  const { lastPayment, secondsLeft, progressPct, startPaymentUndo, handleUndoPayment } =
    usePaymentUndo({ playerName: player.name, onPin, onUnpin, onRemovePayment });

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
    } else { onUnpin(); }
    setIsSaving(false);
  }, [player.name, onAddPayment, onPin, onUnpin, startPaymentUndo, cancelModal]);

  // ── Card class based on state ──────────────────────────────────────────────
  const cardClass = isOrganizer
    ? 'obs-card obs-card-organizer rounded-2xl'
    : isSettled
    ? `obs-card obs-card-settled rounded-2xl ${justSettled ? 'settle-flash' : ''}`
    : `obs-card obs-card-debt rounded-2xl ${justSettled ? 'settle-flash' : ''}`;

  return (
    <div ref={cardRef} className={cardClass}>
      {/* Rank bar */}
      {!isOrganizer && (
        <div className="obs-rank-bar" style={{ background: rankBarColor }} />
      )}

      <div className="pl-5 pr-4 pt-4 pb-4 flex flex-col gap-3">

        {/* ── Top row: name + attendance ── */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: isOrganizer ? 'rgba(255,255,255,0.2)' : tokens.mutedText,
              marginBottom: '2px',
            }}>
              {player.name}
            </p>
            {!isOrganizer && (
              <p style={{ fontSize: '10px', color: tokens.mutedText, opacity: 0.65 }}>
                {rank.name}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: tokens.mutedText,
              marginBottom: '2px',
            }}>
              {player.attendanceCount}/{totalWeeks}
            </p>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              fontWeight: 700,
              color: tokens.bodyText,
              opacity: 0.5,
            }}>{pct}%</p>
          </div>
        </div>

        {/* ── Amount ── */}
        {isOrganizer ? (
          <div style={{ color: tokens.mutedText, fontSize: '12px', paddingBottom: '4px' }}>
            organizator · rezerwacje
          </div>
        ) : (
          <div
            className={`${flash ? 'debt-flash' : ''}`}
            onClick={handleAmountClick}
            style={{ cursor: 'default', userSelect: 'none', borderRadius: '8px', padding: '2px 0' }}
          >
            {justSettled ? (
              <div style={{ animation: 'checkPop 0.4s ease-out forwards', padding: '4px 0' }}>
                <CheckCircle2 style={{ color: '#00c853' }} size={28} />
              </div>
            ) : hasCredit ? (
              <div>
                <p style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f4b942', opacity: 0.7, marginBottom: '2px' }}>
                  Nadpłata
                </p>
                <p className="obs-amount" style={{ fontSize: isCyber ? '36px' : '28px', color: '#f4b942' }}>
                  +{formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '14px', marginLeft: '4px', fontWeight: 400, opacity: 0.5 }}>zł</span>
                </p>
              </div>
            ) : isSettled ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <CheckCircle2 style={{ color: '#00c853', flexShrink: 0 }} size={20} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#00c853', letterSpacing: '0.06em' }}>
                  Rozliczony
                </span>
              </div>
            ) : (
              <div>
                {hasDebt && (
                  <p style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: tokens.mutedText, marginBottom: '2px' }}>
                    Do zapłaty
                  </p>
                )}
                <p className="obs-amount" style={{
                  fontSize: isCyber ? '36px' : '28px',
                  color: hasDebt ? tokens.headingText : '#00c853',
                }}>
                  {formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '14px', marginLeft: '4px', fontWeight: 400, opacity: 0.45 }}>zł</span>
                </p>
                {hasDebt && breakdown === null && (
                  <p style={{ fontSize: '10px', color: tokens.mutedText, opacity: 0.6, marginTop: '2px' }}>
                    {player.attendanceCount > 0 ? `${player.attendanceCount} sesji łącznie` : ''}
                  </p>
                )}
              </div>
            )}
            {adminMode && (
              <p style={{ fontSize: '10px', color: '#f87171', fontWeight: 600, letterSpacing: '0.1em', marginTop: '4px' }}>🔓 tryb edycji</p>
            )}
          </div>
        )}

        {/* ── Breakdown ── */}
        {!isOrganizer && !justSettled && (
          <BreakdownPanel
            playerName={player.name}
            open={openDetails}
            onToggle={() => onToggleDetails(player.name)}
            breakdown={breakdown}
            adminMode={adminMode}
            onRemovePayment={onRemovePayment}
          />
        )}

        {/* ── Payment undo bar ── */}
        {lastPayment && (
          <UndoBar
            message={<>{formatAmountShort(lastPayment.amount)} zł zapisane</>}
            secondsLeft={secondsLeft}
            progressPct={progressPct}
            onUndo={handleUndoPayment}
            buttonLabel="cofnij"
            compact
          />
        )}

        {/* ── Custom amount modal ── */}
        {!isOrganizer && (
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
        )}

        {/* ── Actions ── */}
        {!isOrganizer && !justSettled && modal === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {hasDebt && (
              <>
                <button
                  onClick={() => savePayment(debt)}
                  disabled={isSaving}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${tokens.confirmBorder}`,
                    background: tokens.confirmBg,
                    color: tokens.confirmText,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                >
                  {isSaving
                    ? <InlineSpinner size="sm" />
                    : <>
                        <span style={{ fontSize: '17px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {formatAmountShort(debt)} zł
                        </span>
                        <span style={{ fontSize: '9px', letterSpacing: '0.2em', opacity: 0.6, fontWeight: 600 }}>
                          WYŚLIJ BLIK
                        </span>
                      </>
                  }
                </button>
                <button
                  onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '8px',
                    border: `1px dashed ${tokens.mutedBorder}`,
                    background: 'transparent',
                    color: tokens.mutedText,
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    letterSpacing: '0.06em',
                  }}
                >
                  + inna kwota
                </button>
              </>
            )}
            {hasCredit && (
              <button
                onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                style={{
                  width: '100%', padding: '6px', borderRadius: '8px',
                  border: `1px dashed ${tokens.mutedBorder}`, background: 'transparent',
                  color: tokens.mutedText, fontSize: '11px', fontWeight: 500,
                  cursor: 'pointer', letterSpacing: '0.06em',
                }}
              >
                + wpłać więcej
              </button>
            )}
            {isSettled && (
              <button
                onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                style={{
                  width: '100%', padding: '5px', borderRadius: '8px',
                  border: `1px dashed rgba(255,255,255,0.07)`, background: 'transparent',
                  color: 'rgba(255,255,255,0.15)', fontSize: '10px', fontWeight: 500,
                  cursor: 'pointer', letterSpacing: '0.08em',
                }}
              >
                + wpłać na zapas
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
