/**
 * Two versions of a deck, slide by slide: every change said in words, a slide
 * one version lacks drawn as an empty side, unchanged slides folded away.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { SlideCompare, type SlideCompareRow } from './index.js';

afterEach(cleanup);

const slide = (text: string) => <p>{text}</p>;
const ROWS: SlideCompareRow[] = [
  { key: 'cover', title: 'Plan', change: 'unchanged', fromPosition: 1, toPosition: 1, from: slide('a'), to: slide('a') },
  { key: 'plan', title: 'The plan', change: 'changed', fromPosition: 2, toPosition: 2, from: slide('b'), to: slide('b2') },
  { key: 'team', title: 'Team', change: 'unchanged', fromPosition: 3, toPosition: 4, moved: true, from: slide('c'), to: slide('c') },
  { key: 'timeline', title: 'Timeline', change: 'unchanged', fromPosition: 4, toPosition: 3, moved: true, from: slide('d'), to: slide('d') },
  { key: 'ask', title: 'The ask', change: 'added', toPosition: 5, to: slide('e') },
  { key: 'old', title: 'Old slide', change: 'removed', fromPosition: 5, from: slide('f') },
];

test('the comparison opens with what changed, in words', () => {
  render(<SlideCompare rows={ROWS} fromLabel="Version 1" toLabel="Version 2" />);
  expect(screen.getByText('1 slide changed, 1 added, 1 removed, 2 moved.')).toBeTruthy();
  expect(screen.getByText('Moved from 3 to 4')).toBeTruthy();
  expect(screen.getByText('Not in Version 1')).toBeTruthy();
  expect(screen.getByText('Not in Version 2')).toBeTruthy();
  expect(screen.queryByText('1. Plan')).toBeNull();
});

test('unchanged slides fold away behind one control', () => {
  render(<SlideCompare rows={ROWS} fromLabel="Version 1" toLabel="Version 2" />);
  fireEvent.click(screen.getByRole('button', { name: 'Show the 1 unchanged slide' }));
  expect(screen.getByText('1. Plan')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Hide the unchanged slides' })).toBeTruthy();
});

test('two identical decks say so', () => {
  render(<SlideCompare rows={[ROWS[0]!]} fromLabel="Version 1" toLabel="Version 2" />);
  expect(screen.getByText('The two versions hold the same slides, in the same order.')).toBeTruthy();
});

test('the comparison passes axe', async () => {
  const { container } = render(<SlideCompare rows={ROWS} fromLabel="Version 1" toLabel="Version 2" />);
  expect((await axe.run(container)).violations).toEqual([]);
});
