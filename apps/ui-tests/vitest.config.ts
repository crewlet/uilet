/**
 * The runner for the @crewlethq/ui jsdom suites.
 *
 * It is a workspace of its own, and a private one, because
 * `scripts/release.mjs build` installs the published workspaces together with
 * their devDependencies: a test runner declared on packages/ui would be
 * installed by the release pack job, which has no use for one.
 *
 * The suites themselves live BESIDE the components they cover, in
 * `packages/ui/src/<Name>/<Name>.test.tsx`, as uilet's conventions ask. Only
 * the runner lives here.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { sourceAliases } from './sources.js';

export default defineConfig({
  plugins: [react()],
  resolve: {
    /* The suites import `@crewlethq/ui` the way a consumer does, from its source (`sources.ts`). */
    alias: sourceAliases,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', '../../packages/ui/src/**/*.test.ts', '../../packages/ui/src/**/*.test.tsx'],
    setupFiles: ['./src/setup.ts'],
    server: {
      deps: {
        /*
         * Vitest externalises node_modules, and Node has no loader for a CSS
         * file, so a module that opens with side-effect CSS imports throws
         * `TypeError: Unknown file extension ".css"` and takes the whole run
         * with it. @crewlethq/ui's published entry opens with 29 of them.
         *
         * Inlining the scope hands those modules to Vite instead, which
         * resolves a CSS import to an empty module in a test run. It is
         * declared here rather than left to the workspace's symlinks: a
         * symlinked workspace resolves to a real path outside node_modules
         * and is inlined anyway, so without this line the arrangement would
         * work here and fail in every consumer that installs the tarball.
         */
        inline: [/@crewlethq\//],
      },
    },
  },
});
