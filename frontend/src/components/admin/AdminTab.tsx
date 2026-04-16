import { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarPlus, CheckCircle2, Users, Zap } from 'lucide-react';
import { addSession } from '@/lib/firebase';
import { QUICK_COSTS, SQUASH_QUICK_COSTS, TABS, SOUND_TYPES, SPORT, SQUASH_MULTISPORT_DISCOUNT, RACKET_PRICE } from '@/constants';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { useThemeTokens } from '@/context/ThemeContext';
import type { Sport } from '@/types/domain';
import type { HistoryEntry, SoundType } from '@/types/ui';

import SessionSummaryModal from './SessionSummaryModal';
import LiveCostPreview from './LiveCostPreview';
import PlayerToggleGrid from './PlayerToggleGrid';
import SportSelector from './SportSelector';
import CyberDateInput from './CyberDateInput';
import FieldLabel from './FieldLabel';

interface AdminTabProps {
  playerNames: string[];
  defaultMultiPlayers: string[];
  history: HistoryEntry[];
  setActiveTab: (id: string) => void;
  playSound: (type: SoundType) => void;
}

export default function AdminTab({ playerNames, defaultMultiPlayers, history, setActiveTab, playSound }: AdminTabProps) {
  const { showError } = useToast();
  const tokens = useThemeTokens();

  const today = new Date().toISOString().split('T')[0];
  const [sport,             setSport]             = useState<Sport>(SPORT.PINGPONG as Sport);
  const [datePlayed,        setDatePlayed]        = useState(today);
  const [totalCost,         setTotalCost]         = useState('');
  const [presentPlayers,    setPresentPlayers]    = useState<string[]>([]);
  const [multisportPlayers, setMultisportPlayers] = useState<string[]>([]);
  const [racketCount,       setRacketCount]       = useState(0);
  const [racketPrice,       setRacketPrice]       = useState(RACKET_PRICE);
  const [ownRacketPlayers,  setOwnRacketPlayers]  = useState<string[]>([]);
  const [isSaving,          setIsSaving]          = useState(false);
  const [savedSummary,      setSavedSummary]      = useState<{
    date: string; totalCost: number; presentCount: number; payingCount: number;
    multisportCount: number; perPerson: number; sport: Sport;
    presentPlayers: string[]; multisportPlayers: string[];
    racketCost: number; ownRacketPlayers: string[];
  } | null>(null);
  const [costTouched,       setCostTouched]       = useState(false);

  const isSquash = sport === SPORT.SQUASH;
  const activeCosts = isSquash ? SQUASH_QUICK_COSTS : QUICK_COSTS;
  const ownRacketPresentCount = isSquash ? ownRacketPlayers.filter(p => presentPlayers.includes(p)).length : 0;
  const maxRackets = Math.max(0, presentPlayers.length - ownRacketPresentCount);
  const effectiveRacketCount = Math.min(racketCount, maxRackets);
  const parsedRacketPrice = racketPrice > 0 ? racketPrice : 0;
  const racketCost = isSquash ? effectiveRacketCount * parsedRacketPrice : 0;

  const isDuplicateDate = (history || []).some(s => s.datePlayed === datePlayed);
  const parsedTotalCost = totalCost === '' ? NaN : parseFloat(totalCost);
  const isCostValid = Number.isFinite(parsedTotalCost) && parsedTotalCost >= 0;
  const isPresentValid = presentPlayers.length > 0;
  const totalCostError = isCostValid
    ? null
    : (totalCost === '' ? 'Wpisz koszt sesji żeby kontynuować' : 'Koszt musi być liczbą >= 0');

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!playerNames?.length) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    setPresentPlayers([...playerNames]);
    setMultisportPlayers([...(defaultMultiPlayers ?? [])]);
  }, [playerNames, defaultMultiPlayers]);

  const togglePresent = useCallback((name: string) => {
    playSound(SOUND_TYPES.CLICK);
    setPresentPlayers(prev => {
      if (prev.includes(name)) {
        setMultisportPlayers(m => m.filter(p => p !== name));
        setOwnRacketPlayers(m => m.filter(p => p !== name));
        return prev.filter(p => p !== name);
      }
      return [...prev, name];
    });
  }, [playSound]);

  const toggleOwnRacket = useCallback((name: string) => {
    playSound(SOUND_TYPES.CLICK);
    setOwnRacketPlayers(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  }, [playSound]);

  const toggleMulti = useCallback((name: string) => {
    playSound(SOUND_TYPES.CLICK);
    setMultisportPlayers(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  }, [playSound]);

  const handleSaveSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!isPresentValid) { showError('Zaznacz co najmniej jednego gracza'); return; }
    if (!isCostValid) { showError(totalCostError || 'Wpisz poprawny koszt sesji'); return; }
    if (isDuplicateDate) { showError('Sesja z tą datą już istnieje'); return; }
    setIsSaving(true);
    const cost = parsedTotalCost;
    const totalWithRackets = cost + racketCost;
    const perPerson = isSquash
      ? (() => {
          const multiCount = multisportPlayers.filter(p => presentPlayers.includes(p)).length;
          return presentPlayers.length > 0 ? (cost + multiCount * SQUASH_MULTISPORT_DISCOUNT) / presentPlayers.length : 0;
        })()
      : (() => {
          const paying = presentPlayers.filter(p => !multisportPlayers.includes(p));
          return paying.length > 0 ? cost / paying.length : 0;
        })();
    const paying = presentPlayers.filter(p => !multisportPlayers.includes(p));
    try {
      const ownRacketForSession = ownRacketPlayers.filter(p => presentPlayers.includes(p));
      const result = await addSession({
        datePlayed,
        totalCost: totalWithRackets,
        presentPlayers,
        multisportPlayers,
        sport,
        ...(racketCost > 0 ? { racketCost } : {}),
        ...(ownRacketForSession.length > 0 ? { ownRacketPlayers: ownRacketForSession } : {}),
      });
      if (!result.success) { showError(result.error || 'Nie udało się zapisać sesji'); return; }
      playSound(SOUND_TYPES.SUCCESS);
      setSavedSummary({
        date: datePlayed, totalCost: totalWithRackets,
        presentCount: presentPlayers.length,
        payingCount: paying.length,
        multisportCount: multisportPlayers.length,
        perPerson,
        sport,
        presentPlayers: [...presentPlayers],
        multisportPlayers: [...multisportPlayers],
        racketCost,
        ownRacketPlayers: [...ownRacketForSession],
      });
      setTotalCost('');
      setCostTouched(false);
      setRacketCount(0);
      setRacketPrice(RACKET_PRICE);
      setOwnRacketPlayers([]);
      setPresentPlayers([...playerNames]);
      setMultisportPlayers([...(defaultMultiPlayers ?? [])]);
    } finally { setIsSaving(false); }
  }, [isSaving, datePlayed, presentPlayers, multisportPlayers, ownRacketPlayers, playerNames, defaultMultiPlayers, playSound, showError, isDuplicateDate, isPresentValid, isCostValid, totalCostError, parsedTotalCost, sport, isSquash, racketCost, parsedRacketPrice]);

  const handleSummaryClose = useCallback(() => { setSavedSummary(null); setActiveTab(TABS.DASHBOARD); }, [setActiveTab]);

  const isDisabled = isSaving || !isPresentValid || !isCostValid || isDuplicateDate;

  return (
    <>
      <SessionSummaryModal summary={savedSummary} onClose={handleSummaryClose} tokens={tokens} />

      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', animation: 'slide-in-up 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                {isSquash ? 'zapisz dzisiejszą grę squasha' : 'zapisz dzisiejszą grę ping-ponga'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSession} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Sport */}
            <div>
              <FieldLabel>Sport</FieldLabel>
              <SportSelector value={sport} onChange={(s) => { setSport(s); setTotalCost(''); setRacketCount(0); setRacketPrice(RACKET_PRICE); setOwnRacketPlayers([]); }} />
            </div>

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
                {activeCosts.map(cost => {
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
                      {cost === 0 ? 'FREE' : `${cost} zł`}
                    </button>
                  );
                })}
              </div>
              <input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)}
                onBlur={() => setCostTouched(true)}
                placeholder="lub wpisz ręcznie..."
                className="cyber-input"
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.85rem', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
                required
              />
              {costTouched && !isCostValid && (
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--co-rose)', marginTop: 8 }}>
                  ⚠ {totalCostError}
                </p>
              )}
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
              {!isPresentValid && (
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--co-rose)', marginTop: 10, textAlign: 'center' }}>
                  ⚠ Wybierz przynajmniej jednego gracza
                </p>
              )}
            </div>

            {/* Multisport */}
            {presentPlayers.length > 0 && (
              <div style={{ padding: '16px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.18em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
                  <Zap size={13} style={{ color: 'var(--co-green)' }} />
                  {isSquash ? 'Kto miał Multisport? (zniżka -15 zł)' : 'Kto miał Multisport? (płaci 0 zł)'}
                  {multisportPlayers.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-green)' }}>
                      ⚡{multisportPlayers.length}
                    </span>
                  )}
                </p>
                <PlayerToggleGrid names={presentPlayers} selected={multisportPlayers} onToggle={toggleMulti} accent="green" />
              </div>
            )}

            {/* Own racket players — squash only */}
            {isSquash && presentPlayers.length > 0 && (
              <div style={{ padding: '16px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.18em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
                  🎾 Własna rakietka
                  {ownRacketPresentCount > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-amber)' }}>
                      {ownRacketPlayers.filter(p => presentPlayers.includes(p)).join(', ')}
                    </span>
                  )}
                </p>
                <PlayerToggleGrid names={presentPlayers} selected={ownRacketPlayers} onToggle={toggleOwnRacket} accent="amber" />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', marginTop: 8 }}>
                  {'>'} Zaznacz graczy którzy przynęśli własną rakietkę — nie płacą za wypożyczenie
                </p>
              </div>
            )}

            {/* Racket count — squash only */}
            {isSquash && (
              <div style={{ padding: '16px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.18em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
                  🎾 Wypożyczone rakiety
                  {effectiveRacketCount > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-cyan)' }}>
                      {effectiveRacketCount} × {parsedRacketPrice} = {racketCost} zł
                    </span>
                  )}
                </p>

                {/* Price per racket */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)', whiteSpace: 'nowrap' }}>
                    Cena / szt.:
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={racketPrice}
                    onChange={e => setRacketPrice(parseFloat(e.target.value) || 0)}
                    className="cyber-input"
                    style={{
                      width: 72, padding: '5px 8px', fontSize: '0.8rem', textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)' }}>zł</span>
                  {parsedRacketPrice !== RACKET_PRICE && (
                    <button
                      type="button"
                      onClick={() => setRacketPrice(RACKET_PRICE)}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)',
                        background: 'transparent', border: '1px solid var(--co-border)', cursor: 'pointer',
                        padding: '3px 8px', clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                      }}
                    >
                      reset ({RACKET_PRICE} zł)
                    </button>
                  )}
                </div>

                {/* Racket count buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: maxRackets + 1 }, (_, i) => i).map(n => {
                    const active = effectiveRacketCount === n;
                    return (
                      <button type="button" key={n}
                        onClick={() => { setRacketCount(n); playSound(SOUND_TYPES.CLICK); }}
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
                        {n === 0 ? '0' : `${n}`}
                      </button>
                    );
                  })}
                </div>
                {effectiveRacketCount > 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', marginTop: 8 }}>
                    {'>'} Koszt {effectiveRacketCount} × {parsedRacketPrice} zł dzielony między graczy bez własnej rakietki
                  </p>
                )}
              </div>
            )}

            {/* Live preview */}
            <LiveCostPreview totalCost={totalCost} presentPlayers={presentPlayers} multisportPlayers={multisportPlayers} sport={sport} racketCost={racketCost} ownRacketPlayers={ownRacketPlayers} />

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
                  {'>'} {isDuplicateDate ? '⚠ Zmień datę — sesja już istnieje' : !isCostValid ? totalCostError : 'Zaznacz co najmniej jednego gracza'}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
