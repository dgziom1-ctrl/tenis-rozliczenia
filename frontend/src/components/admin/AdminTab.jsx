import { useState, useEffect, useCallback } from 'react';
import { CalendarPlus, Users, Zap, CalendarDays, CheckCircle2, Calculator, Copy, Terminal } from 'lucide-react';
import { addSession } from '../../firebase/index';
import { QUICK_COSTS, TABS, SOUND_TYPES } from '../../constants';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { formatDate, formatAmountShort } from '../../utils/format';
import { getPayingPlayers } from '../../utils/calculations';
import { useThemeTokens } from '../../context/ThemeContext';

function buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, perPerson }) {
  const paying = getPayingPlayers(presentPlayers, multisportPlayers);
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

// ── Section label ─────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label style={{
      display: 'block',
      fontFamily: 'var(--font-display)', fontSize: '0.9rem',
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--co-dim)', marginBottom: 8,
    }}>
      {children}
    </label>
  );
}

// ── Session summary modal ─────────────────────────────────
function SessionSummaryModal({ summary, onClose, tokens }) {
  const [copied, setCopied] = useState(false);
  if (!summary) return null;
  const { date, totalCost, presentCount, payingCount, multisportCount, perPerson, presentPlayers, multisportPlayers } = summary;

  const handleCopy = async () => {
    const msg = buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, perPerson });
    try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(6px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div style={{
        background: 'var(--co-dark)',
        border: '1px solid rgba(0,229,255,0.4)',
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        boxShadow: '0 0 60px rgba(0,229,255,0.15), 0 4px 60px rgba(0,0,0,0.95)',
        padding: '28px 24px', width: '100%', maxWidth: 400,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{
            width: 40, height: 40,
            background: 'rgba(0,229,255,0.08)',
            border: '1px solid rgba(0,229,255,0.35)',
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={20} style={{ color: 'var(--co-green)' }} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', color: 'var(--co-green)', marginBottom: 3, textTransform: 'uppercase' }}>
              Zapisano!
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.06em', color: '#e8e8e8', margin: 0 }}>
              Sesja zapisana!
            </h3>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'DATA', value: formatDate(date), color: '#c8c8c8' },
            { label: 'KOSZT', value: `${formatAmountShort(totalCost)} ZŁ`, color: 'var(--co-cyan)' },
            { label: 'OBECNI', value: presentCount, color: '#c8c8c8' },
            multisportCount > 0
              ? { label: 'MULTISPORT', value: `⚡ ${multisportCount}`, color: 'var(--co-green)' }
              : { label: 'PŁACĄ', value: payingCount, color: '#c8c8c8' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '10px 12px', background: 'var(--co-dark)',
              border: '1px solid var(--co-border)',
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
            }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 4, textTransform: 'uppercase' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Per-person */}
        {payingCount > 0 && (
          <div style={{
            padding: '16px', marginBottom: 16, textAlign: 'center',
            background: 'rgba(0,229,255,0.04)',
            border: '1px solid rgba(0,229,255,0.3)',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 6, textTransform: 'uppercase' }}>
              KAŻDY PŁACI
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.4rem', color: 'var(--co-cyan)', textShadow: '0 0 20px rgba(0,229,255,0.5)', margin: 0 }}>
              {formatAmountShort(perPerson)}<span style={{ fontSize: '1rem', opacity: 0.4, marginLeft: 4 }}>ZŁ</span>
            </p>
            {multisportCount > 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', marginTop: 4 }}>
                {payingCount} os. płaci · {multisportCount} os. gratis
              </p>
            )}
          </div>
        )}

        {/* Copy & close */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleCopy} style={{
            width: '100%', padding: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em',
            cursor: 'pointer', transition: 'all 0.18s',
            ...(copied ? {
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.4)', color: 'var(--co-green)',
            } : {
              background: 'transparent', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
            }),
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          }}>
            {copied ? <><CheckCircle2 size={14} /> Skopiowano!</> : <><Copy size={14} /> Kopiuj na grupkę</>}
          </button>
          <button onClick={onClose} className="cyber-button-yellow" style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.65rem' }}>
            <CheckCircle2 size={14} /> OK — Powrót do bazy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live cost preview ─────────────────────────────────────
