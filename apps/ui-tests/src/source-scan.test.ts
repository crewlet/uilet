/**
 * Four rules about what a component's SOURCE may contain, which no runtime
 * test can reach because every one of the failures is invisible until somebody
 * looks.
 *
 * 1. A glyph is an SVG, never a font ligature. A component that spells
 *    `material-symbols-outlined` renders a word until a stylesheet it does not
 *    own has fetched a font from a third-party host, and renders that word for
 *    good on a closed network. @crewlethq/icons ships the drawings.
 *
 * 2. Nothing injects a `<style>` element. A style element inside an inline SVG
 *    applies to the WHOLE document, and a strict Content-Security-Policy
 *    refuses it outright, so the rules belong in a stylesheet the bundler
 *    emits.
 *
 * 3. Every ResizeObserver is feature-checked. It is absent in older embedded
 *    browsers, where an unguarded `new ResizeObserver` throws inside an effect
 *    and takes the component down with it — and it is absent in jsdom, so a
 *    suite only catches this where it has not installed a stub. Four call
 *    sites guarded and one did not, which is exactly the shape a convention
 *    held by memory decays into, so it is a scan rather than a habit.
 *
 * 4. A phase has no colour. It is a category, drawn in the neutral colour with
 *    its word, and inside a figure it is a series the application maps it
 *    onto. @crewlethq/tokens shipped a phase family once, three hues and their
 *    inks and tints, and a component that reads one again, or draws a phase
 *    modifier a stylesheet would have to paint, is bringing it back. The
 *    package's variable check would refuse the token once it is unemitted, as
 *    it refuses any; this names the rule, so the failure says why.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/*
 * The repository root by arithmetic on this file's own path, rather than
 * `new URL('../..', import.meta.url)`: Vite rewrites that pattern into an
 * asset reference, so the second form answers with an http URL into the dev
 * server and a filesystem read of it throws.
 */
const REPOSITORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROOTS = ['ui', 'icons'].map((name) => join(REPOSITORY, 'packages', name, 'src'));
const SOURCE = /\.(tsx?|css)$/;

function sources(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...sources(path));
    else if (SOURCE.test(entry)) found.push(path);
  }
  return found;
}

const files = ROOTS.flatMap(sources).map((path) => ({ path: relative(REPOSITORY, path), text: readFileSync(path, 'utf8') }));

describe('component source', () => {
  test('the scan reads the files it claims to', () => {
    // A scan that found nothing would pass both rules below for any tree.
    expect(files.length).toBeGreaterThan(50);
    expect(files.some(({ path }) => path.endsWith('Button/Button.tsx'))).toBe(true);
    expect(files.some(({ path }) => path.endsWith('.css'))).toBe(true);
  });

  test('no component draws a glyph as a Material Symbols ligature', () => {
    const offenders = files.filter(({ text }) => text.includes('material-symbols-outlined')).map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  test('no component injects a style element', () => {
    /*
     * Component source only. A stylesheet cannot contain a style element, so
     * scanning one for the string finds nothing but prose: the rule caught
     * CrewletFigure.css, whose header explains why the figure's rules stopped
     * being a style element.
     */
    const offenders = files
      .filter(({ path }) => !path.endsWith('.css'))
      .filter(({ text }) => /<style[\s>]|createElement\(\s*['"]style['"]/.test(text))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});

describe('a phase', () => {
  test('is never a colour: no component reads a phase hue or draws a phase modifier', () => {
    /*
     * Both spellings the family had: the token a stylesheet reads, and the
     * BEM modifier a component built from a phase tone (`crewlet-tag--phase-…`,
     * `crewlet-status-dot--phase-…`). Named by the file and the line, so a hit
     * says where. A suite is left out, because the Tag and StatusDot suites
     * spell the modifier to assert that nothing draws it.
     */
    const offenders: string[] = [];
    for (const { path, text } of files) {
      if (path.includes('.test.')) continue;
      for (const [index, line] of text.split('\n').entries()) {
        if (/--color-phase-|crewlet-[\w-]+--phase-/.test(line)) offenders.push(`${path}:${index + 1}`);
      }
    }
    expect(offenders, 'a phase is the neutral colour and its word').toEqual([]);
  });
});

describe('every ResizeObserver', () => {
  test('is constructed only behind a feature check', () => {
    const unguarded: string[] = [];
    for (const file of files) {
      if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) continue;
      if (file.path.includes('.test.')) continue;
      /*
       * Comments blanked before the scan, and kept line-for-line so a hit
       * still names its real line: the guard is DESCRIBED in prose beside
       * several of these, and a scan that reads the prose reports the
       * explanation as the offence.
       */
      const code = file.text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '');
      const lines = code.split('\n');
      for (const [index, line] of lines.entries()) {
        if (!/\bnew ResizeObserver\b/.test(line)) continue;
        /*
         * The guard is on the construction's own line — the ternary form Tabs
         * and CodeBlock use — or on a line above it in the same function. Ten
         * lines is generous enough for an early return with its comment and
         * tight enough that the next function's guard cannot be borrowed.
         */
        const above = lines.slice(Math.max(0, index - 10), index + 1).join('\n');
        const guarded =
          /typeof ResizeObserver (===|!==) ['"](function|undefined)['"]/.test(above) ||
          /'ResizeObserver' in (window|globalThis)/.test(above);
        if (!guarded) unguarded.push(`${file.path}:${index + 1}`);
      }
    }
    expect(unguarded, 'construct it behind `typeof ResizeObserver === \'function\'`').toEqual([]);
  });

  test('and the scan can tell, so it cannot pass on nothing', () => {
    // The floor every gate in this workspace carries: a scan that found no
    // call sites at all would satisfy the test above perfectly.
    const sites = files.filter((file) => /\bnew ResizeObserver\b/.test(file.text));
    expect(sites.length).toBeGreaterThanOrEqual(4);
  });
});
