/**
 * The "Start a new artifact" tray: one link per kind named by the kind, what it
 * is for read as its description, the kind's glyph tinted by the kind and
 * hidden from assistive technology, and a kind a reader cannot start kept as
 * a stop that says why.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_KINDS } from '../ArtifactKindGlyph/index.js';
import { ArtifactMakeRow } from './index.js';

afterEach(cleanup);

test('each kind is one link named by the kind, with what it is for as its description', () => {
  render(<ArtifactMakeRow aria-label="Start a new artifact" items={[{ kind: 'dashboard', label: 'Dashboard', detail: 'Live figures', href: '#/artifacts/new/dashboard' }]} />);
  const link = screen.getByRole('link', { name: 'Dashboard' });
  expect(link.getAttribute('href')).toBe('#/artifacts/new/dashboard');
  expect(document.getElementById(link.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Live figures');
  // THE GLYPH IS THE KIND'S, tinted by the kind's class, and never read.
  const mark = link.querySelector('.crewlet-make-row__mark')!;
  expect(mark.classList.contains('crewlet-kind--dashboard')).toBe(true);
  expect(mark.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByRole('list', { name: 'Start a new artifact' })).toBeDefined();
});

test('a kind the reader cannot start stays a stop on the row and says why', () => {
  render(<ArtifactMakeRow aria-label="Start a new artifact" items={[{ kind: 'sheet', label: 'Sheet', detail: 'A table to fill in', disabledReason: 'This needs the Artifacts app.' }]} />);
  const item = screen.getByRole('link', { name: 'Sheet' });
  expect(item.getAttribute('aria-disabled')).toBe('true');
  expect(item.getAttribute('href')).toBeNull();
  expect(item.tabIndex).toBe(0);
  expect(document.getElementById(item.getAttribute('aria-describedby') ?? '')?.textContent).toBe('This needs the Artifacts app.');
});

test('a row of every kind carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1 id="make">Start a new artifact</h1>
      <ArtifactMakeRow
        aria-labelledby="make"
        items={[
          ...ARTIFACT_KINDS.map((kind) => ({ kind, label: kind, detail: `A ${kind}`, href: `#/new/${kind}` })),
          { kind: 'sheet' as const, label: 'Sheet', disabledReason: 'Not now.' },
        ]}
      />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('the tray lays out the kinds it is given, with no empty cell', () => {
  /*
   * Offered five kinds (New design hidden), the tray drew them in six fixed
   * columns with an empty sixth of dotted field at the end of the line, and
   * three across on a phone with a hole after the fifth. The count reaches
   * the stylesheet, and the stylesheet spends it.
   */
  const five = ARTIFACT_KINDS.slice(0, 5).map((kind) => ({ kind, label: kind, href: `#/artifacts/new/${kind}` }));
  render(<ArtifactMakeRow aria-label="Start a new artifact" items={five} />);
  const list = screen.getByRole('list', { name: 'Start a new artifact' });
  expect(list.getAttribute('data-count')).toBe('5');
  expect(list.style.getPropertyValue('--crewlet-make-row-count')).toBe('5');

  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(here, 'ArtifactMakeRow.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // The line is a column per kind, never a fixed six.
  const wide = css.slice(css.indexOf('@container (width >= 560px)'));
  expect(wide).toMatch(/grid-template-columns:\s*repeat\(var\(--crewlet-make-row-count, 6\), minmax\(0, 1fr\)\);/);
  // The narrow tray centres a short last row, and fills rows of two and four.
  const narrow = css.slice(css.indexOf('@container (width < 560px)'), css.indexOf('@container (width >= 560px)'));
  expect(narrow).toMatch(/:nth-child\(3n \+ 1\):nth-last-child\(2\)\s*\{\s*grid-column:\s*2 \/ span 2;/);
  expect(narrow).toMatch(/:nth-child\(3n \+ 1\):last-child\s*\{\s*grid-column:\s*3 \/ span 2;/);
  expect(narrow).toMatch(/\[data-count='2'\], \[data-count='4'\]\) > \.crewlet-make-row__cell\s*\{\s*grid-column:\s*span 3;/);
});
