/**
 * AsideLayout: a main column with a named aside beside it, which follows it
 * when the page is narrow.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ASIDE_LAYOUT_SPLIT_REM, AsideLayout } from './index.js';

afterEach(cleanup);

/** The stylesheet with its comments taken out, so a rule's text is all a match reads. */
const CSS = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'AsideLayout.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** The stylesheet cut at its container queries: their rules by width, and the rules outside every one. */
const QUERIES = (() => {
  const within = new Map<number, string>();
  let outside = '';
  let from = 0;
  for (const match of CSS.matchAll(/@container \(min-width: (\d+)rem\) \{/g)) {
    const open = match.index + match[0].length;
    let depth = 1;
    let at = open;
    for (; at < CSS.length && depth > 0; at += 1) depth += CSS[at] === '{' ? 1 : CSS[at] === '}' ? -1 : 0;
    const rem = Number(match[1]);
    within.set(rem, (within.get(rem) ?? '') + CSS.slice(open, at - 1));
    outside += CSS.slice(from, match.index);
    from = at;
  }
  return { within, outside: outside + CSS.slice(from) };
})();

/** Every rule inside a container query from `rem`. */
const within = (rem: number): string => QUERIES.within.get(rem) ?? '';

test('the aside is a complementary landmark named by its label, after the main column', () => {
  const { container } = render(
    <AsideLayout aside={<p>Clock: UTC</p>} asideLabel="About the company">
      <p>Mission</p>
    </AsideLayout>,
  );
  const aside = screen.getByRole('complementary', { name: 'About the company' });
  expect(aside.textContent).toBe('Clock: UTC');
  // THE SUBJECT FIRST: in reading order, and so on a phone, where the aside
  // follows it.
  const columns = container.querySelector('.crewlet-aside-layout__columns') as HTMLElement;
  expect(columns.firstElementChild?.className).toBe('crewlet-aside-layout__main');
  expect(columns.lastElementChild).toBe(aside);
});

// THE ROOM THE PAGE HAS, NOT THE WINDOW: a container query on its own width,
// one column below 56rem and the aside beside the main column from there.
test('the aside stands beside the main column from 56rem of its own width', () => {
  const css = CSS;
  expect(/\.crewlet-aside-layout \{([^}]*)\}/.exec(css)?.[1]).toMatch(/container-type:\s*inline-size;/);
  const narrow = /\.crewlet-aside-layout__columns \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(narrow).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\);/);
  const wide = /@container \(min-width: 56rem\) \{\s*\.crewlet-aside-layout__columns \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(wide).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) var\(--crewlet-aside-layout-aside, 18rem\);/);
  // FOLLOWING THE MAIN COLUMN, a hairline sets the aside off; beside it, none.
  // The aside's own rule, not the one it shares with the main column.
  const aside = /\}\s*\.crewlet-aside-layout__aside \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(aside).toMatch(/border-top:\s*1px solid var\(--color-border-default\);/);
  const besideAside = /@container \(min-width: 56rem\) \{[\s\S]*?\.crewlet-aside-layout__aside \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(besideAside).toMatch(/border-top:\s*0;/);
});

test('a pane splits at 44rem, its aside 16rem wide and 16px from the main column', () => {
  const pane = within(ASIDE_LAYOUT_SPLIT_REM.pane);
  expect(pane).toMatch(
    /\.crewlet-aside-layout--pane \.crewlet-aside-layout__columns \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--crewlet-aside-layout-aside, 16rem\);[^}]*gap:\s*var\(--spacing-4\);/,
  );
  expect(pane).toMatch(/\.crewlet-aside-layout--pane \.crewlet-aside-layout__aside \{[^}]*border-top:\s*0;/);
  const { container } = render(
    <AsideLayout fit="pane" aside={<p>Setup steps</p>} asideLabel="Setup steps">
      <p>Form</p>
    </AsideLayout>,
  );
  expect(container.firstElementChild?.classList.contains('crewlet-aside-layout--pane')).toBe(true);
});

// ONE NUMBER, TWO READERS: a caller choosing what to draw by the same width
// the stylesheet splits at must never disagree with it.
test('the exported split widths are the widths the container queries split at', () => {
  expect(new Set(QUERIES.within.keys())).toEqual(new Set(Object.values(ASIDE_LAYOUT_SPLIT_REM)));
  expect(within(ASIDE_LAYOUT_SPLIT_REM.page)).toMatch(/var\(--crewlet-aside-layout-aside, 18rem\)/);
  expect(within(ASIDE_LAYOUT_SPLIT_REM.pane)).toMatch(/var\(--crewlet-aside-layout-aside, 16rem\)/);
});

