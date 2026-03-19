import { useState, useRef, useCallback, useEffect } from 'react';
import { getPlayerColor } from '../../constants/playerColors';
import { getRank, ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL, RANKS } from '../../constants';
import { formatAmountShort } from '../../utils/format';
import { useThemeTokens } from '../../context/ThemeContext';
import { usePaymentUndo } from '../../hooks/usePaymentUndo';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal from './PaymentModal';
import UndoBar from '../common/UndoBar';

// ── Animated counter ────────────────────────────────────────────
function useAnimatedValue(value, duration = 900) {
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

// Colors come from shared getPlayerColor(name) — deterministic by name

// ── Pseudo-barcode (seeded by name) ─────────────────────────────
function Barcode({ name, color }) {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const code = name.charCodeAt(i % name.length) + i * 7;
    return { width: (code % 3) + 1, gap: (code % 5) === 0 };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: 18, gap: '1px', overflow: 'hidden', opacity: 0.35 }}>
      {bars.map((b, i) => (
        <div key={i} style={{
          width: b.width * 2, flexShrink: 0,
          background: b.gap ? 'transparent' : color,
          opacity: b.gap ? 0 : (0.4 + (i % 3) * 0.2),
        }} />
      ))}
    </div>
  );
}

// ── Corner brackets ──────────────────────────────────────────────
function CornerBrackets({ color, size = 12, thickness = 1 }) {
  const s = { position: 'absolute', width: size, height: size, pointerEvents: 'none' };
  const b = `${thickness}px solid ${color}`;
  return (
    <>
      <div style={{ ...s, top: -1, left: -1, borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: -1, right: -1, borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: -1, left: -1, borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: -1, right: -1, borderBottom: b, borderRight: b }} />
    </>
  );
}

// ── Avatar ───────────────────────────────────────────────────────
function PlayerAvatar({ name, index, isPending, isOrganizer }) {
  const c = getPlayerColor(name, index);
  const initials = name.slice(0, 2).toUpperCase();
  // Avatar always uses player's own color — never changes based on debt status

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 60, height: 60,
        background: c.bg,
        border: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        boxShadow: `0 0 12px ${c.border}40, inset 0 0 6px ${c.border}08`,
        overflow: 'hidden', position: 'relative',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.3rem',
          color: c.text,
          lineHeight: 1,
          textShadow: `0 0 10px ${c.border}55`,
        }}>{initials}</span>
      </div>
      {/* Status dot — only this element carries semantic color */}
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        width: 10, height: 10,
        background: isPending ? 'var(--co-yellow)' : 'var(--co-green)',
        border: '2px solid var(--co-void)',
        boxShadow: isPending ? '0 0 4px rgba(255,32,144,0.5)' : '0 0 4px rgba(0,255,102,0.5)',
        borderRadius: '50%',
      }} />
    </div>
  );
}

// ── Rank badge ───────────────────────────────────────────────────
function RankBadge({ rank, pct }) {
  const col = rank.hex || 'var(--co-dim)';
  const rankIdx = RANKS.findIndex(r => r.name === rank.name);
  const nextRank = rankIdx > 0 ? RANKS[rankIdx - 1] : null;
  const [visible, setVisible] = useState(false);
  const [tapped, setTapped] = useState(false);
  const timerRef = useRef(null);

  const handleTap = (e) => {
    e.stopPropagation();
    setTapped(true);
    clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2500);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <div
        onClick={handleTap}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px 2px 4px',
          background: `${col}10`, border: `1px solid ${col}30`,
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '0.65rem' }}>{rank.emoji}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.08em', color: col }}>
          {rank.name}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: col, opacity: 0.55 }}>
          {pct}%
        </span>
      </div>
      {/* Tap hint — visible "?" label until first tap */}
      {!tapped && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          color: col, opacity: 0.7,
          letterSpacing: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}>
          ?
        </span>
      )}
      {visible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
          background: 'var(--co-void)',
          border: `1px solid ${col}50`,
          padding: '6px 10px',
          zIndex: 50,
          whiteSpace: 'nowrap',
          clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          boxShadow: `0 0 12px ${col}30`,
          animation: 'slide-in-up 0.15s ease-out',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: col, margin: 0, letterSpacing: '0.08em' }}>
            {rank.emoji} {rank.name} · {rank.min}%+
          </p>
          {nextRank ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', margin: '3px 0 0' }}>
              do {nextRank.emoji} {nextRank.name}: <span style={{ color: nextRank.hex }}>+{Math.max(0, nextRank.min - pct)}%</span>
            </p>
          ) : (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: col, margin: '3px 0 0' }}>
              ★ to jest max ranga
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function PlayerCard({
  player, totalWeeks, history, onSettle, justSettled,
  openDetails, onToggleDetails, breakdown,
  onAddPayment, onRemovePayment, onPin, onUnpin,
  playerIndex = 0,
}) {
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

  const cancelModal = useCallback(() => { setModal(null); setCustomAmt(''); }, []);

  const savePayment = useCallback(async (amount) => {
    cancelModal(); setIsSaving(true); onPin(player.name);
    const result = await onAddPayment(player.name, amount);
    if (result?.paymentId) {
      startPaymentUndo({ id: result.paymentId, amount });
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } else { onUnpin(); }
    setIsSaving(false);
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
            <RankBadge rank={rank} pct={pct} />
          </div>

          {/* Attendance bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--co-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
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
              <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                {[...history].slice(0, 10).reverse().map((session, i) => {
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
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
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
                  <button onClick={() => setModal(PAYMENT_MODAL.CUSTOM)} className="cyber-button-outline" style={{ padding: '8px 12px', width: '100%' }}>
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
          <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Barcode name={player.name} color={accentColor} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--co-dim)', letterSpacing: '0.08em' }}>
                {playerId}-{player.name.toUpperCase().replace(/\s/g, '')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--co-dim)', letterSpacing: '0.06em' }}>
                SW-NET
              </span>
            </div>
          </div>
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
          <div style={{ marginTop: 8, width: '100%', borderTop: '1px solid var(--co-border)', paddingTop: 8 }}>
            <Barcode name={player.name} color={c.border} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--co-dim)', letterSpacing: '0.08em' }}>
                {playerId}-{player.name.toUpperCase().replace(/\s/g, '')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--co-dim)', letterSpacing: '0.06em' }}>
                SW-NET
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
