import { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../common/Modal';
import { useModalExit } from '@/hooks/useModalExit';
import { CornerBrackets } from '../dashboard/CornerBrackets';
import { TEXT, CLIP, Z } from '@/constants/styles';
import type { WrappedStats } from '@/types/ui';
import { display, mono } from './wrapped/styles';
import IntroSlide from './wrapped/IntroSlide';
import OverviewSlide from './wrapped/OverviewSlide';
import BusiestMonthSlide from './wrapped/BusiestMonthSlide';
import BestPairSlide from './wrapped/BestPairSlide';
import RankingSlide from './wrapped/RankingSlide';
import ChampionSlide from './wrapped/ChampionSlide';

interface WrappedModalProps {
  stats: WrappedStats;
  onClose: () => void;
  /** Podgląd dev: pełny ekran bez portalu Modala. */
  embedded?: boolean;
}

/** Identyfikatory slajdów: 0 intro, 1 grupa, 2 miesiąc, 3 para, 4 ranking, 5 mistrz. */
function renderSlide(id: number, stats: WrappedStats, onClose: () => void) {
  switch (id) {
    case 0: return <IntroSlide stats={stats} />;
    case 1: return <OverviewSlide stats={stats} />;
    case 2: return <BusiestMonthSlide stats={stats} />;
    case 3: return <BestPairSlide stats={stats} />;
    case 4: return <RankingSlide stats={stats} />;
    case 5: return <ChampionSlide stats={stats} onClose={onClose} />;
    default: return null;
  }
}

// ─── WrappedModal ────────────────────────────────────────────────
export default function WrappedModal({ stats, onClose, embedded = false }: WrappedModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { open: modalOpen, close: closeWithExit } = useModalExit(onClose);
  const close = useCallback(() => {
    if (embedded) onClose();
    else closeWithExit();
  }, [embedded, onClose, closeWithExit]);

  // Kolejność slajdów; pary i mistrza pomijamy, gdy nie ma ich w danych
  // (pusty slajd mistrza wyglądałby jak błąd).
  const slideList = useMemo(() => {
    const base = [0, 1, 2];
    if (stats.bestPair) base.push(3);
    base.push(4);
    if (stats.champion) base.push(5);
    return base;
  }, [stats.bestPair, stats.champion]);
  const totalSlides = slideList.length;
  const activeSlideId = slideList[currentSlide] ?? 0;

  const advance = useCallback(() => {
    if (currentSlide >= totalSlides - 1) { close(); return; }
    setCurrentSlide(s => s + 1);
  }, [currentSlide, totalSlides, close]);

  const goBack = useCallback(() => {
    setCurrentSlide(s => Math.max(0, s - 1));
  }, []);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    // Spacja na przycisku („Wstecz”, „Dalej”, „Zamknij”) ma go aktywować,
    // a nie przewijać slajd — klawisz bąbelkuje z dziecka do powłoki.
    const onControl = e.target instanceof HTMLElement && e.target.closest('button, a, input') !== null;
    if (e.key === 'ArrowRight' || (e.key === ' ' && !onControl)) { advance(); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { goBack(); e.preventDefault(); }
  }, [advance, goBack, close]);

  // ── Render ─────────────────────────────────────────────────────
  const shell = (
      <div
        onClick={advance}
        onKeyDown={handleKey}
        role="presentation"
        tabIndex={embedded ? 0 : undefined}
        aria-label={embedded ? `Podsumowanie roku ${stats.year}` : undefined}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: embedded ? '100vh' : '100%',
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
        {renderSlide(activeSlideId, stats, close)}
      </div>

      {/* Progress dots — czytelne jako pasek postępu, nie jako przyciski */}
      <div role="progressbar" aria-valuenow={currentSlide + 1} aria-valuemin={1} aria-valuemax={totalSlides}
        aria-label="Postęp podsumowania"
        style={{
          position: 'absolute', bottom: 'clamp(20px, 5vh, 40px)',
          display: 'flex', gap: 8, zIndex: 4,
        }}>
        {slideList.map((_, i) => (
          // Każda kropka ma stałą szerokość 24 px; aktywna jest w pełnej skali,
          // pozostałe zwężają się do 8 px przez `scaleX`. Dzięki temu zmiana
          // slajdu nie animuje `width` (layout) i nie przesuwa sąsiednich kropek.
          <div key={i} style={{ width: 24, height: 8, flexShrink: 0 }}>
            <div
              style={{
                width: 24,
                height: 8,
                borderRadius: 4,
                transform: `scaleX(${i === currentSlide ? 1 : 1 / 3})`,
                transformOrigin: 'center',
                background: i === currentSlide
                  ? 'var(--co-cyan)'
                  : i < currentSlide
                    ? 'var(--co-tint-line)'
                    : 'var(--co-dot-empty)',
                boxShadow: i === currentSlide ? 'var(--glow-box-cyan)' : 'none',
                // Wskaźnik slajdu przełącza się przy każdej zmianie, więc 0.3s
                // było odczuwalnie ospałe przy 0.15–0.2s w reszcie interfejsu.
                transition: 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
              }}
            />
          </div>
        ))}
      </div>

      {/* Slide counter */}
      <div style={{
        position: 'absolute', top: 20, right: 24,
        ...mono(TEXT.small),
        color: 'var(--co-dim)', letterSpacing: 'normal',
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

      {/* Prawdziwy przycisk „Dalej” — powłoka to `role="presentation"`, więc
          czytnik ekranu i przełączniki nie miały czym przejść do następnego
          slajdu. Klik w powłokę nadal przewija jak dotąd. */}
      <button
        onClick={(e) => { e.stopPropagation(); advance(); }}
        className="icon-btn"
        style={{
          position: 'absolute', bottom: 'clamp(16px, 4vh, 32px)', right: 24, zIndex: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          minHeight: 44, padding: '10px 14px',
          background: 'transparent', border: '1px solid var(--co-border)',
          color: 'var(--co-dim)', cursor: 'pointer',
          clipPath: CLIP.badge,
          ...display(TEXT.small),
        }}
      >
        {currentSlide >= totalSlides - 1 ? 'Zamknij' : 'Dalej'}
        {currentSlide < totalSlides - 1 && <ChevronRight size={16} aria-hidden="true" />}
      </button>

      {/* Zmiana slajdu dla czytnika ekranu. */}
      <div className="sr-only" role="status" aria-live="polite">
        Slajd {currentSlide + 1} z {totalSlides}
      </div>
      </div>
  );

  if (embedded) {
    return (
      <div style={{
        position: 'fixed',
        top: 'max(16px, env(safe-area-inset-top, 0px))',
        right: 'max(16px, env(safe-area-inset-right, 0px))',
        bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
        left: 'max(16px, env(safe-area-inset-left, 0px))',
        zIndex: Z.modal,
      }}>
        {shell}
      </div>
    );
  }

  return (
  // Pełny ekran z własnym układem, więc z prymitywu bierze samą nakładkę.
  // Klik w tło przewija slajd, a nie zamyka — dlatego `closeOnBackdrop` off.
    <Modal open={modalOpen} onClose={onClose} bare closeOnBackdrop={false} ariaLabel={`Podsumowanie roku ${stats.year}`}>
      {shell}
    </Modal>
  );
}
