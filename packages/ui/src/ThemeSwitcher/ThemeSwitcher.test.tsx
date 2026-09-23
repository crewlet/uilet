/**
 * The theme and the density: what they are called, where they are written,
 * what a storage that refuses to answer does to them, and what the root
 * actually paints for each choice on each system.
 *
 * The naming case is the engine defect this replaces: the density row drew S,
 * M and L and was announced as "S", "M" and "L", which names nothing anybody
 * can act on.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { DensitySwitcher, ThemeSwitcher } from './ThemeSwitcher.js';
import { applyStoredPreferences } from './preferences.js';
import { installThemes, themeColours } from '../../../../apps/ui-tests/src/cascade.js';

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
  // system's, and following it is the absence of a choice. What the root then
  // paints on each system is measured against the built theme layer below.
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

/*
 * WHAT THE ROOT PAINTS, choice by system, through the BUILT theme layer.
 *
 * The cases above hold what the row writes; these hold what that writing is
 * worth, because the attribute is half of a contract and the stylesheet is the
 * other half. The palette is dark first: the bare root is dark, a light system
 * repaints it through a media block, and an explicit choice has to beat the
 * system in BOTH directions. Explicit light does it with a block of its own;
 * explicit dark does it by keeping the light media block from matching, which
 * is the `:not([data-theme="dark"])` on that block and nothing else. Drop the
 * guard and a reader on a light system who chose dark is repainted light;
 * drop the light attribute block and a reader on a dark system who chose
 * light stays dark. Both are cases here.
 *
 * jsdom evaluates no media query, so `installThemes` answers the
 * prefers-color-scheme query for the system named and leaves every other
 * decision (selector, specificity, order) to jsdom's own cascade.
 */
describe('what the root paints, for each choice on each system', () => {
  const PALETTES = { light: themeColours('light'), dark: themeColours('dark') } as const;

  /*
   * jsdom hands a custom property back re-serialised, with the space after
   * each comma gone (`rgba(0,0,0,0.6)`), so both sides are read in that one
   * spelling. Nothing else is normalised: a different number is a different
   * colour.
   */
  const spelled = (value: string) => value.trim().replace(/\s*,\s*/g, ',');

  /** Every colour the named palette declares, read back off the root. */
  function drift(palette: 'light' | 'dark'): string[] {
    const painted = getComputedStyle(document.documentElement);
    const found = [...PALETTES[palette]]
      .filter(([name, value]) => spelled(painted.getPropertyValue(name)) !== spelled(value))
      .map(([name, value]) => `${name}: ${painted.getPropertyValue(name).trim() || 'nothing'}, not ${value}`);
    const scheme = painted.getPropertyValue('color-scheme').trim();
    if (scheme !== palette) found.push(`color-scheme: ${scheme || 'nothing'}, not ${palette}`);
    return found;
  }

  let remove: () => void = () => {};
  afterEach(() => remove());

  test('the two palettes differ, so a case below can tell which one won', () => {
    // A comparison between two equal palettes would pass every case for any
    // stylesheet, whichever block the cascade picked.
    remove = installThemes('dark');
    expect(PALETTES.dark.size).toBeGreaterThan(80);
    expect(PALETTES.light.size).toBe(PALETTES.dark.size);
    expect(drift('dark')).toEqual([]);
    expect(drift('light').length).toBeGreaterThan(40);
  });

  const CASES = [
    // [the system, the choice, the palette the root paints]
    ['dark', 'Light', 'light'],
    ['light', 'Dark', 'dark'],
    ['dark', 'Follow the system', 'dark'],
    ['light', 'Follow the system', 'light'],
    ['dark', 'Dark', 'dark'],
    ['light', 'Light', 'light'],
  ] as const;

  for (const [system, choice, palette] of CASES) {
    test(`on a ${system} system, "${choice}" paints the ${palette} palette`, () => {
      remove = installThemes(system);
      render(<ThemeSwitcher storageKey="test_theme" />);
      // Chosen AWAY from first, so the case measures the switch it names
      // rather than a root that was already in that state.
      fireEvent.click(screen.getByRole('radio', { name: choice === 'Dark' ? 'Light' : 'Dark' }));
      fireEvent.click(screen.getByRole('radio', { name: choice }));
      expect(drift(palette)).toEqual([]);
    });
  }

  test('with nothing chosen, the root follows the system', () => {
    // A browser that reports no preference at all matches no
    // prefers-color-scheme query, so it gets exactly the dark case here.
    for (const system of ['dark', 'light'] as const) {
      remove();
      remove = installThemes(system);
      render(<ThemeSwitcher storageKey="test_theme" />);
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
      expect(drift(system)).toEqual([]);
      cleanup();
    }
  });
});
