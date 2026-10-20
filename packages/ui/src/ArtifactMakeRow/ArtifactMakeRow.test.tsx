/**
 * The Make something new tray: one link per kind named by the kind, what it
 * is for read as its description, the kind's glyph tinted by the kind and
 * hidden from assistive technology, and a kind a reader cannot start kept as
 * a stop that says why.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_KINDS } from '../ArtifactKindGlyph/index.js';
import { ArtifactMakeRow } from './index.js';

afterEach(cleanup);

test('each kind is one link named by the kind, with what it is for as its description', () => {
  render(<ArtifactMakeRow aria-label="Make something new" items={[{ kind: 'dashboard', label: 'Dashboard', detail: 'Live figures', href: '#/artifacts/new/dashboard' }]} />);
  const link = screen.getByRole('link', { name: 'Dashboard' });
  expect(link.getAttribute('href')).toBe('#/artifacts/new/dashboard');
  expect(document.getElementById(link.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Live figures');
  // THE GLYPH IS THE KIND'S, tinted by the kind's class, and never read.
  const mark = link.querySelector('.crewlet-make-row__mark')!;
  expect(mark.classList.contains('crewlet-kind--dashboard')).toBe(true);
  expect(mark.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByRole('list', { name: 'Make something new' })).toBeDefined();
});

test('a kind the reader cannot start stays a stop on the row and says why', () => {
  render(<ArtifactMakeRow aria-label="Make something new" items={[{ kind: 'sheet', label: 'Sheet', detail: 'A table to fill in', disabledReason: 'This needs the Artifacts app.' }]} />);
  const item = screen.getByRole('link', { name: 'Sheet' });
  expect(item.getAttribute('aria-disabled')).toBe('true');
  expect(item.getAttribute('href')).toBeNull();
  expect(item.tabIndex).toBe(0);
  expect(document.getElementById(item.getAttribute('aria-describedby') ?? '')?.textContent).toBe('This needs the Artifacts app.');
});

test('a row of every kind carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1 id="make">Make something new</h1>
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
