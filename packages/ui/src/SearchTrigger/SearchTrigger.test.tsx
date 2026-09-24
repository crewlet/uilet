/**
 * The narrow-layout case from the engine dashboard's `app/Shell.test.tsx`: the
 * one breakpoint hides the label and the hint, and a button whose name came
 * from its text would be announced as "button" at every width below it.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { breakpoint, themes } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installSheets, installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
import { Kbd } from '../Kbd/index.js';
import { SearchTrigger } from './index.js';

afterEach(cleanup);

/**
 * What the stylesheet's breakpoint does to the button, applied as inline
 * styles.
 *
 * Inline rather than as a style element, which the package's own source
 * scan refuses anywhere under `src`: what a name computation reads is the
 * resolved display of these two elements, and it is the same either way.
 */
function narrowLayout(): () => void {
  const hidden = [
    ...document.querySelectorAll<HTMLElement>(
      '.crewlet-search-trigger__label, .crewlet-search-trigger__shortcut',
    ),
  ];
  for (const element of hidden) element.style.display = 'none';
  return () => {
    for (const element of hidden) element.style.display = '';
  };
}

test('the button keeps its name where the narrow layout hides its label', () => {
  render(
    <SearchTrigger
      variant="toolbar"
      keyshortcuts="Control+K Meta+K /"
      shortcut={<Kbd keys={['Mod', 'k']} apple={false} />}
    />,
  );
  const restore = narrowLayout();
  try {
    const search = screen.getByRole('button', { name: 'Search' });
    expect(search.getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K /');
  } finally {
    restore();
  }
});

test('the label is drawn, and it is the same word the button is called', () => {
  render(<SearchTrigger label="Find anything" />);
  const search = screen.getByRole('button', { name: 'Find anything' });
  // The visible text and the name agree, which is what lets somebody speaking
  // to the page say what they see.
  expect(search.textContent).toContain('Find anything');
});

test('the shortcut hint is drawn beside it as one cap and reads as a sentence', () => {
  render(<SearchTrigger shortcut={<Kbd keys={['Mod', 'k']} apple={false} />} />);
  const search = screen.getByRole('button', { name: 'Search' });
  const caps = [...search.querySelectorAll('.crewlet-kbd')];
  expect(caps.map((cap) => cap.textContent)).toEqual(['Ctrl+K']);
  expect(within(search).getByText('Control plus K')).toBeDefined();
});

/*
 * TWO PLACES, AND THE RAIL IS THE DEFAULT. The approved design puts the field
 * in the sidebar, the width of the rail, on the SHEET's ground one rung above
 * the frame it stands on; a screen's own search stands in its bar on the
 * sheet, on the CARD's ground at the control height.
 */
test('the rail field is the sheet across the rail, and the toolbar field the card at the control height', () => {
  for (const theme of ['dark', 'light'] as const) {
    const uninstall = installThemed(theme, 'SearchTrigger/SearchTrigger.css');
    const { unmount } = render(
      <>
        <SearchTrigger label="Ask or jump to…" />
        <SearchTrigger variant="toolbar" label="Search ENG" />
      </>,
    );
    const palette = themes[theme].color;
    const rail = screen.getByRole('button', { name: 'Ask or jump to…' });
    const toolbar = screen.getByRole('button', { name: 'Search ENG' });
    expect(rail.className).toContain('crewlet-search-trigger--rail');
    expect(channels(getComputedStyle(rail).backgroundColor), `${theme}: rail`).toEqual(
      parseHex(palette.surface.background),
    );
    expect(channels(getComputedStyle(toolbar).backgroundColor), `${theme}: toolbar`).toEqual(
      parseHex(palette.surface.subtle),
    );
    for (const field of [rail, toolbar]) {
      expect(channels(getComputedStyle(field).borderTopColor), theme).toEqual(parseHex(palette.border.default));
    }
    unmount();
    uninstall();
  }

  const uninstall = installSheets('SearchTrigger/SearchTrigger.css');
  try {
    render(
      <>
        <SearchTrigger label="Ask or jump to…" />
        <SearchTrigger variant="toolbar" label="Search ENG" />
      </>,
    );
    const rail = screen.getByRole('button', { name: 'Ask or jump to…' });
    // The design's 34px: the medium control and one scale step, the rail's way
    // in rather than one more button. And the whole width it is given.
    expect(px(rail, 'height')).toBe(34);
    expect(getComputedStyle(rail).width).toBe('100%');
    expect(px(screen.getByRole('button', { name: 'Search ENG' }), 'height')).toBe(30);
  } finally {
    uninstall();
  }
});

test('only the toolbar field folds to its glyph under the shell breakpoint', () => {
  /*
   * The rail is a drawer under the shell breakpoint, as wide as it ever was,
   * so a rail field that dropped its words there would be a magnifier alone in
   * a 236px drawer. jsdom answers no media query, so the rules inside the
   * shell's query are read: every one of them names the toolbar form.
   */
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SearchTrigger.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const query = `@media (width < ${breakpoint.shell})`;
  const at = css.indexOf(query);
  expect(at).toBeGreaterThan(-1);
  let depth = 0;
  let end = css.indexOf('{', at);
  for (let index = end; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    else if (css[index] === '}') depth -= 1;
    if (depth === 0) {
      end = index;
      break;
    }
  }
  const selectors = [...css.slice(css.indexOf('{', at) + 1, end).matchAll(/([^{}]+)\{/g)].flatMap((match) =>
    (match[1] ?? '').split(',').map((one) => one.trim()),
  );
  expect(selectors.length).toBeGreaterThan(0);
  expect(selectors.filter((selector) => !selector.startsWith('.crewlet-search-trigger--toolbar'))).toEqual([]);
});

test('it opens what it was given to open', () => {
  const onClick = vi.fn();
  render(<SearchTrigger onClick={onClick} />);
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('it is a button rather than a field, and never submits a form', () => {
  render(
    <form onSubmit={() => expect.unreachable('a search trigger submitted its form')}>
      <SearchTrigger />
    </form>,
  );
  const search = screen.getByRole('button', { name: 'Search' });
  expect(search.getAttribute('type')).toBe('button');
  fireEvent.click(search);
});
