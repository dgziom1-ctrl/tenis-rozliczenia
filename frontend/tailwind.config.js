/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cyber: ['"Bebas Neue"', 'sans-serif'],
        mono:  ['"Space Mono"', 'monospace'],
        sans:  ['"Rajdhani"', 'system-ui', 'sans-serif'],
      },
      colors: {
        co: {
          void:       'var(--co-void)',
          dark:       'var(--co-dark)',
          panel:      'var(--co-panel)',
          raised:     'var(--co-raised)',
          border:     'var(--co-border)',
          'border-hi':'var(--co-border-hi)',
          cyan:       'var(--co-cyan)',
          'cyan-mid': 'var(--co-cyan-mid)',
          'cyan-dim': 'var(--co-cyan-dim)',
          ice:        'var(--co-ice)',
          rose:       'var(--co-rose)',
          'rose-mid': 'var(--co-rose-mid)',
          'rose-dim': 'var(--co-rose-dim)',
          amber:      'var(--co-amber)',
          'amber-mid':'var(--co-amber-mid)',
          'amber-dim':'var(--co-amber-dim)',
          green:      'var(--co-green)',
          'green-dim':'var(--co-green-dim)',
          pink:       'var(--co-pink)',
          text:       'var(--co-text)',
          'text-hi':  'var(--co-text-hi)',
          dim:        'var(--co-dim)',
          dim2:       'var(--co-dim2)',
        },
        // Sport accents — neon-sport palette for fluid background & status.
        sport: {
          pingpong:   '#00E5FF', // cyan — padel/squash are warm
          squash:     '#FF2090', // rose
          badminton:  '#00FF88', // matrix green
          padel:      '#F59E0B', // amber
        },
      },
      boxShadow: {
        'glass':      'var(--glass-shadow)',
        'glass-lg':   '0 30px 70px -30px rgba(0,0,0,0.92), 0 6px 18px -8px rgba(0,0,0,0.70)',
        'neon-cyan':  '0 0 16px rgba(0,229,255,0.20), inset 0 1px 0 rgba(190,245,255,0.26)',
        'neon-rose':  '0 0 18px rgba(255,32,144,0.13), inset 0 1px 0 rgba(255,255,255,0.08)',
        'neon-green': '0 0 14px rgba(0,255,136,0.40), inset 0 1px 0 rgba(255,255,255,0.08)',
        'fluid':      '0 0 80px 0 rgba(0,229,255,0.18), 0 0 120px 0 rgba(255,32,144,0.12)',
      },
      backdropBlur: {
        glass: '26px',
        'glass-sm': '16px',
        'glass-lg': '32px',
      },
      animation: {
        'pulse-slow':    'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fluid-float':   'fluid-float 14s ease-in-out infinite',
        'blob-drift':    'blob-drift 22s ease-in-out infinite',
        'neon-pulse':    'neon-pulse 3s ease-in-out infinite',
        'glass-shine':   'glass-shine 6s ease-in-out infinite',
        'tap-scale':     'tap-scale 0.18s ease-out',
        'shimmer':       'shimmer 2.4s linear infinite',
      },
      keyframes: {
        'fluid-float': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%':      { transform: 'translate3d(0,-24px,0) scale(1.06)' },
        },
        'blob-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) rotate(0deg)' },
          '33%':      { transform: 'translate3d(40px,-30px,0) rotate(12deg)' },
          '66%':      { transform: 'translate3d(-30px,20px,0) rotate(-8deg)' },
        },
        'neon-pulse': {
          '0%, 100%': { opacity: '0.55', filter: 'blur(0px)' },
          '50%':      { opacity: '0.95', filter: 'blur(0.5px)' },
        },
        'glass-shine': {
          '0%, 100%': { opacity: '0.0' },
          '50%':      { opacity: '0.35' },
        },
        'tap-scale': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
