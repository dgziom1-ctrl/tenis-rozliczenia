import { useState, useRef, useCallback, useEffect } from 'react';
import { CheckCircle2, RotateCcw, X, Coins } from 'lucide-react';
import { getRank, ORGANIZER_NAME, SETTLED_THRESHOLD } from '../../constants';
import { formatAmountShort } from '../../utils/format';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { useThemeTokens } from '../../context/ThemeContext';
import BreakdownPanel from './BreakdownPanel';

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
  const T           = useThemeTokens();

  // modal: null | 'confirm-exact' | 'custom'
  const [modal,       setModal]       = useState(null);
  const [customAmt,   setCustomAmt]   = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const [lastPayment, setLastPayment] = useState(null);
  const [undoSecs,    setUndoSecs]    = useState(0);
  const [adminMode,   setAdminMode]   = useState(false);
  const clickCount   = useRef(0);
  const clickTimer   = useRef(null);
  const undoInterval = useRef(null);
  const cardRef      = useRef(null);

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

  const clearPayUndo = useCallback(() => {
    clearInterval(undoInterval.current);
    undoInterval.current = null;
    setUndoSecs(0);
    setLastPayment(null);
    onUnpin();
  }, [onUnpin]);

  useEffect(() => () => clearInterval(undoInterval.current), []);

  const startUndo = useCallback((payment) => {
    onPin(player.name);
    setLastPayment(payment);
    setUndoSecs(8);
    undoInterval.current = setInterval(() => {
      setUndoSecs(prev => {
        if (prev <= 1) { clearInterval(undoInterval.current); setLastPayment(null); onUnpin(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [player.name, onPin, onUnpin]);

  const handleUndoPayment = useCallback(async () => {
    if (!lastPayment) return;
    clearPayUndo();
    await onRemovePayment(player.name, lastPayment.id);
  }, [lastPayment, clearPayUndo, onRemovePayment, player.name]);

  const savePayment = useCallback(async (amount) => {
    setModal(null);
    setCustomAmt('');
    setIsSaving(true);
    onPin(player.name);
    const result = await onAddPayment(player.name, amount);
    if (result?.paymentId) {
      startUndo({ id: result.paymentId, amount });
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } else {
      onUnpin();
    }
    setIsSaving(false);
  }, [player.name, onAddPayment, onPin, onUnpin, startUndo]);

  const cardBorder = hasDebt   ? 'border-magenta-800 hover:border-magenta-500'
                   : hasCredit ? 'border-yellow-700 hover:border-yellow-500'
                   :             'border-cyan-800 hover:border-cyan-500';
  const headerBg   = hasDebt   ? 'bg-magenta-950/50'
                   : hasCredit ? 'bg-yellow-950/40'
                   :             'bg-cyan-950/50';
  const headerBord = hasDebt   ? 'border-magenta-600'
                   : hasCredit ? 'border-yellow-700'
                   :             'border-cyan-600';
  const headerText = hasDebt   ? 'text-magenta-300 text-neon-pink'
                   : hasCredit ? 'text-yellow-300'
                   :             'text-cyan-300 text-neon-blue';

  return (
    <div
      ref={cardRef}
      className={`cyber-box ${cardBorder} rounded-2xl overflow-hidden transition-all flex flex-col ${justSettled ? 'settle-flash' : ''}`}
    >
      {/* Header */}
      <div className={`${headerBg} p-4 border-b-2 ${headerBord}`}>
        <h3 className={`font-black text-xl ${headerText} flex items-center gap-2`}>
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
              className={`p-4 rounded-xl border-2 shadow-inner mb-4 text-center cursor-default select-none
                ${hasDebt   ? 'bg-magenta-950/30 border-magenta-800'
                : hasCredit ? 'bg-yellow-950/30 border-yellow-800'
                :             'bg-emerald-950/30 border-emerald-900'}`}
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
              <div
                className="mb-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2 relative overflow-hidden"
                style={{ background: T.undoBg, border: `1px solid ${T.undoBorder}` }}
              >
                <div
                  className="absolute bottom-0 left-0 h-0.5 transition-all duration-1000"
                  style={{ width: `${(undoSecs / 8) * 100}%`, background: T.undoProgressBg }}
                />
                <span className="text-xs font-bold flex items-center gap-1" style={{ color: T.undoText }}>
                  <CheckCircle2 size={13} /> {formatAmountShort(lastPayment.amount)} zł zapisane
                </span>
                <button
                  onClick={handleUndoPayment}
                  className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-all flex-shrink-0"
                  style={{ color: T.accentText, border: `1px solid ${T.mutedBorder}` }}
                >
                  <RotateCcw size={11} /> cofnij ({undoSecs}s)
                </button>
              </div>
            )}

            {/* Confirm exact amount modal */}
            {modal === 'confirm-exact' && (
              <div
                className="mb-3 rounded-xl p-4"
                style={{ background: T.accentBg, border: `2px solid ${T.accentBorder}` }}
              >
                <p className="font-bold text-center mb-1" style={{ color: T.bodyText }}>Potwierdzasz przelew?</p>
                <p className="text-2xl font-black text-center mb-4" style={{ color: T.accentText }}>
                  {formatAmountShort(debt)} zł 💸
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => savePayment(debt)}
                    disabled={isSaving}
                    className="flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-40 transition-all"
                    style={{ background: T.confirmBg, border: `2px solid ${T.confirmBorder}`, color: T.confirmText }}
                  >
                    {isSaving ? <InlineSpinner size="sm" /> : <><CheckCircle2 size={14} /> Tak, wysłałem</>}
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-all"
                    style={{ border: `2px solid ${T.cancelBorder}`, color: T.cancelText }}
                  >
                    <X size={14} /> Anuluj
                  </button>
                </div>
              </div>
            )}

            {/* Custom amount modal */}
            {modal === 'custom' && (
              <div
                className="mb-3 rounded-xl p-4"
                style={{ background: T.modalBg, border: `2px solid ${T.accentBorder}`, boxShadow: T.modalShadow }}
              >
                <p className="font-bold text-center mb-3" style={{ color: T.accentText }}>
                  {hasCredit ? 'Ile chcesz dopłacić?' : 'Wpisz kwotę przelewu'}
                </p>
                <input
                  type="number" step="0.01" placeholder="np. 50"
                  value={customAmt}
                  onChange={e => setCustomAmt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = parseFloat(customAmt);
                      if (v && v !== 0) savePayment(v);
                    }
                  }}
                  autoFocus
                  className="cyber-input w-full p-3 rounded-lg text-lg text-center mb-3 font-bold"
                  style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.inputText }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { const v = parseFloat(customAmt); if (v && v !== 0) savePayment(v); }}
                    disabled={isSaving || !customAmt || parseFloat(customAmt) === 0}
                    className="flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-40 transition-all"
                    style={{ background: T.confirmBg, border: `2px solid ${T.confirmBorder}`, color: T.confirmText }}
                  >
                    {isSaving ? <InlineSpinner size="sm" /> : <><CheckCircle2 size={14} /> Potwierdzam</>}
                  </button>
                  <button
                    onClick={() => { setModal(null); setCustomAmt(''); }}
                    className="flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-all"
                    style={{ border: `2px solid ${T.cancelBorder}`, color: T.cancelText }}
                  >
                    <X size={14} /> Anuluj
                  </button>
                </div>
              </div>
            )}

            {/* Default action buttons */}
            {!justSettled && modal === null && (
              <div className="mt-auto flex flex-col gap-2">
                {hasDebt && (
                  <>
                    <button
                      onClick={() => setModal('confirm-exact')}
                      className="w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 transition-all"
                      style={{ background: T.confirmBg, border: `2px solid ${T.confirmBorder}`, color: T.confirmText }}
                    >
                      <Coins size={18} /> Wysyłam {formatAmountShort(debt)} zł na BLIK 💸
                    </button>
                    <button
                      onClick={() => setModal('custom')}
                      className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                      style={{ border: `1px dashed ${T.accentBorder}`, color: T.accentText, opacity: 0.7 }}
                    >
                      + inna kwota
                    </button>
                  </>
                )}
                {hasCredit && (
                  <button
                    onClick={() => setModal('custom')}
                    className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ border: `1px dashed ${T.accentBorder}`, color: T.accentText, opacity: 0.7 }}
                  >
                    + wpłać więcej
                  </button>
                )}
                {!hasDebt && !hasCredit && (
                  <>
                    <div
                      className="w-full py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 opacity-60 select-none"
                      style={{ border: `2px solid ${T.mutedBorder}`, color: T.mutedText }}
                    >
                      <CheckCircle2 size={18} /> wszystko zapłacone ✓
                    </div>
                    <button
                      onClick={() => setModal('custom')}
                      className="w-full py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ border: `1px dashed ${T.accentBorder}`, color: T.accentText, opacity: 0.7 }}
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
