/**
 * A diff's whole job is to say what changed. These cases hold the half a
 * colour cannot say: the word for the kind, and the word for the arrow.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DiffList } from './index.js';

afterEach(cleanup);

const rows = [
  { kind: 'added' as const, path: 'roles.scribe', to: '"planner"' },
  { kind: 'removed' as const, path: 'roles.greeter', from: '"onboarding"' },
  { kind: 'changed' as const, path: 'roles.planner.model', from: '"sonnet"', to: '"opus"' },
];

test('every row says its kind in words, not only in colour', () => {
  render(<DiffList rows={rows} />);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(within(items[0]!).getByText('added')).toBeTruthy();
  expect(within(items[1]!).getByText('removed')).toBeTruthy();
  expect(within(items[2]!).getByText('changed')).toBeTruthy();
});

test('a change reads from one value to the other', () => {
  render(<DiffList rows={rows} />);
  const changed = screen.getAllByRole('listitem')[2]!;
  expect(changed.textContent).toContain('"sonnet"');
  expect(changed.textContent).toContain('"opus"');
  // The arrow is drawn; the word is what a screen reader is given in its place.
  expect(within(changed).getByText('to')).toBeTruthy();
});

test('an addition reads its new value and a removal reads its old one', () => {
  render(<DiffList rows={rows} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0]!.textContent).toContain('"planner"');
  expect(items[1]!.textContent).toContain('"onboarding"');
  // Neither of them invents the other half.
  expect(within(items[0]!).queryByText('to')).toBeNull();
});

test('two identical documents are a fact, said in words', () => {
  render(<DiffList rows={[]} emptyMessage="No differences" />);
  expect(screen.getByText('No differences')).toBeTruthy();
  expect(screen.queryByRole('list')).toBeNull();
});

test('the kind words can be said in another language', () => {
  render(
    <DiffList
      rows={[rows[0]!]}
      labels={{ added: 'hinzugefuegt' }}
    />,
  );
  expect(screen.getByText('hinzugefuegt')).toBeTruthy();
});

test('a diff says it is a list, so its length is read where the markers are off', () => {
  /*
   * Its stylesheet takes the markers off and WebKit drops the list role with
   * them, so the role is declared. The ATTRIBUTE is what is asserted: jsdom
   * applies no stylesheet and answers a bare `ul` as a list either way, so a
   * role query would pass without the declaration and prove nothing.
   */
  const { container } = render(<DiffList rows={rows} />);
  const list = container.querySelector('ul')!;
  expect(list.getAttribute('role')).toBe('list');
  expect(within(list).getAllByRole('listitem')).toHaveLength(3);
});
