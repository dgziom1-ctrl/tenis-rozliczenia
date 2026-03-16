import { useState, useRef, useCallback, useEffect } from 'react';
import { CheckCircle2, Crosshair, Skull, Shield, Zap } from 'lucide-react';
import { getRank, ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL } from '../../constants';
import { formatAmountShort } from '../../utils/format';
import { useThemeTokens } from '../../context/ThemeContext';
import { usePaymentUndo } from '../../hooks/usePaymentUndo';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal from './PaymentModal';
import UndoBar from '../common/UndoBar';

// ── Animated counter ──────────────────────────────────────
function useAnimatedValue(value, duration = 550) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef  = useRef(null);
  useEffect(() => {
    const from = fromRef.current, to = value;
    if (from === to) return;
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * e);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
}

// ── Avatar initials ───────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#1a0a00', border: 'var(--cyber-yellow)', text: 'var(--cyber-yellow)' },
  { bg: '#0a0010', border: '#a855f7', text: '#a855f7' },
  { bg: '#001000', border: 'var(--cyber-green)',  text: 'var(--cyber-green)' },
  { bg: '#000a10', border: 'var(--cyber-cyan)',   text: 'var(--cyber-cyan)' },
  { bg: '#100000', border: 'var(--cyber-red)',    text: 'var(--cyber-red)' },
  { bg: '#0a0a00', border: '#facc15', text: '#facc15' },
];

function PlayerAvatar({ name, index, hasDebt, isOrganizer }) {
  const c = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = name.slice(0, 2).toUpperCase();
  const borderColor = hasDebt ? 'var(--cyber-red)' : c.border;
  const glow = hasDebt
    ? '0 0 12px rgba(255,0,51,0.6), 0 0 24px rgba(255,0,51,0.2)'
    : `0 0 12px ${c.border}60, 0 0 24px ${c.border}20`;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 56, height: 56,
        background: c.bg,
        border: `2px solid ${borderColor}`,
        borderRadius: hasDebt ? '4px' : '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: glow,
        clipPath: hasDebt
          ? 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
          : 'none',
        transition: 'all 0.3s',
        animation: hasDebt ? 'neon-pulse-red 2s ease-in-out infinite' : 'none',
        position: 'relative',
      }}>
        {isOrganizer ? (
          <Shield size={22} style={{ color: borderColor }} />
        ) : (
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
            color: c.text, letterSpacing: '0.05em',
          }}>{initials}</span>
        )}
      </div>
      {/* Status dot */}
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        width: 12, height: 12, borderRadius: '50%',
        background: hasDebt ? 'var(--cyber-red)' : 'var(--cyber-green)',
        border: '2px solid var(--cyber-black)',
        boxShadow: hasDebt ? '0 0 6px var(--cyber-red)' : '0 0 6px var(--cyber-green)',
      }} />
    </div>
  );
}

