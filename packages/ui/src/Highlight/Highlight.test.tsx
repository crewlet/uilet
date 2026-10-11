/**
 * Words a search matched: where a mark starts, what it covers, and that the
 * ground behind it never costs the word its contrast.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, flatten, OPAQUE_SURFACES, paletteStates, parseHex, TEXT_STEPS, type Rgb } from '@crewlethq/tokens/test/palette';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Highlight, highlightRanges, highlightTerms } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, path), 'utf8');

/** The marked stretches of `text`, as the words they cover. */
const marked = (text: string, terms: readonly string[]) =>
  highlightRanges(text, terms).map(([start, end]) => text.slice(start, end));

test('the terms of a query are its words, folded, once each, longest first', () => {
  expect(highlightTerms('Leftover cent, CENT and a q3 plan')).toEqual(['leftover', 'cent', 'plan', 'and', 'q3']);
});

test('a one letter word is not a term, or every "a" in a snippet would be marked', () => {
  expect(highlightTerms('a b c')).toEqual([]);
});

test('a term marks the start of a word and never its middle', () => {
  // "percent" holds "cent", and the engine never matched it there.
  expect(marked('The leftover cents, not the percent.', ['cent'])).toEqual(['cent']);
  expect(highlightRanges('The leftover cents, not the percent.', ['cent'])).toEqual([[13, 17]]);
});

test('a match ignores case and keeps the text as it was written', () => {
  expect(marked('Settle the Leftover Cent', ['leftover', 'cent'])).toEqual(['Leftover', 'Cent']);
});

test('where two terms start at one place the longer one is marked', () => {
  expect(marked('The settlement algorithm', ['settle', 'settlement'])).toEqual(['settlement']);
});

test('the offsets are the text own, even after a character lower casing would lengthen', () => {
  // "İ" lower-cases to two code units; matched over a lower-cased copy every
  // offset after it would be one character off.
  const text = 'İstanbul pays the cent';
  expect(marked(text, ['cent'])).toEqual(['cent']);
});

test('a term carrying the characters of a pattern is matched as text', () => {
  expect(marked('Ask (q3) about c++ today', ['c++'])).toEqual(['c++']);
});

test('no terms, or no text, mark nothing', () => {
  expect(highlightRanges('words', [])).toEqual([]);
  expect(highlightRanges('', ['words'])).toEqual([]);
  expect(highlightRanges('words', ['  '])).toEqual([]);
});

test('the component draws every word once, with each match in a mark element', () => {
  const { container } = render(<Highlight text="Ana pays the leftover cent" terms={['leftover', 'cent']} />);
  const root = container.firstElementChild as HTMLElement;
  expect(root.textContent).toBe('Ana pays the leftover cent');
  expect([...root.querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual(['leftover', 'cent']);
  expect(root.className).toContain('crewlet-highlight');
});

test('a text with no match is drawn whole, with no mark at all', () => {
  const { container } = render(<Highlight text="Nothing here" terms={['cent']} />);
  expect(container.querySelector('mark')).toBeNull();
  expect(container.textContent).toBe('Nothing here');
});

test('the ground behind a match keeps both text inks above the floor for text', () => {
  // A mark keeps the ink of the words around it, the primary step in a title
  // and the secondary one in a snippet. Measured with the tokens package's own
  // maths over every opaque surface in every theme, so a change to the soft
  // accent that dims a match below 4.5:1 fails here rather than on a screen.
  const css = read('Highlight.css');
  const ground = /\.crewlet-highlight__match\s*\{[^}]*background:\s*var\((--[\w-]+)\)/.exec(css)?.[1];
  expect(ground).toMatch(/^--color-brand-accent-soft/);

  const states = paletteStates({
    tokens: read('../../../tokens/dist/css/tokens.css'),
    themes: read('../../../tokens/dist/css/themes.css'),
  });
  const measured: string[] = [];
  const failures: string[] = [];
  for (const [state, values] of Object.entries(states)) {
    if (state === 'base') continue;
    const tint = values.get(ground ?? '') ?? '';
    // The primary and secondary steps, named by the palette module rather
    // than spelt here: a title's ink and a snippet's.
    for (const [ink] of TEXT_STEPS.slice(0, 2)) {
      const text = parseHex(values.get(ink) ?? '');
      expect(text).not.toBeNull();
      for (const surface of OPAQUE_SURFACES) {
        const base = parseHex(values.get(surface) ?? '');
        expect(base).not.toBeNull();
        const behind = flatten(tint, base as Rgb);
        const ratio = contrast(text as Rgb, behind);
        measured.push(`${state} ${ink} on ${surface}`);
        if (ratio < 4.5) failures.push(`${state} ${ink} on ${surface}: ${ratio.toFixed(2)}:1`);
      }
    }
  }
  expect(measured.length).toBeGreaterThan(0);
  expect(failures).toEqual([]);
});
