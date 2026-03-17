import { useState, useRef, useCallback, useEffect } from 'react';
import { CheckCircle2, Crosshair, Skull, Shield, Zap, AlertTriangle, Radio, Database } from 'lucide-react';
import { getRank, ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL } from '../../constants';
import { formatAmountShort } from '../../utils/format';
import { useThemeTokens } from '../../context/ThemeContext';
import { usePaymentUndo } from '../../hooks/usePaymentUndo';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal from './PaymentModal';
import UndoBar from '../common/UndoBar';

// ── Animated counter ─────────────────────────────────────────────
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

// ── Avatar colors — industrial palette ───────────────────────────
const AGENT_COLORS = [
  { bg: '#120800', border: '#E8590A', text: '#E8590A', label: 'OPR' },
  { bg: '#0A0012', border: '#9B59B6', text: '#BB8FD8', label: 'SPY' },
  { bg: '#001200', border: '#7FFF00', text: '#7FFF00', label: 'GHO' },
  { bg: '#00100E', border: '#00FFCC', text: '#00FFCC', label: 'TEC' },
  { bg: '#120000', border: '#FF4444', text: '#FF6666', label: 'HIT' },
  { bg: '#0D0D00', border: '#FFB800', text: '#FFD000', label: 'CMD' },
];

// Generate a pseudo-barcode using the player name as seed
function Barcode({ name, color }) {
  const bars = [];
  for (let i = 0; i < 28; i++) {
    const charCode = name.charCodeAt(i % name.length) + i * 7;
    const width = (charCode % 3) + 1;
    const isGap = (charCode % 5) === 0;
    bars.push({ width, isGap });
  }
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: 22, gap: '1px', overflow: 'hidden', opacity: 0.45 }}>
      {bars.map((bar, i) => (
        <div key={i} style={{
          width: bar.width * 2,
          flexShrink: 0,
          background: bar.isGap ? 'transparent' : color,
          opacity: bar.isGap ? 0 : (0.5 + (i % 3) * 0.17),
        }} />
      ))}
    </div>
  );
}

