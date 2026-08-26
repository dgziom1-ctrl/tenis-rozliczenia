import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { ChevronLeft } from 'lucide-react';
import Modal from '../common/Modal';
import { CornerBrackets } from '../dashboard/CornerBrackets';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';
import type { WrappedStats } from '@/types/ui';

// ─── Count-up hook ───────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const isFloat = target % 1 !== 0;
    const steps = Math.min(Math.ceil(duration / 16), 80);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = 1 - Math.pow(1 - step / steps, 3);          // easeOutCubic
      const v = progress * target;
      setValue(isFloat ? Math.round(v * 10) / 10 : Math.round(v));
      if (step >= steps) { setValue(target); clearInterval(timer); }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return value;
}

// ─── Month short → full name map (PL) ───────────────────────────
const MONTH_FULL: Record<string, string> = {
  STY: 'STYCZEŃ', LUT: 'LUTY', MAR: 'MARZEC', KWI: 'KWIECIEŃ',
  MAJ: 'MAJ', CZE: 'CZERWIEC', LIP: 'LIPIEC', SIE: 'SIERPIEŃ',
  WRZ: 'WRZESIEŃ', PAŹ: 'PAŹDZIERNIK', LIS: 'LISTOPAD', GRU: 'GRUDZIEŃ',
};

// ─── Shared inline-style helpers ─────────────────────────────────
// Cienkie nakładki na wspólne tokeny — plik miał wcześniej własną, równoległą
// kopię FONT.display/FONT.mono z zaszytym na sztywno krojem i trackingiem.
const display = (size: string, extra?: CSSProperties): CSSProperties => ({
  ...FONT.display(size, TRACK.tight), lineHeight: 1.1, ...extra,
});
const mono = (size: string, extra?: CSSProperties): CSSProperties => ({
  ...FONT.mono(size), ...extra,
});

interface WrappedModalProps {
  stats: WrappedStats;
  onClose: () => void;
}

