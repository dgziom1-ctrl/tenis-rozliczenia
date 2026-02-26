import { useEffect, useRef, useState, useCallback } from 'react';

// ── Stałe gry ────────────────────────────────────────────
const W          = 800;
const H          = 500;
const PADDLE_W   = 12;
const PADDLE_H   = 80;
const BALL_R     = 8;
const PADDLE_SPD = 5;
const WIN_SCORE  = 7;

const COLORS = {
  bg:        '#080c14',
  grid:      'rgba(0,212,255,0.04)',
  center:    'rgba(0,212,255,0.15)',
  player:    '#00d4ff',
  ai:        '#e91e8c',
  ball:      '#ffffff',
  ballGlow:  'rgba(255,255,255,0.4)',
  playerHUD: '#00d4ff',
  aiHUD:     '#e91e8c',
  text:      '#ffffff',
  dim:       'rgba(0,0,0,0.6)',
};

function initState() {
  return {
    ball:   { x: W / 2, y: H / 2, vx: 4 * (Math.random() > 0.5 ? 1 : -1), vy: 3 * (Math.random() > 0.5 ? 1 : -1) },
    player: { y: H / 2 - PADDLE_H / 2 },
    ai:     { y: H / 2 - PADDLE_H / 2 },
    score:  { player: 0, ai: 0 },
    phase:  'countdown', // countdown | play | point | gameover
    countdown: 3,
    winner: null,
    rallyLen: 0,
    lastScorer: null,
    touches: { up: false, down: false },
  };
}

