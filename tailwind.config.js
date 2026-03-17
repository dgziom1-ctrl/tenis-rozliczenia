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
        cz: {
          void:    '#050506',
          dark:    '#090908',
          panel:   '#0D0D0B',
          border:  '#1F1F1A',
          orange:  '#E8590A',
          acid:    '#7FFF00',
          blood:   '#CC001C',
          teal:    '#00FFCC',
          amber:   '#FFB800',
          text:    '#C8C4BA',
          dim:     '#4A4640',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
