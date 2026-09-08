import { useState, useRef, useCallback, useEffect, memo } from 'react';
import type { MouseEvent } from 'react';
import { getPlayerColor } from '@/constants/colors';
import { ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL, SOUND_TYPES, SPORT_EMOJI, SPORT_LABEL } from '@/constants';
import { FONT, CLIP } from '../../constants/styles';
import { formatAmountShort } from '@/utils/format';
import { makeId } from '@/utils/id';
import { RARITY_CARD_CLASS, RARITY_FOIL_CLASS, RARITY_LABEL } from '@/utils/playerCard';
import { usePaymentUndo } from '@/hooks/usePaymentUndo';
import { useIsMobile } from '@/hooks/useIsMobile';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal, { type PaymentModalType } from './PaymentModal';
import UndoBar from '../common/UndoBar';
import TreasurerPanel from './TreasurerPanel';
import ConfettiBurst from '../common/ConfettiBurst';
import StreakBadge from '../attendance/StreakBadge';
import type { DebtDisplayData, HistoryEntry, PlayerCardMeta, PlayerStats, SoundType } from '@/types/ui';
import type { AddPaymentResult, TransactionResult } from '@/types/domain';
import type { StyleWithVars } from '@/types/css';
import { useAnimatedValue } from './useAnimatedValue';
import { Barcode } from './Barcode';
import { CornerBrackets } from './CornerBrackets';
import { PlayerAvatar } from './PlayerAvatar';
import { RankBadge } from './RankBadge';

interface PlayerCardProps {
  player: PlayerStats;
  totalWeeks: number;
  history: HistoryEntry[];
  meta: PlayerCardMeta;
  openDetails: boolean;
  onToggleDetails: (playerName: string) => void;
  breakdown: DebtDisplayData | null;
  onAddPayment: (playerName: string, amount: number, paymentId: string) => Promise<AddPaymentResult>;
  onRemovePayment: (playerName: string, paymentId: string) => Promise<TransactionResult>;
  onPin: (playerName: string) => void;
  onUnpin: () => void;
  playSound: (type: SoundType) => void;
  playerIndex?: number;
  /** Podawane tylko dla skarbnika — zasila panel „kto ile winien”. */
  allPlayers?: PlayerStats[];
}

