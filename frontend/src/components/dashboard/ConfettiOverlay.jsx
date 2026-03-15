// Renders CSS-animated confetti pieces. Styles live in index.css.
export default function ConfettiOverlay({ pieces }) {
  if (!pieces || pieces.length === 0) return null;
  return (
    <>
      {pieces.map(c => (
        <div
          key={c.id}
          className="confetti-piece"
          style={{
            left:        `${c.x}%`,
            fontSize:    `${c.size}px`,
            '--dur':     `${c.dur}s`,
            '--delay':   `${c.delay}s`,
            '--drift':   `${c.drift}px`,
            '--rot-end': `${c.rotEnd}deg`,
          }}
        >
          {c.emoji}
        </div>
      ))}
    </>
  );
}

export const CONFETTI_POOLS = {
  cyber: ['🏓','⚡','🎱','🌀','🎉','✨','🏆','💫','🎮','🌟'],
};

export function generateConfetti(count, pool) {
  return Array.from({ length: count }, (_, i) => ({
    id:     i,
    emoji:  pool[Math.floor(Math.random() * pool.length)],
    x:      Math.random() * 100,
    dur:    1.4 + Math.random() * 1.2,
    delay:  Math.random() * 0.6,
    size:   16 + Math.random() * 18,
    drift:  (Math.random() - 0.5) * 80,
    rotEnd: 180 + Math.floor(Math.random() * 3) * 180,
  }));
}
