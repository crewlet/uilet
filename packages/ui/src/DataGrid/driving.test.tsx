/**
 * Which grid the keyboard drives: the first mounted with rows until the
 * reader points at one, never a grid with nothing to step through, and a
 * grid the reader touched hands the keys back when it goes.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { countDataGridRows, useAnyDataGridDriving, useDataGridDriving } from './index.js';

afterEach(cleanup);

const claims = new Map<string, () => void>();

function Grid({ name, rows }: { name: string; rows: number }) {
  const { driving, claim } = useDataGridDriving(rows > 0);
  claims.set(name, claim);
  return <span data-testid={name}>{driving ? 'driving' : 'idle'}</span>;
}

function Any() {
  return <span data-testid="any">{useAnyDataGridDriving() ? 'yes' : 'no'}</span>;
}

const state = (name: string) => screen.getByTestId(name).textContent;

test('the first grid with rows drives until the reader points at another', () => {
  render(
    <>
      <Grid name="empty" rows={0} />
      <Grid name="page" rows={3} />
      <Grid name="peek" rows={2} />
      <Any />
    </>,
  );
  expect(state('empty')).toBe('idle');
  expect(state('page')).toBe('driving');
  expect(state('peek')).toBe('idle');
  expect(state('any')).toBe('yes');
  act(() => claims.get('peek')!());
  expect(state('page')).toBe('idle');
  expect(state('peek')).toBe('driving');
});

test('a grid the reader touched hands the keys back when it unmounts', () => {
  const { rerender } = render(
    <>
      <Grid name="page" rows={3} />
      <Grid name="peek" rows={2} />
    </>,
  );
  act(() => claims.get('peek')!());
  rerender(<Grid name="page" rows={3} />);
  expect(state('page')).toBe('driving');
});

test('with no grid holding rows, nothing drives', () => {
  render(
    <>
      <Grid name="empty" rows={0} />
      <Any />
    </>,
  );
  expect(state('empty')).toBe('idle');
  expect(state('any')).toBe('no');
});

test('rows are counted through bands, however deeply grouped', () => {
  expect(countDataGridRows([1, 2], undefined)).toBe(2);
  expect(countDataGridRows(undefined, undefined)).toBe(0);
  expect(
    countDataGridRows<number>(undefined, [
      { key: 'a', label: 'A', rows: [1, 2] },
      { key: 'b', label: 'B', rows: [], bands: [{ key: 'b1', label: 'B1', rows: [3, 4, 5] }] },
    ]),
  ).toBe(5);
});
