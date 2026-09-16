/**
 * The theme and the density: what they are called, where they are written,
 * and what a storage that refuses to answer does to them.
 *
 * The naming case is the engine defect this replaces: the density row drew S,
 * M and L and was announced as "S", "M" and "L", which names nothing anybody
 * can act on.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { DensitySwitcher, ThemeSwitcher } from './ThemeSwitcher.js';
import { applyStoredPreferences } from './preferences.js';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
});

beforeEach(() => {
  localStorage.clear();
});

test('the theme row is a named radio group, and each choice is a word', () => {
  render(<ThemeSwitcher />);
  const group = screen.getByRole('radiogroup', { name: 'Theme' });
  expect(group).toBeTruthy();
  expect(screen.queryByRole('tab')).toBeNull();
  for (const name of ['Light', 'Follow the system', 'Dark']) {
    expect(screen.getByRole('radio', { name })).toBeTruthy();
  }
});

test('choosing a theme writes the root attribute and remembers it', () => {
  render(<ThemeSwitcher storageKey="test_theme" />);
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(localStorage.getItem('test_theme')).toBe('dark');

  // `system` REMOVES the attribute: the stylesheet's own default is the
  // system's, and a third value would match neither block.
  fireEvent.click(screen.getByRole('radio', { name: 'Follow the system' }));
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  expect(localStorage.getItem('test_theme')).toBe('system');
});

test('the density row draws a letter and is called by a word', () => {
  render(<DensitySwitcher storageKey="test_density" />);
  expect(screen.getByRole('radiogroup', { name: 'Density' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Compact' }).textContent).toBe('S');
  expect(screen.queryByRole('radio', { name: 'S' })).toBeNull();

  fireEvent.click(screen.getByRole('radio', { name: 'Comfortable' }));
  expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
  expect(localStorage.getItem('test_density')).toBe('comfortable');
});

test('a stored value nobody recognises is not applied', () => {
  localStorage.setItem('test_theme', 'midnight');
  render(<ThemeSwitcher storageKey="test_theme" />);
  // Not "midnight" on the root, and not a checked option that does not exist.
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  expect(screen.getByRole('radio', { name: 'Follow the system' }).getAttribute('aria-checked')).toBe(
    'true',
  );
});

test('the preferences are applied before the first render, from what was stored', () => {
  localStorage.setItem('test_theme', 'dark');
  localStorage.setItem('test_density', 'compact');
  const applied = applyStoredPreferences({ themeKey: 'test_theme', densityKey: 'test_density' });
  expect(applied).toEqual({ theme: 'dark', density: 'compact' });
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(document.documentElement.getAttribute('data-density')).toBe('compact');
});

test('storage that throws on access leaves the interface standing', () => {
  const held = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
  try {
    // A private window, blocked site data and a sandboxed frame all throw on
    // the ACCESS rather than answering null, which took the application down
    // before its first paint.
    expect(() => applyStoredPreferences({ themeKey: 'test_theme' })).not.toThrow();
    expect(() => render(<ThemeSwitcher storageKey="test_theme" />)).not.toThrow();
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    // The setting still works for this visit; it is only forgotten.
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  } finally {
    if (held) Object.defineProperty(globalThis, 'localStorage', held);
  }
});

test('the two rows sit in the rail on one register, drawn by one rule', () => {
  /*
   * They are read past rather than read, so they are the QUIET step and they
   * have to match each other: a glyph row beside a letter row is one row of
   * controls only while both take the same chip. The boxes that rule draws are
   * measured in `Tabs.test.tsx`, against the cascade; what is checked here is
   * that both rows reach it, which they did not when the engine drew this pair
   * as two controls of its own at 98px and 79px wide.
   */
  render(
    <>
      <ThemeSwitcher storageKey="test_theme" />
      <DensitySwitcher storageKey="test_density" />
    </>,
  );
  const rows = screen.getAllByRole('radiogroup');
  expect(rows).toHaveLength(2);
  const classes = rows.map((row) => [...row.classList].sort().join(' '));
  expect(classes[0]).toBe(classes[1]);
  expect(rows[0]!.classList.contains('crewlet-tabs--sm')).toBe(true);
  expect(rows[0]!.classList.contains('crewlet-tabs--pill')).toBe(true);

  const chips = screen.getAllByRole('radio');
  expect(chips).toHaveLength(6);
  expect(new Set(chips.map((chip) => [...chip.classList].sort().join(' '))).size).toBe(2);
});
