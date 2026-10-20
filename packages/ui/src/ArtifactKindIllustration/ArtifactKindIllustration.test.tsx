/**
 * A kind pictured: one drawing per kind in the kind's own hue, hidden from
 * assistive technology, and the Make something new tile, one link named by
 * the kind's name, or a stop that says why it cannot start one.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_KINDS } from '../ArtifactKindGlyph/index.js';
import { ArtifactKindGround, ArtifactKindIllustration, ArtifactKindTile } from './index.js';

afterEach(cleanup);

test('draws every kind its own picture, in its own hue, and hides it from assistive technology', () => {
  const drawings = new Set<string>();
  for (const kind of ARTIFACT_KINDS) {
    const { container, unmount } = render(<ArtifactKindIllustration kind={kind} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.classList.contains(`crewlet-kind--${kind}`)).toBe(true);
    // NO COLOUR OF ITS OWN: every mark takes the kind's token through a class.
    expect(svg.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|fill="(?!none)/i);
    drawings.add(svg.innerHTML);
    unmount();
  }
  expect(drawings.size).toBe(ARTIFACT_KINDS.length);
});

test("the ground draws the kind's picture unless it is given something else", () => {
  const { container, rerender } = render(<ArtifactKindGround kind="slides" />);
  const ground = container.querySelector('.crewlet-kind-ground')!;
  expect(ground.getAttribute('aria-hidden')).toBe('true');
  expect(ground.classList.contains('crewlet-kind--slides')).toBe(true);
  expect(ground.querySelector('svg')).not.toBeNull();
  rerender(
    <ArtifactKindGround kind="slides">
      <span data-testid="instead" />
    </ArtifactKindGround>,
  );
  expect(screen.getByTestId('instead')).toBeDefined();
  expect(container.querySelector('svg')).toBeNull();
});

test('a tile is one link named by the kind, with its tag read after the name', () => {
  render(<ArtifactKindTile kind="doc" label="Docs" href="#/artifacts/new?kind=doc" badge="New" />);
  const link = screen.getByRole('link', { name: 'Docs, New' });
  expect(link.getAttribute('href')).toBe('#/artifacts/new?kind=doc');
  expect(link.querySelector('.crewlet-kind-ground svg')).not.toBeNull();
});

test('a tile that cannot start stays a stop on the row and says why', () => {
  render(<ArtifactKindTile kind="sheet" label="Sheet" disabledReason="This needs the Artifacts app." />);
  const tile = screen.getByRole('link', { name: 'Sheet' });
  expect(tile.getAttribute('aria-disabled')).toBe('true');
  expect(tile.getAttribute('href')).toBeNull();
  expect(tile.tabIndex).toBe(0);
  expect(document.getElementById(tile.getAttribute('aria-describedby') ?? '')?.textContent).toBe('This needs the Artifacts app.');
});

test('a row of tiles carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Make something new</h1>
      <ul>
        {ARTIFACT_KINDS.map((kind) => (
          <li key={kind}>
            <ArtifactKindTile kind={kind} label={kind} href={`#/new?kind=${kind}`} />
          </li>
        ))}
        <li>
          <ArtifactKindTile kind="sheet" label="Sheet" disabledReason="Not now." />
        </li>
      </ul>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('a tile that opens something on the page is a button, said as pressed when its kind is chosen', () => {
  let chosen = '';
  const { rerender } = render(
    <ArtifactKindTile kind="dashboard" label="Dashboard" appearance="chip" onSelect={() => (chosen = 'dashboard')} selected={false} />,
  );
  const button = screen.getByRole('button', { name: 'Dashboard' });
  expect(button.getAttribute('aria-pressed')).toBe('false');
  button.click();
  expect(chosen).toBe('dashboard');
  rerender(<ArtifactKindTile kind="dashboard" label="Dashboard" appearance="chip" onSelect={() => {}} selected />);
  expect(screen.getByRole('button', { name: 'Dashboard' }).getAttribute('aria-pressed')).toBe('true');
});

test("a tile's hint describes it, and a chip draws its shortcut and no hint", () => {
  const { rerender } = render(<ArtifactKindTile kind="doc" label="Docs" hint="You write it" appearance="stage" href="#/new" />);
  const link = screen.getByRole('link', { name: 'Docs' });
  expect(document.getElementById(link.getAttribute('aria-describedby') ?? '')?.textContent).toBe('You write it');
  // THE STAGE pictures the kind's object and its maker character together.
  expect(link.querySelector('.crewlet-kind-illustration')).not.toBeNull();
  expect(link.querySelector('.crewlet-kind-mark svg[data-character="pagelet"]')).not.toBeNull();
  rerender(<ArtifactKindTile kind="doc" label="Docs" hint="You write it" appearance="chip" shortcut="D" href="#/new" />);
  const chip = screen.getByRole('link', { name: 'Docs' });
  expect(chip.getAttribute('aria-describedby')).toBeNull();
  expect(chip.querySelector('kbd')?.textContent).toBe('D');
});

test('every appearance draws the kind, and a preview tile frames what it is given', () => {
  for (const appearance of ['illustration', 'stage', 'figure', 'chip', 'preview'] as const) {
    const { container, unmount } = render(
      <ArtifactKindTile kind="sheet" label="Sheet" appearance={appearance} href="#/new">
        <span data-testid="live" />
      </ArtifactKindTile>,
    );
    const tile = container.querySelector('.crewlet-kind-tile')!;
    expect(tile.classList.contains(`crewlet-kind-tile--${appearance}`)).toBe(true);
    expect(tile.classList.contains('crewlet-kind--sheet')).toBe(true);
    expect(container.querySelector('[data-testid="live"]') !== null).toBe(appearance === 'preview');
    unmount();
  }
});

test('a row of every appearance carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Make something new</h1>
      <ul>
        {(['stage', 'figure', 'chip', 'preview'] as const).map((appearance) => (
          <li key={appearance}>
            <ArtifactKindTile
              kind="design"
              label={`Design ${appearance}`}
              hint="An agent designs it"
              appearance={appearance}
              onSelect={() => {}}
              selected={false}
            />
          </li>
        ))}
      </ul>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
