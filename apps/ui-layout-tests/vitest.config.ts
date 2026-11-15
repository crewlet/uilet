/**
 * The runner for the real-browser layout suite: a headless browser, for what
 * jsdom cannot answer because it lays nothing out.
 */
import { configDefaults, defineConfig } from 'vitest/config';
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

// THE FILES THAT MEASURE WHAT A SCROLLBAR TAKES run on a browser that draws
// scrollbars in the layout, as a reader's does. The runner launches its
// headless browser with them hidden, and there a scroller that overflows gives
// up no width, so a box that loses the bar's width in every reader's browser
// measured whole. The rest of the suite keeps the default, whose fixtures are
// sized for it.
const SCROLLBARS = 'src/**/*.scrollbars.test.tsx';

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
      instances: [
        { browser: 'chromium', exclude: [...configDefaults.exclude, SCROLLBARS] },
        {
          browser: 'chromium',
          name: 'chromium-scrollbars',
          include: [SCROLLBARS],
          provider: playwright({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } }),
        },
      ],
    },
  },
});
