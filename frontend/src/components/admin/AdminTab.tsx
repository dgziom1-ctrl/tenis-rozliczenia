import { useState, useEffect, useCallback, useRef, useId, useMemo } from 'react';
import type { FormEvent } from 'react';
import { CalendarPlus, CheckCircle2, Users, Zap, Hand } from 'lucide-react';
import { PanelHeader, FieldGroup } from '../common/SharedUI';
import { addSession } from '@/lib/firebase';
import { TABS, SOUND_TYPES, SPORT, SPORT_ACCUSATIVE, RACKET_PRICE, hasRacketRental } from '@/constants';
import { CLIP, CONTENT_WIDTH, FONT, TEXT } from '@/constants/styles';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { parseAmount, plural } from '@/utils/format';
import { todayISO } from '@/utils/id';
import { racketPriceError } from '@/utils/costMessages';
import { CURRENT_DISCOUNT_MODEL, getExpectedRefund, getMaxMulti, getMultisportPerCourtHour, getRacketSelection, getTotalWithRackets } from '@/utils/sessionCost';
import type { DiscountModel } from '@/utils/sessionCost';
import { grossError, resolveCourtRefund } from '@/utils/courtRefund';
import { getLastCourtRate, getLastSessionDefaults } from '@/utils/sessions';
import CourtPriceFields from './CourtPriceFields';
import type { Sport } from '@/types/domain';
import type { HistoryEntry, PlayerStats, SessionHighlight, SoundType } from '@/types/ui';

import { detectSessionHighlights } from '@/utils/celebrations';
import SessionSummaryModal from './SessionSummaryModal';
import LiveCostPreview from './LiveCostPreview';
import PlayerToggleGrid from './PlayerToggleGrid';
import MultisportLimitWarning from './MultisportLimitWarning';
import CardRulesHint from './CardRulesHint';
import { cardCounter } from '@/utils/cardLabels';
import ToggleChip from '../common/ToggleChip';
import SportSelector from './SportSelector';
import CyberDateInput from './CyberDateInput';
import FieldLabel from './FieldLabel';

interface AdminTabProps {
  playerNames: string[];
  defaultMultiPlayers: string[];
  /** Gracze z kartą jednorazową (Medicover) — cecha ustawiana w zakładce Gracze. */
  singleScanPlayers?: string[];
  history: HistoryEntry[];
  players: PlayerStats[];
  setActiveTab: (id: string) => void;
  playSound: (type: SoundType) => void;
}

const NO_PLAYERS: string[] = [];

