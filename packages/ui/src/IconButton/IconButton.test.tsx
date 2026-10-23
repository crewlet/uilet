/**
 * The icon-only link: a place reached by its glyph, named in words, and saying
 * when the reader is already there.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { IconButtonLink } from './index.js';

afterEach(cleanup);

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
  const current = rule('.crewlet-icon-btn--current:hover');
  expect(current).toContain('background: var(--color-surface-elevated);');
  // The border the square always carries, coloured, so the current place moves nothing.
  expect(current).toContain('border-color: var(--color-border-default);');
  expect(rule('.crewlet-icon-btn--current:focus-visible')).toContain(
    'outline-offset: var(--size-focus-ring-inset-offset);',
  );
});
