/**
 * A long block folded to a height with Show more under it. jsdom lays nothing
 * out, so what folds is measured in the layout suite (clamp.test.tsx there);
 * here, what the block says and does whatever its height.
 */
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { Clamp } from './index.js';

afterEach(cleanup);

test('a block nothing measured as long is drawn whole, with no control', () => {
  render(<Clamp>A short remark.</Clamp>);
  expect(screen.getByText('A short remark.').closest('.crewlet-clamp')!.getAttribute('data-state')).toBe('whole');
  expect(screen.queryByRole('button')).toBeNull();
});

test('takes its fold from the caller as the block\'s own custom property', () => {
  const { container } = render(<Clamp height="12rem">A short remark.</Clamp>);
  expect(container.querySelector<HTMLElement>('.crewlet-clamp')!.style.getPropertyValue('--crewlet-clamp-height')).toBe('12rem');
});

// FOLDED, THE FADE IS A MASK, so it needs no colour of the ground under it.
// Mutation: paint a gradient in the sheet's colour over the foot instead.
test('folded, the body stops at the fold and fades through a mask', () => {
  const uninstall = installSheets('Clamp/Clamp.css');
  try {
    const { container } = render(
      <div className="crewlet-clamp" data-state="folded">
        <div className="crewlet-clamp__body">x</div>
      </div>,
    );
    const body = container.querySelector<HTMLElement>('.crewlet-clamp__body')!;
    const style = getComputedStyle(body);
    expect(style.overflow).toBe('hidden');
    expect(style.maxHeight).not.toBe('none');
    expect(style.getPropertyValue('mask-image')).toContain('linear-gradient');
  } finally {
    uninstall();
  }
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <Clamp>A short remark.</Clamp>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
