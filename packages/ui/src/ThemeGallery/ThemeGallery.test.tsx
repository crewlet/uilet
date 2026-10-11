/**
 * The theme gallery: a radio group of cards, grouped, that previews the card
 * the pointer rests on and applies the one chosen.
 *
 * What it has to get right is the radio group's keyboard (one stop, arrows
 * that choose as they move, across the groups), what each card is called, and
 * that a pointer crossing the grid previews only where it stops.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { themeGroups, themeRegistry } from '@crewlethq/tokens';
import { channels, installThemed, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { HIGHLIGHT_REST_MS } from '../Listbox/index.js';
import { ThemeGallery, type ThemeGalleryTheme } from './index.js';

afterEach(cleanup);

function Gallery({ onPreview, initial = 'crewlet' }: { onPreview?: (id: string | null) => void; initial?: string }) {
  const [value, setValue] = useState<string>(initial);
  return (
    <>
      <ThemeGallery value={value} onValueChange={setValue} onPreview={onPreview} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const applied = () => screen.getByTestId('value').textContent;
const card = (name: RegExp | string) => screen.getByRole('radio', { name });

test('every theme the registry lists is a card, in the order of its groups, named with its tag', () => {
  render(<Gallery />);
  const group = screen.getByRole('radiogroup', { name: 'Theme' });
  const cards = within(group).getAllByRole('radio');
  const order = themeGroups.flatMap((g) => themeRegistry.filter((theme) => theme.group === g.id));
  expect(cards.map((el) => el.getAttribute('aria-label'))).toEqual(order.map((theme) => `${theme.name}, ${theme.tag}`));
  // Its group's heading describes it, so a reader hears where it sits.
  const abyss = card('Abyss, Vivid violet');
  expect(document.getElementById(abyss.getAttribute('aria-describedby')!)?.textContent).toBe('Purple');
  // The drawing is decoration: the name is printed under it.
  expect(abyss.querySelector('.crewlet-theme-swatch')?.getAttribute('aria-hidden')).toBe('true');
  expect(within(abyss).getByText('Abyss')).toBeTruthy();
});

test('the chosen card is the one stop, and the arrows choose as they move across the groups', () => {
  render(<Gallery />);
  const cards = screen.getAllByRole('radio');
  expect(cards.filter((el) => el.tabIndex === 0)).toEqual([card(/^Crewlet,/)]);
  expect(card(/^Crewlet,/).getAttribute('aria-checked')).toBe('true');

  card(/^Crewlet,/).focus();
  fireEvent.keyDown(card(/^Crewlet,/), { key: 'ArrowRight' });
  expect(applied()).toBe('violet');
  expect(document.activeElement).toBe(card(/^Violet,/));
  // From the last card of one group to the first of the next.
  fireEvent.keyDown(card(/^Violet,/), { key: 'ArrowDown' });
  fireEvent.keyDown(card(/^Origin,/), { key: 'ArrowDown' });
  expect(applied()).toBe('abyss');
  // End, then round the end back to the start.
  fireEvent.keyDown(card(/^Abyss,/), { key: 'End' });
  expect(applied()).toBe('high-contrast');
  fireEvent.keyDown(card(/^High contrast,/), { key: 'ArrowRight' });
  expect(applied()).toBe('crewlet');
  fireEvent.keyDown(card(/^Crewlet,/), { key: 'ArrowUp' });
  expect(applied()).toBe('high-contrast');
  // And the stop follows the choice.
  expect(screen.getAllByRole('radio').filter((el) => el.tabIndex === 0)).toEqual([card(/^High contrast,/)]);
});

test('a click chooses, and a value nobody offers leaves the first card the stop', () => {
  render(<Gallery initial="gone" />);
  expect(screen.getAllByRole('radio').filter((el) => el.tabIndex === 0)).toEqual([card(/^Crewlet,/)]);
  expect(screen.getAllByRole('radio').some((el) => el.getAttribute('aria-checked') === 'true')).toBe(false);
  fireEvent.click(card(/^Ledger,/));
  expect(applied()).toBe('ledger');
  expect(card(/^Ledger,/).getAttribute('aria-checked')).toBe('true');
});

test('the pointer previews the card it rests on, and leaving the gallery is nowhere', () => {
  vi.useFakeTimers();
  try {
    const told: (string | null)[] = [];
    const { container } = render(<Gallery onPreview={(id) => told.push(id)} />);
    fireEvent.mouseEnter(card(/^Violet,/));
    act(() => vi.advanceTimersByTime(HIGHLIGHT_REST_MS / 2));
    fireEvent.mouseEnter(card(/^Iris,/));
    act(() => vi.advanceTimersByTime(HIGHLIGHT_REST_MS));
    expect(told).toEqual(['iris']);
    // Pointing is not choosing.
    expect(applied()).toBe('crewlet');
    fireEvent.mouseLeave(container.querySelector('.crewlet-theme-gallery')!);
    expect(told).toEqual(['iris', null]);
  } finally {
    vi.useRealTimers();
  }
});

test('disabled, nothing can be chosen and the group says so', () => {
  const onValueChange = vi.fn();
  render(<ThemeGallery value="crewlet" onValueChange={onValueChange} disabled />);
  expect(screen.getByRole('radiogroup').getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(card(/^Abyss,/));
  fireEvent.keyDown(card(/^Crewlet,/), { key: 'ArrowRight' });
  expect(onValueChange).not.toHaveBeenCalled();
});

test('a theme whose group is not listed is still offered, after the groups and under no heading', () => {
  const swatch = themeRegistry[0]!.swatch;
  const themes: ThemeGalleryTheme[] = [
    { id: 'a', name: 'Alpha', tag: 'First', group: 'one', swatch },
    { id: 'b', name: 'Beta', tag: 'Loose', group: 'elsewhere', swatch },
  ];
  render(<ThemeGallery value="a" onValueChange={() => {}} themes={themes} groups={[{ id: 'one', name: 'One' }]} columns={2} />);
  expect(screen.getAllByRole('radio').map((el) => el.getAttribute('aria-label'))).toEqual(['Alpha, First', 'Beta, Loose']);
  expect(card('Beta, Loose').getAttribute('aria-describedby')).toBeNull();
});

test('the gallery carries no accessibility violation', async () => {
  const { container } = render(
    <main>
      <h1>Appearance</h1>
      <Gallery />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

/*
 * ONE LINE ROUND A CARD IN EVERY STATE. The chosen card is its own border in
 * the accent, never a frame round a card, and the focus ring is drawn over
 * that border rather than as a second line outside it.
 */
