import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  // Three entries, because they are three different weights. The root carries
  // the illustrations and the marks; ./glyphs carries 105 drawings a bundler
  // takes one at a time; ./glyphs/registry carries the lookup that needs all
  // of them, so that nothing pays for it by accident.
  entry: ['src/index.ts', 'src/glyphs.ts', 'src/glyphs-registry.ts'],
  format: ['esm'],
  dts: {
    /*
     * tsup's declaration build sets `baseUrl` on the program it creates
     * (`baseUrl: compilerOptions.baseUrl || '.'`), and TypeScript 6.0 turns
     * every use of that removed option into an error. Nothing in this
     * repository asks for `baseUrl`, and no tsup release drops it yet, so the
     * error is silenced where it is raised rather than in a tsconfig every
     * other check reads. It goes when tsup stops setting it.
     */
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  // Source maps are emitted for the local watch loop only. A published map
  // would embed the full TypeScript source through sourcesContent and point
  // at src/ paths the tarball does not contain, so it adds weight to every
  // install without helping a consumer debug anything.
  sourcemap: Boolean(options.watch),
  clean: true,
  external: ['react', 'react-dom'],
  // Copied beside the JS that imports it, as in @crewlethq/ui: the import
  // stays a side effect the consumer's bundler resolves, rather than rules
  // injected into the document at runtime.
  loader: { '.css': 'copy' },
  treeshake: true,
  injectStyle: false,
}));
