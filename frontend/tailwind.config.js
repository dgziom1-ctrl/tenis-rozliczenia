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
          500: '#ff00ff',
          700: '#bd00bd',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