function LiveCostPreview({ totalCost, presentPlayers, multisportPlayers }) {
  const cost = parseFloat(totalCost);
  if (!totalCost || isNaN(cost) || cost <= 0 || presentPlayers.length === 0) return null;
  const paying    = presentPlayers.filter(p => !multisportPlayers.includes(p));
  const perPerson = paying.length > 0 ? cost / paying.length : 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(0,229,255,0.03)',
      border: '1px solid rgba(0,229,255,0.2)',
      clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calculator size={14} style={{ color: 'var(--co-dim)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', letterSpacing: '0.15em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
          Podział kosztów
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        {paying.length > 0 ? (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'var(--co-cyan)', textShadow: '0 0 10px rgba(0,229,255,0.3)' }}>
              {formatAmountShort(perPerson)} ZŁ
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--co-dim)', marginLeft: 8, letterSpacing: '0.12em' }}>
              / os. ({paying.length} PŁACI)
            </span>
          </>
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.1em', color: 'var(--co-green)' }}>
            ⚡ WSZYSCY MAJĄ MULTISPORT
          </span>
        )}
      </div>
    </div>
  );
}

// ── Player toggle grid ────────────────────────────────────
function PlayerToggleGrid({ names, selected, onToggle, accent = 'yellow' }) {
  const accentColor = accent === 'green' ? 'var(--co-green)' : 'var(--co-cyan)';
  const accentAlpha = accent === 'green' ? 'rgba(0,229,255,0.08)' : 'rgba(0,229,255,0.08)';
  const accentBorder = accent === 'green' ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.4)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
      {names.map(name => {
        const active = selected.includes(name);
        return (
          <button type="button" key={name} onClick={() => onToggle(name)} style={{
            padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
            ...(active ? {
              background: accentAlpha, border: `1px solid ${accentBorder}`, color: accentColor,
              boxShadow: `0 0 10px ${accent === 'green' ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.1)'}`,
            } : {
              background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
            }),
          }}>
            {name}
          </button>
        );
      })}
    </div>
  );
}

