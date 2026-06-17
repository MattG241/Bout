import { defineConfig } from 'vitest/config';

// The core game logic (puzzles, scoring, seasons) is pure TypeScript with no
// React Native dependencies, so it runs in a fast Node environment under vitest.
// This is the server-authoritative logic shared with the Supabase Edge Functions,
// so it is the most important thing to test exhaustively.
export default defineConfig({
  test: {
    include: ['src/core/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@core': '/src/core',
      '@': '/src',
    },
  },
});
