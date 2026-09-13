import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  // Source maps are emitted for the local watch loop only. A published map
  // would embed the full TypeScript source through sourcesContent and point
  // at src/ paths the tarball does not contain, so it adds weight to every
  // install without helping a consumer debug anything.
  sourcemap: Boolean(options.watch),
  clean: true,
  external: ['react', 'react-dom'],
  loader: { '.css': 'copy' },
  treeshake: true,
  injectStyle: false,
}));
