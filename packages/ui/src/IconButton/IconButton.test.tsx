/**
 * The icon-only link: a place reached by its glyph, named in words, and saying
 * when the reader is already there.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test, vi } from 'vitest';
import { channels, installSheets, installThemed, px, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { Tooltip } from '../Tooltip/index.js';
import { IconButton, IconButtonLink } from './index.js';

afterEach(cleanup);

/** A palette's colour by token name, without the leading dashes (a quoted custom property reads as a declaration to the lint). */
const tokenColour = (palette: ReadonlyMap<string, string>, name: string) => channels(palette.get(`--${name}`)!);

test('an icon link is a real link, named and titled by its label', () => {
  render(<IconButtonLink label="Settings" href="#/settings" icon={<svg data-testid="glyph" />} size="sm" />);
  const link = screen.getByRole('link', { name: 'Settings' });
  expect(link.getAttribute('href')).toBe('#/settings');
  expect(link.getAttribute('title')).toBe('Settings');
  expect(link.className).toContain('crewlet-icon-btn--sm');
  expect(link.className).toContain('crewlet-icon-btn--ghost');
  expect(link.hasAttribute('aria-current')).toBe(false);
});

test('an icon link to the page the reader is on says so, and is drawn as the current place', () => {
  render(<IconButtonLink label="Settings" href="#/settings" icon={<svg />} current />);
  const link = screen.getByRole('link', { name: 'Settings' });
  expect(link.getAttribute('aria-current')).toBe('page');
  expect(link.className).toContain('crewlet-icon-btn--current');
});

test("the current place draws a nav row's selected treatment on the square's own boundary, and its ring covers it", () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'IconButton.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at)).replace(/\s+/g, ' ');
  };
  const current = rule(".crewlet-icon-btn--current:hover:not(:disabled):not([aria-disabled='true'])");
  expect(current).toContain('background: var(--color-surface-elevated);');
  // The border the square always carries, coloured, so the current place moves nothing.
  expect(current).toContain('border-color: var(--color-border-default);');
  expect(rule('.crewlet-icon-btn--current:focus-visible')).toContain(
    'outline-offset: var(--size-focus-ring-inset-offset);',
  );
});

test('the current place keeps the primary ink on every variant, a ghost included', () => {
  // The variants used to follow the current rule and tie with it, so a ghost
  // square's secondary ink won and the place the reader was on looked like
  // every other square in the row.
  const uninstall = installThemed('light', 'IconButton/IconButton.css');
  const colours = themeColours('light');
  render(
    <>
      <IconButtonLink label="Settings" href="#/settings" icon={<svg />} current />
      <IconButtonLink label="Help" href="#/help" icon={<svg />} variant="ghost-brand" current />
    </>,
  );
  for (const name of ['Settings', 'Help']) {
    const link = screen.getByRole('link', { name });
    expect(channels(getComputedStyle(link).color)).toEqual(tokenColour(colours, 'color-text-primary'));
    expect(channels(getComputedStyle(link).backgroundColor)).toEqual(tokenColour(colours, 'color-surface-elevated'));
  }
  uninstall();
});

test('the primary square is the accent fill with the label ink on it', () => {
  const uninstall = installThemed('light', 'IconButton/IconButton.css');
  const colours = themeColours('light');
  render(<IconButton label="Send" icon={<svg />} variant="primary" />);
  const button = screen.getByRole('button', { name: 'Send' });
  expect(button.className).toContain('crewlet-icon-btn--primary');
  expect(channels(getComputedStyle(button).backgroundColor)).toEqual(tokenColour(colours, 'color-brand-accent'));
  expect(channels(getComputedStyle(button).color)).toEqual(tokenColour(colours, 'color-text-on-accent'));
  uninstall();
});

test("a header's control is the md square with an 18px glyph, where the md square draws 14px", () => {
  const uninstall = installSheets('IconButton/IconButton.css');
  try {
    render(
      <>
        <IconButton label="Search" size="header" icon={<svg className="crewlet-glyph" />} />
        <IconButton label="Copy" size="md" icon={<svg className="crewlet-glyph" />} />
        <IconButtonLink label="Details" href="#/details" size="header" icon={<svg className="crewlet-glyph" />} />
      </>,
    );
    for (const control of [screen.getByRole('button', { name: 'Search' }), screen.getByRole('link', { name: 'Details' })]) {
      expect(control.className).toContain('crewlet-icon-btn--header');
      expect(px(control, 'width')).toBe(30);
      expect(px(control, 'height')).toBe(30);
      expect(px(control.querySelector('svg')!, 'width')).toBe(18);
      expect(px(control.querySelector('svg')!, 'height')).toBe(18);
    }
    const md = screen.getByRole('button', { name: 'Copy' });
    expect(px(md, 'width')).toBe(30);
    expect(px(md.querySelector('svg')!, 'width')).toBe(14);
  } finally {
    uninstall();
  }
});

// A GLYPH SAYS WHAT IT DOES without the caller asking: on keyboard focus at
// once, where a native title shows nothing, and on hover in the kit's tip.
test('an icon button says what it does on keyboard focus by default, with no native title beside it', () => {
  vi.useFakeTimers();
  try {
    render(<IconButton label="Mark all read" icon={<svg />} />);
    const button = screen.getByRole('button', { name: 'Mark all read' });
    expect(button.getAttribute('title')).toBe('');
    act(() => button.focus());
    const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
    expect(tip?.textContent).toBe('Mark all read');
  } finally {
    vi.useRealTimers();
  }
});

test("a caller's own tooltip turns the default off, so the pointer meets one tip", () => {
  vi.useFakeTimers();
  try {
    render(
      <Tooltip content="New message (N)">
        <IconButton label="New message" icon={<svg />} tooltip={false} />
      </Tooltip>,
    );
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'New message' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const tips = document.querySelectorAll('[role="tooltip"]');
    expect([...tips].map((t) => t.textContent)).toEqual(['New message (N)']);
  } finally {
    vi.useRealTimers();
  }
});

test("a caller's title is what the tip says, and no native title is drawn beside it", () => {
  vi.useFakeTimers();
  try {
    render(<IconButton label="Previous" icon={<svg />} title="Previous ([)" />);
    const button = screen.getByRole('button', { name: 'Previous' });
    expect(button.getAttribute('title')).toBe('');
    fireEvent.pointerEnter(button);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Previous ([)');
  } finally {
    vi.useRealTimers();
  }
});
