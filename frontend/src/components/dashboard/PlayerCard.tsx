import { useCallback, memo } from 'react';
import { Pencil } from 'lucide-react';
import { ORGANIZER_NAME, SETTLED_THRESHOLD, PAYMENT_MODAL, rankTint } from '@/constants';
import { FONT, TEXT } from '../../constants/styles';
import { formatAmountShort } from '@/utils/format';
import { RARITY_CARD_CLASS, RARITY_FOIL_CLASS } from '@/utils/playerCard';
import { usePaymentUndo } from '@/hooks/usePaymentUndo';
import { useIsMobile } from '@/hooks/useIsMobile';
import BreakdownPanel from './BreakdownPanel';
import PaymentModal from './PaymentModal';
import UndoBar from '../common/UndoBar';
import TreasurerPanel from './TreasurerPanel';
import CardStatusStrip from './CardStatusStrip';
import CardIdentity from './CardIdentity';
import DebtAmountPanel from './DebtAmountPanel';
import TreasurerAmountPanel from './TreasurerAmountPanel';
import PaymentActions from './PaymentActions';
import SettleConfirmModal from './SettleConfirmModal';
import { useSettleAnimation } from './useSettleAnimation';
import { useAdminModeToggle } from './useAdminModeToggle';
import { usePaymentFlow } from './usePaymentFlow';

import type { DebtDisplayData, HistoryEntry, PlayerCardMeta, PlayerColor, PlayerStats } from '@/types/ui';
import type { AddPaymentResult, TransactionResult } from '@/types/domain';
import type { StyleWithVars } from '@/types/css';
import { useAnimatedValue } from './useAnimatedValue';
import { useCardTilt } from './useCardTilt';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Barcode } from './Barcode';
import { CornerBrackets } from './CornerBrackets';

interface PlayerCardProps {
  player: PlayerStats;
  playerColor: PlayerColor;
  /** Sesje bieżącego sezonu — ostatnie kropki i licznik obecności. */
  history: HistoryEntry[];
  meta: PlayerCardMeta;
  openDetails: boolean;
  onToggleDetails: (playerName: string) => void;
  breakdown: DebtDisplayData | null;
  onAddPayment: (playerName: string, amount: number, paymentId: string) => Promise<AddPaymentResult>;
  onRemovePayment: (playerName: string, paymentId: string) => Promise<TransactionResult>;
  /** Podawane tylko dla skarbnika — zasila panel „kto ile winien”. */
  allPlayers?: PlayerStats[];
}

/** Stopka karty: pseudo-kod kreskowy z nazwą gracza (tylko na desktopie). */
function CardBarcode({ name, color, marginTop }: { name: string; color: string; marginTop: number | string }) {
  return (
    <div style={{ marginTop, paddingTop: 10, borderTop: '1px solid var(--co-separator)' }}>
      <Barcode name={name} color={color} />
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 2 }}>
        <span style={{ ...FONT.monoMicro, letterSpacing: 'normal' }}>
          {name.toUpperCase().replace(/\s/g, '')}
        </span>
      </div>
    </div>
  );
}

