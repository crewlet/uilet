/**
 * One artifact as a card: one real link named by its title, the facts as its
 * description, and nothing inside a second control.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ArtifactCard } from './index.js';

afterEach(cleanup);

const NOW = Date.parse('2026-10-17T12:00:00Z');
const MAYA = { id: 'maya', kind: 'person' as const, name: 'Maya Ortiz' };

test('is one link, named by the title alone and described by its facts', () => {
  render(
    <ArtifactCard
      title="Vendor scorecard"
      kind="sheet"
      href="#/artifacts/7b0c"
      owner={MAYA}
      updatedAt={NOW - 4 * 60_000}
      updatedBy="Maya"
      project="OPS"
      version={12}
      changes={14}
      presence={[{ name: 'Maya Ortiz', kind: 'human' }, { name: 'PM', character: 'gemlet', hue: 'rose' }]}
      pinned
      now={NOW}
    />,
  );
  const link = screen.getByRole('link', { name: 'Vendor scorecard' });
  expect(link.getAttribute('href')).toBe('#/artifacts/7b0c');
  const facts = document.getElementById(link.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
  for (const fact of ['Sheet', 'OPS', 'v12', 'Pinned', 'Maya Ortiz', '4m ago', '2 here now', '14 changes since you looked']) {
    expect(facts).toContain(fact);
  }
  expect(link.querySelectorAll('button, a[href] a[href], input')).toHaveLength(0);
});

test('draws no changes line for none, and none for never opened', () => {
  const { rerender } = render(<ArtifactCard title="Pricing explorer" kind="html" href="#/a" updatedAt={NOW} changes={0} now={NOW} />);
  expect(screen.queryByText(/since you looked/)).toBeNull();
  rerender(<ArtifactCard title="Pricing explorer" kind="html" href="#/a" updatedAt={NOW} now={NOW} />);
  expect(screen.queryByText(/since you looked/)).toBeNull();
});

test('stands the kind glyph in for a missing preview, and draws a given preview instead', () => {
  const { container, rerender } = render(<ArtifactCard title="Runbook" kind="doc" href="#/a" updatedAt={NOW} now={NOW} />);
  expect(container.querySelector('.crewlet-artifact-card__preview svg')).not.toBeNull();
  rerender(<ArtifactCard title="Runbook" kind="doc" href="#/a" updatedAt={NOW} now={NOW} preview={<span data-testid="cover">cover</span>} />);
  expect(screen.getByTestId('cover')).toBeDefined();
});

test('compact draws no preview', () => {
  const { container } = render(<ArtifactCard title="Runbook" kind="doc" href="#/a" updatedAt={NOW} size="compact" now={NOW} />);
  expect(container.querySelector('.crewlet-artifact-card__preview')).toBeNull();
  expect(container.querySelector('.crewlet-artifact-card--compact')).not.toBeNull();
});

test('carries no axe violation, as a card and compact', async () => {
  const { container } = render(
    <main>
      <h1>Artifacts</h1>
      <ArtifactCard title="Vendor scorecard" kind="sheet" href="#/a" owner={MAYA} updatedAt={NOW} pinned changes={3} now={NOW} />
      <ArtifactCard title="Runbook" kind="doc" href="#/b" updatedAt={NOW} size="compact" now={NOW} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
