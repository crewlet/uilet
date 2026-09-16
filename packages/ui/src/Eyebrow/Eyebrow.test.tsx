/**
 * The kicker above a title.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Eyebrow } from './index.js';

afterEach(cleanup);

/*
 * A path rather than `new URL(..., import.meta.url)`: Vite rewrites that exact
 * pattern into an asset reference, so the URL that comes back names the dev
 * server rather than the file on disk.
 */
const here = dirname(fileURLToPath(import.meta.url));
const css = (file: string) => readFileSync(join(here, file), 'utf8');

/** The declarations of one rule, by selector, from a stylesheet's source. */
function ruleOf(sheet: string, selector: string): string {
  const at = sheet.indexOf(`${selector} {`);
  expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return sheet.slice(at, sheet.indexOf('}', at));
}

test('it is an inline span by default, so it does not claim to be a heading', () => {
  // A kicker read as a heading puts a level into the outline that names a
  // section nobody wrote.
  render(<Eyebrow>WHAT THE ENGINE DOES</Eyebrow>);
  const kicker = screen.getByText('WHAT THE ENGINE DOES');
  expect(kicker.tagName).toBe('SPAN');
  expect(kicker.className).toContain('crewlet-eyebrow--muted');
});

test('it draws the element it is told to', () => {
  render(<Eyebrow as="p" variant="accent">GOAL ALIGNMENT</Eyebrow>);
  expect(screen.getByText('GOAL ALIGNMENT').tagName).toBe('P');
});

test('the kicker and the label register are one register', () => {
  // They name the same thing: the block under them. Set in two registers they
  // drift, which is how one product ends up with six tracking values for one
  // job. The tie is asserted rather than remembered, because nothing else
  // connects two stylesheets.
  const kicker = ruleOf(css('Eyebrow.css'), '.crewlet-eyebrow');
  const label = ruleOf(css('../Text/Text.css'), '.crewlet-text--label');
  for (const declaration of [
    'font-size: var(--font-size-2xs)',
    'font-weight: var(--font-weight-medium)',
    'letter-spacing: var(--font-letter-spacing-wide)',
    'text-transform: uppercase',
  ]) {
    expect(kicker, `the kicker is missing ${declaration}`).toContain(declaration);
    expect(label, `the label register is missing ${declaration}`).toContain(declaration);
  }
  // And the kicker no longer brings a face of its own to a register that has
  // none: it takes the document's, exactly as the label does.
  expect(kicker).not.toContain('font-family');
  expect(label).not.toContain('font-family');
});

test('the accent kicker takes the accent as an INK, never as a fill', () => {
  // The fill step is a mark and clears 3:1. A word has to clear 4.5:1, and an
  // 11px uppercase label is exactly where a fill spent as text fails.
  const accent = ruleOf(css('Eyebrow.css'), '.crewlet-eyebrow--accent');
  expect(accent).toContain('var(--color-brand-accent-ink)');
  expect(accent).not.toMatch(/var\(--color-brand-accent\)/);
});
