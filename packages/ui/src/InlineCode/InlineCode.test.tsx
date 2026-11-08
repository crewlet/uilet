/**
 * One identifier inside a sentence.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { InlineCode } from './index.js';

let uninstall: (() => void) | null = null;

afterEach(() => {
  cleanup();
  uninstall?.();
  uninstall = null;
});

/** The chip's text, run by run, with each held run marked. */
function runs(code: Element): string[] {
  return [...code.childNodes].map((node) =>
    node instanceof Element && node.classList.contains('crewlet-inline-code__end') ? `[${node.textContent}]` : (node.textContent ?? ''),
  );
}

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

test('a whole chip moves to the next line whole, and breaks only where no line holds it', () => {
  // A cron expression or an event type split over two lines names nothing;
  // held with `nowrap`, one wider than a nested list item ran past its box.
  const { container } = render(<InlineCode whole>*/20 * * * *</InlineCode>);
  expect(container.firstElementChild?.className).toContain('crewlet-inline-code--whole');
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(here, 'InlineCode.css'), 'utf8');
  const at = css.indexOf('.crewlet-inline-code--whole {');
  const rule = css.slice(at, css.indexOf('}', at));
  expect(rule).toContain('display: inline-block');
  expect(rule).toContain('max-width: 100%');
  expect(rule).not.toContain('nowrap');
  expect(rule).not.toContain('overflow-wrap: normal');
});

test('no presentation prop reaches the DOM', () => {
  const { container } = render(
    <InlineCode variant="reference" tone="inherit" truncate whole>
      x
    </InlineCode>,
  );
  const code = container.firstElementChild as HTMLElement;
  for (const name of ['variant', 'tone', 'truncate', 'whole']) {
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

test('a reference holds its braces to the name and lets the name break', () => {
  // Held whole, a long name ran past a dialog at a phone's width. Held by its
  // ends, `${` and `}` never stand on a line of their own, and the name between
  // them offers no break, so a chip that fits a line still moves there whole.
  uninstall = installSheets('InlineCode/InlineCode.css');
  const { container } = render(<InlineCode variant="reference">{'${GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY}'}</InlineCode>);
  const code = container.querySelector('code')!;
  expect(runs(code)).toEqual(['[${G]', 'OOGLE_CLOUD_SERVICE_ACCOUNT_KE', '[Y}]']);
  // One token to a reader: copied or read, it is the name exactly.
  expect(code.textContent).toBe('${GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY}');
  expect(getComputedStyle(code).whiteSpace).not.toBe('nowrap');
  expect(getComputedStyle(code).overflowWrap).toBe('anywhere');
  for (const end of code.querySelectorAll('.crewlet-inline-code__end')) {
    expect(getComputedStyle(end).whiteSpace).toBe('nowrap');
  }
});

test('a reference written in pieces is held the same way', () => {
  const { container } = render(
    <InlineCode variant="reference">
      ${'{'}SLACK_BOT_TOKEN{'}'}
    </InlineCode>,
  );
  expect(runs(container.querySelector('code')!)).toEqual(['[${S]', 'LACK_BOT_TOKE', '[N}]']);
});

test('a one-character name is held whole', () => {
  const { container } = render(<InlineCode variant="reference">{'${A}'}</InlineCode>);
  expect(runs(container.querySelector('code')!)).toEqual(['[${A}]']);
});

test('only a reference shaped ${NAME} is cut, and only in the reference variant', () => {
  const bare = render(<InlineCode variant="reference">SLACK_BOT_TOKEN</InlineCode>);
  expect(runs(bare.container.querySelector('code')!)).toEqual(['SLACK_BOT_TOKEN']);
  bare.unmount();
  const empty = render(<InlineCode variant="reference">{'${}'}</InlineCode>);
  expect(runs(empty.container.querySelector('code')!)).toEqual(['${}']);
  empty.unmount();
  const plain = render(<InlineCode>{'${SLACK_BOT_TOKEN}'}</InlineCode>);
  expect(runs(plain.container.querySelector('code')!)).toEqual(['${SLACK_BOT_TOKEN}']);
});
