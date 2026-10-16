/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cyber: ['Fraunces', 'Georgia', 'serif'],
        mono:  ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        panel: '20px',
        card:  '16px',
        control: '12px',
      },
      boxShadow: {
        soft:  '0 1px 2px rgba(0,0,0,0.24), 0 18px 40px -24px rgba(0,0,0,0.72)',
        lift:  '0 2px 6px rgba(0,0,0,0.30), 0 28px 60px -28px rgba(0,0,0,0.80)',
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
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
