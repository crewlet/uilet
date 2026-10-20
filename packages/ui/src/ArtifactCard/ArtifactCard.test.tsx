/**
 * One artifact as a card: one real link named by its title, the facts as its
 * description, the kind on a badge over the preview's foot, who can open it
 * and when it was edited on one quiet line, and the card's own controls
 * beside the link rather than inside it.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_KINDS, ArtifactCard, ArtifactCardSkeleton, ArtifactPreviewGlyph } from './index.js';

afterEach(cleanup);

const NOW = Date.parse('2026-10-17T12:00:00Z');
const MAYA = { id: 'maya', kind: 'person' as const, name: 'Maya Ortiz' };

function factsOf(link: HTMLElement): string {
  return document.getElementById(link.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
}

test('is one link, named by the title alone and described by its facts', () => {
  render(
    <ArtifactCard
      title="Vendor scorecard"
      kind="sheet"
      href="#/artifacts/7b0c"
      owner={MAYA}
      updatedAt={NOW - 4 * 60_000}
      updatedBy="Ana"
      access="shared"
      changes={14}
      presence={[{ name: 'Maya Ortiz', kind: 'human' }, { name: 'PM', character: 'gemlet', hue: 'rose' }]}
      pinned
      now={NOW}
    />,
  );
  const link = screen.getByRole('link', { name: 'Vendor scorecard' });
  expect(link.getAttribute('href')).toBe('#/artifacts/7b0c');
  const facts = factsOf(link);
  for (const fact of ['Sheet', 'Pinned', 'Shared', 'Maya Ortiz', 'Edited 4m ago by Ana', '2 here now', '14 changes since you looked']) {
    expect(facts).toContain(fact);
  }
  expect(link.querySelectorAll('button, a[href] a[href], input')).toHaveLength(0);
});

test('says who can open it by a glyph and its words, for each audience', () => {
  const said: string[] = [];
  for (const access of ['private', 'shared', 'company'] as const) {
    const { unmount } = render(<ArtifactCard title="Runbook" kind="doc" href="#/a" updatedAt={NOW} access={access} now={NOW} />);
    const glyph = document.querySelector('.crewlet-artifact-card__access');
    expect(glyph?.querySelector('svg'), access).not.toBeNull();
    said.push(glyph?.getAttribute('title') ?? '');
    unmount();
  }
  expect(said).toEqual(['Private', 'Shared', 'Shared with the company']);
});

test('says when it was edited, and by whom only when that is not the owner already named', () => {
  const said = () => document.querySelector('.crewlet-artifact-card__meta')?.textContent ?? '';
  const { rerender } = render(<ArtifactCard title="Vendor scorecard" kind="sheet" href="#/a" owner={MAYA} updatedAt={NOW - 4 * 60_000} updatedBy="Ana" now={NOW} />);
  expect(said()).toMatch(/Maya Ortiz\s*Edited 4m ago by Ana$/);
  rerender(<ArtifactCard title="Vendor scorecard" kind="sheet" href="#/a" owner={MAYA} updatedAt={NOW - 4 * 60_000} updatedBy="Maya Ortiz" now={NOW} />);
  expect(said()).toMatch(/Maya Ortiz\s*Edited 4m ago$/);
});

test("draws its actions beside its link, where a keyboard reaches them after it", () => {
  render(<ArtifactCard title="Runbook" kind="doc" href="#/a" updatedAt={NOW} now={NOW} actions={<button type="button">More for Runbook</button>} />);
  const link = screen.getByRole('link', { name: 'Runbook' });
  const more = screen.getByRole('button', { name: 'More for Runbook' });
  expect(link.contains(more)).toBe(false);
  expect(link.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

test("stands the kind's drawing in for a missing preview, and draws a given preview instead", () => {
  const { container, rerender } = render(<ArtifactCard title="Runbook" kind="doc" href="#/a" updatedAt={NOW} now={NOW} />);
  expect(container.querySelector('.crewlet-artifact-card__preview .crewlet-kind-ground svg')).not.toBeNull();
  rerender(<ArtifactCard title="Runbook" kind="doc" href="#/a" updatedAt={NOW} now={NOW} preview={<span data-testid="cover">cover</span>} />);
  expect(screen.getByTestId('cover')).toBeDefined();
});

test('gives every kind its own drawing, badge and word when no preview is given', () => {
  const words: string[] = [];
  const drawings = new Set<string>();
  const badges = new Set<string>();
  for (const kind of ARTIFACT_KINDS) {
    const { container, unmount } = render(<ArtifactCard title="Untitled" kind={kind} href="#/a" updatedAt={NOW} now={NOW} />);
    const drawing = container.querySelector('.crewlet-artifact-card__preview svg');
    expect(drawing, kind).not.toBeNull();
    drawings.add(drawing?.innerHTML ?? '');
    badges.add(container.querySelector('.crewlet-artifact-card__badge svg')?.innerHTML ?? '');
    words.push(factsOf(screen.getByRole('link', { name: 'Untitled' })).split('Edited')[0] ?? '');
    unmount();
  }
  expect(drawings.size).toBe(ARTIFACT_KINDS.length);
  expect(badges.size).toBe(ARTIFACT_KINDS.length);
  expect(words).toEqual(['HTML', 'Doc', 'Slides', 'Design', 'Dashboard', 'Sheet']);
});

test('a host whose cover has nothing to draw stands in the same drawing the card would', () => {
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

test('a card in the trash says so in its look', () => {
  const { container } = render(<ArtifactCard title="Old draft" kind="doc" href="#/a" updatedAt={NOW} trashed now={NOW} />);
  expect(container.querySelector('.crewlet-artifact-card--trashed')).not.toBeNull();
});

test('compact draws no preview and no actions, and keeps its facts', () => {
  const { container } = render(
    <ArtifactCard title="Runbook" kind="doc" href="#/a" updatedAt={NOW} size="compact" version={3} project="OPS" now={NOW} actions={<button type="button">More</button>} />,
  );
  expect(container.querySelector('.crewlet-artifact-card__preview')).toBeNull();
  expect(container.querySelector('.crewlet-artifact-card--compact')).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  expect(factsOf(screen.getByRole('link', { name: 'Runbook' }))).toMatch(/Doc.*OPS.*v3/);
});

test('says the owner once when the owner made the latest change', () => {
  render(<ArtifactCard title="Vendor scorecard" kind="sheet" href="#/artifacts/7b0c" owner={MAYA} updatedAt={NOW - 4 * 60_000} updatedBy="Maya Ortiz" size="compact" now={NOW} />);
  const facts = factsOf(screen.getByRole('link', { name: 'Vendor scorecard' }));
  expect(facts.match(/Maya Ortiz/g)).toHaveLength(1);
  expect(facts).toContain('Edited 4m ago');
});

test("the placeholder is the card's own shape and is hidden from assistive technology", () => {
  const { container } = render(<ArtifactCardSkeleton />);
  const skeleton = container.querySelector('.crewlet-artifact-card--skeleton');
  expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
  expect(skeleton?.querySelector('.crewlet-artifact-card__preview')).not.toBeNull();
  expect(skeleton?.querySelector('.crewlet-artifact-card__badge')).not.toBeNull();
});

test('carries no axe violation, as a card and compact', async () => {
  const { container } = render(
    <main>
      <h1>Artifacts</h1>
      <ArtifactCard
        title="Vendor scorecard"
        kind="sheet"
        href="#/a"
        owner={MAYA}
        updatedAt={NOW}
        access="company"
        pinned
        changes={3}
        now={NOW}
        actions={<button type="button">More for Vendor scorecard</button>}
      />
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

test('the tile is the card a step smaller, its badge the kind\'s glyph', () => {
  const { container } = render(<ArtifactCard title="Beta health" kind="dashboard" href="#/artifacts/b" updatedAt={NOW} now={NOW} size="tile" />);
  const card = container.querySelector('.crewlet-artifact-card')!;
  expect(card.classList.contains('crewlet-artifact-card--card')).toBe(true);
  expect(card.classList.contains('crewlet-artifact-card--tile')).toBe(true);
  // THE BADGE IS THE KIND'S GLYPH IN ITS INK, as on every card.
  const badge = container.querySelector('.crewlet-artifact-card__badge')!;
  expect(badge.classList.contains('crewlet-kind--dashboard')).toBe(true);
  expect(badge.querySelector('svg')).not.toBeNull();
  expect(factsOf(screen.getByRole('link', { name: 'Beta health' }))).toContain('Dashboard');
});

test("a tile skeleton is the tile's shape", () => {
  const { container } = render(<ArtifactCardSkeleton size="tile" />);
  expect(container.querySelector('.crewlet-artifact-card--tile.crewlet-artifact-card--skeleton')).not.toBeNull();
});
