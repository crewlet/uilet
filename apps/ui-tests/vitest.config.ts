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
import { fileURLToPath } from 'node:url';

const packages = (path: string) => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    /*
     * The suites import `@crewlethq/ui` the way a consumer does, and it
     * resolves to the SOURCE, so a run needs no build of the package under
     * test and a failure points at a line somebody can edit.
     */
    /*
     * An ARRAY, and longest first: an object alias matches the whole
     * specifier, so `@crewlethq/icons` alone leaves `@crewlethq/icons/glyphs`
     * unresolved, which is the entry every component draws its glyphs from.
     */
    alias: [
      { find: '@crewlethq/icons/glyphs/registry', replacement: packages('icons/src/glyphs-registry.ts') },
      { find: '@crewlethq/icons/glyphs', replacement: packages('icons/src/glyphs.ts') },
      { find: '@crewlethq/icons', replacement: packages('icons/src/index.ts') },
      { find: '@crewlethq/ui', replacement: packages('ui/src/index.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', '../../packages/ui/src/**/*.test.tsx'],
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
