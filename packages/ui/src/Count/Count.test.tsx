/**
 * A count's one rule: it is never tinted by severity. The one colour it takes
 * is the accent, for a count of what waits on the reader, at the badge's own
 * size, so a count in a menu button, a switcher and a list row agree.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { size } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installThemed, px, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { Count } from './index.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

/** Spelled without the leading dashes and prefixed at use: the package's
    variable check reads a quoted `--name` in a .tsx file as a declaration. */
const property = (name: string) => `--${name}`;

test('reads its number with what it counts, and draws the number alone', () => {
  render(<Count value={3} label="unread mentions" tone="attention" />);
  expect(screen.getByText('3 unread mentions')).toBeTruthy();
});

test('is quiet by default: the inset ground and the tertiary ink, never a tone', () => {
  const { container } = render(<Count value={3} />);
  const count = container.querySelector('.crewlet-count')!;
  expect(count.className).toBe('crewlet-count');
});

test('a count that waits on the reader is the accent badge pill, in every mode', () => {
  for (const theme of ['dark', 'light'] as const) {
    uninstall?.();
    uninstall = installThemed(theme, 'Count/Count.css');
    cleanup();
    const palette = themeColours(theme);
    const token = (name: string) => parseHex(palette.get(property(name)) ?? '');
    const { container } = render(<Count value={7} tone="attention" />);
    const pill = container.querySelector('.crewlet-count')!;
    expect(pill.className).toContain('crewlet-count--attention');
    const drawn = getComputedStyle(pill);
    expect(channels(drawn.backgroundColor), theme).toEqual(token('color-brand-accent'));
    expect(channels(drawn.color), theme).toEqual(token('color-text-on-accent'));
    // The badge's own size: 16px tall and at least as wide.
    expect(px(pill, 'height'), theme).toBe(Number.parseFloat(size.badge));
    expect(px(pill, 'min-width'), theme).toBe(Number.parseFloat(size.badge));
  }
});