// ── Date input overlay ────────────────────────────────────
function CyberDateInput({ value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="cyber-input" style={{
        width: '100%', padding: '10px 14px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 10,
        clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        pointerEvents: 'none', fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
      }}>
        <span>{formatDate(value)}</span>
        <CalendarDays size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        onClick={e => e.currentTarget.showPicker?.()}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', zIndex: 2, padding: 0, border: 'none',
          boxSizing: 'border-box', fontSize: '16px',
        }}
      />
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────
export default function AdminTab({ playerNames, defaultMultiPlayers, history, setActiveTab, playSound }) {
  const { showError } = useToast();
  const tokens = useThemeTokens();

  const today = new Date().toISOString().split('T')[0];
  const [datePlayed,        setDatePlayed]        = useState(today);
  const [totalCost,         setTotalCost]         = useState('');
  const [presentPlayers,    setPresentPlayers]    = useState([]);
  const [multisportPlayers, setMultisportPlayers] = useState([]);
  const [isSaving,          setIsSaving]          = useState(false);
  const [savedSummary,      setSavedSummary]      = useState(null);

  const isDuplicateDate = (history || []).some(s => s.datePlayed === datePlayed);

  useEffect(() => {
    if (!playerNames?.length) return;
    setPresentPlayers([...playerNames]);
    setMultisportPlayers([...(defaultMultiPlayers ?? [])]);
  }, [playerNames, defaultMultiPlayers]);

  const togglePresent = useCallback((name) => {
    playSound(SOUND_TYPES.CLICK);
    setPresentPlayers(prev => {
      if (prev.includes(name)) { setMultisportPlayers(m => m.filter(p => p !== name)); return prev.filter(p => p !== name); }
      return [...prev, name];
    });
  }, [playSound]);

  const toggleMulti = useCallback((name) => {
    playSound(SOUND_TYPES.CLICK);
    setMultisportPlayers(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  }, [playSound]);

  const handleSaveSession = useCallback(async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const cost     = parseFloat(totalCost);
    const paying   = presentPlayers.filter(p => !multisportPlayers.includes(p));
    const perPerson = paying.length > 0 ? cost / paying.length : 0;
    try {
      const result = await addSession({ datePlayed, totalCost: cost, presentPlayers, multisportPlayers });
      if (!result.success) { showError(result.error || 'Nie udało się zapisać sesji'); return; }
      playSound(SOUND_TYPES.SUCCESS);
      setSavedSummary({ date: datePlayed, totalCost: cost, presentCount: presentPlayers.length, payingCount: paying.length, multisportCount: multisportPlayers.length, perPerson, presentPlayers: [...presentPlayers], multisportPlayers: [...multisportPlayers] });
      setTotalCost('');
      setPresentPlayers([...playerNames]);
      setMultisportPlayers([...(defaultMultiPlayers ?? [])]);
    } finally { setIsSaving(false); }
  }, [isSaving, datePlayed, totalCost, presentPlayers, multisportPlayers, playerNames, defaultMultiPlayers, playSound, showError]);

  const handleSummaryClose = useCallback(() => { setSavedSummary(null); setActiveTab(TABS.DASHBOARD); }, [setActiveTab]);

  const isDisabled = isSaving || presentPlayers.length === 0 || !totalCost || isDuplicateDate;

  return (
    <>
      <SessionSummaryModal summary={savedSummary} onClose={handleSummaryClose} tokens={tokens} />

      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', animation: 'slide-in-up 0.3s ease-out' }}>
        <div className="cyber-box" style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)', padding: '20px 20px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid var(--co-border)' }}>
            <div style={{ padding: '7px 9px', background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.25)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
              <CalendarPlus size={16} style={{ color: 'var(--co-cyan)', display: 'block' }} />
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.22em', color: 'var(--co-cyan)', textTransform: 'uppercase' }}>
                Dodaj nową sesję
              </span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', margin: '2px 0 0' }}>
                zapisz dzisiejszą grę ping-ponga
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSession} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Date */}
            <div>
              <FieldLabel>Data gry</FieldLabel>
              <CyberDateInput value={datePlayed} onChange={setDatePlayed} />
              {isDuplicateDate && (
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.15em', color: '#f59e0b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠ SESJA Z TĄ DATĄ JUŻ ISTNIEJE
                </p>
              )}
            </div>

            {/* Cost */}
            <div>
              <FieldLabel>Koszt całkowity (zł)</FieldLabel>
              {/* Quick-cost buttons */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {QUICK_COSTS.map(cost => {
                  const active = totalCost === String(cost);
                  return (
                    <button type="button" key={cost}
                      onClick={() => { setTotalCost(String(cost)); playSound(SOUND_TYPES.CLICK); }}
                      style={{
                        flex: 1, padding: '8px 4px', cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                        clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                        ...(active ? {
                          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.5)',
                          color: 'var(--co-cyan)', boxShadow: '0 0 8px rgba(0,229,255,0.15)',
                        } : {
                          background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
                        }),
                      }}>
                      {cost === 0 ? 'FREE' : cost}
                    </button>
                  );
                })}
              </div>
              <input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)}
                placeholder="lub wpisz ręcznie..."
                className="cyber-input"
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.85rem', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
                required
              />
            </div>

            {/* Present players */}
            <div style={{ padding: '16px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.18em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
                <Users size={13} style={{ color: 'var(--co-cyan)' }} />
                Kto grał?
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-cyan)' }}>
                  [{presentPlayers.length}/{playerNames?.length || 0}]
                </span>
              </p>
              <PlayerToggleGrid names={playerNames || []} selected={presentPlayers} onToggle={togglePresent} accent="yellow" />
            </div>

            {/* Multisport */}
            {presentPlayers.length > 0 && (
              <div style={{ padding: '16px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.18em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
                  <Zap size={13} style={{ color: 'var(--co-green)' }} />
                  Kto miał Multisport? (płaci 0 zł)
                  {multisportPlayers.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-green)' }}>
                      ⚡{multisportPlayers.length}
                    </span>
                  )}
                </p>
                <PlayerToggleGrid names={presentPlayers} selected={multisportPlayers} onToggle={toggleMulti} accent="green" />
              </div>
            )}

            {/* Live preview */}
            <LiveCostPreview totalCost={totalCost} presentPlayers={presentPlayers} multisportPlayers={multisportPlayers} />

            {/* Submit */}
            <div>
              <button type="submit" disabled={isDisabled}
                className={isDisabled ? '' : 'cyber-button-yellow'}
                style={{
                  width: '100%', padding: '14px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: '0.72rem', letterSpacing: '0.12em',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  ...(isDisabled ? {
                    background: 'var(--co-panel)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
                  } : {}),
                }}>
                {isSaving
                  ? <><InlineSpinner size="sm" /> ZAPISUJĘ...</>
                  : <><CheckCircle2 size={16} /> ZAPISZ SESJĘ</>}
              </button>
              {!isSaving && isDisabled && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', textAlign: 'center', marginTop: 8 }}>
                  {'>'} {isDuplicateDate ? '⚠ Zmień datę — sesja już istnieje' : !totalCost ? 'Wpisz koszt sesji żeby kontynuować' : 'Zaznacz co najmniej jednego gracza'}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
