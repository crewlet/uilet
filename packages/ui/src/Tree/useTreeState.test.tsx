/**
 * The state both tree patterns share: what is collapsed, which node holds the
 * one tab stop, and what a key press asks for.
 *
 * The model itself is `model.test.tsx`. What is asserted here is the half that
 * only exists once the model is in a component: that COLLAPSED is what is
 * kept, so a node an operation adds is open; that the tab stop falls back to
 * the nearest visible ancestor rather than vanishing; and that `treeStep`
 * answers with three different things, because a key that leads nowhere and a
 * key that is not the tree's at all are not the same fact.
 */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import type { TreeInput } from './model.js';
import { treeItemAction, treeStep, useTreeState } from './useTreeState.js';

afterEach(cleanup);

const FOREST: TreeInput[] = [
  {
    id: 'company',
    label: 'Nimbus',
    children: [
      { id: 'ceo', label: 'Chief Executive' },
      {
        id: 'eng',
        label: 'Engineering',
        children: [
          { id: 'platform', label: 'Platform', children: [{ id: 'sre', label: 'Reliability' }] },
          { id: 'swe', label: 'Software Engineer' },
        ],
      },
    ],
  },
];

function mount(forest: readonly TreeInput[] = FOREST, selected: string | null = null) {
  return renderHook(({ tree, choice }) => useTreeState(tree, choice), {
    initialProps: { tree: forest, choice: selected },
  });
}

const key = (name: string, extra: Record<string, unknown> = {}) => ({
  key: name,
  timeStamp: 1000,
  ...extra,
});

test('everything is open until something is closed, so a node just added is visible', () => {
  const { result } = mount();
  expect(result.current.rows).toEqual(['company', 'ceo', 'eng', 'platform', 'sre', 'swe']);

  act(() => result.current.toggle('eng'));
  expect(result.current.rows).toEqual(['company', 'ceo', 'eng']);
  act(() => result.current.toggle('eng'));
  expect(result.current.rows).toContain('platform');
});

test('collapse all keeps the tops open, and expand all opens everything again', () => {
  const { result } = mount();
  act(() => result.current.collapseAll());
  expect(result.current.rows).toEqual(['company', 'ceo', 'eng']);
  act(() => result.current.expandAll());
  expect(result.current.rows).toHaveLength(6);
});

test('opening a node reports whether anything was closed, and opens only its ancestors', () => {
  const { result } = mount();
  act(() => result.current.collapseAll());
  let opened: boolean | undefined;
  act(() => {
    opened = result.current.open('sre');
  });
  expect(opened).toBe(true);
  expect(result.current.rows).toContain('sre');

  // Nothing was closed this time, so nothing had to be opened.
  act(() => {
    opened = result.current.open('sre');
  });
  expect(opened).toBe(false);
});

test('the tab stop is the selection, and falls back to the nearest visible ancestor', () => {
  const { result, rerender } = mount(FOREST, 'sre');
  expect(result.current.active).toBe('sre');

  act(() => result.current.toggle('platform'));
  // Its own row is hidden now, so the stop climbs rather than leaving the tree
  // with no way in.
  expect(result.current.active).toBe('platform');

  act(() => result.current.toggle('eng'));
  expect(result.current.active).toBe('eng');

  // A selection that names no node of this tree leaves the first row holding it.
  rerender({ tree: FOREST, choice: 'nobody' });
  expect(result.current.active).toBe('company');
});

test('a node the operator focused wins over the selection until the selection moves on', () => {
  const { result } = mount(FOREST, 'ceo');
  expect(result.current.active).toBe('ceo');
  act(() => result.current.setActive('swe'));
  expect(result.current.active).toBe('swe');
});

test('treeStep answers a step, nothing, or that the key was never the tree keys', () => {
  const { result } = mount();
  expect(treeStep(result.current, 'company', key('ArrowDown'))).toEqual({ focus: 'ceo' });
  expect(treeStep(result.current, 'ceo', key('ArrowUp'))).toEqual({ focus: 'company' });
  expect(treeStep(result.current, 'eng', key('ArrowLeft'))).toEqual({ toggle: 'eng' });
  expect(treeStep(result.current, 'ceo', key('ArrowLeft'))).toEqual({ focus: 'company' });
  expect(treeStep(result.current, 'ceo', key('ArrowRight'))).toBeNull();
  expect(treeStep(result.current, 'eng', key('End'))).toEqual({ focus: 'swe' });
  expect(treeStep(result.current, 'swe', key('Home'))).toEqual({ focus: 'company' });

  // Up on the first row is the tree's key and leads nowhere, which a caller
  // still swallows; Tab and a chord are somebody else's entirely.
  expect(treeStep(result.current, 'company', key('ArrowUp'))).toBeNull();
  expect(treeStep(result.current, 'company', key('Tab'))).toBeUndefined();
  expect(treeStep(result.current, 'company', key('ArrowDown', { ctrlKey: true }))).toBeUndefined();
});

test('typing walks the rows, and a zoom key never starts a word', () => {
  const { result } = mount();
  expect(treeStep(result.current, 'company', key('p'))).toEqual({ focus: 'platform' });
  // A fresh word: far enough after the last key that the pause has ended it.
  expect(treeStep(result.current, 'platform', { key: '0', timeStamp: 9000 })).toBeUndefined();
});

test('the item keys are Enter, Delete or Backspace, the Menu key and Shift+F10, and nothing else', () => {
  expect(treeItemAction({ key: 'Enter' })).toBe('activate');
  expect(treeItemAction({ key: 'Delete' })).toBe('remove');
  expect(treeItemAction({ key: 'Backspace' })).toBe('remove');
  expect(treeItemAction({ key: 'ContextMenu' })).toBe('menu');
  expect(treeItemAction({ key: 'F10', shiftKey: true })).toBe('menu');

  // A chord belongs to the application (Undo is Command with Backspace on one
  // platform), and Shift extends a selection rather than deleting a node.
  expect(treeItemAction({ key: 'Backspace', metaKey: true })).toBeNull();
  expect(treeItemAction({ key: 'Delete', shiftKey: true })).toBeNull();
  expect(treeItemAction({ key: 'Enter', shiftKey: true })).toBeNull();
  expect(treeItemAction({ key: 'F10' })).toBeNull();
  expect(treeItemAction({ key: 'a' })).toBeNull();
});
