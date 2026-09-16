/**
 * What a consumer actually carries when it imports ONE component.
 *
 * The package used to have a single entry, so `import { Button }` was an
 * import of all of it: the entry opens with a side-effect stylesheet import
 * per component, and a side effect is a thing a bundler may not drop. The
 * measured cost was about 170 KB of CSS for a button, DataTable's 49 KB and
 * TimeWindowPicker's 19 KB among it.
 *
 * The probe walks the built module graph the way a bundler does, from one
 * entry, collecting the stylesheets it would have to keep. A number this test
 * prints is the number a consumer pays.
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/*
 * By arithmetic on this file's own path rather than `new URL('..',
 * import.meta.url)`: Vite rewrites that pattern into an asset reference, so
 * the second form answers with an http URL into the dev server.
 */
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../../packages/ui/dist');

const IMPORTS = /(?:^|[\s;])(?:import|export)\s*(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g;

/** Every file the module at `entry` pulls in, stylesheets included. */
function graph(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const path = queue.pop()!;
    if (seen.has(path)) continue;
    seen.add(path);
    if (path.endsWith('.css')) continue;
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(IMPORTS)) {
      const specifier = match[1]!;
      // A bare specifier stays a dependency of the consumer's own graph.
      if (!specifier.startsWith('.')) continue;
      queue.push(resolve(dirname(path), specifier));
    }
  }
  return seen;
}

function stylesheets(entry: string): { files: string[]; bytes: number } {
  const files = [...graph(entry)]
    .filter((path) => path.endsWith('.css'))
    .map((path) => relative(DIST, path))
    .sort();
  const bytes = files.reduce((total, name) => total + statSync(join(DIST, name)).size, 0);
  return { files, bytes };
}

describe('a single-component import', () => {
  test('carries its own stylesheet and nobody else’s', () => {
    const button = stylesheets(join(DIST, 'Button/index.js'));
    expect(button.files.some((name) => name.includes('Button'))).toBe(true);
    // The two heaviest stylesheets in the package, and the reason this probe
    // exists: a button used to carry both.
    expect(button.files.some((name) => name.includes('DataTable'))).toBe(false);
    expect(button.files.some((name) => name.includes('TimeWindowPicker'))).toBe(false);
  });

  test('is a small fraction of the whole bundle', () => {
    const button = stylesheets(join(DIST, 'Button/index.js'));
    const everything = stylesheets(join(DIST, 'index.js'));
    // Printed rather than only asserted: the ratio is the number worth
    // watching, and a regression shows as a number rather than as a failure
    // nobody can size.
    console.warn(
      `[probe] Button carries ${button.bytes} bytes of CSS (${button.files.length} files); the root barrel carries ${everything.bytes} (${everything.files.length})`,
    );
    expect(button.bytes).toBeLessThan(everything.bytes / 8);
  });

  test('carries the stylesheet of everything it is built from', () => {
    /*
     * The defect this caught: every cross-folder import reached for the
     * component MODULE (`../Button/Button.js`) rather than the folder
     * (`../Button/index.js`), which is where the side-effect stylesheet import
     * lives. Under one entry that was invisible, because the entry imported
     * all 29 stylesheets anyway. Under a folder entry each, a Menu imported on
     * its own drew an unstyled button for its trigger.
     */
    const menu = stylesheets(join(DIST, 'Menu/index.js')).files.join(' ');
    for (const part of ['Menu', 'Button', 'IconButton', 'Layer', 'VisuallyHidden']) {
      expect({ part, in: menu.includes(part) }).toEqual({ part, in: true });
    }
  });

  test('a component that draws glyphs does not carry the glyph set', () => {
    /*
     * @crewlethq/icons stays a bare specifier somewhere in the entry's graph,
     * so the consumer's own bundler resolves and tree-shakes it. Bundled in,
     * every drawing a component used would be copied into this package and
     * the icons package's own shaking would be defeated for everybody.
     *
     * Read across the graph rather than out of the entry file: tsup splits
     * shared code into chunks, so the entry is usually a re-export line and
     * the import that matters is one hop away.
     */
    const text = [...graph(join(DIST, 'Menu/index.js'))]
      .filter((path) => path.endsWith('.js'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    expect(text).toMatch(/@crewlethq\/icons\/glyphs/);
    // And not a drawing's path data, which is what an inlined glyph looks like.
    expect(text).not.toMatch(/viewBox="0 -960 960 960"/);
  });
});
