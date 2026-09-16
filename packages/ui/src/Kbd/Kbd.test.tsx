/**
 * A shortcut hint names the key the reader actually presses, and is read as
 * words rather than as glyph names.
 *
 * Ported from the engine dashboard's `ui/Kbd.test.tsx`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Kbd, keyGlyph } from './index.js';

afterEach(cleanup);

test('a quieter cap gives up its frame, never its ink', () => {
  /*
   * An opacity multiplies the TEXT as well as the border, and the cap's text
   * is the whole point of it: the reader is being told which key to press.
   * 0.7 of a text step measures 3.43:1 on the panel, so the one thing on the
   * row a reader had to read was the one they could not. Quieting is a flatter
   * frame over a measured ink step, and the palette suite is what holds the
   * step.
   *
   * BOTH RULES, because the ink is declared once now: the cap itself carries
   * the tertiary step, measured at 4.5:1 on every surface, and the quiet
   * modifier only drops the frame. An opacity creeping into either one is the
   * same defect wherever it lands.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(here, 'Kbd.css'), 'utf8');
  const cap = /\.crewlet-kbd\s*\{([^}]*)\}/.exec(css);
  const subtle = /\.crewlet-kbd--subtle\s*\{([^}]*)\}/.exec(css);
  expect(cap).not.toBeNull();
  expect(subtle).not.toBeNull();
  expect(cap?.[1]).toMatch(/color:\s*var\(--color-text-tertiary\)/);
  expect(cap?.[1]).not.toMatch(/opacity\s*:/);
  expect(subtle?.[1]).not.toMatch(/opacity\s*:/);
});

test('a cap is set on the line it sits in, not on a line of its own', () => {
  /*
   * A keycap is drawn INSIDE a run of text and never beside it: a hint at the
   * end of a search field, a key named in a sentence, a shortcut at the end of
   * a menu row. On a tighter step than the line around it the cap stood a
   * pixel short, and every row that held one sat a pixel off the rows that did
   * not. It is read off the document's own rule rather than named here, so the
   * two cannot be changed apart.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const cap = /\.crewlet-kbd\s*\{([^}]*)\}/.exec(readFileSync(join(here, 'Kbd.css'), 'utf8'))?.[1] ?? '';
  const base = readFileSync(resolve(here, '../../../tokens/dist/css/base.css'), 'utf8');
  const documentLeading = /(?:^|\})\s*body\s*\{[^}]*line-height:\s*var\((--[\w-]+)\)/.exec(base)?.[1];
  expect(documentLeading).toBeTruthy();
  expect(cap).toContain(`line-height: var(${documentLeading ?? ''})`);
});

test('Mod is Command on Apple platforms and Control everywhere else', () => {
  expect(keyGlyph('Mod', true)).toEqual({ glyph: '⌘', spoken: 'Command' });
  expect(keyGlyph('Mod', false)).toEqual({ glyph: 'Ctrl', spoken: 'Control' });
  expect(keyGlyph('Alt', true).spoken).toBe('Option');
  expect(keyGlyph('Backspace', true)).toEqual({ glyph: '⌫', spoken: 'Delete' });
});

test('a letter is printed in capitals, and an unknown key as itself', () => {
  expect(keyGlyph('z', false)).toEqual({ glyph: 'Z', spoken: 'Z' });
  expect(keyGlyph('F10', false)).toEqual({ glyph: 'F10', spoken: 'F10' });
});

test('the glyphs are hidden and one sentence is read instead', () => {
  // A screen reader handed the glyphs reads "place of interest sign Z", which
  // names nothing anybody presses.
  const { container } = render(<Kbd keys={['Mod', 'Shift', 'z']} apple />);
  const drawn = container.querySelector("[aria-hidden='true']")!;
  expect([...drawn.querySelectorAll('kbd')].map((cap) => cap.textContent)).toEqual(['⌘', '⇧', 'Z']);
  expect(container.querySelector('.crewlet-visually-hidden')?.textContent).toBe('Command plus Shift plus Z');
});

test('one key with no shortcut is still one keycap, read as itself', () => {
  // The hint inside a field: "Enter" beside a box that adds a value to a list.
  render(<Kbd>Enter</Kbd>);
  const cap = screen.getByText('Enter');
  expect(cap.tagName).toBe('KBD');
  expect(cap.getAttribute('aria-hidden')).toBeNull();
});
