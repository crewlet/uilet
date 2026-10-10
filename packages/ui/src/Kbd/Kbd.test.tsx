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
import { themes } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installThemed } from '../../../../apps/ui-tests/src/cascade.js';
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

test('a key inside a chord takes no box of its own, whatever the page says about kbd', () => {
  /*
   * ONE CHORD, ONE CAP. An application rule drawing every bare `kbd` as a cap
   * reached the keys inside a chord and framed each one inside the chord's
   * own frame. The key states its whole box, so no rule of that kind can.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const key = /\.crewlet-kbd__key\s*\{([^}]*)\}/.exec(readFileSync(join(here, 'Kbd.css'), 'utf8'))?.[1] ?? '';
  for (const declaration of ['padding: 0', 'background: none', 'border: 0', 'border-radius: 0', 'color: inherit']) {
    expect(key).toContain(declaration);
  }
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
  expect([...drawn.querySelectorAll('kbd')].map((key) => key.textContent)).toEqual(['⌘', '⇧', 'Z']);
  expect(container.querySelector('.crewlet-visually-hidden')?.textContent).toBe('Command plus Shift plus Z');
});

test('a chord is one cap, printed in the platform notation', () => {
  /*
   * The keys of a shortcut are pressed together, so they are printed on ONE
   * cap, as the approved design draws every shortcut it shows: `⌘K`. A cap per
   * key read as a sequence to press one after another. On an Apple platform
   * the menus run a chord's symbols together; everywhere else they join the
   * names with a plus. Each key is still a `kbd` inside the cap, which is how a
   * key combination is marked up.
   */
  const { container, rerender } = render(<Kbd keys={['Mod', 'k']} apple />);
  const cap = () => [...container.querySelectorAll('.crewlet-kbd')];
  expect(cap().map((one) => one.textContent)).toEqual(['⌘K']);
  expect([...cap()[0]!.querySelectorAll('kbd')].map((key) => key.textContent)).toEqual(['⌘', 'K']);
  expect(cap()[0]!.getAttribute('aria-hidden')).toBe('true');

  rerender(<Kbd keys={['Mod', 'Shift', 'z']} apple={false} />);
  expect(cap().map((one) => one.textContent)).toEqual(['Ctrl+Shift+Z']);
  expect([...cap()[0]!.querySelectorAll('kbd')].map((key) => key.textContent)).toEqual(['Ctrl', 'Shift', 'Z']);
  expect(container.querySelector('.crewlet-visually-hidden')?.textContent).toBe('Control plus Shift plus Z');
});

test('a cap is the raised rung inside the strong hairline, and a quiet one gives up the fill', () => {
  /*
   * The approved design's keycap, as the cascade paints it: the raised rung,
   * the strong hairline and the tertiary ink, which the palette suite holds
   * at 4.5:1 on every rung. The quiet cap drops the fill and takes the plain
   * hairline, and keeps the ink.
   */
  const transparent = (value: string) => value === '' || value === 'transparent' || /^rgba\(0, 0, 0, 0\)$/.test(value);
  for (const theme of ['dark', 'light'] as const) {
    const uninstall = installThemed(theme, 'Kbd/Kbd.css');
    const { unmount } = render(
      <>
        <Kbd>Esc</Kbd>
        <Kbd subtle>Enter</Kbd>
      </>,
    );
    const palette = themes[theme].color;
    const cap = getComputedStyle(screen.getByText('Esc'));
    expect(channels(cap.backgroundColor), theme).toEqual(parseHex(palette.surface.elevated));
    expect(channels(cap.borderTopColor), theme).toEqual(parseHex(palette.border.strong));
    // Flat on every side: the heavier bottom edge said "raised" a second time.
    expect(cap.borderBottomWidth, theme).toBe(cap.borderTopWidth);
    expect(channels(cap.color), theme).toEqual(parseHex(palette.text.tertiary));
    const quiet = getComputedStyle(screen.getByText('Enter'));
    expect(transparent(quiet.backgroundColor), `${theme}: ${quiet.backgroundColor}`).toBe(true);
    expect(channels(quiet.borderTopColor), theme).toEqual(parseHex(palette.border.default));
    expect(channels(quiet.color), theme).toEqual(parseHex(palette.text.tertiary));
    unmount();
    uninstall();
  }
});

test('one key with no shortcut is still one keycap, read as itself', () => {
  // The hint inside a field: "Enter" beside a box that adds a value to a list.
  render(<Kbd>Enter</Kbd>);
  const cap = screen.getByText('Enter');
  expect(cap.tagName).toBe('KBD');
  expect(cap.getAttribute('aria-hidden')).toBeNull();
});
