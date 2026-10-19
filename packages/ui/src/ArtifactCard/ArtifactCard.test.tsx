/**
 * One artifact as a card: one real link named by its title, the facts as its
 * description, and nothing inside a second control.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_KINDS, ArtifactCard, ArtifactPreviewGlyph } from './index.js';

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

test('says when it changed before who changed it, and leaves out a changer it was not given', () => {
  const said = () => document.querySelectorAll('.crewlet-artifact-card__line')[1]?.textContent ?? '';
  const { rerender } = render(
    <ArtifactCard title="Vendor scorecard" kind="sheet" href="#/a" owner={MAYA} updatedAt={NOW - 4 * 60_000} updatedBy="Ana" now={NOW} />,
  );
  // "Ana 4m ago" beside the owner read as a second owner.
  expect(said()).toMatch(/Maya Ortiz\s*Updated 4m ago by Ana$/);
  rerender(<ArtifactCard title="Vendor scorecard" kind="sheet" href="#/a" owner={MAYA} updatedAt={NOW - 4 * 60_000} now={NOW} />);
  expect(said()).toMatch(/Maya Ortiz\s*Updated 4m ago$/);
});

test('offers the whole title to a pointer, since the card cuts it to one line', () => {
  const long = 'Integration requirements review for the payments platform migration, second quarter';
  render(<ArtifactCard title={long} kind="sheet" href="#/a" updatedAt={NOW} now={NOW} />);
  expect(screen.getByRole('link', { name: long }).querySelector('[title]')?.getAttribute('title')).toBe(long);
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

test('gives every kind its own glyph and label when no preview is given', () => {
  const words: string[] = [];
  const drawings = new Set<string>();
  for (const kind of ARTIFACT_KINDS) {
    const { container, unmount } = render(<ArtifactCard title="Untitled" kind={kind} href="#/a" updatedAt={NOW} now={NOW} />);
    const glyph = container.querySelector('.crewlet-artifact-card__preview svg');
    expect(glyph, kind).not.toBeNull();
    drawings.add(glyph?.innerHTML ?? '');
    words.push(container.querySelector('.crewlet-artifact-card__line span')?.textContent ?? '');
    unmount();
  }
  expect(drawings.size).toBe(ARTIFACT_KINDS.length);
  expect(words).toEqual(['Page', 'Doc', 'Slides', 'Design', 'Dashboard', 'Sheet']);
});

test('a host whose cover has nothing to draw stands in the same glyph the card would', () => {
  // A cover that rendered nothing left an empty box: the card cannot see that
  // a preview it was given drew nothing, so the host draws the fallback.
  const { container } = render(
    <>
      <ArtifactCard title="Runbook" kind="sheet" href="#/a" updatedAt={NOW} now={NOW} />
      <ArtifactCard title="Runbook" kind="sheet" href="#/b" updatedAt={NOW} now={NOW} preview={<ArtifactPreviewGlyph kind="sheet" />} />
    </>,
  );
  const [own, given] = [...container.querySelectorAll('.crewlet-artifact-card__preview')];
  expect(given!.innerHTML).toBe(own!.innerHTML);
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
