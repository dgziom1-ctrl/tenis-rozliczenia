const ZEN_LEAVES = ['🍃', '🌿', '🍀', '🌸', '🌾', '🍂', '🌱', '🎋'];

const LEAF_CONFIG = Array.from({ length: 12 }, (_, i) => ({
  id:    i,
  emoji: ZEN_LEAVES[i % ZEN_LEAVES.length],
  left:  5 + (i * 8.2) % 90,
  size:  14 + (i * 7) % 16,
  dur:   10 + (i * 1.7) % 8,
  delay: (i * 2.1) % 14,
  drift: -40 + (i * 11) % 80,
  rot:   120 + (i * 37) % 180,
}));

export default function ZenLeaves() {
  return (
    <>
      {LEAF_CONFIG.map(leaf => (
        <div
          key={leaf.id}
          className="zen-leaf"
          style={{
            left:           `${leaf.left}%`,
            fontSize:       `${leaf.size}px`,
            '--leaf-dur':   `${leaf.dur}s`,
            '--leaf-delay': `${leaf.delay}s`,
            '--leaf-drift': `${leaf.drift}px`,
            '--leaf-rot':   `${leaf.rot}deg`,
          }}
        >
          {leaf.emoji}
        </div>
      ))}
    </>
  );
}
