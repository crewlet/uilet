/**
 * The runner for the real-browser layout suite: a headless browser, for what
 * jsdom cannot answer because it lays nothing out.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { readFileSync } from 'node:fs';
import { sourceAliases } from '../ui-tests/sources.js';

// The kit's runtime dependencies, bundled up front: found mid-run, each one
// reloaded the page under a running test.
const ui = JSON.parse(readFileSync(new URL('../../packages/ui/package.json', import.meta.url), 'utf8')) as {
  dependencies: Record<string, string>;
};
const runtime = Object.keys(ui.dependencies).filter((name) => !name.startsWith('@crewlethq/'));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: sourceAliases },
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', ...runtime] },
  test: {
    include: ['src/**/*.test.tsx'],
    setupFiles: ['./src/setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
