/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // nerdy fonts
        cyber: ['"Orbitron"', 'sans-serif'],
        mono: ['"Roboto Mono"', 'monospace'],
      },
      colors: {
        // cyberpunk color palette
        cyan: {
          DEFAULT: '#00f3ff',
          300: '#6efaff',
          500: '#00f3ff',
          700: '#00bbcc',
          900: '#004e54',
        },
        magenta: {
          DEFAULT: '#ff00ff',
          300: '#ff80ff',
          400: '#ff40ff',
          500: '#ff00ff',
          600: '#e000e0',
          700: '#bd00bd',
          800: '#800080',
          900: '#4d004d',
          950: '#2a002a',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
