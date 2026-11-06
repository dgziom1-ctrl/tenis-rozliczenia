import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, ChevronDown } from 'lucide-react';
import { computeRankingHistory } from '@/utils/rankings';
import { createPlayerColorMap } from '@/constants/colors';
import { FONT, TEXT, TRACK, CLIP, PANEL } from '@/constants/styles';
import { SectionHeader } from '../common/SharedUI';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { HistoryEntry, PlayerStats } from '@/types/ui';

interface RankingReplayProps {
  players: PlayerStats[];
  history: HistoryEntry[];
}

const ROW_H = 38;
const FRAME_MS = 1200;

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${m}/${y}`;
}

// ─── Replay sezonu ────────────────────────────────────────────────
// Odtwarza ranking miesiąc po miesiącu na danych z computeRankingHistory.
// Niczego nie liczy od nowa: to tylko inny sposób pokazania tych samych klatek.
export default function RankingReplay({ players, history }: RankingReplayProps) {
  const reducedMotion = useReducedMotion();
  const frames = useMemo(() => computeRankingHistory(players, history), [players, history]);
  const colorMap = useMemo(() => createPlayerColorMap(players?.map(p => p.name) ?? []), [players]);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);

  const last = frames.length - 1;

  // Zmiana zakresu danych (np. inny sezon) zaczyna replay od początku.
  useEffect(() => { setIndex(0); setPlaying(false); }, [frames]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setIndex(i => {
        if (i >= last) { setPlaying(false); return i; }
        return i + 1;
      });
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [playing, last]);

  if (frames.length < 2) return null;

  const frame = frames[Math.min(index, last)];
  const rows = frame.rankings;
  const leader = rows.find(r => r.place === 1);

  const togglePlay = () => {
    if (!playing && index >= last) setIndex(0);
    setPlaying(p => !p);
  };

  const transition = reducedMotion ? 'none' : `transform ${FRAME_MS * 0.7}ms cubic-bezier(.2,.8,.2,1)`;
  const barTransition = reducedMotion ? 'none' : `transform ${FRAME_MS * 0.7}ms cubic-bezier(.2,.8,.2,1)`;

  return (
    <div style={PANEL.cyberCut}>
      <SectionHeader icon={Play} title="Replay sezonu" sub="ranking miesiąc po miesiącu" />
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
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="replay-month" style={{ ...FONT.tech(TEXT.h2), color: 'var(--co-cyan)' }}>
              {monthLabel(frame.month)}
            </span>
            {leader && (
              <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: TRACK.tight }}>
                lider: {leader.name}
              </span>
            )}
          </div>

          <div
            role="img"
            aria-label={`Ranking po ${monthLabel(frame.month)}: ${rows.map(r => `${r.place}. ${r.name} ${r.pct}%`).join(', ')}`}
            style={{
              position: 'relative', height: rows.length * ROW_H,
              background: 'var(--co-tint)', border: '1px solid var(--co-border)',
              clipPath: CLIP.smallCard, overflow: 'hidden',
            }}
          >
            {/* Remisy dzielą miejsce (#1, #1), więc pozycję w pionie bierzemy z kolejności
                na liście, a numer miejsca tylko wyświetlamy. Klucz = imię, żeby wiersz
                płynął między klatkami zamiast się odtwarzać. */}
            {[...rows].sort((a, b) => a.name.localeCompare(b.name, 'pl')).map(r => {
              const slot = rows.findIndex(x => x.name === r.name);
              const col = colorMap.get(r.name)?.border ?? 'var(--co-cyan)';
              return (
                <div
                  key={r.name}
                  className="replay-row"
                  style={{
                    position: 'absolute', left: 0, right: 0, top: 0, height: ROW_H,
                    transform: `translateY(${slot * ROW_H}px)`,
                    transition,
                    display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px',
                  }}
                >
                  <span style={{ ...FONT.mono(TEXT.small), width: 20, color: 'var(--co-dim)' }}>#{r.place}</span>
                  <span style={{ ...FONT.mono(TEXT.small), width: 72, color: 'var(--co-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </span>
                  <span style={{ flex: 1, height: 14, background: 'var(--co-border)', position: 'relative' }}>
                    <span
                      className="replay-bar"
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%',
                        transformOrigin: 'left center',
                        transform: `scaleX(${Math.min(100, Math.max(0, r.pct)) / 100})`,
                        background: col, boxShadow: `0 0 10px ${col}`,
                        transition: barTransition,
                      }}
                    />
                  </span>
                  <span style={{ ...FONT.mono(TEXT.small), width: 40, textAlign: 'right', color: 'var(--co-text)' }}>{r.pct}%</span>
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
              {playing ? <Pause size={16} aria-hidden="true" /> : index >= last ? <RotateCcw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
            <input
              type="range"
              min={0}
              max={last}
              value={Math.min(index, last)}
              onChange={e => { setPlaying(false); setIndex(Number(e.target.value)); }}
              aria-label="Miesiąc replay"
              aria-valuetext={monthLabel(frame.month)}
              style={{ flex: 1, minHeight: 44, accentColor: 'var(--co-cyan)' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
