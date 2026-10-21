# CYBER PONK — Liquid Glass Design System

## Concept
Fusion of the **CYBER PONK** neon-sport identity (electric cyan / rose / matrix green / amber)
with the **Liquid Glass** language of iOS 18 / visionOS: translucent, refractive surfaces
floating over a living, fluid neon background.

## 1. Fluid background (`fluid-bg`)
Animated, blurred neon blobs (`fluid-blob-*`) in sport accents (cyan = ping-pong, rose = squash,
green = badminton, amber = padel) drift behind the UI and refract through glass surfaces.
A fine dot grid (`fluid-grid`) adds depth. All motion respects `prefers-reduced-motion`.

## 2. Liquid Glass surfaces
Shared recipe (`.glass-card`, `.glass-panel`, `.glass-surface`, `.glass-header`,
`.desktop-nav-inner`, `.modal-panel`):
- `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat))`
- translucent `--co-glass*` fills
- multi-layer shadow (`--glass-shadow`) + rim (`--glass-rim`)
- specular edge highlight on hover (`::after` mask)
- cursor-following light patch (`--glass-x/y` via `useGlassPointer`)

## 3. Neon status accents
- `.neon-status-debt` — rose, pending debt
- `.neon-status-credit` — green, overpayment
- `.neon-status-multisport` — amber, MultiSport discount
- `.neon-status-streak` — cyan, win streak
- `.status-chip` — compact glass chip for labels

## 4. Microinteractions
- `.glass-hover-lift` — card lift + glow on hover, settle on active
- `.tap-press` — scale-down on tap for touch targets
- `.glass-shine-overlay` — animated specular sweep
- Existing: card tilt, scan-sweep, tab bounce, debt flash/settle

## 5. Tailwind base
`tailwind.config.js` extends:
- `colors.sport.*` — neon sport accents
- `boxShadow` — glass, neon-cyan/rose/green, fluid
- `backdropBlur` — glass scale
- `animation`/`keyframes` — fluid-float, blob-drift, neon-pulse, glass-shine, shimmer, tap-scale

## Usage
Components should prefer Tailwind utilities + the CSS classes above over inline styles.
Keep all class names referenced in source so `lint:css` stays green.