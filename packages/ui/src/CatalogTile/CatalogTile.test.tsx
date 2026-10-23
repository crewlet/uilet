/**
 * CatalogTile: a named entry with a mark, a state only when it has one, and a
 * foot only when it has something to put there.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { CatalogTile } from './index.js';

afterEach(cleanup);

test('is an article named by its heading', () => {
  render(<CatalogTile mark={<svg />} title="GitHub" description="Issues and pull requests." />);
  const tile = screen.getByRole('article', { name: 'GitHub' });
  expect(screen.getByRole('heading', { level: 2, name: 'GitHub' })).toBeTruthy();
  expect(tile.querySelector('.crewlet-catalog-tile__mark')!.getAttribute('aria-hidden')).toBe('true');
});

test('takes its heading level from where it stands', () => {
  render(
    <HeadingLevelProvider level={3}>
      <CatalogTile mark={<svg />} title="Slack" />
    </HeadingLevelProvider>,
  );
  expect(screen.getByRole('heading', { level: 3, name: 'Slack' })).toBeTruthy();
});

test('draws a state only when given one', () => {
  const { container, rerender } = render(<CatalogTile mark={<svg />} title="Slack" />);
  expect(container.querySelector('.crewlet-catalog-tile__status')).toBeNull();
  rerender(<CatalogTile mark={<svg />} title="Slack" status={<span>Connected</span>} />);
  expect(container.querySelector('.crewlet-catalog-tile__status')!.textContent).toBe('Connected');
});

test('draws no foot with nothing to put in it', () => {
  const { container, rerender } = render(<CatalogTile mark={<svg />} title="Crewlet Chat" description="Soon." />);
  expect(container.querySelector('.crewlet-catalog-tile__foot')).toBeNull();
  rerender(
    <CatalogTile mark={<svg />} title="GitHub" meta="2 agents" action={<button type="button">Manage</button>} />,
  );
  const foot = container.querySelector('.crewlet-catalog-tile__foot')!;
  expect(foot.querySelector('.crewlet-catalog-tile__meta')!.textContent).toBe('2 agents');
  expect(screen.getByRole('button', { name: 'Manage' })).toBeTruthy();
});

test('sits on the quieter ground when not set up', () => {
  const { container } = render(<CatalogTile mark={<svg />} title="GitLab" quiet />);
  expect(container.querySelector('.crewlet-catalog-tile')!.classList.contains('crewlet-catalog-tile--quiet')).toBe(
    true,
  );
});

test('as a list item, it is not also named as an article', () => {
  render(
    <ul>
      <CatalogTile as="li" mark={<svg />} title="Engineering" />
    </ul>,
  );
  const item = screen.getByRole('listitem');
  expect(item.hasAttribute('aria-labelledby')).toBe(false);
});

// A FOOT HOLDING ONLY A FACT STANDS AS TALL AS ONE HOLDING A BUTTON, so the
// rules of a row's feet sit on one line: the floor is a small control's
// height of CONTENT, under the rule and the padding.
test("a foot's floor is a small control's height of content", () => {
  const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'CatalogTile.css'), 'utf8');
  const foot = /\.crewlet-catalog-tile__foot \{([^}]*)\}/.exec(sheet.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1] ?? '';
  expect(foot).toMatch(/box-sizing:\s*content-box;/);
  expect(foot).toMatch(/min-height:\s*var\(--size-control-sm\);/);
});

// THE NAME STANDS ON ONE LINE ACROSS A ROW whether or not a tile has a state:
// centred on the mark, a name over a pill rose above its stateless neighbour's.
test("a tile's name starts at the same height with or without a state", () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'CatalogTile.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const head = /\.crewlet-catalog-tile__head \{([^}]*)\}/.exec(css)?.[1] ?? '';
  const title = /\.crewlet-catalog-tile__title \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(head).toMatch(/align-items:\s*flex-start;/);
  expect(title).toMatch(/justify-content:\s*flex-start;/);
});
