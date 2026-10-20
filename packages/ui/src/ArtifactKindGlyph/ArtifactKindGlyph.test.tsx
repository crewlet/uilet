/**
 * A kind's glyph: one drawing per kind, at the size it is asked for, from a
 * module that carries nothing else.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_KINDS, ArtifactKindGlyph } from './index.js';

afterEach(cleanup);

test('draws every kind its own glyph', () => {
  const drawings = new Set<string>();
  for (const kind of ARTIFACT_KINDS) {
    const { container, unmount } = render(<ArtifactKindGlyph kind={kind} />);
    expect(container.querySelector('svg'), kind).not.toBeNull();
    drawings.add(container.innerHTML);
    unmount();
  }
  expect(drawings.size).toBe(ARTIFACT_KINDS.length);
});

test('draws at the size it is given', () => {
  const small = render(<ArtifactKindGlyph kind="sheet" size="sm" />).container.innerHTML;
  cleanup();
  const large = render(<ArtifactKindGlyph kind="sheet" size={32} />).container.innerHTML;
  expect(small).not.toBe(large);
});

test('imports nothing but the glyphs and carries no stylesheet', () => {
  /*
   * A bundler places a module whole. A sidebar or a palette that draws one
   * kind glyph takes everything this module imports into the host's first
   * screen, so it may import the glyphs it draws and nothing else: no card,
   * no drawing, no sheet. The glyph lived in ArtifactCard's module once, and
   * every host that drew one took the card and the kind drawings with it.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const specifiers = (file: string) =>
    [
      ...readFileSync(join(here, file), 'utf8').matchAll(
        /^(?:import|export)\b[^;]*?\bfrom\s+['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]/gm,
      ),
    ].map((match) => match[1] ?? match[2]);
  expect(specifiers('ArtifactKindGlyph.tsx')).toEqual(['@crewlethq/icons/glyphs']);
  expect(specifiers('index.ts')).toEqual(['./ArtifactKindGlyph.js', './ArtifactKindGlyph.js']);
});
