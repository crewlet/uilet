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

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ListDetail.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);
const rule = (selector: string, within = css) => {
  const at = within.indexOf(`${selector} {`);
  return at < 0 ? '' : within.slice(at, within.indexOf('}', at)).replace(/\s+/g, ' ');
};

test('the detail is the outermost box that scrolls: its inset is inside it, and its gutter always reserved', () => {
  // A trailing control (a header's Disconnect) never touches the scrollbar,
  // and does not move when the detail grows long enough to scroll.
  const detail = rule('.crewlet-list-detail__detail');
  expect(detail).toContain('overflow-y: auto;');
  expect(detail).toContain('scrollbar-gutter: stable;');
  expect(detail).toContain('padding-right: var(--crewlet-list-detail-end);');
  // The screen's own side inset, so the page's two edges match.
  expect(rule('.crewlet-list-detail')).toContain(
    '--crewlet-list-detail-end: var(--crewlet-app-shell-inset, var(--spacing-5));',
  );
  // Folded, the list is the pane that scrolls, and takes the same end.
  const folds = css.match(/@container crewlet-list-detail \(width < 640px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  const list = rule('.crewlet-list-detail__list', folds);
  expect(list).toContain('padding-right: var(--crewlet-list-detail-end);');
  expect(list).toContain('scrollbar-gutter: stable;');
  // On a phone neither pane scrolls, and the page's pad is the only inset.
  const phone = css.match(/@media \(width < 640px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  expect(phone).toMatch(/padding-right:\s*0;/);
});

test("standing in a fill screen's column, it reaches past the column's end pad to the sheet's edge", () => {
  // The shell publishes the pad (the inset and the scrollbar's width), and it
  // is 0 on every screen that does not fill the window.
  expect(rule('.crewlet-app-shell__content > .crewlet-list-detail')).toContain(
    'margin-right: calc(var(--crewlet-app-shell-bleed-end, 0px) * -1);',
  );
});