test('the chosen card is its own border in the accent, and focus draws over it', () => {
  const uninstall = installThemed('dark', 'ThemeGallery/ThemeGallery.css');
  try {
    render(<Gallery />);
    const colours = themeColours('dark');
    const chosen = getComputedStyle(card(/^Crewlet,/));
    const resting = getComputedStyle(card(/^Violet,/));
    expect(channels(chosen.borderTopColor)).toEqual(channels(colours.get('--color-brand-accent')!));
    expect(channels(resting.borderTopColor)).toEqual(channels(colours.get('--color-border-default')!));
    expect(chosen.borderTopWidth).toBe(resting.borderTopWidth);
    expect(chosen.outlineStyle === '' || chosen.outlineStyle === 'none').toBe(true);
  } finally {
    uninstall();
  }
});

/*
 * THE CHOSEN CARD KEEPS ITS ACCENT UNDER THE POINTER. jsdom matches no
 * :hover, so the stylesheet's own rule is read: the hover border is never
 * drawn on the chosen card, which would otherwise outrank its accent.
 */
test('the hover border is never drawn on the chosen card', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'ThemeGallery.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const hover = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selector]) => selector!.includes(':hover'));
  expect(hover.length).toBeGreaterThan(0);
  for (const [, selector] of hover) expect(selector, selector).toContain(':not(.is-chosen)');
});
