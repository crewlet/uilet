/**
 * One identifier inside a sentence.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { InlineCode } from './index.js';

afterEach(cleanup);

test('it is a code element, so a reader is told it is one', () => {
  render(<InlineCode>store.driver</InlineCode>);
  expect(screen.getByText('store.driver').tagName).toBe('CODE');
});

test('a reference is marked as one', () => {
  // A `${NAME}` is a POINTER at a value, not the value, and the two sit side
  // by side on a configuration screen.
  const { container } = render(<InlineCode variant="reference">{'${SLACK_BOT_TOKEN}'}</InlineCode>);
  expect(container.firstElementChild?.className).toContain('crewlet-inline-code--reference');
});

test('inherit gives up the chip, so a callout keeps one ink', () => {
  // A calm grey identifier in the middle of an alarming sentence reads as a
  // separate, calmer sentence inside it.
  const { container } = render(<InlineCode tone="inherit">seats[0].handle</InlineCode>);
  expect(container.firstElementChild?.className).toContain('crewlet-inline-code--inherit');
});

test('no presentation prop reaches the DOM', () => {
  const { container } = render(
    <InlineCode variant="reference" tone="inherit" truncate>
      x
    </InlineCode>,
  );
  const code = container.firstElementChild as HTMLElement;
  for (const name of ['variant', 'tone', 'truncate']) {
    expect(code.getAttribute(name)).toBeNull();
  }
});

test('a chip inside a message takes its ink and keeps its own ground', () => {
  // ONLY THE INK. The chip's ground and its inset are what say "this is a
  // string you type", and a bare run of monospace inside a sentence is not
  // that. The composite the message's ink then lands on is measured:
  // @crewlethq/tokens holds every status ink to 4.5:1 on the inset well drawn
  // over its own callout tint.
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(here, 'InlineCode.css'), 'utf8');
  const at = css.indexOf('.crewlet-inline-code--inherit {');
  expect(at).toBeGreaterThan(-1);
  const rule = css.slice(at, css.indexOf('}', at));
  expect(rule).toContain('color: inherit');
  expect(rule).not.toMatch(/background\s*:/);
  expect(rule).not.toMatch(/padding\s*:/);
});
