// vitest.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Pin so timezone-sensitive assertions (e.g. kickoff time formatting)
    // are deterministic across machines/CI instead of inheriting the host's
    // local zone.
    env: {
      TZ: 'UTC',
    },
  },
});
