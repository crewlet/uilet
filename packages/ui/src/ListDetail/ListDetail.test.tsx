/**
 * ListDetail: two panes, the list first, and which one a phone shows.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ListDetail } from './index.js';

afterEach(cleanup);

test('draws the list before the detail, in reading order', () => {
  const { container } = render(
    <ListDetail list={<nav aria-label="Things">list</nav>}>
      <h2>Detail</h2>
    </ListDetail>,
  );
  const panes = container.querySelectorAll('.crewlet-list-detail > div');
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
