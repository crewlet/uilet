/**
 * The one-press theme control: what it flips, what it keeps, what it is
 * called, and what the root actually paints after a press.
 *
 * The whole point of the control is that it flips the palette ON THE SCREEN,
 * so every case names the system it runs on. A toggle that read the stored
 * preference instead would pass a suite that only ever ran on one system.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher.js';
import type { ThemePreference } from '../ThemeSwitcher/preferences.js';
import { ThemeToggle } from './ThemeToggle.js';
import { installThemes, themeColours } from '../../../../apps/ui-tests/src/cascade.js';

/**
 * A platform the test names. `none` is a browser that reports no preference,
 * which matches NEITHER colour-scheme query and is painted dark by the theme
 * layer; it is the case that tells a toggle asking "is the system light"
 * (right) from one asking "is the system dark" (which calls that page light).
 */
type System = 'light' | 'dark' | 'none';

function installSystem(initial: System): { set: (next: System) => void; restore: () => void } {
  let system = initial;
  const listeners = new Set<() => void>();
  const had = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  const answers = (query: string) => {
    const asked = /prefers-color-scheme:\s*(light|dark)/.exec(query)?.[1];
    return asked !== undefined && asked === system;
  };
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches() {
        return answers(query);
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: () => void) => void listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => void listeners.delete(listener),
      addListener: (listener: () => void) => void listeners.add(listener),
      removeListener: (listener: () => void) => void listeners.delete(listener),
      dispatchEvent: () => false,
    }),
  });
  return {
    set(next) {
      system = next;
      act(() => {
        for (const listener of [...listeners]) listener();
      });
    },
    restore() {
      if (had) Object.defineProperty(globalThis, 'matchMedia', had);
      else delete (globalThis as Record<string, unknown>).matchMedia;
    },
  };
}

const TO_LIGHT = 'Switch to the light theme';
const TO_DARK = 'Switch to the dark theme';
const theme = () => document.documentElement.getAttribute('data-theme');

let platform: ReturnType<typeof installSystem> | null = null;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  platform?.restore();
  platform = null;
  document.documentElement.removeAttribute('data-theme');
});

test('on a dark system, a press writes light, explicitly, and keeps it', () => {
  platform = installSystem('dark');
  render(<ThemeToggle storageKey="toggle_theme" />);
  fireEvent.click(screen.getByRole('button', { name: TO_LIGHT }));
  expect(theme()).toBe('light');
  expect(localStorage.getItem('toggle_theme')).toBe('light');
  // Now named for the way back.
  expect(screen.getByRole('button', { name: TO_DARK })).toBeTruthy();
});

test('on a light system, a press writes dark, explicitly, and keeps it', () => {
  platform = installSystem('light');
  render(<ThemeToggle storageKey="toggle_theme" />);
  fireEvent.click(screen.getByRole('button', { name: TO_DARK }));
  expect(theme()).toBe('dark');
  expect(localStorage.getItem('toggle_theme')).toBe('dark');
});

test('a second press reverses the first, on either system', () => {
  for (const system of ['dark', 'light'] as const) {
    platform?.restore();
    platform = installSystem(system);
    localStorage.clear();
    render(<ThemeToggle storageKey="toggle_theme" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    // Back to the palette the system paints, but as a CHOICE: a press never
    // writes `system`, so the page no longer follows the platform.
    expect(theme()).toBe(system);
    expect(localStorage.getItem('toggle_theme')).toBe(system);
    cleanup();
  }
});

test('an explicit choice flips from itself, whatever the system says', () => {
  platform = installSystem('light');
  localStorage.setItem('toggle_theme', 'dark');
  render(<ThemeToggle storageKey="toggle_theme" />);
  fireEvent.click(screen.getByRole('button', { name: TO_LIGHT }));
  expect(localStorage.getItem('toggle_theme')).toBe('light');
});

test('a browser reporting no preference is dark, so the toggle offers light', () => {
  platform = installSystem('none');
  render(<ThemeToggle storageKey="toggle_theme" />);
  fireEvent.click(screen.getByRole('button', { name: TO_LIGHT }));
  expect(theme()).toBe('light');
});

test('following the system, the name follows the system as it changes', () => {
  platform = installSystem('dark');
  render(<ThemeToggle storageKey="toggle_theme" />);
  expect(screen.getByRole('button', { name: TO_LIGHT })).toBeTruthy();
  platform.set('light');
  expect(screen.getByRole('button', { name: TO_DARK })).toBeTruthy();
});

test('it is a named action, not a pressed state, and it draws where it goes', () => {
  platform = installSystem('dark');
  const { container } = render(<ThemeToggle storageKey="toggle_theme" />);
  const button = screen.getByRole('button', { name: TO_LIGHT });
  expect(button.hasAttribute('aria-pressed')).toBe(false);
  expect(button.getAttribute('title')).toBe(TO_LIGHT);
  const sun = container.innerHTML;
  fireEvent.click(button);
  // The sun on a dark page, the moon on a light one: a different drawing.
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.innerHTML).not.toBe(sun);
});