// ─── WrappedModal ────────────────────────────────────────────────
export default function WrappedModal({ stats, onClose }: WrappedModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Build ordered slide list (skip bestPair slide when null)
  const slideList = useMemo(() => {
    const base = [0, 1, 2];
    if (stats.bestPair) base.push(3);
    base.push(4, 5);
    return base;
  }, [stats.bestPair]);
  const totalSlides = slideList.length;
  const activeSlideId = slideList[currentSlide] ?? 0;

  const advance = useCallback(() => {
    if (currentSlide >= totalSlides - 1) { onClose(); return; }
    setCurrentSlide(s => s + 1);
  }, [currentSlide, totalSlides, onClose]);

  const goBack = useCallback(() => {
    setCurrentSlide(s => Math.max(0, s - 1));
  }, []);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowRight' || e.key === ' ') { advance(); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { goBack(); e.preventDefault(); }
  }, [advance, goBack, onClose]);

  // Count-up values
  const cSessions  = useCountUp(stats.totalSessions,   1400, activeSlideId === 1);
  const cPP        = useCountUp(stats.pingpongSessions, 1200, activeSlideId === 1);
  const cSQ        = useCountUp(stats.squashSessions,   1200, activeSlideId === 1);
  const cBM        = useCountUp(stats.badmintonSessions, 1200, activeSlideId === 1);
  const cPD        = useCountUp(stats.padelSessions,    1200, activeSlideId === 1);
  const cAvg       = useCountUp(stats.avgPlayersPerSession, 1000, activeSlideId === 1);
  const cBusiest   = useCountUp(stats.busiestMonthCount, 1000, activeSlideId === 2);
  const cPairCount = useCountUp(stats.bestPairCount,    1200, activeSlideId === 3);

  // ── Slide content ──────────────────────────────────────────────
  const slideContent = (id: number) => {
    switch (id) {
      // ─ Slide 0: Intro ─────────────────────────────────────────
      case 0:
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              ...display('clamp(5rem, 18vw, 12rem)'),
              color: 'var(--co-cyan)',
              animation: 'wm-glow 3s ease-in-out infinite',
              marginBottom: 16,
            }}>
              {stats.year}
            </div>
            <div style={{
              ...display('clamp(1.2rem, 4vw, 2rem)', { letterSpacing: '0.18em' }),
              color: 'var(--co-text-hi)',
              marginBottom: 40,
            }}>
              PODSUMOWANIE ROKU
            </div>
            <div style={{
              ...mono('clamp(0.6rem, 2vw, 0.8rem)'),
              color: 'var(--co-dim)',
              animation: 'wm-pulse 2s ease-in-out infinite',
            }}>
              Dotknij aby kontynuować →
            </div>
          </div>
        );

      // ─ Slide 1: Group Overview ─────────────────────────────────
      case 1:
        return (
          <div style={{ textAlign: 'center', maxWidth: 500, width: '100%' }}>
            <div style={{
              ...mono('clamp(0.6rem, 2vw, 0.85rem)', { letterSpacing: '0.18em' }),
              color: 'var(--co-dim)', marginBottom: 12,
            }}>
              RAZEM ZAGRALIŚMY
            </div>
            <div style={{
              ...display('clamp(4rem, 14vw, 8rem)'),
              color: 'var(--co-cyan)',
              textShadow: 'var(--glow-cyan-lg)',
            }}>
              {cSessions}
            </div>
            <div style={{
              ...display('clamp(1rem, 3.5vw, 1.6rem)', { letterSpacing: '0.1em' }),
              color: 'var(--co-text-hi)', marginBottom: 32,
            }}>
              SESJI W {stats.year} ROKU
            </div>

            {/* Sport breakdown */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 6vw, 48px)', marginBottom: 28 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', marginBottom: 4 }}>🏓</div>
                <div style={{ ...display('clamp(1.2rem, 4vw, 2rem)'), color: 'var(--co-cyan)' }}>{cPP}</div>
                <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: '0.1em' }}>PING PONG</div>
              </div>
              {stats.squashSessions > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', marginBottom: 4 }}>🎾</div>
                  <div style={{ ...display('clamp(1.2rem, 4vw, 2rem)'), color: 'var(--co-green)' }}>{cSQ}</div>
                  <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: '0.1em' }}>SQUASH</div>
                </div>
              )}
              {stats.badmintonSessions > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', marginBottom: 4 }}>🏸</div>
                  <div style={{ ...display('clamp(1.2rem, 4vw, 2rem)'), color: 'var(--co-pink)' }}>{cBM}</div>
                  <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: '0.1em' }}>BADMINTON</div>
                </div>
              )}
              {stats.padelSessions > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', marginBottom: 4 }}>🥎</div>
                  <div style={{ ...display('clamp(1.2rem, 4vw, 2rem)'), color: 'var(--co-amber)' }}>{cPD}</div>
                  <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: '0.1em' }}>PADEL</div>
                </div>
              )}
            </div>

            {/* Avg players */}
            <div style={{ ...mono('clamp(0.65rem, 2vw, 0.85rem)'), color: 'var(--co-text)' }}>
              <span style={{ color: 'var(--co-cyan)', fontWeight: 'bold' }}>{cAvg}</span> graczy na sesję
            </div>
          </div>
        );

      // ─ Slide 2: Busiest Month ──────────────────────────────────
      case 2:
        return (
          <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
            {/* Busiest month */}
            <div style={{
              ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: '0.18em' }),
              color: 'var(--co-dim)', marginBottom: 14,
            }}>
              NAJAKTYWNIEJSZY MIESIĄC
            </div>
            <div style={{
              ...display('clamp(1.8rem, 7vw, 3.5rem)'),
              color: 'var(--co-cyan)',
              textShadow: 'var(--glow-cyan-md)',
              marginBottom: 8,
            }}>
              {(stats.busiestMonthName && MONTH_FULL[stats.busiestMonthName]) || stats.busiestMonthName}
            </div>
            <div style={{
              ...display('clamp(1.2rem, 4vw, 2rem)', { letterSpacing: '0.1em' }),
              color: 'var(--co-text-hi)',
            }}>
              {cBusiest} SESJI
            </div>
          </div>
        );

      // ─ Slide 3: Best Pair ──────────────────────────────────────
      case 3:
        return (
          <div style={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>
            <div style={{
              ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: '0.18em' }),
              color: 'var(--co-dim)', marginBottom: 28,
            }}>
              NAJLEPSZA PARA
            </div>

            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 'clamp(12px, 4vw, 28px)', marginBottom: 28,
            }}>
              {stats.bestPair?.map((name, i) => (
                <div key={name} style={{
                  ...display('clamp(1.6rem, 6vw, 3rem)'),
                  color: i === 0 ? 'var(--co-cyan)' : 'var(--co-green)',
                  textShadow: i === 0 ? 'var(--glow-cyan-md)' : 'var(--glow-green-md)',
                  animation: `wm-float 3s ease-in-out ${i * 0.5}s infinite`,
                }}>
                  {name}
                </div>
              ))}
            </div>

            <div style={{
              ...display('clamp(1.2rem, 4vw, 2rem)'),
              color: 'var(--co-text-hi)', marginBottom: 12,
            }}>
              {cPairCount} wspólnych sesji
            </div>

            <div style={{
              fontSize: 'clamp(1.4rem, 5vw, 2rem)',
              marginTop: 24,
            }}>
              🤝
            </div>
            <div style={{
              ...mono('clamp(0.6rem, 2vw, 0.8rem)'),
              color: 'var(--co-dim)', marginTop: 8,
            }}>
              Nie do rozdzielenia
            </div>
          </div>
        );

      // ─ Slide 4: Rankings ───────────────────────────────────────
      case 4: {
        const top3 = stats.players.slice(0, 3);
        const rest = stats.players.slice(3);
        const medals = ['🥇', '🥈', '🥉'];
        const medalColors = ['var(--co-cyan)', 'var(--co-text)', 'var(--co-green)'];
        // Osobne tokeny, nie `medalColors` z dopiskiem krycia: te wartości są
        // już `var(...)`, więc `${medalColors[i]}08` dawało `var(--co-cyan)08` —
        // po podstawieniu zmiennej deklaracja jest nieprawidłowa i karty
        // podium zostawały bez wypełnienia. Malejąca moc washu = malejące miejsce.
        const medalTints = ['var(--co-tint-hi)', 'var(--co-tint)', 'var(--co-tint-green)'];

        return (
          <div style={{ textAlign: 'center', maxWidth: 500, width: '100%' }}>
            <div style={{
              ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: '0.18em' }),
              color: 'var(--co-dim)', marginBottom: 24,
            }}>
              RANKING {stats.year}
            </div>

            {/* Podium */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(8px, 3vw, 20px)', marginBottom: 28 }}>
              {top3.map((p, i) => (
                <div key={p.name} style={{
                  flex: 1, maxWidth: 140, padding: 'clamp(10px, 3vw, 18px) 8px',
                  background: medalTints[i],
                  border: `1px solid ${i === 0 ? 'var(--co-tint-line)' : i === 2 ? 'var(--co-green)' : 'var(--co-border)'}`,
                  clipPath: CLIP.card,
                  animation: `wm-slideUp 0.6s ease-out ${0.15 * i}s both`,
                }}>
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', marginBottom: 6 }}>{medals[i]}</div>
                  <div style={{
                    ...display('clamp(0.9rem, 3vw, 1.4rem)'),
                    color: medalColors[i],
                    textShadow: i === 0 ? 'var(--glow-cyan-sm)' : 'none',
                    marginBottom: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ ...mono('clamp(0.65rem, 1.8vw, 0.75rem)'), color: 'var(--co-text)' }}>
                    {p.percentage}%
                  </div>
                  <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', marginTop: 2 }}>
                    {p.attended} sesji
                  </div>
                </div>
              ))}
            </div>

            {/* Rest of players */}
            {rest.length > 0 && (
              <div style={{
                textAlign: 'left', padding: '10px 14px',
                background: 'var(--co-surface-2)',
                border: '1px solid var(--co-border)',
                maxHeight: 180, overflowY: 'auto',
              }}>
                {rest.map((p) => (
                  <div key={p.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 0',
                    borderBottom: '1px solid var(--co-separator)',
                  }}>
                    <span style={{ ...mono(TEXT.small), color: 'var(--co-dim)', width: 24 }}>
                      #{p.place}
                    </span>
                    <span style={{ ...mono('clamp(0.6rem, 2vw, 0.8rem)'), color: 'var(--co-text)', flex: 1 }}>
                      {p.name}
                    </span>
                    <span style={{ ...mono(TEXT.small), color: 'var(--co-cyan)' }}>
                      {p.percentage}%
                    </span>
                    <span style={{ ...mono(TEXT.small), color: 'var(--co-dim)', width: 50, textAlign: 'right' }}>
                      {p.attended} sesji
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      // ─ Slide 5: Champion ───────────────────────────────────────
      case 5: {
        const ch = stats.champion;
        if (!ch) return null;
        return (
          <div style={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>
            <div style={{
              ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: '0.18em' }),
              color: 'var(--co-dim)', marginBottom: 8,
            }}>
              MISTRZ ROKU {stats.year}
            </div>

            <div style={{ fontSize: 'clamp(2.5rem, 10vw, 5rem)', marginBottom: 8, animation: 'wm-float 3s ease-in-out infinite' }}>
              🏆
            </div>

            <div style={{
              ...display('clamp(2.2rem, 9vw, 5rem)'),
              color: 'var(--co-cyan)',
              animation: 'wm-glow 2.5s ease-in-out infinite',
              marginBottom: 24,
            }}>
              {ch.name}
            </div>

            {/* Stats grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10, marginBottom: 28,
            }}>
              {[
                { label: 'SESJE', value: `${ch.attended}`, color: 'var(--co-cyan)' },
                { label: 'FREKWENCJA', value: `${ch.percentage}%`, color: 'var(--co-green)' },
                { label: 'NAJDŁUŻSZA SERIA', value: `${ch.longestStreak}`, color: 'var(--co-pink)' },
                { label: 'SESJE MULTISPORT', value: `${ch.multiSessions}`, color: 'var(--co-text-hi)' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: 'clamp(8px, 2vw, 14px)',
                  background: 'var(--co-surface-2)',
                  border: '1px solid var(--co-border)',
                  clipPath: CLIP.card,
                }}>
                  <div style={{ ...display('clamp(1rem, 3.5vw, 1.6rem)'), color: s.color }}>
                    {s.value}
                  </div>
                  <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', letterSpacing: '0.1em', marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Close button — wspólna klasa zamiast ręcznych handlerów hover,
                które na dotyku zostawały wciśnięte do kolejnego tapnięcia. */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="cyber-button-outline"
              style={{ padding: 'clamp(12px, 2.5vw, 16px) clamp(28px, 8vw, 56px)', minHeight: 44 }}
            >
              ZAMKNIJ
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    // Pełny ekran z własnym układem, więc z prymitywu bierze samą nakładkę.
    // Klik w tło przewija slajd, a nie zamyka — dlatego `closeOnBackdrop` off.
    <Modal onClose={onClose} bare closeOnBackdrop={false} ariaLabel={`Podsumowanie roku ${stats.year}`}>
      <div
        onClick={advance}
        onKeyDown={handleKey}
        role="presentation"
        style={{
          position: 'absolute', inset: 0,
          background: 'var(--co-void)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24,
          cursor: 'pointer',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
      {/* Scan-line overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, var(--co-tint) 2px, var(--co-tint) 4px)',
      }} />

      {/* Corner decorations — wspólny komponent zamiast 20-linijkowej kopii */}
      <CornerBrackets color="var(--co-tint-line)" size={30} inset={20} />

      {/* Slide content */}
      <div
        key={currentSlide}
        style={{
          position: 'relative', zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', maxWidth: 600,
          animation: 'wm-fadeScale 0.55s cubic-bezier(0.22,1,0.36,1) forwards',
          padding: '0 16px',
        }}
      >
        {slideContent(activeSlideId)}
      </div>

      {/* Progress dots — czytelne jako pasek postępu, nie jako przyciski */}
      <div role="progressbar" aria-valuenow={currentSlide + 1} aria-valuemin={1} aria-valuemax={totalSlides}
        aria-label="Postęp podsumowania"
        style={{
          position: 'absolute', bottom: 'clamp(20px, 5vh, 40px)',
          display: 'flex', gap: 8, zIndex: 4,
        }}>
        {slideList.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentSlide ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === currentSlide
                ? 'var(--co-cyan)'
                : i < currentSlide
                  ? 'var(--co-tint-line)'
                  : 'var(--co-dot-empty)',
              boxShadow: i === currentSlide ? 'var(--glow-box-cyan)' : 'none',
              // Wskaźnik slajdu przełącza się przy każdej zmianie, więc 0.3s
              // było odczuwalnie ospałe przy 0.15–0.2s w reszcie interfejsu.
              transition: 'width 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div style={{
        position: 'absolute', top: 20, right: 24,
        ...mono(TEXT.small),
        color: 'var(--co-dim)', letterSpacing: TRACK.normal,
        zIndex: 4,
      }}>
        {currentSlide + 1}/{totalSlides}
      </div>

      {/* Cofnięcie slajdu. Wcześniej jedynym sposobem była strzałka w lewo na
          klawiaturze — a to okno otwiera się głównie na telefonie, gdzie
          przypadkowe tapnięcie bezpowrotnie przeskakiwało slajd. */}
      {currentSlide > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goBack(); }}
          aria-label="Poprzedni slajd"
          className="icon-btn"
          style={{
            position: 'absolute', bottom: 'clamp(16px, 4vh, 32px)', left: 24, zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            minHeight: 44, padding: '10px 14px',
            background: 'transparent', border: '1px solid var(--co-border)',
            color: 'var(--co-dim)', cursor: 'pointer',
            clipPath: CLIP.badge,
            ...display(TEXT.small),
          }}
        >
          <ChevronLeft size={16} aria-hidden="true" /> Wstecz
        </button>
      )}
      </div>
    </Modal>
  );
}
