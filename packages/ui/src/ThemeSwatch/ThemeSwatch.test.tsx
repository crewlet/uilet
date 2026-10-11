/**
 * A theme's thumbnail, drawn from the colours its registry entry carries.
 *
 * What it has to get right is that every half is painted with ITS palette and
 * nothing of the page's, that both halves are there unless one is asked for,
 * and that it is decoration wherever a name is printed beside it.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { themeRegistry } from '@crewlethq/tokens';
import { channels, installThemed, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { ThemeSwatch, type ThemeSwatchColours } from './index.js';

afterEach(cleanup);

const abyss = themeRegistry.find((theme) => theme.id === 'abyss')!;
const halves = (root: Element) => [...root.querySelectorAll<HTMLElement>(':scope > .crewlet-theme-swatch__half')];
const painted = (half: HTMLElement, key: string) => half.style.getPropertyValue(`--crewlet-swatch-${key}`);

/** The custom property each colour is painted through, as the stylesheet reads it. */
const KEYS: Record<keyof ThemeSwatchColours, string> = {
  frame: 'frame',
  sheet: 'sheet',
  card: 'card',
  raised: 'raised',
  hairline: 'hairline',
  text: 'text',
  muted: 'muted',
  accent: 'accent',
  onAccent: 'on-accent',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  success: 'success',
};

test('both palettes are drawn, dark then light, each in its own colours', () => {
  const { container } = render(<ThemeSwatch swatch={abyss.swatch} />);
  const [dark, light] = halves(container.firstElementChild!);
  expect(dark).toBeTruthy();
  expect(light).toBeTruthy();
  for (const [key, name] of Object.entries(KEYS) as [keyof ThemeSwatchColours, string][]) {
    expect(painted(dark!, name), `dark ${key}`).toBe(abyss.swatch.dark[key]);
    expect(painted(light!, name), `light ${key}`).toBe(abyss.swatch.light[key]);
  }
});

test('a mode draws that palette alone', () => {
  const { container } = render(<ThemeSwatch swatch={abyss.swatch} mode="light" size="pane" />);
  const drawn = halves(container.firstElementChild!);
  expect(drawn).toHaveLength(1);
  expect(painted(drawn[0]!, 'frame')).toBe(abyss.swatch.light.frame);
});

test('it is decoration unless named, and an image with the name it is given', () => {
  const { container } = render(<ThemeSwatch swatch={abyss.swatch} />);
  expect(container.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
  expect(screen.queryByRole('img')).toBeNull();
  cleanup();
  render(<ThemeSwatch swatch={abyss.swatch} label="Abyss" />);
  const image = screen.getByRole('img', { name: 'Abyss' });
  expect(image.getAttribute('aria-hidden')).toBeNull();
});

describe('the three sizes', () => {
  test('a chip is each palette with its accent on it', () => {
    const { container } = render(<ThemeSwatch swatch={abyss.swatch} size="chip" />);
    const root = container.firstElementChild!;
    expect(root.classList.contains('crewlet-theme-swatch--chip')).toBe(true);
    expect(root.querySelectorAll('.crewlet-theme-swatch__dot')).toHaveLength(2);
    expect(root.querySelector('.crewlet-theme-swatch__rail')).toBeNull();
  });

  test('a card is a rail, a sheet and a card with the primary action and the four states', () => {
    const { container } = render(<ThemeSwatch swatch={abyss.swatch} />);
    const [dark] = halves(container.firstElementChild!);
    expect(dark!.querySelector('.crewlet-theme-swatch__rail-row.is-current')).not.toBeNull();
    expect(dark!.querySelector('.crewlet-theme-swatch__card .crewlet-theme-swatch__action')).not.toBeNull();
    const states = [...dark!.querySelectorAll('.crewlet-theme-swatch__state')].map((state) => state.className.split('--')[1]);
    expect(states).toEqual(['info', 'warning', 'danger', 'success']);
  });

  test('a pane adds a row per state and the action with its label', () => {
    const { container } = render(<ThemeSwatch swatch={abyss.swatch} size="pane" mode="dark" />);
    const [dark] = halves(container.firstElementChild!);
    expect(dark!.querySelectorAll('.crewlet-theme-swatch__item')).toHaveLength(4);
    expect(dark!.querySelector('.crewlet-theme-swatch__action .crewlet-theme-swatch__label')).not.toBeNull();
    expect(dark!.querySelector('.crewlet-theme-swatch__secondary')).not.toBeNull();
  });
});

test('every theme the registry lists draws, in both palettes', () => {
  for (const theme of themeRegistry) {
    const { container, unmount } = render(<ThemeSwatch swatch={theme.swatch} size="chip" />);
    const [dark, light] = halves(container.firstElementChild!);
    expect(painted(dark!, 'accent'), theme.id).toBe(theme.swatch.dark.accent);
    expect(painted(light!, 'accent'), theme.id).toBe(theme.swatch.light.accent);
    unmount();
  }
});

/*
 * NOTHING OF THE PAGE'S BUT THE OUTLINE. A colour the stylesheet took from a
 * page token would draw every theme's thumbnail partly in the theme on
 * screen, which is the one thing a thumbnail of another theme must not do.
 */
test('the stylesheet paints every part with the theme it is handed, and the outline with the page hairline', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'ThemeSwatch.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const colours = [...css.matchAll(/(?:background|border(?:-color)?)\s*:\s*([^;]+);/g)].map(([, value]) => value!.trim());
  const pageColours = colours.flatMap((value) => [...value.matchAll(/var\((--color-[\w-]+)\)/g)].map(([, name]) => name));
  expect(pageColours).toEqual(['--color-border-default']);
  expect(colours.filter((value) => value.includes('var(--crewlet-swatch-')).length).toBeGreaterThan(10);

  const uninstall = installThemed('dark', 'ThemeSwatch/ThemeSwatch.css');
  try {
    const { container } = render(<ThemeSwatch swatch={abyss.swatch} />);
    const root = getComputedStyle(container.firstElementChild!);
    expect(channels(root.borderTopColor)).toEqual(channels(themeColours('dark').get('--color-border-default')!));
    expect(root.getPropertyValue('forced-color-adjust')).toBe('none');
  } finally {
    uninstall();
  }
});