// ── Corner brackets decoration ────────────────────────────────────
function CornerBrackets({ color, size = 12, thickness = 2 }) {
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

// ── ID Photo Avatar ───────────────────────────────────────────────
function DossierAvatar({ name, index, hasDebt, isOrganizer }) {
  const c = AGENT_COLORS[index % AGENT_COLORS.length];
  const initials = name.slice(0, 2).toUpperCase();
  const borderColor = hasDebt ? 'var(--cz-blood)' : isOrganizer ? 'var(--cz-teal)' : c.border;
  const bg = hasDebt ? '#120005' : c.bg;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Photo frame with hazard stripes when in debt */}
      <div style={{
        width: 62, height: 62,
        position: 'relative',
        background: bg,
        border: `1px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        boxShadow: hasDebt
          ? `0 0 16px rgba(204,0,28,0.5), 0 0 32px rgba(204,0,28,0.15), inset 0 0 8px rgba(204,0,28,0.1)`
          : `0 0 12px ${borderColor}40, inset 0 0 6px ${borderColor}08`,
        animation: hasDebt ? 'neon-blood 2.5s ease-in-out infinite' : 'none',
        overflow: 'hidden',
      }}>
        {/* Hazard stripe top bar when in debt */}
        {hasDebt && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 6,
            background: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 4px, rgba(204,0,28,0.5) 4px, rgba(204,0,28,0.5) 8px)',
          }} />
        )}
        {isOrganizer ? (
          <Shield size={24} style={{ color: 'var(--cz-teal)' }} />
        ) : (
          <>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.35rem',
              color: hasDebt ? 'var(--cz-blood)' : c.text,
              letterSpacing: '0.03em',
              lineHeight: 1,
              marginTop: hasDebt ? 6 : 0,
              textShadow: `0 0 10px ${hasDebt ? 'rgba(204,0,28,0.6)' : borderColor + '60'}`,
            }}>{initials}</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.42rem',
              color: borderColor, opacity: 0.7,
              letterSpacing: '0.15em',
              marginTop: 1,
            }}>{c.label}</span>
          </>
        )}
        {/* Scan line overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)',
        }} />
      </div>
      {/* Status indicator dot */}
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        width: 10, height: 10,
        background: hasDebt ? 'var(--cz-blood)' : isOrganizer ? 'var(--cz-teal)' : 'var(--cz-acid)',
        border: '2px solid var(--cz-void)',
        boxShadow: hasDebt ? '0 0 6px var(--cz-blood)' : isOrganizer ? '0 0 6px var(--cz-teal)' : '0 0 6px var(--cz-acid)',
        borderRadius: hasDebt ? '2px' : '50%',
      }} />
    </div>
  );
}

// ── Clearance Level badge ─────────────────────────────────────────
function ClearanceBadge({ rank, pct }) {
  const rankColors = {
    'LEGENDA': '#FFB800', 'MISTRZ': '#FF8C00', 'WETERAN': '#9B59B6',
    'STAŁY': '#E8590A', 'GOŚĆ': '#4A4640', 'DUCH': '#2E2E28',
  };
  const col = rankColors[rank.name] || '#4A4640';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px 2px 4px',
      background: `${col}10`,
      border: `1px solid ${col}35`,
      clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
    }}>
      <span style={{ fontSize: '0.65rem' }}>{rank.emoji}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '0.75rem',
        fontWeight: 400, letterSpacing: '0.08em', color: col,
        textTransform: 'uppercase',
      }}>{rank.name}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: col, opacity: 0.55 }}>
        {pct}%
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
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

  const c = AGENT_COLORS[playerIndex % AGENT_COLORS.length];
  const accentColor = hasDebt ? 'var(--cz-blood)' : hasCredit ? 'var(--cz-amber)' : isOrganizer ? 'var(--cz-teal)' : 'var(--cz-orange)';
  const agentId = `AG-${(player.name.charCodeAt(0) * 31 + playerIndex * 17) % 9000 + 1000}`;

  return (
    <div
      ref={cardRef}
      className={`${justSettled ? 'settle-flash' : ''} crt-card`}
      style={{
        position: 'relative',
        background: hasDebt
          ? 'linear-gradient(160deg, #0E0008 0%, #120005 100%)'
          : 'linear-gradient(160deg, #0D0D0B 0%, #0F0F0D 100%)',
        border: `1px solid ${hasDebt ? 'rgba(204,0,28,0.5)' : hasCredit ? 'rgba(255,184,0,0.35)' : 'var(--cz-border)'}`,
        display: 'flex', flexDirection: 'column',
        animation: hasDebt ? 'neon-blood 3s ease-in-out infinite' : 'none',
        overflow: 'hidden',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Corner brackets */}
      <CornerBrackets
        color={hasDebt ? 'var(--cz-blood)' : hasCredit ? 'var(--cz-amber)' : accentColor}
        size={14} thickness={1}
      />

      {/* ── Classification header strip ── */}
      <div style={{
        padding: '4px 12px',
        background: hasDebt
          ? 'repeating-linear-gradient(-45deg, rgba(204,0,28,0.08) 0px, rgba(204,0,28,0.08) 6px, transparent 6px, transparent 12px)'
          : 'repeating-linear-gradient(-45deg, rgba(232,89,10,0.05) 0px, rgba(232,89,10,0.05) 6px, transparent 6px, transparent 12px)',
        borderBottom: `1px solid ${hasDebt ? 'rgba(204,0,28,0.25)' : 'rgba(232,89,10,0.12)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
          color: hasDebt ? 'var(--cz-blood)' : 'var(--cz-dim)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          {hasDebt ? '⚠ ZALEGŁOŚĆ' : isOrganizer ? 'ORGANIZATOR' : isSettled ? '✓ ROZLICZONY' : '↑ NADPŁATA'}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
          color: 'var(--cz-dim)', letterSpacing: '0.1em',
        }}>{agentId}</span>
      </div>

      {/* ── Card Body ── */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <DossierAvatar
          name={player.name}
          index={playerIndex}
          hasDebt={hasDebt}
          isOrganizer={isOrganizer}
        />

        {/* Identity block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name */}
          <div style={{ marginBottom: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.4rem, 5vw, 1.7rem)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: hasDebt ? '#FF4455' : 'var(--cz-text-hi, #E8E4DA)',
              margin: 0, lineHeight: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textShadow: hasDebt ? '0 0 14px rgba(204,0,28,0.4)' : 'none',
            }}>
              {player.name}
            </h3>
          </div>

          <ClearanceBadge rank={rank} pct={pct} />

          {/* Dossier data rows */}
          <div style={{ marginTop: 8 }}>
            <div className="dossier-row">
              <span className="dossier-label">OBECNOŚĆ</span>
              <span className="dossier-value" style={{ color: 'var(--cz-text)' }}>
                {player.attendanceCount}/{totalWeeks}
              </span>
            </div>
            {/* Attendance bar */}
            <div style={{ height: 2, background: '#1C1C18', margin: '4px 0 6px', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${pct}%`,
                background: pct >= 75
                  ? 'linear-gradient(90deg, var(--cz-acid), #AAFF44)'
                  : pct >= 45
                  ? 'linear-gradient(90deg, var(--cz-orange), #FFB800)'
                  : 'linear-gradient(90deg, var(--cz-blood), #FF6644)',
                transition: 'width 0.8s ease',
              }} />
            </div>
            {isOrganizer && (
              <div className="dossier-row">
                <span className="dossier-label">ROLA</span>
                <span className="dossier-value" style={{ color: 'var(--cz-teal)' }}>ZARZĄDZANIE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Balance section ── */}
      {!isOrganizer && (
        <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Amount display */}
          <div
            className={flash ? 'debt-flash' : ''}
            onClick={handleAmountClick}
            style={{
              padding: '10px 12px',
              marginBottom: 10,
              background: hasDebt
                ? 'rgba(204,0,28,0.06)'
                : hasCredit
                ? 'rgba(255,184,0,0.05)'
                : 'rgba(127,255,0,0.04)',
              border: `1px solid ${hasDebt ? 'rgba(204,0,28,0.22)' : hasCredit ? 'rgba(255,184,0,0.2)' : 'rgba(127,255,0,0.15)'}`,
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              cursor: 'default', userSelect: 'none',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Background texture */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)',
            }} />

            {justSettled ? (
              <div style={{ textAlign: 'center', animation: 'checkPop 0.4s ease-out forwards', position: 'relative', zIndex: 1 }}>
                <CheckCircle2 style={{ color: 'var(--cz-acid)', margin: '0 auto' }} size={30} />
              </div>
            ) : hasCredit ? (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--cz-amber)', letterSpacing: '0.15em' }}>↑ NADPŁATA</span>
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: '#FFB800', textAlign: 'center', margin: 0, lineHeight: 1.1, letterSpacing: '0.04em' }}>
                  +{formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '0.9rem', opacity: 0.5, marginLeft: 3 }}>ZŁ</span>
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1 }}>
                {hasDebt && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 2 }}>
                    <AlertTriangle size={9} style={{ color: 'var(--cz-blood)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--cz-blood)', letterSpacing: '0.2em' }}>
                      DO ZAPŁATY
                    </span>
                    <AlertTriangle size={9} style={{ color: 'var(--cz-blood)' }} />
                  </div>
                )}
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: '2.4rem',
                  textAlign: 'center', margin: 0, lineHeight: 1.1, letterSpacing: '0.04em',
                  color: hasDebt ? '#FF3344' : 'var(--cz-acid)',
                  textShadow: hasDebt ? '0 0 16px rgba(204,0,28,0.5)' : '0 0 14px rgba(127,255,0,0.35)',
                }}>
                  {formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '0.9rem', opacity: 0.4, marginLeft: 3 }}>ZŁ</span>
                </p>
                {isSettled && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', textAlign: 'center', color: 'var(--cz-acid)', letterSpacing: '0.2em', marginTop: 2 }}>
                    STATUS: CLEAR
                  </p>
                )}
              </div>
            )}
            {adminMode && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cz-blood)', letterSpacing: '0.1em', marginTop: 4, textAlign: 'center', position: 'relative', zIndex: 1 }}>
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

          {/* Action buttons */}
          {!justSettled && modal === null && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hasDebt && (
                <>
                  <button
                    onClick={() => savePayment(debt)}
                    disabled={isSaving}
                    className="cyber-button-yellow"
                    style={{ padding: '11px 16px', width: '100%' }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
                        {formatAmountShort(debt)} ZŁ
                      </span>
                      <span style={{ fontSize: '0.62rem', letterSpacing: '0.18em', opacity: 0.75, fontFamily: 'var(--font-mono)' }}>
                        ⚡ WYŚLIJ BLIK
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{
                    width: 48, height: 48,
                    background: 'rgba(127,255,0,0.05)',
                    border: '1px solid rgba(127,255,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                    boxShadow: '0 0 14px rgba(127,255,0,0.12)',
                  }}>
                    <CheckCircle2 size={24} style={{ color: 'var(--cz-acid)', filter: 'drop-shadow(0 0 4px rgba(127,255,0,0.5))' }} />
                  </div>
                  <button
                    onClick={() => setModal(PAYMENT_MODAL.CUSTOM)}
                    className="cyber-button-outline"
                    style={{ padding: '6px 12px', width: '100%', opacity: 0.5 }}
                  >
                    + Wpłać na zapas
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Barcode footer */}
          <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--cz-border)' }}>
            <Barcode name={player.name} color={
              hasDebt ? 'var(--cz-blood)' : hasCredit ? 'var(--cz-amber)' : isOrganizer ? 'var(--cz-teal)' : 'var(--cz-orange)'
            } />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--cz-dim)', letterSpacing: '0.08em' }}>
                {agentId}-{player.name.toUpperCase().replace(/\s/g, '')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--cz-dim)', letterSpacing: '0.06em' }}>
                CZ-SECTOR
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Organizer special layout */}
      {isOrganizer && (
        <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{
            padding: '10px 20px',
            border: '1px solid rgba(0,255,204,0.2)',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            background: 'rgba(0,255,204,0.03)',
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.15em', color: 'var(--cz-teal)', margin: 0 }}>
              ZARZĄDZA REZERWACJĄ
            </p>
          </div>
          <div style={{ marginTop: 8, width: '100%', borderTop: '1px solid var(--cz-border)', paddingTop: 8 }}>
            <Barcode name={player.name} color="var(--cz-teal)" />
          </div>
        </div>
      )}
    </div>
  );
}
