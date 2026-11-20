import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, ChevronDown } from 'lucide-react';
import { computeWeeklyRankingHistory } from '@/utils/rankings';
import { createPlayerColorMap } from '@/constants/colors';
import { FONT, TEXT, CLIP, PANEL } from '@/constants/styles';
import { SectionHeader } from '../common/SharedUI';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { HistoryEntry, PlayerStats, WeeklyRankingEntry } from '@/types/ui';

interface RankingReplayProps {
  players: PlayerStats[];
  history: HistoryEntry[];
}

const ROW_H = 38;
/** Cały sezon trwa mniej więcej tyle, niezależnie od liczby tygodni… */
const TARGET_TOTAL_MS = 16000;
/** …ale jeden tydzień nigdy nie jest szybszy/wolniejszy niż te granice. */
const MIN_STEP_MS = 280;
const MAX_STEP_MS = 900;

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

function monthLabel(date: string): string {
  const [y, m] = date.split('-');
  return `${m}/${y}`;
}

function dayLabel(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface RowState {
  name: string;
  y: number;
  pct: number;
  opacity: number;
  place: number;
}

/**
 * Stan wierszy dla ciągłego czasu `t` (0..frames-1): między tygodniem
 * floor(t) a ceil(t) interpolujemy procent i pozycję. Pozycja idzie po
 * smoothstep, żeby wyprzedzanie wyglądało jak ruch, a nie przesuwanie suwaka.
 */
function rowsAt(frames: WeeklyRankingEntry[], t: number, names: string[]): RowState[] {
  const last = frames.length - 1;
  const clamped = Math.min(Math.max(t, 0), last);
  const i = Math.floor(clamped);
  const j = Math.min(i + 1, last);
  const f = clamped - i;
  const a = frames[i].rankings;
  const b = frames[j].rankings;
  const posF = smoothstep(f);

  return names.flatMap(name => {
    const ia = a.findIndex(r => r.name === name);
    const ib = b.findIndex(r => r.name === name);
    if (ia < 0 && ib < 0) return [];
    const ra = ia >= 0 ? a[ia] : null;
    const rb = ib >= 0 ? b[ib] : null;
    // Gracz, który dopiero dołącza, wjeżdża od dołu tabeli i od 0%.
    const slotA = ia >= 0 ? ia : a.length;
    const slotB = ib >= 0 ? ib : b.length;
    return [{
      name,
      y: lerp(slotA, slotB, posF) * ROW_H,
      pct: lerp(ra?.pct ?? 0, rb?.pct ?? 0, f),
      opacity: lerp(ra ? 1 : 0, rb ? 1 : 0, f),
      place: (f < 0.5 ? ra : rb)?.place ?? (ra ?? rb)!.place,
    }];
  });
}

// ─── Replay sezonu ────────────────────────────────────────────────
// Odtwarza ranking tydzień po tygodniu. Klatki liczy computeWeeklyRankingHistory,
// a komponent płynnie przechodzi między nimi w requestAnimationFrame.
export default function RankingReplay({ players, history }: RankingReplayProps) {
  const reducedMotion = useReducedMotion();
  const frames = useMemo(() => computeWeeklyRankingHistory(players, history), [players, history]);
  const colorMap = useMemo(() => createPlayerColorMap(players?.map(p => p.name) ?? []), [players]);
  const names = useMemo(
    () => [...new Set(frames.flatMap(f => f.rankings.map(r => r.name)))].sort((a, b) => a.localeCompare(b, 'pl')),
    [frames],
  );
  const maxRows = useMemo(() => Math.max(0, ...frames.map(f => f.rankings.length)), [frames]);

  const last = frames.length - 1;
  const stepMs = Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, TARGET_TOTAL_MS / Math.max(1, last)));

  const [open, setOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  // Domyślnie pokazujemy stan końcowy (aktualny ranking); Play odtwarza od początku.
  const [t, setT] = useState(Math.max(0, last));
  // Pętla rAF czyta aktualny czas z refa; synchronizujemy go po renderze, nie w trakcie.
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  // Zmiana zakresu danych (np. inny sezon) ustawia replay na koniec nowego zakresu.
  useEffect(() => { setT(Math.max(0, frames.length - 1)); setPlaying(false); }, [frames]);

  useEffect(() => {
    if (!playing) return undefined;

    if (reducedMotion) {
      // Bez animacji: skok co tydzień.
      const id = window.setInterval(() => {
        const next = Math.floor(tRef.current) + 1;
        tRef.current = Math.min(next, last);
        if (next >= last) { setT(last); setPlaying(false); } else setT(next);
      }, stepMs);
      return () => window.clearInterval(id);
    }

    let raf = 0;
    let prev: number | null = null;
    const tick = (now: number) => {
      // Ograniczamy dt, żeby po powrocie do karty nie przeskoczyć pół sezonu.
      const dt = prev === null ? 0 : Math.min(64, now - prev);
      prev = now;
      const next = tRef.current + dt / stepMs;
      tRef.current = Math.min(next, last);
      if (next >= last) { setT(last); setPlaying(false); return; }
      setT(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, last, stepMs, reducedMotion]);

  if (frames.length < 2) return null;

  const rows = rowsAt(frames, t, names);
  const nearest = frames[Math.min(last, Math.round(t))];
  const leader = nearest.rankings.find(r => r.place === 1);
  const atEnd = t >= last;

  const togglePlay = () => {
    if (!playing && atEnd) setT(0);
    setPlaying(p => !p);
  };

  return (
    <div style={PANEL.cyberCut}>
      <SectionHeader icon={Play} title="Replay sezonu" sub="ranking tydzień po tygodniu" />
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setPlaying(false); }}
        aria-expanded={open}
        className="cyber-button-outline"
        style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '10px 20px', marginBottom: open ? 14 : 0 }}
      >
        <ChevronDown size={14} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        {open ? 'Zwiń replay' : 'Pokaż replay'}
      </button>

      {open && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="replay-month" style={{ ...FONT.tech(TEXT.h2), color: 'var(--co-cyan)' }}>
                {monthLabel(nearest.date)}
              </span>
              <span className="replay-day" style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: 'normal' }}>
                {dayLabel(nearest.date)} · tydz. {Math.round(t) + 1}/{frames.length}
              </span>
            </span>
            {leader && (
              <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: 'normal', textAlign: 'right' }}>
                lider: {leader.name}
              </span>
            )}
          </div>

          <div
            role="img"
            aria-label={`Ranking po ${dayLabel(nearest.date)} ${nearest.date.slice(0, 4)}: ${nearest.rankings.map(r => `${r.place}. ${r.name} ${r.pct}%`).join(', ')}`}
            style={{
              position: 'relative', height: maxRows * ROW_H,
              background: 'var(--co-tint)', border: '1px solid var(--co-border)',
              clipPath: CLIP.smallCard, overflow: 'hidden',
            }}
          >
            {/* Remisy dzielą miejsce (#1, #1), więc pozycję w pionie bierzemy z kolejności
                na liście, a numer miejsca tylko wyświetlamy. Klucz = imię, żeby wiersz
                płynął między klatkami zamiast się odtwarzać. */}
            {rows.map(r => {
              const col = colorMap.get(r.name)?.border ?? 'var(--co-cyan)';
              return (
                <div
                  key={r.name}
                  className="replay-row"
                  style={{
                    position: 'absolute', left: 0, right: 0, top: 0, height: ROW_H,
                    transform: `translate3d(0, ${r.y.toFixed(2)}px, 0)`,
                    opacity: r.opacity,
                    willChange: playing ? 'transform' : undefined,
                    display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px',
                  }}
                >
                  <span style={{ ...FONT.mono(TEXT.small), width: 24, color: r.place === 1 ? 'var(--co-cyan)' : 'var(--co-dim)' }}>#{r.place}</span>
                  <span style={{ ...FONT.mono(TEXT.small), width: 72, color: 'var(--co-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </span>
                  <span style={{ flex: 1, height: 14, background: 'var(--co-border)', position: 'relative' }}>
                    <span
                      className="replay-bar"
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%',
                        transformOrigin: 'left center',
                        transform: `scaleX(${(Math.min(100, Math.max(0, r.pct)) / 100).toFixed(4)})`,
                        background: col, boxShadow: `0 0 10px ${col}`,
                      }}
                    />
                  </span>
                  <span style={{ ...FONT.mono(TEXT.small), width: 40, textAlign: 'right', color: 'var(--co-text)', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(r.pct)}%
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pauza' : 'Odtwórz'}
              className="cyber-button-outline"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {playing ? <Pause size={16} aria-hidden="true" /> : atEnd ? <RotateCcw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
            <input
              type="range"
              min={0}
              max={last}
              step="any"
              value={t}
              onChange={e => { setPlaying(false); setT(Number(e.target.value)); }}
              aria-label="Tydzień replay"
              aria-valuetext={`${dayLabel(nearest.date)} ${nearest.date.slice(0, 4)}`}
              style={{ flex: 1, minHeight: 44, accentColor: 'var(--co-cyan)' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