test('a storage refusal still flips the page for the visit', () => {
  platform = installSystem('dark');
  const held = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
  try {
    // Its own key: the visit's memory of a refused choice is per key and
    // lasts the visit, which here is the whole test file.
    render(<ThemeToggle storageKey="refused_toggle_theme" />);
    fireEvent.click(screen.getByRole('button', { name: TO_LIGHT }));
    expect(theme()).toBe('light');
    // Not only the root: the control remembers what it just did, so the next
    // press goes back rather than offering light a second time.
    fireEvent.click(screen.getByRole('button', { name: TO_DARK }));
    expect(theme()).toBe('dark');
  } finally {
    if (held) Object.defineProperty(globalThis, 'localStorage', held);
  }
});

test('controlled, it reports the explicit opposite and writes nothing', () => {
  platform = installSystem('dark');
  const onChange = vi.fn();
  render(<ThemeToggle value="system" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: TO_LIGHT }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('light');
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  expect(localStorage.length).toBe(0);
  // Nothing changed, because the value did not: the application owns it.
  expect(screen.getByRole('button', { name: TO_LIGHT })).toBeTruthy();
});

test('one application preference drives the toggle and the row alike', () => {
  platform = installSystem('dark');
  function Owner() {
    const [value, setValue] = useState<ThemePreference>('system');
    return (
      <>
        <ThemeToggle value={value} onChange={setValue} />
        <ThemeSwitcher value={value} onChange={setValue} />
      </>
    );
  }
  render(<Owner />);
  fireEvent.click(screen.getByRole('button', { name: TO_LIGHT }));
  expect(screen.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('radio', { name: 'Follow the system' }));
  expect(screen.getByRole('button', { name: TO_LIGHT })).toBeTruthy();
});

test('stored, a toggle and a row on one key agree after a press on either', () => {
  platform = installSystem('dark');
  render(
    <>
      <ThemeToggle storageKey="toggle_theme" />
      <ThemeSwitcher storageKey="toggle_theme" />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: TO_LIGHT }));
  // The row used to keep its own copy and went on showing "Follow the system".
  expect(screen.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  expect(screen.getByRole('button', { name: TO_LIGHT })).toBeTruthy();
});

/*
 * WHAT A PRESS PAINTS, through the BUILT theme layer, as the ThemeSwitcher
 * suite measures its row: the attribute is half of the contract and the
 * stylesheet the other half, and a toggle whose write the stylesheet ignored
 * would pass every case above.
 */
describe('what the root paints after a press', () => {
  const PALETTES = { light: themeColours('light'), dark: themeColours('dark') } as const;
  const spelled = (value: string) => value.trim().replace(/\s*,\s*/g, ',');
  function drift(palette: 'light' | 'dark'): string[] {
    const painted = getComputedStyle(document.documentElement);
    return [...PALETTES[palette]]
      .filter(([name, value]) => spelled(painted.getPropertyValue(name)) !== spelled(value))
      .map(([name]) => name);
  }

  let remove: () => void = () => {};
  afterEach(() => remove());

  for (const [system, first, second] of [
    ['dark', 'light', 'dark'],
    ['light', 'dark', 'light'],
  ] as const) {
    test(`on a ${system} system: ${first}, then ${second}`, () => {
      platform = installSystem(system);
      remove = installThemes(system);
      render(<ThemeToggle storageKey="toggle_theme" />);
      expect(drift(system)).toEqual([]);
      fireEvent.click(screen.getByRole('button'));
      expect(drift(first)).toEqual([]);
      fireEvent.click(screen.getByRole('button'));
      expect(drift(second)).toEqual([]);
    });
  }
});
