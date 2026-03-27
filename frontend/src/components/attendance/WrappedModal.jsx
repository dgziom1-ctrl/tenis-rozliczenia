import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Count-up hook ───────────────────────────────────────────────
function useCountUp(target, duration = 1200, active = false) {
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
const MONTH_FULL = {
  STY: 'STYCZEŃ', LUT: 'LUTY', MAR: 'MARZEC', KWI: 'KWIECIEŃ',
  MAJ: 'MAJ', CZE: 'CZERWIEC', LIP: 'LIPIEC', SIE: 'SIERPIEŃ',
  WRZ: 'WRZESIEŃ', PAŹ: 'PAŹDZIERNIK', LIS: 'LISTOPAD', GRU: 'GRUDZIEŃ',
};

// ─── Keyframe CSS (injected once) ────────────────────────────────
const STYLE_ID = 'wrapped-modal-keyframes';
const KEYFRAMES = `
@keyframes wm-fadeScale{0%{opacity:0;transform:scale(.88) translateY(24px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes wm-glow{0%,100%{text-shadow:0 0 10px currentColor,0 0 30px currentColor}50%{text-shadow:0 0 20px currentColor,0 0 60px currentColor,0 0 90px currentColor}}
@keyframes wm-scanline{0%{top:-2px;opacity:.7}100%{top:100%;opacity:0}}
@keyframes wm-pulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes wm-slideUp{0%{opacity:0;transform:translateY(40px)}100%{opacity:1;transform:translateY(0)}}
@keyframes wm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
`;

function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
}

// ─── Shared inline-style helpers ─────────────────────────────────
const display = (size, extra) => ({
  fontFamily: 'var(--font-display)', fontSize: size,
  letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.1, ...extra,
});
const mono = (size, extra) => ({
  fontFamily: 'var(--font-mono)', fontSize: size, ...extra,
});