function PlayerCard({
  player, playerColor, history, meta,
  openDetails, onToggleDetails, breakdown,
  onAddPayment, onRemovePayment,
  allPlayers,
}: PlayerCardProps) {
  const isMobile = useIsMobile();
  const isOrganizer = player.name === ORGANIZER_NAME;
  const debt        = player.currentDebt;
  const isPending   = debt > SETTLED_THRESHOLD;
  const hasCredit   = debt < -SETTLED_THRESHOLD;
  const isSettled   = !isPending && !hasCredit;
  const rank        = meta.rank;
  const c           = playerColor;

  const reducedMotion = useReducedMotion();

  // 850 ms zamiast 450: po zapisie kwota ma widocznie zjechać do zera, a nie
  // mrugnąć. Ten sam licznik animuje też powrót długu po „cofnij”.
  const animatedAbs = useAnimatedValue(Math.abs(debt), 850);

  const { flash, settling, justCleared, startSettling, resetSettling } = useSettleAnimation(debt, reducedMotion);

  const { lastPayment, secondsLeft, progressPct, startPaymentUndo, handleUndoPayment } =
    usePaymentUndo({ playerName: player.name, onRemovePayment });

  const { adminMode, toggleAdminMode, handleAmountClick, handleAmountKeyDown } = useAdminModeToggle();

  const onPaid = useCallback((payment: { id: string; amount: number }) => {
    startPaymentUndo(payment);
    if (debt > SETTLED_THRESHOLD && debt - payment.amount <= SETTLED_THRESHOLD) {
      // Sam licznik zjeżdża do zera; pieczątka i dźwięk czekają na efekt
      // w `useSettleAnimation`, żeby nie nakładały się na animację.
      startSettling();
    }
  }, [debt, startPaymentUndo, startSettling]);

  const {
    modal, setModal, customAmt, setCustomAmt, isSaving, paymentError, setPaymentError,
    confirmSettle, setConfirmSettle, cancelModal, savePayment,
  } = usePaymentFlow({ playerName: player.name, onAddPayment, onPaid });

  const handleUndo = useCallback(async () => {
    resetSettling();
    await handleUndoPayment();
  }, [resetSettling, handleUndoPayment]);

  const cardBorder = isSettled && !isOrganizer
    ? `${c.border}25`
    : `${c.border}30`;
  // Etykieta musi zawierać widoczny tekst (kwotę i stan), inaczej osoby
  // korzystające z rozpoznawania mowy nie mogą aktywować elementu po nazwie.
  const amountText = `${hasCredit ? '+' : ''}${formatAmountShort(Math.abs(debt))}zł`;
  const amountAriaLabel = `${hasCredit ? '↑ Nadpłata ' : ''}${amountText}${adminMode ? ' Tryb edycji' : ''} — ${adminMode ? 'wyłącz' : 'włącz'} tryb edycji wpłat`;

  const { cardRef, foilRef, handlers: tiltHandlers } = useCardTilt({
    reducedMotion,
    activeBorder: `${c.border}70`,
    restBorder: cardBorder,
    activeShadow: isPending && !isOrganizer ? 'var(--glow-box-rose)' : 'var(--glow-box-cyan)',
    restShadow: isPending && !isOrganizer ? 'var(--glow-box-rose)' : 'none',
  });

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
      {...tiltHandlers}
    >
      <div ref={foilRef} className={RARITY_FOIL_CLASS[meta.rarity]} style={foilStyle} aria-hidden="true" />
      <CornerBrackets color={c.border} size={14} thickness={1} />
      <div className="glass-shine-overlay" aria-hidden="true" />
      <span className="sr-only" role="status" aria-live="polite">
        {isSaving ? 'Zapisywanie wpłaty…' : settling ? 'Rozliczanie…' : justCleared ? 'Wpłata zapisana. Karta rozliczona.' : ''}
      </span>

      <CardStatusStrip
        isOrganizer={isOrganizer}
        isPending={isPending}
        hasCredit={hasCredit}
        isSettled={isSettled}
        playerColor={c}
        meta={meta}
      />

      <CardIdentity
        player={player}
        playerColor={c}
        meta={meta}
        history={history}
        isOrganizer={isOrganizer}
        isPending={isPending}
        isMobile={isMobile}
      />

      {!isOrganizer && (
        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

          <DebtAmountPanel
            animatedAbs={animatedAbs}
            isPending={isPending}
            hasCredit={hasCredit}
            flash={flash}
            settling={settling}
            adminMode={adminMode}
            ariaLabel={amountAriaLabel}
            onClick={handleAmountClick}
            onKeyDown={handleAmountKeyDown}
          />

          {/* Widoczna ścieżka do trybu edycji wpłat — dotąd tylko pięć kliknięć
              w kwotę (nieodkrywalne) albo Enter na kwocie (łatwo przypadkowy). */}
          <button
            type="button"
            onClick={toggleAdminMode}
            aria-pressed={adminMode}
            className="icon-btn"
            style={{
              alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 6,
              minHeight: 44, padding: '6px 10px', marginBottom: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: adminMode ? 'var(--co-rose)' : 'var(--co-dim)',
              ...FONT.mono(TEXT.small),
            }}
          >
            <Pencil size={13} aria-hidden="true" />
            {adminMode ? 'Zakończ edycję wpłat' : 'Edytuj wpłaty'}
          </button>

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

          <SettleConfirmModal
            open={confirmSettle}
            playerName={player.name}
            debt={debt}
            isSaving={isSaving}
            errorMsg={paymentError}
            onClose={() => setConfirmSettle(false)}
            onCancel={() => { setConfirmSettle(false); setPaymentError(null); }}
            onConfirm={() => void savePayment(debt)}
          />

          {modal === null && (
            <PaymentActions
              debt={debt}
              isPending={isPending}
              hasCredit={hasCredit}
              isSettled={isSettled}
              isSaving={isSaving}
              onSettleExact={() => void savePayment(debt)}
              onRequestConfirm={() => setConfirmSettle(true)}
              onOpenCustom={() => setModal(PAYMENT_MODAL.CUSTOM)}
            />
          )}

          {!isMobile && (
            <CardBarcode name={player.name} color={c.border} marginTop={modal === null ? 12 : 'auto'} />
          )}
        </div>
      )}

      {isOrganizer && (
        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

          <TreasurerAmountPanel
            animatedAbs={animatedAbs}
            isPending={isPending}
            hasCredit={hasCredit}
            flash={flash}
          />

          {allPlayers && (
            <TreasurerPanel
              players={allPlayers}
              open={openDetails}
              onToggle={() => onToggleDetails(player.name)}
            />
          )}

          {!isMobile && (
            <CardBarcode name={player.name} color={c.border} marginTop="auto" />
          )}
        </div>
      )}
    </div>
  );
}

/* Design system hooks (kept for lint:css reachability):
   status-chip */
export default memo(PlayerCard);