function drawFrame(ctx, state, scale) {
  const s = (v) => v * scale;

  // Tło
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, s(W), s(H));

  // Siatka
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(s(x), 0); ctx.lineTo(s(x), s(H)); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, s(y)); ctx.lineTo(s(W), s(y)); ctx.stroke(); }

  // Linia środkowa przerywana
  ctx.setLineDash([s(10), s(10)]);
  ctx.strokeStyle = COLORS.center;
  ctx.lineWidth = s(2);
  ctx.beginPath();
  ctx.moveTo(s(W / 2), 0);
  ctx.lineTo(s(W / 2), s(H));
  ctx.stroke();
  ctx.setLineDash([]);

  // Wynik
  ctx.textAlign = 'center';
  ctx.font      = `bold ${s(52)}px 'Orbitron', monospace`;
  ctx.fillStyle = COLORS.playerHUD;
  ctx.shadowColor = COLORS.playerHUD;
  ctx.shadowBlur  = s(20);
  ctx.fillText(state.score.player, s(W / 2 - 80), s(60));

  ctx.fillStyle = COLORS.aiHUD;
  ctx.shadowColor = COLORS.aiHUD;
  ctx.fillText(state.score.ai, s(W / 2 + 80), s(60));
  ctx.shadowBlur = 0;

  // Etykiety
  ctx.font      = `bold ${s(11)}px 'Share Tech Mono', monospace`;
  ctx.fillStyle = COLORS.playerHUD;
  ctx.shadowColor = COLORS.playerHUD;
  ctx.shadowBlur  = s(8);
  ctx.textAlign   = 'left';
  ctx.fillText('TY', s(30), s(25));
  ctx.fillStyle   = COLORS.aiHUD;
  ctx.shadowColor = COLORS.aiHUD;
  ctx.textAlign   = 'right';
  ctx.fillText('CPU', s(W - 30), s(25));
  ctx.shadowBlur  = 0;

  // Do ilu punktów
  ctx.textAlign   = 'center';
  ctx.font        = `${s(10)}px monospace`;
  ctx.fillStyle   = 'rgba(0,212,255,0.3)';
  ctx.fillText(`FIRST TO ${WIN_SCORE}`, s(W / 2), s(25));

  // Paski postępu wyników
  const barW = s(120);
  const barH = s(4);
  const barY = s(70);

  // Gracz
  ctx.fillStyle = 'rgba(0,212,255,0.15)';
  ctx.fillRect(s(W / 2 - 160), barY, barW, barH);
  ctx.fillStyle = COLORS.playerHUD;
  ctx.fillRect(s(W / 2 - 160), barY, barW * (state.score.player / WIN_SCORE), barH);

  // AI
  ctx.fillStyle = 'rgba(233,30,140,0.15)';
  ctx.fillRect(s(W / 2 + 40), barY, barW, barH);
  ctx.fillStyle = COLORS.aiHUD;
  ctx.fillRect(s(W / 2 + 40), barY, barW * (state.score.ai / WIN_SCORE), barH);

  // Paletka gracza (lewa)
  const px = s(20);
  const py = s(state.player.y);
  const pw = s(PADDLE_W);
  const ph = s(PADDLE_H);
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur  = s(15);
  ctx.fillStyle   = COLORS.player;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, s(4));
  ctx.fill();
  ctx.shadowBlur = 0;

  // Paletka AI (prawa)
  const ax = s(W - 20 - PADDLE_W);
  const ay = s(state.ai.y);
  ctx.shadowColor = COLORS.ai;
  ctx.shadowBlur  = s(15);
  ctx.fillStyle   = COLORS.ai;
  ctx.beginPath();
  ctx.roundRect(ax, ay, pw, ph, s(4));
  ctx.fill();
  ctx.shadowBlur = 0;

  // Piłka
  if (state.phase !== 'countdown') {
    const bx = s(state.ball.x);
    const by = s(state.ball.y);
    const br = s(BALL_R);

    // Trail / glow
    ctx.shadowColor = COLORS.ballGlow;
    ctx.shadowBlur  = s(25);
    ctx.fillStyle   = COLORS.ballGlow;
    ctx.beginPath();
    ctx.arc(bx, by, br * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur  = s(10);
    ctx.fillStyle   = COLORS.ball;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Overlay fazy
  if (state.phase === 'countdown') {
    ctx.fillStyle = COLORS.dim;
    ctx.fillRect(0, 0, s(W), s(H));

    ctx.textAlign   = 'center';
    ctx.font        = `bold ${s(100)}px 'Orbitron', monospace`;
    ctx.fillStyle   = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = s(40);
    ctx.fillText(state.countdown, s(W / 2), s(H / 2) + s(35));
    ctx.shadowBlur  = 0;

    ctx.font        = `${s(14)}px 'Share Tech Mono', monospace`;
    ctx.fillStyle   = 'rgba(0,212,255,0.6)';
    ctx.fillText('PRZYGOTUJ SIĘ...', s(W / 2), s(H / 2) - s(60));
  }

  if (state.phase === 'point') {
    ctx.fillStyle = COLORS.dim;
    ctx.fillRect(0, 0, s(W), s(H));

    const isPlayer = state.lastScorer === 'player';
    ctx.font        = `bold ${s(28)}px 'Orbitron', monospace`;
    ctx.fillStyle   = isPlayer ? COLORS.playerHUD : COLORS.aiHUD;
    ctx.shadowColor = isPlayer ? COLORS.playerHUD : COLORS.aiHUD;
    ctx.shadowBlur  = s(30);
    ctx.textAlign   = 'center';
    ctx.fillText(isPlayer ? '⚡ PUNKT DLA CIEBIE!' : '💀 PUNKT DLA CPU!', s(W / 2), s(H / 2));
    ctx.shadowBlur  = 0;
  }

  if (state.phase === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, s(W), s(H));

    const won = state.winner === 'player';
    const mainColor = won ? '#ffd700' : COLORS.ai;

    // Tytuł
    ctx.font        = `bold ${s(42)}px 'Orbitron', monospace`;
    ctx.fillStyle   = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur  = s(40);
    ctx.textAlign   = 'center';
    ctx.fillText(won ? '🏆 WYGRAŁEŚ!' : '💀 PRZEGRAŁEŚ!', s(W / 2), s(H / 2) - s(60));
    ctx.shadowBlur  = 0;

    ctx.font      = `${s(18)}px 'Share Tech Mono', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`${state.score.player} : ${state.score.ai}`, s(W / 2), s(H / 2) - s(10));

    if (won) {
      ctx.font      = `${s(13)}px monospace`;
      ctx.fillStyle = 'rgba(255,215,0,0.6)';
      ctx.fillText('nie zły wynik jak na kogoś kto gra w ping-ponga IRL 😄', s(W / 2), s(H / 2) + s(25));
    } else {
      ctx.font      = `${s(13)}px monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('CPU nie zna litości. następnym razem!', s(W / 2), s(H / 2) + s(25));
    }

    ctx.font      = `bold ${s(13)}px 'Share Tech Mono', monospace`;
    ctx.fillStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = s(10);
    ctx.fillText('[ ENTER lub TAP — zagraj jeszcze raz ]', s(W / 2), s(H / 2) + s(75));
    ctx.fillText('[ ESC — wyjdź ]', s(W / 2), s(H / 2) + s(100));
    ctx.shadowBlur = 0;
  }
}

