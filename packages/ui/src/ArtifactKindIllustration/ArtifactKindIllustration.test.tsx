/**
 * A kind pictured: one drawing per kind in the kind's own hue, hidden from
 * assistive technology, and the Make something new tile, one link named by
 * the kind's name, or a stop that says why it cannot start one.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
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

test('a tile that starts something in place is a button with its own face and a line saying what it starts', () => {
  const onSelect = vi.fn();
  render(
    <ArtifactKindTile
      kind="design"
      label="Landing page"
      detail="3 boards"
      face={<span data-testid="face" />}
      onSelect={onSelect}
    />,
  );
  const tile = screen.getByRole('button', { name: 'Landing page' });
  expect(document.getElementById(tile.getAttribute('aria-describedby') ?? '')?.textContent).toBe('3 boards');
  expect(screen.getByTestId('face').closest('.crewlet-kind-ground')).not.toBeNull();
  expect(tile.querySelector('svg')).toBeNull();
  fireEvent.click(tile);
  expect(onSelect).toHaveBeenCalledTimes(1);
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
        <li>
          <ArtifactKindTile kind="design" label="Blank canvas" detail="No boards yet" onSelect={() => {}} selected />
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

test('a starting tile that is chosen is a pressed button with a check, and one that is not carries no state', () => {
  render(
    <>
      <ArtifactKindTile kind="design" label="Landing page" onSelect={() => {}} selected />
      <ArtifactKindTile kind="design" label="App screens" onSelect={() => {}} selected={false} />
      <ArtifactKindTile kind="design" label="Blank canvas" onSelect={() => {}} />
    </>,
  );
  const chosen = screen.getByRole('button', { name: 'Landing page' });
  expect(chosen.getAttribute('aria-pressed')).toBe('true');
  expect(chosen.classList.contains('is-selected')).toBe(true);
  expect(chosen.querySelector('.crewlet-kind-tile__check')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'App screens' }).getAttribute('aria-pressed')).toBe('false');
  // A tile with no `selected` is an action, not a toggle.
  const plain = screen.getByRole('button', { name: 'Blank canvas' });
  expect(plain.hasAttribute('aria-pressed')).toBe(false);
  expect(plain.querySelector('.crewlet-kind-tile__check')).toBeNull();
});

test('a starting tile draws one edge: its ground has no inner line, and its chosen state is the selected pair', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'ArtifactKindIllustration.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(/\.crewlet-kind-tile--button \.crewlet-kind-tile__ground\s*\{\s*box-shadow:\s*none;\s*\}/.test(css)).toBe(true);
  const chosen = /\.crewlet-kind-tile--button\.is-selected \.crewlet-kind-tile__frame,[^{]*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(chosen).toMatch(/border-color:\s*var\(--color-border-selected\)/);
  expect(chosen).toMatch(/var\(--color-surface-selected\)/);
  expect(chosen).not.toMatch(/--color-brand-accent\)|outline/);
});
