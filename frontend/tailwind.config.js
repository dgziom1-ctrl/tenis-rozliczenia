/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cyber: ['"Orbitron"', 'sans-serif'],
        mono:  ['"Roboto Mono"', 'monospace'],
        sans:  ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Slightly cooler, more "metallic" cyan — less terminal, more premium
        cyan: {
          DEFAULT: '#38bdf8',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Softer fuchsia — same vibe, less aggressive
        magenta: {
          DEFAULT: '#e879f9',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
