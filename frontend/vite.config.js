import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom emulates a browser environment — catches bugs that only appear in the browser
    // (like accessing Notification.permission before checking if the API exists)
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.js'],
    include: ['src/__tests__/**/*.test.{js,jsx}'],
  },
});