// THE SAME ELEMENT: an aside that comes and goes must not redraw the main
// column, or a form in it loses its focus and every field's typed value.
test('without an aside the main column stands alone, and stays the same element as one comes', () => {
  const { container, rerender } = render(
    <AsideLayout asideLabel="Setup steps">
      <input aria-label="Name" />
    </AsideLayout>,
  );
  expect(screen.queryByRole('complementary')).toBeNull();
  const root = container.firstElementChild as HTMLElement;
  expect(root.classList.contains('crewlet-aside-layout--alone')).toBe(true);
  const main = root.querySelector('.crewlet-aside-layout__main');
  const field = screen.getByRole('textbox', { name: 'Name' });
  field.focus();

  rerender(
    <AsideLayout asideLabel="Setup steps" aside={<p>Steps</p>}>
      <input aria-label="Name" />
    </AsideLayout>,
  );
  expect(root.classList.contains('crewlet-aside-layout--alone')).toBe(false);
  expect(root.querySelector('.crewlet-aside-layout__main')).toBe(main);
  expect(screen.getByRole('textbox', { name: 'Name' })).toBe(field);
  expect(document.activeElement).toBe(field);
  expect(screen.getByRole('complementary', { name: 'Setup steps' }).textContent).toBe('Steps');
  expect(/\.crewlet-aside-layout--alone > \.crewlet-aside-layout__columns \{([^}]*)\}/.exec(CSS)?.[1]).toMatch(
    /grid-template-columns:\s*minmax\(0, 1fr\);/,
  );
});

// STICKY ONLY BESIDE: following the main column on a phone, a stuck aside
// would cover the form it explains.
test('a sticky aside sticks beside the main column only, as tall as its content', () => {
  const { container } = render(
    <AsideLayout sticky fit="pane" aside={<p>Steps</p>} asideLabel="Setup steps">
      <p>Form</p>
    </AsideLayout>,
  );
  const stick = container.querySelector('.crewlet-aside-layout__aside > .crewlet-aside-layout__stick');
  expect(stick?.textContent).toBe('Steps');
  // EVERY SPLIT, AND ONLY A SPLIT, LETS IT STICK: the stack reads the aside's
  // `--crewlet-aside-layout-stick`, which is static until a split sets it.
  const stickRule = /\.crewlet-aside-layout__stick \{([^}]*)\}/.exec(QUERIES.outside)?.[1] ?? '';
  expect(stickRule).toMatch(/position:\s*var\(--crewlet-aside-layout-stick\);/);
  expect(QUERIES.outside).toMatch(/\.crewlet-aside-layout__aside \{[^}]*--crewlet-aside-layout-stick:\s*static;/);
  expect(QUERIES.outside).not.toMatch(/sticky;/);
  for (const rem of Object.values(ASIDE_LAYOUT_SPLIT_REM)) {
    expect(within(rem)).toMatch(/__aside \{[^}]*--crewlet-aside-layout-stick:\s*sticky;/);
  }
  // AS TALL AS ITS CONTENT, so it has the column's length to stick along.
  expect(stickRule).not.toMatch(/flex(-grow)?:|height:/);
  expect(
    render(
      <AsideLayout aside={<p>Steps</p>} asideLabel="Setup steps">
        <p>Form</p>
      </AsideLayout>,
    ).container.querySelector('.crewlet-aside-layout__stick'),
  ).toBeNull();
});

test('has no accessibility violations', async () => {
  const { container } = render(
    <main>
      <AsideLayout aside={<p>Clock: UTC</p>} asideLabel="About the company">
        <p>Mission</p>
      </AsideLayout>
    </main>,
  );
  const result = await axe.run(container);
  expect(result.violations).toEqual([]);
});

test('a sticky pane, and one without an aside, have no accessibility violations', async () => {
  const { container } = render(
    <main>
      <AsideLayout fit="pane" sticky aside={<p>Setup steps</p>} asideLabel="Setup steps">
        <p>Form</p>
      </AsideLayout>
      <AsideLayout fit="pane" asideLabel="Setup steps">
        <p>Form</p>
      </AsideLayout>
    </main>,
  );
  const result = await axe.run(container);
  expect(result.violations).toEqual([]);
});
