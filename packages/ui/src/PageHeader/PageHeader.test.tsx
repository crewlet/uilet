/**
 * The header's one hard rule is the heading: a level that does not follow the
 * page's outline is a document a reader navigating by heading cannot move
 * around at all.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { HeadingLevelProvider } from '../utils/index.js';
import { PageHeader } from './index.js';

afterEach(cleanup);

test('the title is a level 2 heading under the shell that spends the h1', () => {
  render(<PageHeader title="Coding runs" />);
  expect(screen.getByRole('heading', { level: 2, name: 'Coding runs' })).toBeDefined();
});

test('it follows the level of the surface it is in', () => {
  render(
    <HeadingLevelProvider level={3}>
      <PageHeader title="Access" />
    </HeadingLevelProvider>,
  );
  expect(screen.getByRole('heading', { level: 3, name: 'Access' })).toBeDefined();
});

test('an explicit level wins over the surrounding one', () => {
  render(
    <HeadingLevelProvider level={3}>
      <PageHeader title="Access" headingLevel={4} />
    </HeadingLevelProvider>,
  );
  expect(screen.getByRole('heading', { level: 4, name: 'Access' })).toBeDefined();
});

test('badges and actions are beside the heading, never inside it', () => {
  render(
    <PageHeader
      title="People"
      badges={<span>12 seats</span>}
      actions={<button>Add a seat</button>}
      description="Every seat and what it is doing."
    />,
  );
  // The heading is the screen's name. A heading that also read "Add a seat"
  // would announce the screen as its name plus every verb on it.
  const heading = screen.getByRole('heading', { level: 2 });
  expect(heading.textContent).toBe('People');
  expect(heading.contains(screen.getByRole('button', { name: 'Add a seat' }))).toBe(false);
  expect(screen.getByText('12 seats')).toBeDefined();
  expect(screen.getByText('Every seat and what it is doing.')).toBeDefined();
});

test('the heading can be named as a region label', () => {
  render(
    <section aria-labelledby="runs-title">
      <PageHeader title="Coding runs" titleId="runs-title" />
    </section>,
  );
  expect(screen.getByRole('region', { name: 'Coding runs' })).toBeDefined();
});

test('the screen title keeps the page leading', () => {
  // A heading element takes the baseline's tight step, and the head is one
  // line above one sentence: at 1.2 the two sit closer than the gap between
  // them and the head reads as three lines of something rather than a title
  // with a caption under it.
  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'PageHeader.css'),
    'utf8',
  );
  const title = /\.crewlet-page-header__title\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(title).toMatch(/line-height:\s*var\(--font-line-height-normal\)/);
});
