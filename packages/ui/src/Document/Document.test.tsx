/**
 * Rendered markdown, set on the ramp: what the element is, and the two rules
 * of its stylesheet whose failure nothing on a screen reports.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Document, DocumentTitle } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'Document.css'), 'utf8');

/** Every `property: value` pair of the stylesheet, comments removed. */
const declarations = (property: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`, 'g'))].map(
    (match) => match[1]?.trim() ?? '',
  );

test('a document is a div on the reading measure by default', () => {
  const { container } = render(<Document>body</Document>);
  const root = container.firstElementChild as HTMLElement;
  expect(root.tagName).toBe('DIV');
  expect(root.className.split(' ')).toEqual(['crewlet-document', 'crewlet-document--md', 'crewlet-document--measure']);
});

test('a page that stands alone is an article, and a narrow pane can drop the measure', () => {
  const { container } = render(
    <Document as="article" size="sm" measure="none" aria-label="Settlement algorithm">
      body
    </Document>,
  );
  const root = container.firstElementChild as HTMLElement;
  expect(root.tagName).toBe('ARTICLE');
  expect(root.className).toContain('crewlet-document--sm');
  expect(root.className).not.toContain('measure');
  expect(root.getAttribute('aria-label')).toBe('Settlement algorithm');
});

test('no presentation prop reaches the DOM', () => {
  const { container } = render(
    <Document size="sm" measure="none">
      body
    </Document>,
  );
  const root = container.firstElementChild as HTMLElement;
  for (const name of ['size', 'measure', 'as']) expect(root.getAttribute(name)).toBeNull();
});

test('a title is the page h1 by default, and an h2 where the screen already has one', () => {
  render(
    <>
      <DocumentTitle>Settlement algorithm</DocumentTitle>
      <DocumentTitle as="h2">Split modes</DocumentTitle>
    </>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Settlement algorithm' }).className).toBe('crewlet-document-title');
  expect(screen.getByRole('heading', { level: 2, name: 'Split modes' })).toBeTruthy();
});

test('every size the stylesheet sets is a step on the type ramp', () => {
  // A reading column in sizes of its own (32, 20, 18, 15 and 14.5px were
  // measured on the one this replaces) drifts from every surface beside it.
  const sizes = declarations('font-size');
  expect(sizes.length).toBeGreaterThan(5);
  for (const size of sizes) expect(size).toMatch(/^var\(--font-size-[\w-]+\)$/);
});

test('every gap is a spacing step or the document rhythm itself', () => {
  for (const value of [...declarations('margin-block-start'), ...declarations('gap')]) {
    expect(value).toMatch(/^(var\(--(spacing-\d+|crewlet-document-[\w-]+)\)|0\.35em)$/);
  }
});

test('the margin reset comes before the rhythm, or the rhythm is reset with it', () => {
  // The shorthand in the reset clears the top margin too, at the same
  // specificity. Written after the sibling rule it wins, and every block runs
  // into the next with no gap at all, which is how the rhythm this replaces died.
  const reset = css.indexOf('.crewlet-document :where(p, h1');
  const rhythm = css.indexOf('.crewlet-document > * + *');
  expect(reset).toBeGreaterThan(-1);
  expect(rhythm).toBeGreaterThan(reset);
});

test('a task list and a wide table are recognised by their shape, not by a class', () => {
  // Any renderer that emits the markup it would emit anyway gets both.
  expect(css).toContain("ul:has(> li > input[type='checkbox'])");
  expect(css).toContain(':where(div):has(> table)');
  expect(css).not.toMatch(/\.md-|\.markdown/);
});