// ── Rank badge ────────────────────────────────────────────
function RankBadge({ rank, pct }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px',
      background: 'rgba(0,0,0,0.6)',
      border: '1px solid #2a2a2a',
      clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
    }}>
      <span style={{ fontSize: '0.7rem' }}>{rank.emoji}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '0.66rem',
        fontWeight: 700, letterSpacing: '0.12em', color: '#888',
        textTransform: 'uppercase',
      }}>{rank.name}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#555' }}>{pct}%</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function PlayerCard({
  player, totalWeeks, onSettle, justSettled,
  openDetails, onToggleDetails, breakdown,
  onAddPayment, onRemovePayment, onPin, onUnpin,
  playerIndex = 0,
}) {
  const isOrganizer = player.name === ORGANIZER_NAME;
  const debt        = player.currentDebt;
  const hasDebt     = debt > SETTLED_THRESHOLD;
  const hasCredit   = debt < -SETTLED_THRESHOLD;
  const isSettled   = !hasDebt && !hasCredit;
  const pct         = totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0;
  const rank        = getRank(pct);
  const tokens      = useThemeTokens();

  const [modal,     setModal]     = useState(null);
  const [customAmt, setCustomAmt] = useState('');
  const [isSaving,  setIsSaving]  = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [flash,     setFlash]     = useState(false);

  const clickCount = useRef(0);
  const clickTimer = useRef(null);
  const prevDebt   = useRef(debt);
  const cardRef    = useRef(null);

  const animatedAbs = useAnimatedValue(Math.abs(debt));

  useEffect(() => {
    if (prevDebt.current !== debt) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 750);
      prevDebt.current = debt;
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
    } else {
      onUnpin();
    }
    setIsSaving(false);
  }, [player.name, onAddPayment, onPin, onUnpin, startPaymentUndo, cancelModal]);

  // Card border based on state
  const cardBorderColor = hasDebt ? 'var(--cyber-red)' : hasCredit ? '#f59e0b' : '#1e1e1e';
  const cardAnimation   = hasDebt ? 'neon-pulse-red 2.5s ease-in-out infinite' : 'none';

  return (
    <div
      ref={cardRef}
      className={`cyber-box ${justSettled ? 'settle-flash' : ''}`}
      style={{
        borderRadius: 0,
        border: `1px solid ${cardBorderColor}`,
        clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
        animation: cardAnimation,
        display: 'flex', flexDirection: 'column',
        background: hasDebt ? 'linear-gradient(160deg, #0d0d0d, #140505)' : '#0d0d0d',
      }}
    >
      {/* ── Card Header ── */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${hasDebt ? 'rgba(255,0,51,0.2)' : '#161616'}`,
        background: hasDebt ? 'rgba(255,0,51,0.04)' : 'rgba(252,227,0,0.02)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <PlayerAvatar
          name={player.name}
          index={playerIndex}
          hasDebt={hasDebt}
          isOrganizer={isOrganizer}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Class label */}
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2,
            color: isOrganizer ? 'var(--cyber-cyan)' : hasDebt ? 'var(--cyber-red)' : hasCredit ? '#f59e0b' : 'var(--cyber-green)',
            opacity: 0.85,
          }}>
            {isOrganizer ? '🏓 ORGANIZATOR' : hasDebt ? '⚠ MA DŁUG' : hasCredit ? '💛 NADPŁATA' : '✓ ROZLICZONY'}
          </div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: hasDebt ? '#ff4d6d' : '#e8e8e8',
            margin: 0, lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {player.name}
          </h3>
          <RankBadge rank={rank} pct={pct} />
        </div>
        {hasDebt && (
          <Crosshair size={16} style={{ color: 'var(--cyber-red)', flexShrink: 0, opacity: 0.6 }} />
        )}
        {isSettled && !isOrganizer && (
          <CheckCircle2 size={16} style={{ color: 'var(--cyber-green)', flexShrink: 0 }} />
        )}
      </div>

      {/* ── Card Body ── */}
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Attendance bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>
              OBECNOŚĆ
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#888' }}>
              {player.attendanceCount}/{totalWeeks}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: '#1a1a1a', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${pct}%`,
              background: pct >= 75
                ? 'linear-gradient(90deg, #00FF41, #86efac)'
                : pct >= 45
                ? 'linear-gradient(90deg, var(--cyber-yellow), #fbbf24)'
                : 'linear-gradient(90deg, var(--cyber-red), #f87171)',
              boxShadow: pct >= 75 ? '0 0 6px var(--cyber-green)' : '0 0 6px var(--cyber-yellow)',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        {isOrganizer ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 8, padding: '16px 0',
          }}>
            <Shield size={28} style={{ color: 'var(--cyber-cyan)', opacity: 0.6 }} />
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: '0.7rem',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'var(--cyber-cyan)', opacity: 0.7,
            }}>ZARZĄDZA REZERWACJĄ</p>
          </div>
        ) : (
          <>
            {/* ── Balance display ── */}
            <div
              className={flash ? 'debt-flash' : ''}
              onClick={handleAmountClick}
              style={{
                padding: '14px 12px',
                marginBottom: 12,
                textAlign: 'center',
                cursor: 'default', userSelect: 'none',
                background: hasDebt
                  ? 'rgba(255,0,51,0.05)'
                  : hasCredit
                  ? 'rgba(245,158,11,0.05)'
                  : 'rgba(0,255,65,0.04)',
                border: `1px solid ${hasDebt ? 'rgba(255,0,51,0.2)' : hasCredit ? 'rgba(245,158,11,0.2)' : 'rgba(0,255,65,0.15)'}`,
                clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              }}
            >
              {justSettled ? (
                <div style={{ animation: 'checkPop 0.4s ease-out forwards' }}>
                  <CheckCircle2 style={{ color: 'var(--cyber-green)', margin: '0 auto' }} size={32} />
                </div>
              ) : hasCredit ? (
                <>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.12em', color: '#f59e0b', marginBottom: 4, opacity: 0.85 }}>
                    💛 NADPŁATA — NA KOLEJNE SESJE
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 400, color: '#fbbf24', letterSpacing: '-0.02em' }}>
                    +{formatAmountShort(animatedAbs)}<span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: 3 }}>ZŁ</span>
                  </p>
                </>
              ) : (
                <>
              {hasDebt && (
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--cyber-red)', marginBottom: 4, opacity: 0.85 }}>
                    ⚠ DO ZAPŁATY
                  </p>
                )}
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 400,
                    color: hasDebt ? '#ff4d6d' : 'var(--cyber-green)',
                    letterSpacing: '-0.02em',
                    textShadow: hasDebt ? '0 0 12px rgba(255,0,51,0.4)' : '0 0 12px rgba(0,255,65,0.3)',
                  }}>
                    {formatAmountShort(animatedAbs)}
                    <span style={{ fontSize: '0.75rem', opacity: 0.4, marginLeft: 3 }}>ZŁ</span>
                  </p>
                </>
              )}
              {adminMode && (
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--cyber-red)', letterSpacing: '0.1em', marginTop: 4 }}>
                  ⚠ TRYB EDYCJI
                </p>
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
              <div style={{ marginBottom: 10 }}>
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

            {/* Payment modal */}
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

            {/* ── Action Buttons ── */}
            {!justSettled && modal === null && (
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hasDebt && (
                  <>
                    <button
                      onClick={() => savePayment(debt)}
                      disabled={isSaving}
                      className="cyber-button-yellow"
                      style={{ padding: '12px 16px', width: '100%', fontSize: '0.7rem' }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                          {formatAmountShort(debt)} ZŁ
                        </span>
                        <span style={{ fontSize: '0.66rem', letterSpacing: '0.2em', opacity: 0.7 }}>
                          💸 WYŚLIJ BLIK
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                      className="cyber-button-outline"
                      style={{ padding: '8px 12px', width: '100%' }}
                    >
                      + Inna kwota
                    </button>
                  </>
                )}

                {hasCredit && (
                  <button
                    onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                    className="cyber-button-outline"
                    style={{ padding: '8px 12px', width: '100%' }}
                  >
                    + Wpłać więcej
                  </button>
                )}

                {isSettled && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                    <div style={{
                      width: 52, height: 52,
                      background: 'rgba(0,255,65,0.06)',
                      border: '2px solid rgba(0,255,65,0.3)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 16px rgba(0,255,65,0.15)',
                    }}>
                      <CheckCircle2 size={26} style={{ color: 'var(--cyber-green)', filter: 'drop-shadow(0 0 5px rgba(0,255,65,0.5))' }} />
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.66rem', letterSpacing: '0.2em', color: 'rgba(0,255,65,0.7)', textTransform: 'uppercase' }}>
                      ✓ Rozliczony
                    </p>
                    <button
                      onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                      className="cyber-button-outline"
                      style={{ padding: '6px 12px', width: '100%', opacity: 0.5, fontSize: '0.7rem' }}
                    >
                      + Wpłać na zapas
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