export default function AdminTab({ playerNames, defaultMultiPlayers, singleScanPlayers = NO_PLAYERS, history, players, setActiveTab, playSound }: AdminTabProps) {
  const { showError, showInfo } = useToast();

  const today = todayISO();
  const [sport,             setSport]             = useState<Sport>(SPORT.PINGPONG as Sport);
  const [datePlayed,        setDatePlayed]        = useState(today);
  // Cena kortu z rezerwacji (przed zwrotem). Kwota po zwrocie jest wyliczana.
  const [courtGrossText,    setCourtGrossText]    = useState('');
  // Ręczny zwrot z portfela; `undefined` = automatyczny wg reguł.
  const [refundOverride,    setRefundOverride]    = useState<string | undefined>(undefined);
  const [presentPlayers,    setPresentPlayers]    = useState<string[]>([]);
  const [multisportPlayers, setMultisportPlayers] = useState<string[]>([]);
  const [racketCount,       setRacketCount]       = useState(0);
  const [racketPrice,       setRacketPriceValue]  = useState(RACKET_PRICE);
  // Tekst pola ceny trzymany osobno, żeby dało się je wyczyścić i wpisać przecinek.
  const [racketPriceText,   setRacketPriceText]   = useState(String(RACKET_PRICE));
  const setRacketPrice = (value: number) => { setRacketPriceValue(value); setRacketPriceText(String(value)); };
  const [ownRacketPlayers,  setOwnRacketPlayers]  = useState<string[]>([]);
  const [courtCount,        setCourtCount]        = useState(1);
  const [durationHours,     setDurationHours]     = useState(1);
  const [isSaving,          setIsSaving]          = useState(false);
  const [savedSummary,      setSavedSummary]      = useState<{
    date: string; totalCost: number; sport: Sport;
    presentPlayers: string[]; multisportPlayers: string[];
    racketCost: number; ownRacketPlayers: string[];
    courtCount: number; durationHours: number;
    singleScanPlayers: string[]; discountModel: DiscountModel;
    courtGross: number;
    highlights: SessionHighlight[];
  } | null>(null);
  const [costTouched,       setCostTouched]       = useState(false);

  const racketPriceId    = useId();
  const racketPriceErrorId = useId();

  const withRackets = hasRacketRental(sport);
  const {
    ownRacketPresentCount,
    maxRackets,
    effectiveCount: effectiveRacketCount,
    price: parsedRacketPrice,
    cost: racketCost,
  } = getRacketSelection(sport, presentPlayers, ownRacketPlayers, racketCount, racketPrice);

  // Duplikat to ta sama data i ten sam sport — drugi sport tego dnia jest OK.
  const isDuplicateDate = (history || []).some(s => s.datePlayed === datePlayed && (s.sport ?? SPORT.PINGPONG) === sport);
  const isPresentValid = presentPlayers.length > 0;
  const racketPriceMsg = withRackets ? racketPriceError(racketPriceText) : null;

  // Limit kart obiektu działa na godzinę: korty × limit/sport. Karty odbijają
  // się w każdej godzinie (Medicover tylko w pierwszej), więc za dużo kart
  // jest wtedy, gdy przekraczają limit jednej godziny.
  const perCourtHour = getMultisportPerCourtHour(sport);
  const maxMulti = getMaxMulti(sport, courtCount, durationHours);
  const perHourLimit = courtCount * perCourtHour;
  const multiPresentCount = multisportPlayers.filter(p => presentPlayers.includes(p)).length;
  const multiOverLimit = multiPresentCount > perHourLimit && multiPresentCount > 0;
  // Migawka cechy „Medicover” dla tej sesji — tylko obecni z zaznaczoną kartą.
  const sessionSingleScan = useMemo(
    () => multisportPlayers.filter(p => presentPlayers.includes(p) && singleScanPlayers.includes(p)),
    [multisportPlayers, presentPlayers, singleScanPlayers],
  );

  // Zwrot za karty wg reguł zależy od kart, godzin i kortów — nie od ceny.
  const expectedRefund = useMemo(
    () => getExpectedRefund({ presentPlayers, multisportPlayers, singleScanPlayers: sessionSingleScan, courtCount, durationHours, sport }),
    [presentPlayers, multisportPlayers, sessionSingleScan, courtCount, durationHours, sport],
  );
  const resolution = resolveCourtRefund(courtGrossText, refundOverride, expectedRefund);
  const parsedTotalCost = resolution.net ?? 0;
  const isCostValid = resolution.net !== null;
  const totalCostError = grossError(courtGrossText) ?? resolution.error;
  const lastRatePerUnit = useMemo(() => getLastCourtRate(history, sport), [history, sport]);
  const lastRate = lastRatePerUnit === null ? null : { perUnit: lastRatePerUnit, units: courtCount * durationHours };

  // Nowa sesja startuje składem z ostatniej rozegranej sesji — łącznie z jej
  // kartami MultiSport. Dzięki temu formularz nie proponuje „wszyscy + 3 karty”
  // i nie pokazuje ostrzeżenia o limicie jeszcze przed pierwszym kliknięciem.
  const sessionDefaults = useMemo(
    () => getLastSessionDefaults(history, playerNames),
    [history, playerNames],
  );

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!playerNames?.length) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (sessionDefaults) {
      setPresentPlayers([...sessionDefaults.presentPlayers]);
      setMultisportPlayers([...sessionDefaults.multisportPlayers]);
      setCourtCount(sessionDefaults.courtCount);
      setDurationHours(sessionDefaults.durationHours);
      setSport(sessionDefaults.sport);
      return;
    }
    setPresentPlayers([...playerNames]);
    // Karta gracza = Multisport albo Medicover; obie podpowiadamy od razu.
    setMultisportPlayers([...new Set([...(defaultMultiPlayers ?? []), ...singleScanPlayers])].filter(p => playerNames.includes(p)));
  }, [playerNames, defaultMultiPlayers, singleScanPlayers, sessionDefaults]);

  const togglePresent = useCallback((name: string) => {
    playSound(SOUND_TYPES.CLICK);
    if (presentPlayers.includes(name)) {
      setPresentPlayers(prev => prev.filter(p => p !== name));
      setMultisportPlayers(prev => prev.filter(p => p !== name));
      setOwnRacketPlayers(prev => prev.filter(p => p !== name));
    } else {
      setPresentPlayers(prev => [...prev, name]);
    }
  }, [playSound, presentPlayers]);

  const toggleOwnRacket = useCallback((name: string) => {
    playSound(SOUND_TYPES.CLICK);
    setOwnRacketPlayers(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  }, [playSound]);

  const toggleMulti = useCallback((name: string) => {
    playSound(SOUND_TYPES.CLICK);
    setMultisportPlayers(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  }, [playSound]);

  const handleSaveSession = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!isPresentValid) { showError('Zaznacz co najmniej jednego gracza'); return; }
    if (!isCostValid) { showError(totalCostError || 'Wpisz poprawny koszt sesji'); return; }
    if (racketPriceMsg) { showError(racketPriceMsg); return; }
    if (isDuplicateDate) { showError('Sesja z tą datą i sportem już istnieje'); return; }
    setIsSaving(true);
    const courtAmount = parsedTotalCost;
    const courtGross = resolution.gross ?? courtAmount;
    const totalWithRackets = getTotalWithRackets(courtAmount, racketCost);
    try {
      const ownRacketForSession = withRackets
        ? ownRacketPlayers.filter(p => presentPlayers.includes(p))
        : [];
      const result = await addSession({
        datePlayed,
        totalCost: totalWithRackets,
        presentPlayers,
        multisportPlayers,
        sport,
        courtCount,
        durationHours,
        courtGross,
        ...(racketCost > 0 ? { racketCost } : {}),
        ...(ownRacketForSession.length > 0 ? { ownRacketPlayers: ownRacketForSession } : {}),
        ...(sessionSingleScan.length > 0 ? { singleScanPlayers: sessionSingleScan } : {}),
      });
      if (!result.success) { showError(result.error || 'Nie udało się zapisać sesji'); return; }
      const added = {
        id: 'just-added',
        datePlayed,
        totalCost: totalWithRackets,
        sport,
        costPerPerson: 0,
        costPerPersonMulti: 0,
        presentPlayers: [...presentPlayers],
        multisportPlayers: [...multisportPlayers],
        racketCost: racketCost > 0 ? racketCost : undefined,
        ownRacketPlayers: ownRacketForSession.length > 0 ? ownRacketForSession : undefined,
      };
      const highlights = detectSessionHighlights(players, history, added);
      const hasStreak = highlights.some(h => h.kind === 'streak');
      const hasRankUp = highlights.some(h => h.kind === 'rankup');
      playSound(hasStreak ? SOUND_TYPES.STREAK : hasRankUp ? SOUND_TYPES.RANK1 : SOUND_TYPES.SUCCESS);
      setSavedSummary({
        date: datePlayed, totalCost: totalWithRackets,
        sport,
        presentPlayers: [...presentPlayers],
        multisportPlayers: [...multisportPlayers],
        racketCost,
        ownRacketPlayers: [...ownRacketForSession],
        courtCount,
        durationHours,
        singleScanPlayers: [...sessionSingleScan],
        discountModel: CURRENT_DISCOUNT_MODEL,
        courtGross,
        highlights,
      });
      setCourtGrossText('');
      setRefundOverride(undefined);
      setCostTouched(false);
      setRacketCount(0);
      setRacketPrice(RACKET_PRICE);
      setOwnRacketPlayers([]);
      // Korty, godziny i sport zostają takie jak w zapisanej sesji — to one
      // wyznaczają limit kart, więc nie mogą wracać do 1 przed kolejnym wpisem.
      // Następna sesja dziedziczy też dokładnie tę obsadę, która została zapisana.
      setPresentPlayers([...presentPlayers]);
      setMultisportPlayers(multisportPlayers.filter(p => presentPlayers.includes(p)));
    } finally { setIsSaving(false); }
  }, [isSaving, datePlayed, presentPlayers, multisportPlayers, ownRacketPlayers, playSound, showError, isDuplicateDate, isPresentValid, isCostValid, totalCostError, racketPriceMsg, parsedTotalCost, resolution.gross, sport, withRackets, racketCost, players, history, courtCount, durationHours, sessionSingleScan]);

  const handleSummaryClose = useCallback(() => { setSavedSummary(null); setActiveTab(TABS.DASHBOARD); }, [setActiveTab]);

  const isDisabled = isSaving || !isPresentValid || !isCostValid || isDuplicateDate || racketPriceMsg !== null;

  // Zmiana sportu zachowuje wpisaną kwotę kortu; rakietki czyścimy tylko wtedy,
  // gdy nowy sport ich nie wypożycza — i mówimy o tym użytkownikowi.
  const handleSportChange = (next: Sport) => {
    setSport(next);
    if (hasRacketRental(next)) return;
    const hadRacketData = racketCount > 0 || ownRacketPlayers.length > 0 || racketPrice !== RACKET_PRICE;
    setRacketCount(0);
    setRacketPrice(RACKET_PRICE);
    setOwnRacketPlayers([]);
    if (hadRacketData) showInfo('Zmieniono sport — wyczyszczono ustawienia rakietek');
  };

  return (
    <>
      {/* Montowany dopiero z danymi — inaczej pułapka fokusu i autofokus
          uruchamiałyby się na pustym, jeszcze nieistniejącym oknie. */}
      {savedSummary && <SessionSummaryModal summary={savedSummary} highlights={savedSummary.highlights} onClose={handleSummaryClose} />}

      <div style={{ width: '100%', maxWidth: CONTENT_WIDTH.form, margin: '0 auto', animation: 'slide-in-up 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="cyber-box" style={{ clipPath: CLIP.panel, padding: '20px 20px' }}>

          <PanelHeader
            icon={CalendarPlus}
            title="Dodaj nową sesję"
            sub={`zapisz dzisiejszą grę w ${SPORT_ACCUSATIVE[sport] ?? SPORT_ACCUSATIVE[SPORT.PINGPONG]}`}
          />

          <form onSubmit={handleSaveSession} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Sport */}
            <div>
              <FieldLabel>Sport</FieldLabel>
              <SportSelector value={sport} onChange={handleSportChange} />
            </div>

            {/* Korty + godziny */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Korty / stoły</FieldLabel>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3].map(n => (
                    <ToggleChip key={n} font="mono" active={courtCount === n}
                      ariaLabel={`Liczba kortów: ${n}`}
                      style={{ flex: 1, padding: '8px 4px' }}
                      onClick={() => { setCourtCount(n); playSound(SOUND_TYPES.CLICK); }}>
                      {n}
                    </ToggleChip>
                  ))}
                </div>
                <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 6 }}>
                  Limit odbić: {perHourLimit}/h ({perCourtHour}/kort/h)
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel>Godziny</FieldLabel>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3].map(n => (
                    <ToggleChip key={n} font="mono" active={durationHours === n}
                      ariaLabel={`Czas gry: ${n} h`}
                      style={{ flex: 1, padding: '8px 4px' }}
                      onClick={() => { setDurationHours(n); playSound(SOUND_TYPES.CLICK); }}>
                      {n}h
                    </ToggleChip>
                  ))}
                </div>
                <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 6 }}>
                  {durationHours > 1 ? `${durationHours}h × ` : ''}{perHourLimit}/h = maks. {maxMulti} {plural(maxMulti, 'odbicie', 'odbicia', 'odbić')}
                </p>
              </div>
            </div>

            {/* Date */}
            <div>
              <FieldLabel>Data gry</FieldLabel>
              <CyberDateInput label="Data gry" value={datePlayed} onChange={setDatePlayed} />
              {isDuplicateDate && (
                <p role="alert" style={{ ...FONT.display(TEXT.base), color: 'var(--co-amber)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠ Sesja z tą datą i tym sportem już istnieje
                </p>
              )}
            </div>

            {/* Present players */}
            <FieldGroup
              icon={Users}
              label="Kto grał?"
              counter={`[${presentPlayers.length}/${playerNames?.length || 0}]`}
            >
              <PlayerToggleGrid names={playerNames || []} selected={presentPlayers} onToggle={togglePresent} accent="yellow" />
              {sessionDefaults && (
                <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 8 }}>
                  Skład z ostatniej sesji — zmień, jeśli dziś gra ktoś inny
                </p>
              )}
              {!isPresentValid && (
                <p style={{ ...FONT.display(TEXT.base), color: 'var(--co-rose)', marginTop: 10, textAlign: 'center' }}>
                  ⚠ Wybierz przynajmniej jednego gracza
                </p>
              )}
            </FieldGroup>

            {/* Karty: Multisport i Medicover */}
            {presentPlayers.length > 0 && (
              <FieldGroup
                icon={Zap}
                label="Kto miał kartę?"
                counter={cardCounter(multisportPlayers.length - sessionSingleScan.length, sessionSingleScan.length)}
                counterColor="var(--co-green)"
              >
                <PlayerToggleGrid names={presentPlayers} selected={multisportPlayers} onToggle={toggleMulti} accent="green" medicover={singleScanPlayers} />
                <CardRulesHint />

                {multiOverLimit && <MultisportLimitWarning maxMulti={perHourLimit} cardCount={multiPresentCount} perHour />}
              </FieldGroup>
            )}

            {/* Cena kortu + zwrot za karty → kwota do rozdzielenia */}
            <CourtPriceFields
              grossText={courtGrossText}
              onGrossChange={setCourtGrossText}
              showGrossError={costTouched}
              onGrossBlur={() => setCostTouched(true)}
              overrideText={refundOverride}
              onOverrideChange={setRefundOverride}
              resolution={resolution}
              expectedRefund={expectedRefund}
              lastRate={lastRate}
            />

            {/* Own racket players — tylko sporty z wypożyczalnią */}
            {withRackets && presentPlayers.length > 0 && (
              <FieldGroup
                icon={Hand}
                label="Własna rakietka"
                counter={ownRacketPresentCount > 0 ? ownRacketPlayers.filter(p => presentPlayers.includes(p)).join(', ') : undefined}
                counterColor="var(--co-amber)"
              >
                <PlayerToggleGrid names={presentPlayers} selected={ownRacketPlayers} onToggle={toggleOwnRacket} accent="amber" />
                <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 8 }}>
                  Zaznacz graczy, którzy przynieśli własną rakietkę — nie płacą za wypożyczenie
                </p>
              </FieldGroup>
            )}

            {/* Racket count — tylko sporty z wypożyczalnią */}
            {withRackets && (
              <FieldGroup
                icon={Hand}
                label="Wypożyczone rakiety"
                counter={effectiveRacketCount > 0 ? `${effectiveRacketCount} × ${parsedRacketPrice} = ${racketCost} zł` : undefined}
              >

                {/* Price per racket */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <label htmlFor={racketPriceId} style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', whiteSpace: 'nowrap' }}>
                    Cena / szt.:
                  </label>
                  <input
                    id={racketPriceId}
                    type="text"
                    inputMode="decimal"
                    value={racketPriceText}
                    onChange={e => { setRacketPriceText(e.target.value); setRacketPriceValue(parseAmount(e.target.value) || 0); }}
                    aria-invalid={racketPriceMsg !== null}
                    aria-describedby={racketPriceMsg ? racketPriceErrorId : undefined}
                    className={racketPriceMsg ? 'cyber-input input-error' : 'cyber-input'}
                    style={{
                      width: 78, padding: '8px', textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      clipPath: CLIP.badge,
                    }}
                  />
                  <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>zł</span>
                  {parsedRacketPrice !== RACKET_PRICE && (
                    <button
                      type="button"
                      onClick={() => setRacketPrice(RACKET_PRICE)}
                      style={{
                        ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)',
                        background: 'transparent', border: '1px solid var(--co-border)', cursor: 'pointer',
                        padding: '2px 8px', minHeight: 44, clipPath: CLIP.badge,
                      }}
                    >
                      Przywróć {RACKET_PRICE} zł
                    </button>
                  )}
                </div>
                {racketPriceMsg && (
                  <p id={racketPriceErrorId} role="alert" style={{ ...FONT.display(TEXT.base), color: 'var(--co-rose)', margin: '0 0 10px' }}>
                    ⚠ {racketPriceMsg}
                  </p>
                )}

                {/* Racket count buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Array.from({ length: maxRackets + 1 }, (_, i) => i).map(n => (
                    <ToggleChip key={n} font="mono" active={effectiveRacketCount === n}
                      ariaLabel={`Liczba wypożyczonych rakiet: ${n}`}
                      style={{ flex: 1, minWidth: 44, padding: '8px 4px' }}
                      onClick={() => { setRacketCount(n); playSound(SOUND_TYPES.CLICK); }}>
                      {n}
                    </ToggleChip>
                  ))}
                </div>
                {effectiveRacketCount > 0 && (
                  <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 8 }}>
                    Koszt {effectiveRacketCount} × {parsedRacketPrice} zł dzielony między graczy bez własnej rakietki
                  </p>
                )}
              </FieldGroup>
            )}

            {/* Live preview */}
            <LiveCostPreview totalCost={resolution.net === null ? '' : String(resolution.net)} courtGross={resolution.gross ?? undefined} presentPlayers={presentPlayers} multisportPlayers={multisportPlayers} sport={sport} racketCost={racketCost} ownRacketPlayers={ownRacketPlayers} racketCount={effectiveRacketCount} courtCount={courtCount} durationHours={durationHours} singleScanPlayers={sessionSingleScan} />

            {/* Submit */}
            <div>
              <button type="submit" disabled={isDisabled}
                className={isDisabled ? '' : 'cyber-button-yellow'}
                style={{
                  width: '100%', padding: '14px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: '0.8125rem', letterSpacing: 'normal',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-display)', 
                  ...(isDisabled ? {
                    background: 'var(--co-panel)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
                  } : {}),
                }}>
                {isSaving
                  ? <><InlineSpinner size="sm" /> Zapisuję...</>
                  : <><CheckCircle2 size={16} /> Zapisz sesję</>}
              </button>
              {!isSaving && isDisabled && (
                <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', textAlign: 'center', marginTop: 8 }}>
                  {isDuplicateDate ? '⚠ Zmień datę lub sport — sesja już istnieje' : !isCostValid ? totalCostError : 'Zaznacz co najmniej jednego gracza'}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
