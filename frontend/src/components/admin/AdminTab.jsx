import { useState, useEffect, useCallback } from 'react';
import { CalendarPlus, Users, Zap, CalendarDays, CheckCircle2, Calculator, Copy } from 'lucide-react';
import { addSession } from '../../firebase/index';
import { QUICK_COSTS, TABS, SOUND_TYPES } from '../../constants';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { formatDate, formatAmountShort } from '../../utils/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, perPerson }) {
  const paying = presentPlayers.filter(p => !multisportPlayers.includes(p));
  const multi  = multisportPlayers.filter(p => presentPlayers.includes(p));

  let msg = `🏓 Graliśmy! (${formatDate(date)})\n`;
  msg += `💰 Koszt: ${formatAmountShort(totalCost)} zł\n`;
  msg += `👥 Obecni (${presentPlayers.length}): ${presentPlayers.join(', ')}\n`;

  if (paying.length > 0) {
    msg += `💳 Każdy płaci: ${formatAmountShort(perPerson)} zł`;
    if (paying.length !== presentPlayers.length) msg += ` (${paying.length} os.)`;
    msg += '\n';
  }
  if (multi.length > 0) msg += `⚡ Multisport (gratis): ${multi.join(', ')}\n`;

  return msg.trim();
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for older browsers
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

// ─── Session summary modal ────────────────────────────────────────────────────
function SessionSummaryModal({ summary, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!summary) return null;

  const { date, totalCost, presentCount, payingCount, multisportCount, perPerson, presentPlayers, multisportPlayers } = summary;

  const handleCopy = async () => {
    const msg = buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, perPerson });
    try {
      await copyToClipboard(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // silently ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="cyber-box border-emerald-500 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_40px_rgba(16,185,129,0.3)]">
        <div className="flex items-center gap-3 mb-5">
          <CheckCircle2 className="text-emerald-400" size={28} />
          <h3 className="font-black text-emerald-300 text-xl tracking-wide">Sesja zapisana!</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/60 border border-cyan-900 rounded-xl p-3 text-center">
            <p className="text-cyan-700 text-xs tracking-widest mb-1">DATA</p>
            <p className="text-cyan-200 font-bold text-sm">{formatDate(date)}</p>
          </div>
          <div className="bg-black/60 border border-magenta-900 rounded-xl p-3 text-center">
            <p className="text-cyan-700 text-xs tracking-widest mb-1">KOSZT</p>
            <p className="text-magenta-300 font-black text-lg">{formatAmountShort(totalCost)} zł</p>
          </div>
          <div className="bg-black/60 border border-cyan-900 rounded-xl p-3 text-center">
            <p className="text-cyan-700 text-xs tracking-widest mb-1">OBECNYCH</p>
            <p className="text-cyan-200 font-black text-lg">{presentCount}</p>
          </div>
          {multisportCount > 0 && (
            <div className="bg-black/60 border border-emerald-900 rounded-xl p-3 text-center">
              <p className="text-cyan-700 text-xs tracking-widest mb-1">MULTISPORT</p>
              <p className="text-emerald-300 font-black text-lg">⚡ {multisportCount}</p>
            </div>
          )}
        </div>

        {payingCount > 0 && (
          <div className="bg-magenta-950/40 border-2 border-magenta-700 rounded-xl p-4 mb-4 text-center">
            <p className="text-cyan-600 text-xs tracking-widest mb-1">KAŻDY PŁACI</p>
            <p className="text-4xl font-black text-magenta-300 glow-magenta-lg">
              {formatAmountShort(perPerson)}<span className="text-xl ml-1 opacity-70">zł</span>
            </p>
            {multisportCount > 0 && (
              <p className="text-emerald-600 text-xs mt-1">({payingCount} os. płaci · {multisportCount} os. gratis)</p>
            )}
          </div>
        )}

        <button
          onClick={handleCopy}
          className={`w-full py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 mb-3 ${
            copied
              ? 'border-emerald-400 bg-emerald-950/50 text-emerald-300'
              : 'border-cyan-700 bg-cyan-950/30 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-950/50'
          }`}
        >
          {copied ? <><CheckCircle2 size={15} /> SKOPIOWANO!</> : <><Copy size={15} /> KOPIUJ NA GRUPKĘ</>}
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl border-2 border-emerald-500 text-emerald-300 bg-emerald-950/50 hover:bg-emerald-500 hover:text-black font-black text-sm transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} /> OK, GOTOWE
        </button>
      </div>
    </div>
  );
}

