/**
 * Two rules about what a component's SOURCE may contain, which no runtime test
 * can reach because both failures are invisible until somebody looks.
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
