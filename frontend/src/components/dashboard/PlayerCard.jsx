import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { getPlayerColor } from '../../constants/playerColors';
import { getRank, ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL } from '../../constants';
import { FONT, CLIP } from '../../constants/styles';
import { formatAmountShort } from '../../utils/format';
import { useThemeTokens } from '../../context/ThemeContext';
import { usePaymentUndo } from '../../hooks/usePaymentUndo';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal from './PaymentModal';
import UndoBar from '../common/UndoBar';
import { useAnimatedValue } from './useAnimatedValue';
import { Barcode } from './Barcode';
import { CornerBrackets } from './CornerBrackets';
import { PlayerAvatar } from './PlayerAvatar';
import { RankBadge } from './RankBadge';

// ── Main Component ───────────────────────────────────────────────
function PlayerCard({
  player, totalWeeks, history, onSettle, justSettled,
  openDetails, onToggleDetails, breakdown,
  onAddPayment, onRemovePayment, onPin, onUnpin,
  playerIndex = 0,
}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 639;
  const isOrganizer = player.name === ORGANIZER_NAME;
  const debt        = player.currentDebt;
  const isPending   = debt > SETTLED_THRESHOLD;    // "Do rozliczenia" – neutralny
  const hasCredit   = debt < -SETTLED_THRESHOLD;
  const isSettled   = !isPending && !hasCredit;
  const pct         = totalWeeks > 0 ? Math.round((player.attendanceCount / totalWeeks) * 100) : 0;
  const rank        = getRank(pct);
  const tokens      = useThemeTokens();
  const c           = getPlayerColor(player.name, playerIndex);

  const [modal,     setModal]     = useState(null);
  const [customAmt, setCustomAmt] = useState('');
  const [isSaving,  setIsSaving]  = useState(false);
  const [paymentError, setPaymentError] = useState(null);
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
    if (clickCount.current >= 5) { clickCount.current = 0; setAdminMode(prev => !prev); }
    else clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 1000);
  }, []);
  useEffect(() => () => clearTimeout(clickTimer.current), []);

  const cancelModal = useCallback(() => { setPaymentError(null); setModal(null); setCustomAmt(''); }, []);

  const savePayment = useCallback(async (amount) => {
    setPaymentError(null);
    setIsSaving(true);
    onPin(player.name);

    try {
      const result = await onAddPayment(player.name, amount);
      if (result?.paymentId && result?.success !== false) {
        startPaymentUndo({ id: result.paymentId, amount });
        setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        cancelModal();
      } else {
        onUnpin();
        setPaymentError(result?.error || 'Nie udało się zapisać wpłaty');
      }
    } catch (err) {
      onUnpin();
      setPaymentError(err?.message || 'Nie udało się zapisać wpłaty');
    } finally {
      setIsSaving(false);
    }
  }, [player.name, onAddPayment, onPin, onUnpin, startPaymentUndo, cancelModal]);

  // Card color logic — neutralny dla pending
  const accentColor = c.border;   // always player's own color

  // Settled cards get a very subtle green tint on top of player color
  const cardBorder = isSettled && !isOrganizer
    ? `${c.border}25`
    : `${c.border}30`;

  const playerId = `P${String((player.name.charCodeAt(0) * 31 + playerIndex * 17) % 9000 + 1000)}`;

  return (
    <div
      ref={cardRef}
      className={`${justSettled ? 'settle-flash' : ''} crt-card`}
      style={{
        position: 'relative',
        background: 'linear-gradient(160deg, var(--co-panel) 0%, var(--co-dark) 100%)',
        border: `1px solid ${cardBorder}`,
        display: 'flex', flexDirection: 'column',
        animation: 'none',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: isPending
          ? `0 0 18px rgba(255,32,144,0.13), 0 0 40px rgba(255,32,144,0.05), inset 0 0 20px rgba(255,32,144,0.03)`
          : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${c.border}70`;
        e.currentTarget.style.boxShadow = isPending
          ? `0 0 24px rgba(255,32,144,0.2), 0 0 50px rgba(255,32,144,0.07), inset 0 0 20px rgba(255,32,144,0.04)`
          : `0 0 16px ${c.border}30, 0 0 32px ${c.border}10`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = cardBorder;
        e.currentTarget.style.boxShadow = isPending
          ? `0 0 18px rgba(255,32,144,0.13), 0 0 40px rgba(255,32,144,0.05), inset 0 0 20px rgba(255,32,144,0.03)`
          : 'none';
      }}
    >
      <CornerBrackets color={accentColor} size={14} thickness={1} />

      {/* ── Header strip ── */}
      <div style={{
        padding: '4px 12px',
        background: isPending
          ? 'rgba(255,32,144,0.04)'
          : 'rgba(0,229,255,0.03)',
        borderBottom: `1px solid ${isPending ? 'rgba(255,32,144,0.18)' : 'rgba(0,229,255,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
          color: isPending ? `${c.border}99` : 'var(--co-dim)',
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          {/* Neutralne etykiety – żadnych wykrzykników, żadnego "dłużnik" */}
          {isPending ? 'Do rozliczenia'
            : isOrganizer ? 'Organizator'
            : isSettled ? 'Rozliczony'
            : '↑ Nadpłata'}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
          color: 'var(--co-dim)', letterSpacing: '0.1em',
        }}>{playerId}</span>
      </div>

      {/* ── Identity block ── */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <PlayerAvatar
          name={player.name}
          index={playerIndex}
          isPending={isPending}
          isOrganizer={isOrganizer}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 5vw, 1.85rem)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'var(--co-text-hi)',
            margin: 0, lineHeight: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{player.name}</h3>

          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <RankBadge rank={rank} pct={pct} showHint={!isMobile} />
          </div>

          {/* Attendance bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ ...FONT.monoLabel }}>
                Obecność
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--co-dim)' }}>
                {player.attendanceCount}/{totalWeeks}
              </span>
            </div>
            <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
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
            {/* Session dots — last 10 sessions */}
            {history && history.length > 0 && (
              <div
                title={`Ostatnie ${[...history].slice(0, isMobile ? 6 : 10).length} sesji`}
                style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                {[...history].slice(0, isMobile ? 6 : 10).reverse().map((session, i) => {
                  const attended = session.presentPlayers.includes(player.name);
                  return (
                    <div
                      key={session.id || i}
                      title={session.datePlayed}
                      style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: attended ? c.border : 'transparent',
                        border: `1px solid ${attended ? c.border : 'rgba(255,255,255,0.15)'}`,
                        boxShadow: attended ? `0 0 4px ${c.border}80` : 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Balance + actions (nie-organizatorzy) ── */}
      {!isOrganizer && (
        <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Balance display */}
          <div
            className={flash ? 'debt-flash' : ''}
            onClick={handleAmountClick}
            style={{
              padding: '12px',
              marginBottom: 10,
              background: isPending
                ? 'rgba(255,32,144,0.06)'
                : hasCredit ? 'rgba(255,32,144,0.05)'
                : 'rgba(0,229,255,0.04)',
              border: `1px solid ${isPending
                ? 'rgba(255,32,144,0.25)'
                : hasCredit ? 'rgba(255,32,144,0.2)'
                : 'rgba(0,229,255,0.15)'}`,
              clipPath: CLIP.tag,
              cursor: 'default', userSelect: 'none',
              position: 'relative', overflow: 'hidden',
              textAlign: 'center',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
          >

            {justSettled ? (
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', animation: 'slide-in-up 0.3s ease-out' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.15em', color: 'var(--co-green)', textShadow: '0 0 20px rgba(0,255,136,0.6)', margin: 0 }}>
                  OPŁACONO
                </p>
              </div>
            ) : hasCredit ? (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--co-yellow)', letterSpacing: '0.2em', marginBottom: 2 }}>
                  ↑ NADPŁATA
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', color: 'var(--co-yellow)', margin: 0, lineHeight: 1 }}>
                  +{formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '0.9rem', opacity: 0.4, marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                    color: isPending ? 'rgba(255,32,144,0.5)' : 'rgba(0,255,136,0.5)',
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                  }}>
                    {isPending ? 'do rozliczenia' : 'rozliczony'}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: '2.4rem',
                  margin: 0, lineHeight: 1.1,
                  color: isPending ? 'var(--co-yellow)' : 'var(--co-green)',
                  textShadow: isPending
                    ? '0 0 14px rgba(255,32,144,0.45)'
                    : '0 0 14px rgba(0,229,255,0.4)',
                }}>
                  {formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '0.9rem', opacity: 0.35, marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
                </p>
              </div>
            )}
            {adminMode && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-yellow)', letterSpacing: '0.1em', marginTop: 4, position: 'relative', zIndex: 1 }}>
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

          {/* Undo bar */}
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
            type={modal} debt={debt} hasCredit={hasCredit}
            customAmt={customAmt} onAmtChange={setCustomAmt}
            onSave={savePayment} onCancel={cancelModal}
            isSaving={isSaving} tokens={tokens}
            errorMsg={paymentError}
          />

          {/* Action buttons */}
          {!justSettled && modal === null && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isPending && (
                <>
                  <button
                    onClick={() => savePayment(debt)}
                    disabled={isSaving}
                    className="cyber-button-yellow"
                    style={{ padding: '11px 16px', width: '100%' }}
                    aria-label={`Zapłać ${formatAmountShort(debt)} zł przez BLIK`}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', lineHeight: 1 }}>
                        {formatAmountShort(debt)} ZŁ
                      </span>
                      <span style={{ fontSize: '0.6rem', letterSpacing: '0.22em', opacity: 0.75, fontFamily: 'var(--font-mono)' }}>
                        ⚡ BLIK
                      </span>
                    </span>
                  </button>
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
                <div style={{ padding: '4px 0' }}>
                  <button onClick={() => setModal(PAYMENT_MODAL.CUSTOM)} className="cyber-button-outline" style={{ padding: '6px 12px', width: '100%', opacity: 0.45 }}>
                    + Wpłać na zapas
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Barcode footer */}
          {!isMobile && (
            <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <Barcode name={player.name} color={accentColor} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ ...FONT.monoMicro, letterSpacing: '0.08em' }}>
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

      {/* Organizer */}
      {isOrganizer && (
        <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{
            padding: '8px 20px',
            border: `1px solid ${c.border}30`,
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            background: `${c.border}05`, textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.18em', color: c.text, margin: 0, opacity: 0.7 }}>
              org · rezerwacje
            </p>
          </div>
          {/* Barcode + labels — same as other players */}
          {!isMobile && (
            <div style={{ marginTop: 8, width: '100%', borderTop: '1px solid var(--co-border)', paddingTop: 8 }}>
              <Barcode name={player.name} color={c.border} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ ...FONT.monoMicro, letterSpacing: '0.08em' }}>
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

export default memo(PlayerCard);