export default function PongGame({ onClose }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(initState());
  const keysRef   = useRef({ ArrowUp: false, ArrowDown: false, w: false, s: false });
  const rafRef    = useRef(null);
  const cdRef     = useRef(null);

  const [phase, setPhase] = useState('countdown');

  // ── Resize helper ──────────────────────────────────────
  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return canvas.width / W;
  }, []);

  // ── Resize canvas ──────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW  = Math.min(window.innerWidth - 32, W);
      const scale = maxW / W;
      canvas.width  = maxW;
      canvas.height = H * scale;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Countdown ─────────────────────────────────────────
  const startCountdown = useCallback(() => {
    const st = stateRef.current;
    st.phase     = 'countdown';
    st.countdown = 3;
    setPhase('countdown');
    clearInterval(cdRef.current);

    cdRef.current = setInterval(() => {
      st.countdown -= 1;
      if (st.countdown <= 0) {
        clearInterval(cdRef.current);
        st.phase = 'play';
        // Reset piłki
        st.ball = {
          x:  W / 2,
          y:  H / 2,
          vx: 4 * (Math.random() > 0.5 ? 1 : -1),
          vy: 3 * (Math.random() > 0.5 ? 1 : -1),
        };
        st.rallyLen = 0;
        setPhase('play');
      }
    }, 1000);
  }, []);

  // ── Game loop ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    const tick = () => {
      const st    = stateRef.current;
      const keys  = keysRef.current;
      const scale = getScale();

      if (st.phase === 'play') {
        // Gracz
        const up   = keys.ArrowUp   || keys.w || st.touches.up;
        const down = keys.ArrowDown || keys.s || st.touches.down;
        if (up)   st.player.y = Math.max(0,          st.player.y - PADDLE_SPD);
        if (down) st.player.y = Math.min(H - PADDLE_H, st.player.y + PADDLE_SPD);

        // AI — śledzi piłkę z opóźnieniem zależnym od trudności
        const aiCenter = st.ai.y + PADDLE_H / 2;
        const aiSpeed  = 3.5 + st.rallyLen * 0.1; // rośnie z każdym odbiciem (max ~5.5)
        if (aiCenter < st.ball.y - 5) st.ai.y = Math.min(H - PADDLE_H, st.ai.y + aiSpeed);
        if (aiCenter > st.ball.y + 5) st.ai.y = Math.max(0,            st.ai.y - aiSpeed);

        // Piłka
        st.ball.x += st.ball.vx;
        st.ball.y += st.ball.vy;

        // Odbicie góra/dół
        if (st.ball.y - BALL_R <= 0)     { st.ball.vy =  Math.abs(st.ball.vy); st.ball.y = BALL_R; }
        if (st.ball.y + BALL_R >= H)     { st.ball.vy = -Math.abs(st.ball.vy); st.ball.y = H - BALL_R; }

        // Kolizja z paletką gracza
        const plx = 20, plr = 20 + PADDLE_W;
        if (
          st.ball.x - BALL_R <= plr &&
          st.ball.x - BALL_R >= plx - 5 &&
          st.ball.y >= st.player.y &&
          st.ball.y <= st.player.y + PADDLE_H &&
          st.ball.vx < 0
        ) {
          const hit      = (st.ball.y - (st.player.y + PADDLE_H / 2)) / (PADDLE_H / 2);
          const speed    = Math.min(Math.hypot(st.ball.vx, st.ball.vy) * 1.05, 14);
          const angle    = hit * (Math.PI / 3);
          st.ball.vx     = Math.cos(angle) * speed;
          st.ball.vy     = Math.sin(angle) * speed;
          st.ball.x      = plr + BALL_R + 1;
          st.rallyLen++;
        }

        // Kolizja z paletką AI
        const alx = W - 20 - PADDLE_W, alr = W - 20;
        if (
          st.ball.x + BALL_R >= alx &&
          st.ball.x + BALL_R <= alr + 5 &&
          st.ball.y >= st.ai.y &&
          st.ball.y <= st.ai.y + PADDLE_H &&
          st.ball.vx > 0
        ) {
          const hit   = (st.ball.y - (st.ai.y + PADDLE_H / 2)) / (PADDLE_H / 2);
          const speed = Math.min(Math.hypot(st.ball.vx, st.ball.vy) * 1.05, 14);
          const angle = hit * (Math.PI / 3);
          st.ball.vx  = -Math.cos(angle) * speed;
          st.ball.vy  = Math.sin(angle) * speed;
          st.ball.x   = alx - BALL_R - 1;
          st.rallyLen++;
        }

        // Punkt
        if (st.ball.x < 0) {
          st.score.ai++;
          st.lastScorer = 'ai';
          scorePoint(st);
        }
        if (st.ball.x > W) {
          st.score.player++;
          st.lastScorer = 'player';
          scorePoint(st);
        }
      }

      drawFrame(ctx, st, scale);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getScale]);

  const scorePoint = (st) => {
    if (st.score.player >= WIN_SCORE || st.score.ai >= WIN_SCORE) {
      st.phase  = 'gameover';
      st.winner = st.score.player >= WIN_SCORE ? 'player' : 'ai';
      setPhase('gameover');
    } else {
      st.phase = 'point';
      setPhase('point');
      setTimeout(() => startCountdown(), 1200);
    }
  };

  // ── Uruchom grę ───────────────────────────────────────
  useEffect(() => {
    startCountdown();
    return () => { clearInterval(cdRef.current); cancelAnimationFrame(rafRef.current); };
  }, [startCountdown]);

  // ── Klawiatura ────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true;
      if (e.key === 'Escape') onClose();
      if ((e.key === 'Enter' || e.key === ' ') && stateRef.current.phase === 'gameover') {
        const st     = initState();
        st.phase     = 'countdown';
        st.countdown = 3;
        stateRef.current = st;
        startCountdown();
      }
      if (['ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
    };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [onClose, startCountdown]);

  // ── Touch controls ────────────────────────────────────
  const handleTouchStart = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    Array.from(e.touches).forEach(t => {
      const y = t.clientY - rect.top;
      if (y < rect.height / 2) stateRef.current.touches.up   = true;
      else                     stateRef.current.touches.down = true;
    });
  };
  const handleTouchEnd = () => {
    stateRef.current.touches.up   = false;
    stateRef.current.touches.down = false;
  };

  const handleCanvasTap = () => {
    if (stateRef.current.phase === 'gameover') {
      const st     = initState();
      st.phase     = 'countdown';
      st.countdown = 3;
      stateRef.current = st;
      startCountdown();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4"
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {/* Nagłówek */}
      <div className="w-full max-w-[800px] flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏓</span>
          <div>
            <div className="text-cyan-400 font-black text-lg tracking-widest" style={{ fontFamily: "'Orbitron', monospace" }}>
              CYBER PONK
            </div>
            <div className="text-cyan-800 text-xs tracking-wider">SECRET GAME MODE</div>
          </div>
        </div>

        {/* Mobile controls hint */}
        <div className="text-cyan-800 text-xs text-right hidden sm:block">
          ↑↓ / W S — sterowanie<br/>
          ESC — wyjdź
        </div>
        <div className="text-cyan-800 text-xs text-right sm:hidden">
          dotknij góra/dół<br/>żeby sterować
        </div>

        <button
          onClick={onClose}
          className="ml-4 px-3 py-2 border border-cyan-800 text-cyan-600 rounded-lg hover:border-cyan-500 hover:text-cyan-400 transition-all text-sm font-bold flex-shrink-0"
        >
          ✕ ESC
        </button>
      </div>

      {/* Canvas */}
      <div
        className="relative rounded-2xl overflow-hidden border-2 border-cyan-900 shadow-[0_0_60px_rgba(0,212,255,0.15)]"
        style={{ width: '100%', maxWidth: W }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ imageRendering: 'pixelated' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onClick={handleCanvasTap}
        />
      </div>

      {/* Mobile touch buttons */}
      <div className="flex gap-4 mt-4 sm:hidden">
        <button
          className="flex-1 py-5 rounded-xl border-2 border-cyan-700 bg-cyan-950/50 text-cyan-400 text-2xl font-black active:bg-cyan-800 active:scale-95 transition-all select-none"
          onTouchStart={() => { stateRef.current.touches.up = true; }}
          onTouchEnd={()   => { stateRef.current.touches.up = false; }}
        >↑</button>
        <button
          className="flex-1 py-5 rounded-xl border-2 border-cyan-700 bg-cyan-950/50 text-cyan-400 text-2xl font-black active:bg-cyan-800 active:scale-95 transition-all select-none"
          onTouchStart={() => { stateRef.current.touches.down = true; }}
          onTouchEnd={()   => { stateRef.current.touches.down = false; }}
        >↓</button>
      </div>

      <div className="text-cyan-900 text-xs mt-3 tracking-widest">
        znajdź jak otworzyć tę grę 🏓
      </div>
    </div>
  );
}