// ─── Live cost preview ────────────────────────────────────────────────────────
function LiveCostPreview({ totalCost, presentPlayers, multisportPlayers }) {
  const cost = parseFloat(totalCost);
  if (!totalCost || isNaN(cost) || cost <= 0 || presentPlayers.length === 0) return null;

  const payingPlayers = presentPlayers.filter(p => !multisportPlayers.includes(p));
  const perPerson     = payingPlayers.length > 0 ? cost / payingPlayers.length : 0;

  return (
    <div className="flex items-center justify-between bg-cyan-950/30 border border-cyan-800 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 text-cyan-600 text-sm font-bold">
        <Calculator size={15} className="text-cyan-500" />
        <span>Podgląd podziału</span>
      </div>
      <div className="text-right">
        {payingPlayers.length > 0 ? (
          <>
            <span className="text-magenta-300 font-black text-xl glow-magenta-sm">
              {formatAmountShort(perPerson)} zł
            </span>
            <span className="text-cyan-700 text-xs ml-2">/ os. ({payingPlayers.length} płaci)</span>
          </>
        ) : (
          <span className="text-emerald-400 font-bold text-sm">Wszyscy mają Multisport 🎉</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminTab({ playerNames, defaultMultiPlayers, setActiveTab, playSound }) {
  const { showError } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const [datePlayed,        setDatePlayed]        = useState(today);
  const [totalCost,         setTotalCost]         = useState('');
  const [presentPlayers,    setPresentPlayers]    = useState([]);
  const [multisportPlayers, setMultisportPlayers] = useState([]);
  const [isSaving,          setIsSaving]          = useState(false);
  const [savedSummary,      setSavedSummary]      = useState(null);

  // Initialise player lists whenever roster changes
  useEffect(() => {
    if (!playerNames?.length) return;
    setPresentPlayers([...playerNames]);
    setMultisportPlayers([...(defaultMultiPlayers ?? [])]);
  }, [playerNames, defaultMultiPlayers]);

  const togglePresent = useCallback((name) => {
    playSound(SOUND_TYPES.CLICK);
    setPresentPlayers(prev => {
      if (prev.includes(name)) {
        setMultisportPlayers(m => m.filter(p => p !== name));
        return prev.filter(p => p !== name);
      }
      return [...prev, name];
    });
  }, [playSound]);

  const toggleMulti = useCallback((name) => {
    playSound(SOUND_TYPES.CLICK);
    setMultisportPlayers(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name],
    );
  }, [playSound]);

  const handleSaveSession = useCallback(async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    const cost          = parseFloat(totalCost);
    const payingPlayers = presentPlayers.filter(p => !multisportPlayers.includes(p));
    const perPerson     = payingPlayers.length > 0 ? cost / payingPlayers.length : 0;

    try {
      const result = await addSession({ datePlayed, totalCost: cost, presentPlayers, multisportPlayers });
      if (!result.success) {
        showError(result.error || 'Nie udało się zapisać sesji');
        return;
      }

      playSound(SOUND_TYPES.SUCCESS);
      setSavedSummary({
        date: datePlayed, totalCost: cost,
        presentCount:    presentPlayers.length,
        payingCount:     payingPlayers.length,
        multisportCount: multisportPlayers.length,
        perPerson,
        presentPlayers:    [...presentPlayers],
        multisportPlayers: [...multisportPlayers],
      });

      // Reset form
      setTotalCost('');
      setPresentPlayers([...playerNames]);
      setMultisportPlayers([...(defaultMultiPlayers ?? [])]);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, datePlayed, totalCost, presentPlayers, multisportPlayers, playerNames, defaultMultiPlayers, playSound, showError]);

  const handleSummaryClose = useCallback(() => {
    setSavedSummary(null);
    setActiveTab(TABS.DASHBOARD);
  }, [setActiveTab]);

  return (
    <>
      <SessionSummaryModal summary={savedSummary} onClose={handleSummaryClose} />

      <div className="w-full max-w-3xl mx-auto animate-in slide-in-from-bottom-5 duration-300">
        <div className="cyber-box rounded-2xl p-4 sm:p-8">
          <h2 className="text-xl font-black text-cyan-300 mb-6 flex items-center gap-3 border-b-2 border-cyan-800 pb-4">
            <CalendarPlus className="text-magenta-500 flex-shrink-0" />
            Dodaj nową sesję
          </h2>

          <form onSubmit={handleSaveSession} className="space-y-5">
            {/* Date */}
            <div>
              <label className="block font-bold text-cyan-600 mb-2 tracking-wider text-sm">Data gry:</label>
              <div style={{ position: 'relative' }}>
                <div
                  className="cyber-input w-full p-3 rounded-xl text-sm flex items-center justify-between gap-3"
                  style={{ pointerEvents: 'none' }}
                >
                  <span>{formatDate(datePlayed)}</span>
                  <CalendarDays size={18} style={{ opacity: 0.6, flexShrink: 0 }} />
                </div>
                <input
                  type="date"
                  value={datePlayed}
                  onChange={e => setDatePlayed(e.target.value)}
                  onClick={e => e.currentTarget.showPicker?.()}
                  className="date-overlay"
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer', zIndex: 2,
                    padding: 0, border: 'none', boxSizing: 'border-box',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>

            {/* Cost */}
            <div>
              <label className="block font-bold text-cyan-600 mb-2 tracking-wider text-sm">Koszt całkowity:</label>
              <div className="flex gap-2 mb-2">
                {QUICK_COSTS.map(cost => (
                  <button
                    type="button"
                    key={cost}
                    onClick={() => { setTotalCost(String(cost)); playSound(SOUND_TYPES.CLICK); }}
                    className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm transition-all ${
                      totalCost === String(cost)
                        ? 'border-cyan-400 bg-cyan-950 text-cyan-200 shadow-[0_0_8px_#00f3ff]'
                        : 'border-cyan-900 bg-black text-cyan-700 hover:border-cyan-600 hover:text-cyan-400'
                    }`}
                  >
                    {cost === 0 ? 'FREE' : cost}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={totalCost}
                onChange={e => setTotalCost(e.target.value)}
                placeholder="lub wpisz ręcznie..."
                className="cyber-input p-3 rounded-xl text-sm w-full"
                required
              />
            </div>

            {/* Who was present */}
            <div className="cyber-box bg-black/50 p-4 rounded-xl">
              <p className="font-bold text-cyan-400 mb-4 flex items-center gap-2 text-sm">
                <Users size={18} className="text-magenta-500 flex-shrink-0" /> Kto był obecny?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {playerNames.map(name => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => togglePresent(name)}
                    className={`p-3 rounded-lg border-2 font-bold text-sm transition-all text-center ${
                      presentPlayers.includes(name)
                        ? 'border-cyan-400 bg-cyan-950 text-cyan-200 shadow-[0_0_8px_#00f3ff]'
                        : 'border-cyan-900 bg-black hover:border-cyan-700 text-cyan-800'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Multisport */}
            {presentPlayers.length > 0 && (
              <div className="cyber-box bg-black/50 p-4 rounded-xl border-emerald-900">
                <p className="font-bold text-emerald-400 mb-4 flex items-center gap-2 text-sm">
                  <Zap size={18} className="text-emerald-500 flex-shrink-0" /> Kto miał Multisport (0 zł)?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {presentPlayers.map(name => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => toggleMulti(name)}
                      className={`p-3 rounded-lg border-2 font-bold text-sm transition-all text-center ${
                        multisportPlayers.includes(name)
                          ? 'border-emerald-400 bg-emerald-950 text-emerald-200 shadow-[0_0_8px_#10b981]'
                          : 'border-emerald-900 bg-black hover:border-emerald-700 text-emerald-800'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <LiveCostPreview
              totalCost={totalCost}
              presentPlayers={presentPlayers}
              multisportPlayers={multisportPlayers}
            />

            <button
              type="submit"
              disabled={isSaving || presentPlayers.length === 0 || !totalCost}
              className={`cyber-button-blue w-full py-4 rounded-xl text-lg font-black flex justify-center items-center gap-2 transition-opacity ${
                isSaving || presentPlayers.length === 0 || !totalCost ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSaving
                ? <><InlineSpinner size="sm" /> Zapisuję...</>
                : <><CheckCircle2 className="flex-shrink-0" /> ZAPISZ SESJĘ</>
              }
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
