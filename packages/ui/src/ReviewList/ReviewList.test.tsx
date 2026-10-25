/**
 * ReviewList: a setup's parts as rows of one box, each a heading with its
 * state and its way back, over the values it holds, and what holds the finish
 * said under the part it is about.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { ReviewList } from './index.js';

afterEach(cleanup);

function Summary({ error }: { error?: string }) {
  return (
    <ReviewList label="Brand summary">
      <ReviewList.Item
        icon={<svg aria-hidden="true" />}
        title="Identity"
        status={{ label: 'Complete', tone: 'success' }}
        action={<button type="button">Edit Identity</button>}
      >
        <p>FairSplit</p>
      </ReviewList.Item>
      <ReviewList.Item
        icon={<svg aria-hidden="true" />}
        title="Logos"
        status={{ label: 'Missing required', tone: 'danger' }}
        action={<button type="button">Edit Logos</button>}
        error={error}
      >
        <p>No primary logo</p>
      </ReviewList.Item>
    </ReviewList>
  );
}

test('is a list named for what it reviews, a row a part', () => {
  render(<Summary />);
  const list = screen.getByRole('list', { name: 'Brand summary' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(2);
});

test('each part is a heading one level under where the list sits, with its state, its action and its values', () => {
  render(
    <HeadingLevelProvider level={4}>
      <Summary />
    </HeadingLevelProvider>,
  );
  const [identity] = screen.getAllByRole('listitem');
  const heading = within(identity!).getByRole('heading', { name: 'Identity' });
  expect(heading.tagName).toBe('H4');
  expect(identity!.textContent).toBe('IdentityCompleteEdit IdentityFairSplit');
  expect(identity!.querySelector('.crewlet-tag--success')).not.toBeNull();
  expect(within(identity!).getByRole('button', { name: 'Edit Identity' })).toBeDefined();
});

test('the glyph is decorative, and a part without one starts at the row’s start', () => {
  const { container, rerender } = render(<Summary />);
  const tile = container.querySelector('.crewlet-review-list__icon')!;
  expect(tile.getAttribute('aria-hidden')).toBe('true');
  rerender(
    <ReviewList label="Summary">
      <ReviewList.Item title="Plain">Value</ReviewList.Item>
    </ReviewList>,
  );
  const row = container.querySelector('.crewlet-review-list__item')!;
  expect(row.classList.contains('crewlet-review-list__item--plain')).toBe(true);
  expect(row.querySelector('.crewlet-review-list__icon')).toBeNull();
});

test('what holds the finish is an alert under the part it is about, and nothing is said without one', () => {
  const { rerender } = render(<Summary />);
  expect(screen.queryByRole('alert')).toBeNull();
  rerender(<Summary error="Add the primary logo to adopt." />);
  const alert = screen.getByRole('alert');
  expect(alert.textContent).toBe('Add the primary logo to adopt.');
  const logos = screen.getAllByRole('listitem')[1]!;
  expect(logos.contains(alert)).toBe(true);
  expect(logos.classList.contains('is-error')).toBe(true);
});

test('the values sit under the title and take the whole row on a narrow list', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ReviewList.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const row = /\.crewlet-review-list__item \{([^}]*)\}/.exec(css)?.[1]?.replace(/\s+/g, ' ') ?? '';
  expect(row).toMatch(/grid-template-areas: 'icon head action' '\. body body' '\. error error';/);
  expect(/\.crewlet-review-list \{([^}]*)\}/.exec(css)?.[1]).toMatch(/container-type:\s*inline-size;/);
  const narrow = /@container \(width < 28rem\) \{([\s\S]*?)\n\}/.exec(css)?.[1]?.replace(/\s+/g, ' ') ?? '';
  expect(narrow).toMatch(/'icon head action' 'body body body' 'error error error'/);
});

test('carries no axe violation, with and without an error', async () => {
  for (const error of [undefined, 'Add the primary logo to adopt.']) {
    cleanup();
    const { container } = render(
      <main>
        <h1>Review</h1>
        <Summary {...(error ? { error } : {})} />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  }
});
