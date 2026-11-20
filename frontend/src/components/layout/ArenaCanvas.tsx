import { useRef, useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Sport } from '@/types/domain';
import { ARENA_SCENES } from './arena';
import { W, H, createProjection, makeGlow, readPalette } from './arena/kit';
import { FADE_MS, GLITCH_MS, drawCrossfade, drawGlitchSwap } from './arena/transition';
import { devArenaFreeze, publishArenaStats } from './arena/dev';
import type { SceneContext } from './arena/types';

interface ArenaCanvasProps {
  chaosMode: boolean;
  lightMode?: boolean;
  onHit?: (hitting: boolean) => void;
  /** Dyscyplina na arenie. Zmiana podmienia scenę przejściem, bez restartu pętli. */
  sport?: Sport;
}

/**
 * Docelowy odstęp klatek. Próg jest celowo niższy od 16,7 ms: na ekranie
 * 120 Hz (iPhone) pozwala rysować co drugie odświeżenie, czyli stabilne
 * 60 fps. Wcześniejsze 21 ms dawało nierówny rytm 25/16,7 ms — dokładnie to
 * czytało się jako „algowanie” animacji, mimo że klatki były tanie.
 */
const FRAME_GATE_MS = 1000 / 75; // ≈ 13,3 ms

/**
 * Awaryjny rytm 30 fps. Włącza się, gdy rysowanie nie mieści się w budżecie
 * 60 fps — równy rytm jest płynniejszy niż gubione klatki.
 */
const SLOW_FRAME_GATE_MS = 1000 / 34; // ≈ 29,4 ms

/** Jak długo po uderzeniu trwa wstrząs i błysk (ms). */
const IMPACT_MS = 220;

/** Okno „trwa uderzenie” wokół kontaktu (ms) — tyle świeci tytuł. */
const HIT_WINDOW_MS = 100;

/** Uderzenia, gdy scena nie podaje własnych: lewy gracz w 0, prawy w połowie cyklu. */
const DEFAULT_HITS: readonly number[] = [0, 0.5];

/**
 * W którym miejscu cyklu startuje nowa scena po przełączeniu. Piłka jest
 * wtedy w locie, więc pierwsze uderzenie pada już po przejściu, a nie
 * w jego trakcie (wstrząs nałożony na glitch wyglądał jak błąd).
 */
const ENTRY_PROGRESS = 0.22;