function PlayerCard({
  player, totalWeeks, history, meta,
  openDetails, onToggleDetails, breakdown,
  onAddPayment, onRemovePayment, onPin, onUnpin,
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
  const [showBurst, setShowBurst] = useState(false);
  const [foil, setFoil] = useState({ x: 50, y: 22 });

  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDebt   = useRef(debt);
  const cardRef    = useRef<HTMLDivElement | null>(null);
  const savingRef  = useRef(false);
  const pendingPaymentIdRef = useRef<string | null>(null);

  const animatedAbs = useAnimatedValue(Math.abs(debt));

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

  const { lastPayment, secondsLeft, progressPct, startPaymentUndo, handleUndoPayment } =
    usePaymentUndo({ playerName: player.name, onPin, onUnpin, onRemovePayment });

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
    onPin(player.name);

    try {
      const result = await onAddPayment(player.name, amount, paymentId);
      if (result?.paymentId && result?.success !== false) {
        pendingPaymentIdRef.current = null;
        startPaymentUndo({ id: result.paymentId, amount });
        if (debt > SETTLED_THRESHOLD && debt - amount <= SETTLED_THRESHOLD) {
          setJustCleared(true);
          setShowBurst(true);
          playSound(SOUND_TYPES.SUCCESS);
        }
        setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        cancelModal();
      } else {
        onUnpin();
        setPaymentError(result?.error || 'Nie udało się zapisać wpłaty');
      }
    } catch (err) {
      onUnpin();
      const message = err instanceof Error ? err.message : '';
      setPaymentError(message || 'Nie udało się zapisać wpłaty');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [player.name, debt, onAddPayment, onPin, onUnpin, startPaymentUndo, cancelModal, playSound]);

  const accentColor = c.border;
  const cardBorder = isSettled && !isOrganizer
    ? `${c.border}25`
    : `${c.border}30`;
  const playerId = `P${String((player.name.charCodeAt(0) * 31 + playerIndex * 17) % 9000 + 1000)}`;

  const handleCardMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setFoil({ x: x * 100, y: y * 100 });
    e.currentTarget.style.transform = `perspective(920px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg)`;
    e.currentTarget.style.borderColor = `${c.border}70`;
    e.currentTarget.style.boxShadow = isPending && !isOrganizer
      ? 'var(--glow-box-rose)'
      : 'var(--glow-box-cyan)';
  };

  const handleCardLeave = (e: MouseEvent<HTMLDivElement>) => {
    setFoil({ x: 50, y: 22 });
    e.currentTarget.style.transform = 'none';
    e.currentTarget.style.borderColor = cardBorder;
    e.currentTarget.style.boxShadow = isPending && !isOrganizer ? 'var(--glow-box-rose)' : 'none';
  };

  const foilStyle: StyleWithVars = {
    '--foil-x': `${foil.x}%`,
    '--foil-y': `${foil.y}%`,
    '--foil-tint': `${rank.hex}99`,
  };

  return (
    <div
      ref={cardRef}
      className={`crt-card glass-card ${RARITY_CARD_CLASS[meta.rarity]}`}
      style={{
        position: 'relative',
        border: `1px solid ${cardBorder}`,
        display: 'flex', flexDirection: 'column',
        animation: 'none',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.18s ease',
        transformStyle: 'preserve-3d',
        boxShadow: isPending && !isOrganizer ? 'var(--glow-box-rose)' : 'none',
      }}
      onMouseMove={handleCardMove}
      onMouseLeave={handleCardLeave}
    >
      <div className={RARITY_FOIL_CLASS[meta.rarity]} style={foilStyle} aria-hidden="true" />
      <CornerBrackets color={accentColor} size={14} thickness={1} />
      {showBurst && <ConfettiBurst onDone={() => setShowBurst(false)} />}

      <div style={{
        padding: '4px 12px',
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

      <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span className="card-ovr" style={{ color: rank.hex }}>{meta.overall}</span>
          <span style={{ ...FONT.monoMicro, letterSpacing: '0.14em', color: rank.hex }}>OVR</span>
          <PlayerAvatar
            name={player.name}
            index={playerIndex}
            isPending={isOrganizer ? undefined : isPending}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 5vw, 1.85rem)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: 'var(--co-text-hi)',
            margin: 0, lineHeight: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{player.name}</h3>

          <div style={{ marginTop: 4, marginBottom: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <RankBadge rank={rank} pct={pct} showHint={!isMobile} />
            {meta.currentStreak >= 2 && <StreakBadge streak={meta.currentStreak} />}
          </div>

          {meta.sports.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {meta.sports.map(row => (
                <span
                  key={row.sport}
                  title={`${SPORT_LABEL[row.sport] ?? row.sport} ×${row.count}`}
                  style={{
                    ...FONT.monoMicro,
                    letterSpacing: '0.08em',
                    color: 'var(--co-text)',
                    padding: '1px 6px',
                    border: '1px solid var(--co-border)',
                    background: 'var(--co-tint)',
                    clipPath: CLIP.badge,
                  }}
                >
                  {SPORT_EMOJI[row.sport] ?? '🏓'} {row.count}
                </span>
              ))}
            </div>
          )}

          {!isMobile && meta.topAchievements.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }} aria-label="Osiągnięcia">
              {meta.topAchievements.map(a => (
                <span key={a.id} title={`${a.label}: ${a.desc}`} style={{ fontSize: '0.95rem', lineHeight: 1 }}>
                  {a.emoji}
                </span>
              ))}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ ...FONT.monoLabel }}>
                Obecność
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
                {player.attendanceCount}/{player.eligibleWeeks || totalWeeks}
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
                style={{ display: 'flex', gap: 2, marginTop: 6, flexWrap: 'wrap' }}>
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

      {!isOrganizer && (
        <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

          <div
            className={flash ? 'debt-flash' : ''}
            onClick={handleAmountClick}
            style={{
              padding: '12px',
              marginBottom: 10,
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
            {justCleared && (
              <div className="cleared-stamp" aria-hidden="true">
                ROZLICZONY
              </div>
            )}

            {hasCredit ? (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-green)', letterSpacing: '0.18em', marginBottom: 2 }}>
                  ↑ NADPŁATA
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--co-green)', margin: 0, lineHeight: 1 }}>
                  +{formatAmountShort(animatedAbs)}
                  <span style={{ fontSize: '1rem', opacity: 0.4, marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
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
                  <span style={{ fontSize: '1rem', opacity: 0.35, marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
                </p>
              </div>
            )}
            {adminMode && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-rose)', letterSpacing: '0.1em', marginTop: 4, position: 'relative', zIndex: 1 }}>
                ⚠ TRYB EDYCJI
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
                onUndo={handleUndoPayment}
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

          {modal === null && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isPending && (
                <>
                  <button
                    onClick={() => savePayment(debt)}
                    disabled={isSaving}
                    className="cyber-button-yellow"
                    style={{ padding: '10px 16px', width: '100%' }}
                    aria-label={`Zapłać ${formatAmountShort(debt)} zł przez BLIK`}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', lineHeight: 1 }}>
                        {formatAmountShort(debt)} ZŁ
                      </span>
                      <span style={{ fontSize: '0.75rem', letterSpacing: '0.18em', opacity: 0.75, fontFamily: 'var(--font-mono)' }}>
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

          {!isMobile && (
            <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--co-separator)' }}>
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
        <div style={{ padding: '0 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>

          <div
            className={flash ? 'debt-flash' : ''}
            style={{
              padding: '12px',
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
                  <span style={{ fontSize: '1rem', opacity: 0.4, marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
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
                  <span style={{ fontSize: '1rem', opacity: 0.4, marginLeft: 4, letterSpacing: '0.1em' }}>ZŁ</span>
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

export default memo(PlayerCard);