// ─── WrappedModal ────────────────────────────────────────────────
export default function WrappedModal({ stats, onClose }) {
  const overlayRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [entering, setEntering] = useState(true);

  // Build ordered slide list (skip bestPair slide when null)
  const slideList = useMemo(() => {
    const base = [0, 1, 2];
    if (stats.bestPair) base.push(3);
    base.push(4, 5);
    return base;
  }, [stats.bestPair]);
  const totalSlides = slideList.length;
  const activeSlideId = slideList[currentSlide] ?? 0;

  // Inject keyframes & focus
  useEffect(() => { injectKeyframes(); overlayRef.current?.focus(); }, []);

  // Re-trigger entrance animation on slide change
  useEffect(() => {
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 600);
    return () => clearTimeout(t);
  }, [currentSlide]);

  const advance = useCallback(() => {
    if (currentSlide >= totalSlides - 1) { onClose(); return; }
    setCurrentSlide(s => s + 1);
  }, [currentSlide, totalSlides, onClose]);

  const goBack = useCallback(() => {
    setCurrentSlide(s => Math.max(0, s - 1));
  }, []);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowRight' || e.key === ' ') { advance(); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { goBack(); e.preventDefault(); }
  }, [advance, goBack, onClose]);

  // Count-up values
  const cSessions  = useCountUp(stats.totalSessions,   1400, activeSlideId === 1);
  const cCost      = useCountUp(stats.totalCost,        1800, activeSlideId === 1);
  const cPP        = useCountUp(stats.pingpongSessions, 1200, activeSlideId === 1);
  const cSQ        = useCountUp(stats.squashSessions,   1200, activeSlideId === 1);
  const cAvg       = useCountUp(stats.avgPlayersPerSession, 1000, activeSlideId === 1);
  const cBusiest   = useCountUp(stats.busiestMonthCount, 1000, activeSlideId === 2);
  const cPairCount = useCountUp(stats.bestPairCount,    1200, activeSlideId === 3);

  // ── Slide content ──────────────────────────────────────────────
  const slideContent = (id) => {
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
              textShadow: '0 0 20px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.3)',
            }}>
              {cSessions}
            </div>
            <div style={{
              ...display('clamp(1rem, 3.5vw, 1.6rem)', { letterSpacing: '0.14em' }),
              color: 'var(--co-text-hi)', marginBottom: 32,
            }}>
              SESJI W {stats.year} ROKU
            </div>

            {/* Sport breakdown */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 6vw, 48px)', marginBottom: 28 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', marginBottom: 4 }}>🏓</div>
                <div style={{ ...display('clamp(1.2rem, 4vw, 2rem)'), color: 'var(--co-cyan)' }}>{cPP}</div>
                <div style={{ ...mono('clamp(0.65rem, 1.5vw, 0.65rem)'), color: 'var(--co-dim)', letterSpacing: '0.1em' }}>PING PONG</div>
              </div>
              {stats.squashSessions > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', marginBottom: 4 }}>🏸</div>
                  <div style={{ ...display('clamp(1.2rem, 4vw, 2rem)'), color: 'var(--co-green)' }}>{cSQ}</div>
                  <div style={{ ...mono('clamp(0.65rem, 1.5vw, 0.65rem)'), color: 'var(--co-dim)', letterSpacing: '0.1em' }}>SQUASH</div>
                </div>
              )}
            </div>

            {/* Total cost */}
            <div style={{
              padding: '14px 20px', marginBottom: 14,
              background: 'rgba(0,229,255,0.04)',
              border: '1px solid rgba(0,229,255,0.15)',
              clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
            }}>
              <div style={{ ...mono('clamp(0.65rem, 1.5vw, 0.65rem)'), color: 'var(--co-dim)', letterSpacing: '0.12em', marginBottom: 4 }}>
                WYDALIŚMY
              </div>
              <div style={{ ...display('clamp(1.4rem, 5vw, 2.2rem)'), color: 'var(--co-green)' }}>
                {cCost.toFixed ? cCost.toFixed(2) : cCost} ZŁ
              </div>
            </div>

            {/* Avg players */}
            <div style={{ ...mono('clamp(0.65rem, 2vw, 0.85rem)'), color: 'var(--co-text)' }}>
              <span style={{ color: 'var(--co-cyan)', fontWeight: 'bold' }}>{cAvg}</span> graczy na sesję
            </div>
          </div>
        );

      // ─ Slide 2: Busiest Month + Most Expensive ─────────────────
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
              textShadow: '0 0 16px rgba(0,229,255,0.5)',
              marginBottom: 8,
            }}>
              {MONTH_FULL[stats.busiestMonthName] || stats.busiestMonthName}
            </div>
            <div style={{
              ...display('clamp(1.2rem, 4vw, 2rem)', { letterSpacing: '0.1em' }),
              color: 'var(--co-text-hi)', marginBottom: 40,
            }}>
              {cBusiest} SESJI
            </div>

            {/* Divider */}
            <div style={{
              height: 1, margin: '0 auto 36px',
              width: '60%',
              background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)',
            }} />

            {/* Most expensive session */}
            {stats.mostExpensiveSession && (
              <>
                <div style={{
                  ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: '0.18em' }),
                  color: 'var(--co-dim)', marginBottom: 16,
                }}>
                  NAJDROŻSZA SESJA
                </div>
                <div style={{
                  padding: '18px 24px',
                  background: 'rgba(255,0,255,0.04)',
                  border: '1px solid rgba(255,0,255,0.2)',
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                }}>
                  <div style={{ ...mono('clamp(0.7rem, 2.5vw, 0.95rem)'), color: 'var(--co-text)', marginBottom: 8 }}>
                    📅 {stats.mostExpensiveSession.date}
                  </div>
                  <div style={{ ...display('clamp(1.4rem, 5vw, 2.4rem)'), color: 'var(--co-pink)', marginBottom: 6 }}>
                    {stats.mostExpensiveSession.cost?.toFixed(2)} ZŁ
                  </div>
                  <div style={{ ...mono('clamp(0.65rem, 1.8vw, 0.7rem)'), color: 'var(--co-dim)' }}>
                    {stats.mostExpensiveSession.players} graczy
                  </div>
                </div>
              </>
            )}
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
                  textShadow: i === 0
                    ? '0 0 16px rgba(0,229,255,0.5), 0 0 40px rgba(0,229,255,0.2)'
                    : '0 0 16px rgba(0,255,136,0.5), 0 0 40px rgba(0,255,136,0.2)',
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
                  background: `${medalColors[i]}08`,
                  border: `1px solid ${i === 0 ? 'rgba(0,229,255,0.3)' : i === 2 ? 'rgba(0,255,136,0.2)' : 'rgba(208,232,245,0.12)'}`,
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                  animation: `wm-slideUp 0.6s ease-out ${0.15 * i}s both`,
                }}>
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', marginBottom: 6 }}>{medals[i]}</div>
                  <div style={{
                    ...display('clamp(0.9rem, 3vw, 1.4rem)'),
                    color: medalColors[i],
                    textShadow: i === 0 ? '0 0 8px rgba(0,229,255,0.4)' : 'none',
                    marginBottom: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ ...mono('clamp(0.65rem, 1.8vw, 0.75rem)'), color: 'var(--co-text)' }}>
                    {p.percentage}%
                  </div>
                  <div style={{ ...mono('clamp(0.65rem, 1.4vw, 0.65rem)'), color: 'var(--co-dim)', marginTop: 2 }}>
                    {p.attended} sesji
                  </div>
                </div>
              ))}
            </div>

            {/* Rest of players */}
            {rest.length > 0 && (
              <div style={{
                textAlign: 'left', padding: '10px 14px',
                background: 'var(--co-separator)',
                border: '1px solid var(--co-separator)',
                maxHeight: 180, overflowY: 'auto',
              }}>
                {rest.map((p) => (
                  <div key={p.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 0',
                    borderBottom: '1px solid var(--co-separator)',
                  }}>
                    <span style={{ ...mono('clamp(0.65rem, 1.5vw, 0.65rem)'), color: 'var(--co-dim)', width: 24 }}>
                      #{p.place}
                    </span>
                    <span style={{ ...mono('clamp(0.6rem, 2vw, 0.8rem)'), color: 'var(--co-text)', flex: 1 }}>
                      {p.name}
                    </span>
                    <span style={{ ...mono('clamp(0.65rem, 1.5vw, 0.65rem)'), color: 'var(--co-cyan)' }}>
                      {p.percentage}%
                    </span>
                    <span style={{ ...mono('clamp(0.65rem, 1.3vw, 0.65rem)'), color: 'var(--co-dim)', width: 50, textAlign: 'right' }}>
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
                { label: 'WYDAŁ', value: `${ch.totalCost} ZŁ`, color: 'var(--co-text-hi)' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: 'clamp(8px, 2vw, 14px)',
                  background: 'var(--co-separator)',
                  border: '1px solid var(--co-separator)',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}>
                  <div style={{ ...display('clamp(1rem, 3.5vw, 1.6rem)'), color: s.color }}>
                    {s.value}
                  </div>
                  <div style={{ ...mono('clamp(0.65rem, 1.2vw, 0.65rem)'), color: 'var(--co-dim)', letterSpacing: '0.1em', marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.35)',
                color: 'var(--co-cyan)',
                ...display('clamp(0.8rem, 2.5vw, 1.1rem)', { letterSpacing: '0.14em' }),
                padding: 'clamp(10px, 2.5vw, 16px) clamp(28px, 8vw, 56px)',
                cursor: 'pointer',
                clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                transition: 'all 0.2s',
                boxShadow: '0 0 20px rgba(0,229,255,0.15)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,229,255,0.18)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,255,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.15)';
              }}
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
    <div
      ref={overlayRef}
      onClick={advance}
      onKeyDown={handleKey}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Podsumowanie roku ${stats.year}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(3,5,8,0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.015) 2px, rgba(0,229,255,0.015) 4px)',
      }} />

      {/* Corner decorations */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => {
        const isTop = pos.includes('top');
        const isLeft = pos.includes('left');
        return (
          <div key={pos} style={{
            position: 'absolute',
            [isTop ? 'top' : 'bottom']: 20,
            [isLeft ? 'left' : 'right']: 20,
            width: 30, height: 30,
            borderColor: 'rgba(0,229,255,0.2)',
            borderStyle: 'solid',
            borderWidth: 0,
            ...(isTop && isLeft && { borderTopWidth: 1, borderLeftWidth: 1 }),
            ...(isTop && !isLeft && { borderTopWidth: 1, borderRightWidth: 1 }),
            ...(!isTop && isLeft && { borderBottomWidth: 1, borderLeftWidth: 1 }),
            ...(!isTop && !isLeft && { borderBottomWidth: 1, borderRightWidth: 1 }),
            pointerEvents: 'none', zIndex: 2,
          }} />
        );
      })}

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

      {/* Progress dots */}
      <div style={{
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
                  ? 'rgba(0,229,255,0.35)'
                  : 'rgba(255,255,255,0.12)',
              boxShadow: i === currentSlide ? '0 0 8px rgba(0,229,255,0.5)' : 'none',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div style={{
        position: 'absolute', top: 20, right: 24,
        ...mono('clamp(0.65rem, 1.5vw, 0.65rem)'),
        color: 'var(--co-dim)', letterSpacing: '0.1em',
        zIndex: 4,
      }}>
        {currentSlide + 1}/{totalSlides}
      </div>
    </div>
  );
}