export default function ArenaCanvas({ chaosMode, lightMode = false, onHit, sport = 'pingpong' }: ArenaCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number | null>(null);
  const t0  = useRef<number | null>(null);
  /** Bieżąca dyscyplina — czytana przez pętlę, żeby zmiana sportu nie restartowała efektu. */
  const sportRef = useRef<Sport>(sport);
  /** Podmiana sceny wystawiona przez działający efekt; `null`, gdy pętla nie żyje. */
  const swapRef = useRef<((next: Sport) => void) | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (sportRef.current === sport) return;
    sportRef.current = sport;
    swapRef.current?.(sport);
  }, [sport]);

  useEffect(() => {
    if (chaosMode) {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      swapRef.current = null;
      return undefined;
    }
    const canvas = ref.current;
    if (!canvas) return;
    // Brak kontekstu 2D zdarza się w przeglądarkach z wyłączonym canvasem
    // (tryb oszczędzania danych, niektóre rozszerzenia prywatności) i w jsdom.
    // Bez tej straży cały nagłówek wywracał się razem z dekoracją tła.
    const g = canvas.getContext('2d');
    if (!g) return undefined;

    const P = readPalette();
    const ctx: SceneContext = {
      P,
      proj: createProjection(),
      lightMode,
      glows: {
        ball: makeGlow(P.white, 0.62),
        hit: makeGlow(P.accent, 0.70),
        idle: makeGlow(P.glowIdle, 0.45),
      },
    };
    const scanGlow = makeGlow(P.accent, 0.85);

    /** Zamrożona klatka (tylko `npm run dev`, patrz `arena/dev.ts`). */
    const freezeAt = devArenaFreeze();
    /** Bez pętli: `prefers-reduced-motion` albo zamrożenie do przeglądu. */
    const stillMode = reducedMotion || freezeAt !== null;

    let sceneSport = sportRef.current;
    let scene = ARENA_SCENES[sceneSport]();
    scene.prepare?.(ctx);

    const staticCanvas = document.createElement('canvas');
    const sg = staticCanvas.getContext('2d');

    /** Nieruchoma część sceny — malowana raz na rozmiar, motyw i dyscyplinę. */
    const paintStatic = () => {
      if (!sg) return;
      sg.clearRect(0, 0, W, H);
      scene.paintStatic(sg, ctx);
    };

    let lastHitState = false;
    let impactStartTs = -Infinity;
    const setHit = (state: boolean, ts: number) => {
      if (state === lastHitState) return;
      lastHitState = state;
      if (state) impactStartTs = ts;
      onHit?.(state);
    };

    let transition: { snap: HTMLCanvasElement; start: number; mode: 'glitch' | 'fade' } | null = null;

    /* ── KLATKA ── */
    const drawFrame = (progress: number, nowTs: number, still = false) => {
      g.clearRect(0, 0, W, H);

      let impact = 0;
      if (!still) {
        const nearHit = (scene.hits ?? DEFAULT_HITS).some(h => {
          const d = Math.abs(progress - h);
          return Math.min(d, 1 - d) * scene.cycleMs < HIT_WINDOW_MS;
        });
        setHit(nearHit, nowTs);
        const impactRaw = impactStartTs > 0 ? Math.max(0, (IMPACT_MS - (nowTs - impactStartTs)) / IMPACT_MS) : 0;
        impact = impactRaw * impactRaw * (3 - 2 * impactRaw);
      }
      const shakeAmp = impact * 3;

      g.save();
      if (impact > 0) g.translate(Math.sin(nowTs * 0.02) * shakeAmp, Math.cos(nowTs * 0.017) * shakeAmp * 0.6);
      if (sg) g.drawImage(staticCanvas, 0, 0, W, H);
      scene.draw(g, { progress, now: nowTs, impact }, ctx);
      g.restore();

      if (transition) {
        const t = (nowTs - transition.start) / (transition.mode === 'glitch' ? GLITCH_MS : FADE_MS);
        if (t >= 1) transition = null;
        else if (transition.mode === 'glitch') drawGlitchSwap(g, transition.snap, t, P, lightMode, scanGlow);
        else drawCrossfade(g, transition.snap, t);
      }
    };

    // Cykl jest liczony z czasu, nie z liczby klatek, więc zmiana rytmu nie
    // zmienia tempa gry. Bramka czasu (a nie licznik klatek) wyrównuje rytm do
    // odświeżania ekranu: na 60 Hz rysujemy co ramkę, na 120 Hz co drugą.
    let lastDrawTs = 0;
    let frameGate = FRAME_GATE_MS;
    let drawCostAvg = 0;
    let statsTs = 0;
    const loop = (ts: number) => {
      raf.current = requestAnimationFrame(loop);
      if (!t0.current) t0.current = ts;
      if (ts - lastDrawTs < frameGate) return;
      lastDrawTs = ts;

      const startedAt = performance.now();
      const elapsed = ts - t0.current;
      drawFrame((((elapsed % scene.cycleMs) + scene.cycleMs) % scene.cycleMs) / scene.cycleMs, ts);
      const cost = performance.now() - startedAt;
      // Wygładzona cena klatki. Dopiero gdy realnie wychodzi ponad budżet
      // 60 fps, schodzimy na równe 30 fps — toczy się płynniej niż gubione
      // klatki, a próg 10 ms nie karze zdrowych urządzeń za sam narzut API.
      drawCostAvg += (cost - drawCostAvg) * 0.08;
      if (drawCostAvg > 10) frameGate = SLOW_FRAME_GATE_MS;
      if (import.meta.env.DEV && ts - statsTs > 500) {
        statsTs = ts;
        publishArenaStats({ sport: sceneSport, frameMs: Math.round(drawCostAvg * 1000) / 1000, fps: Math.round(1000 / frameGate) });
      }
    };

    const startLoop = () => {
      if (raf.current !== null) return;
      raf.current = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (raf.current === null) return;
      cancelAnimationFrame(raf.current);
      raf.current = null;
      // Wznawiamy cykl od początku, żeby po powrocie piłeczka nie skoczyła
      // o czas, w którym animacja była zatrzymana.
      t0.current = null;
    };

    const drawStillFrame = () => {
      stopLoop();
      drawFrame(freezeAt ?? scene.staticProgress, performance.now(), true);
    };

    /* Przenikanie w trybie bez ruchu: kilka klatek, potem znów cisza. */
    let fadeRaf: number | null = null;
    const runFade = () => {
      const step = () => {
        drawFrame(freezeAt ?? scene.staticProgress, performance.now(), true);
        fadeRaf = transition ? requestAnimationFrame(step) : null;
      };
      if (fadeRaf === null) fadeRaf = requestAnimationFrame(step);
    };

    /** Kopia tego, co właśnie widać — materiał dla przejścia. */
    const snapshot = (): HTMLCanvasElement | null => {
      if (!canvas.width || !canvas.height) return null;
      const snap = document.createElement('canvas');
      snap.width = canvas.width;
      snap.height = canvas.height;
      const c = snap.getContext('2d');
      if (!c) return null;
      c.drawImage(canvas, 0, 0);
      return snap;
    };

    swapRef.current = (next: Sport) => {
      if (next === sceneSport) return;
      const snap = snapshot();
      const now = performance.now();
      sceneSport = next;
      scene = ARENA_SCENES[next]();
      scene.prepare?.(ctx);
      paintStatic();
      // Przełączenie w trakcie uderzenia zostawiłoby tytuł podświetlony.
      setHit(false, now);
      impactStartTs = -Infinity;

      if (stillMode) {
        transition = snap ? { snap, start: now, mode: 'fade' } : null;
        if (transition) runFade();
        else drawStillFrame();
        return;
      }
      t0.current = now - scene.cycleMs * ENTRY_PROGRESS;
      // Gdy pętla stoi (arena poza ekranem), nie ma czego animować —
      // nowa scena po prostu ruszy po powrocie.
      transition = snap && raf.current !== null ? { snap, start: now, mode: 'glitch' } : null;
    };

    /**
     * Bufor canvasu dopasowany do realnej szerokości elementu. Wcześniej był
     * zawsze 560 × dpr (1120 px), choć na telefonie arena ma ~340 px CSS —
     * czyli ponad 3× nadpróbkowanie, płacone przy każdym `clearRect`
     * i `drawImage`. Teraz bufor ma dokładnie tyle pikseli, ile widać.
     */
    let surfaceKey = '';
    const syncSurface = () => {
      const rect = canvas.getBoundingClientRect();
      const cssWidth = Math.min(W, Math.max(1, rect.width || W));
      const dpr = Math.min(
        (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1,
        2,
      );
      const bw = Math.max(1, Math.round(cssWidth * dpr));
      const bh = Math.max(1, Math.round(cssWidth * (H / W) * dpr));
      const key = `${bw}x${bh}`;
      if (key === surfaceKey) return;
      surfaceKey = key;

      canvas.width = bw;
      canvas.height = bh;
      staticCanvas.width = bw;
      staticCanvas.height = bh;
      const sx = bw / W, sy = bh / H;
      g.setTransform(sx, 0, 0, sy, 0, 0);
      sg?.setTransform(sx, 0, 0, sy, 0, 0);
      paintStatic();
      // Zmiana rozmiaru czyści bufor — w trybie bez ruchu od razu malujemy
      // statyczną klatkę, żeby arena nie mrugała pustką.
      if (stillMode) drawStillFrame();
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSurface);
      resizeObserver.observe(canvas);
    }
    syncSurface();

    /**
     * rAF tylko wtedy, gdy canvas faktycznie widać. Sama zmiana widoczności
     * karty nie wystarcza: po przewinięciu nagłówka poza ekran pętla rysowała
     * 60 klatek/s w tle (GSAP performance: „pause off-screen animations”).
     * Gdy IntersectionObserver nie istnieje (stare webview, jsdom), zostaje
     * dotychczasowe zachowanie oparte wyłącznie na `visibilitychange`.
     */
    let onScreen = true;
    const syncLoop = () => {
      if (stillMode) { drawStillFrame(); return; }
      const hidden = document.visibilityState === 'hidden';
      if (onScreen && !hidden) startLoop();
      else stopLoop();
    };
    const onVisibility = () => syncLoop();

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        syncLoop();
      }, { threshold: 0.01 });
      observer.observe(canvas);
    }

    document.addEventListener('visibilitychange', onVisibility);
    syncLoop();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      resizeObserver?.disconnect();
      stopLoop();
      if (fadeRaf !== null) cancelAnimationFrame(fadeRaf);
      swapRef.current = null;
    };
  }, [chaosMode, lightMode, onHit, reducedMotion]);

  return (
    <canvas ref={ref} width={560} height={180} aria-hidden="true"
      style={{ display:'block', width:'100%', maxWidth:560, height:'auto' }} />
  );
}
