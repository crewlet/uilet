/**
 * ListDetail: two panes, the list first, and which one a phone shows.
 */

import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { ListDetail } from './index.js';

afterEach(cleanup);

test('draws the list before the detail, in reading order', () => {
  const { container } = render(
    <ListDetail list={<nav aria-label="Things">list</nav>}>
      <h2>Detail</h2>
    </ListDetail>,
  );
  const panes = container.querySelectorAll('.crewlet-list-detail__panes > div');
  expect([...panes].map((p) => p.className)).toEqual(['crewlet-list-detail__list', 'crewlet-list-detail__detail']);
  expect(panes[1]!.textContent).toBe('Detail');
});

test('says which pane a phone shows: the list by default, the detail once chosen', () => {
  const { container, rerender } = render(<ListDetail list="list">detail</ListDetail>);
  expect(container.firstElementChild!.classList.contains('crewlet-list-detail--showing-list')).toBe(true);
  rerender(
    <ListDetail list="list" showing="detail">
      detail
    </ListDetail>,
  );
  expect(container.firstElementChild!.classList.contains('crewlet-list-detail--showing-detail')).toBe(true);
});

test('passes its own attributes through', () => {
  const { container } = render(
    <ListDetail list="list" data-screen="integrations" className="mine">
      detail
    </ListDetail>,
  );
  const root = container.firstElementChild!;
  expect(root.getAttribute('data-screen')).toBe('integrations');
  expect(root.classList.contains('mine')).toBe(true);
});

test('folds by its own width: the pane shape is a container query, and only the page scroll is the window\'s', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ListDetail.css'), 'utf8');
  expect(css).toMatch(/container:\s*crewlet-list-detail\s*\/\s*inline-size/);
  const folds = css.match(/@container crewlet-list-detail \(width < 640px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  expect(folds).toContain('grid-template-columns: minmax(0, 1fr)');
  expect(folds).toContain('display: none');
  // The window's own rule may only let the page scroll; it never picks a pane.
  const phone = css.match(/@media \(width < 640px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  expect(phone).not.toMatch(/grid-template-columns|display: none/);
});
