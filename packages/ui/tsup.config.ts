import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  /*
   * ONE ENTRY PER COMPONENT, beside the root barrel.
   *
   * A single entry made every import of this package an import of all of it:
   * `import { Button }` pulled in about 170 KB of CSS, DataTable's 49 KB and
   * TimeWindowPicker's 19 KB among it, because the entry's 29 side-effect
   * stylesheet imports are side effects and a bundler may not drop them. With
   * a folder entry each, `@crewlethq/ui/Button` carries Button.css and nothing
   * else, and the root barrel still works for anyone who wants everything.
   */
  entry: ['src/index.ts', 'src/*/index.ts'],
  format: ['esm'],
  /*
   * DECLARATIONS ARE tsc's, not the bundler's. Rolling up a .d.ts per entry
   * runs one worker over the whole graph for each of the 78 folders, which
   * exhausts the heap on a 16 GB machine. tsc emits one file per source in
   * the same layout the entries already have, so ./dist/<Name>/index.d.ts
   * still answers the exports map.
   */
  dts: false,
  // Source maps are emitted for the local watch loop only. A published map
  // would embed the full TypeScript source through sourcesContent and point
  // at src/ paths the tarball does not contain, so it adds weight to every
  // install without helping a consumer debug anything.
  sourcemap: Boolean(options.watch),
  clean: true,
  splitting: true,
  /*
   * The peers and the sibling packages stay imports. @crewlethq/icons in
   * particular: bundled in, every glyph a component draws would be copied into
   * this package's output and the icons package's own tree shaking would be
   * defeated for every consumer.
   */
  external: ['react', 'react-dom', /^@crewlethq\//],
  loader: { '.css': 'copy' },
  treeshake: true,
  injectStyle: false,
}));
