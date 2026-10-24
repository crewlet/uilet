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
import { AsideLayout } from './index.js';

afterEach(cleanup);

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
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'AsideLayout.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
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
