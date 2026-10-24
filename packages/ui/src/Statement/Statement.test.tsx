/**
 * Statement: a label over the words a page exists to say, or an honest empty
 * state with the way to write them.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { Button } from '../Button/index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { Statement } from './index.js';

afterEach(cleanup);

const EMPTY = {
  title: 'No mission yet',
  description: 'One sentence on what the company is for tells every agent why its work matters.',
  action: <Button size="small">Add a mission</Button>,
};

test('is a region named by its label, the words under it', () => {
  render(
    <Statement label="Mission" empty={EMPTY}>
      Make shared expenses painless.
    </Statement>,
  );
  const region = screen.getByRole('region', { name: 'Mission' });
  expect(within(region).getByRole('heading', { level: 2, name: 'Mission' })).toBeTruthy();
  expect(region.querySelector('.crewlet-statement__text')?.textContent).toBe('Make shared expenses painless.');
  expect(within(region).queryByRole('button')).toBeNull();
});

test('the heading takes the level where the statement sits', () => {
  render(
    <HeadingLevelProvider level={3}>
      <Statement label="Vision" empty={EMPTY}>
        Everywhere.
      </Statement>
    </HeadingLevelProvider>,
  );
  expect(screen.getByRole('heading', { level: 3, name: 'Vision' })).toBeTruthy();
});

// AN UNWRITTEN STATEMENT IS SAID AS ONE, with its own way to write it, and
// nothing grey stands where the words would. An empty string is unwritten too.
test.each([undefined, null, ''])('an unwritten statement (%s) is an inline empty state with its action', (value) => {
  const { container } = render(
    <Statement label="Mission" empty={EMPTY}>
      {value}
    </Statement>,
  );
  expect(container.querySelector('.crewlet-statement__text')).toBeNull();
  const box = container.querySelector('.crewlet-empty-state--inline') as HTMLElement;
  expect(box.textContent).toContain('No mission yet');
  expect(within(box).getByRole('button', { name: 'Add a mission' })).toBeTruthy();
  expect(container.firstElementChild?.className).toContain('crewlet-statement--empty');
});

// A BLOCK UNDER THE SAME LABEL: a list of policies heads the way a mission
// does, and is drawn as given rather than in the statement's register.
test('a block is drawn as given under the label, not in the statement register', () => {
  const { container } = render(
    <Statement label="Standing policies" empty={EMPTY}>
      <ol aria-label="Standing policies">
        <li>Ask before deleting anything.</li>
      </ol>
    </Statement>,
  );
  expect(container.querySelector('.crewlet-statement__text')).toBeNull();
  const body = container.querySelector('.crewlet-statement__body') as HTMLElement;
  expect(within(body).getByRole('list', { name: 'Standing policies' }).tagName).toBe('OL');
});

// A STATEMENT IS READ: a step over the body, at the reading measure, with its
// author's own line breaks kept.
test("the words are set a step over the body at the reading measure, keeping the author's breaks", () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Statement.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const text = /\.crewlet-statement__text \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(text).toMatch(/font-size:\s*var\(--font-size-lg\);/);
  expect(text).toMatch(/max-width:\s*var\(--size-measure\);/);
  expect(text).toMatch(/white-space:\s*pre-wrap;/);
  expect(text).toMatch(/line-height:\s*var\(--font-line-height-relaxed\);/);
});

test('has no accessibility violations, written or not', async () => {
  const { container } = render(
    <>
      <Statement label="Mission" empty={EMPTY}>
        Make shared expenses painless.
      </Statement>
      <Statement label="Vision" empty={{ ...EMPTY, title: 'No vision yet' }} />
    </>,
  );
  const result = await axe.run(container);
  expect(result.violations).toEqual([]);
});
