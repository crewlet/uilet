/**
 * A short flexible column keeps exactly its widest value and the long ones
 * share the rest, a shrink column keeps its place, and the grid fills its box.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { DataGrid, type DataGridColumn } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

interface Person {
  id: string;
  name: string;
  team: string;
  access: string;
  stage: string;
}

const ROWS: Person[] = [
  { id: 'a', name: 'Jane Founder', team: 'Core', access: 'Admin', stage: 'Active' },
  {
    id: 'b',
    name: 'Maximiliana Konstantinopoulou-Vanderberg',
    team: 'Core',
    access: 'Worklet · Doclet · Artifacts · Chatlet · Gitlet',
    stage: 'Active',
  },
  { id: 'c', name: 'Priya Natarajan', team: 'Ops', access: 'Worklet · Chatlet', stage: 'Invited' },
];

const COLUMNS: DataGridColumn<Person>[] = [
  { key: 'name', header: 'Name', floor: '8rem', overflow: 'truncate', cell: (p) => p.name },
  { key: 'team', header: 'Team', overflow: 'truncate', cell: (p) => p.team },
  { key: 'stage', header: 'Stage', shrink: true, overflow: 'truncate', cell: (p) => p.stage },
  { key: 'access', header: 'Access', overflow: 'truncate', cell: (p) => p.access },
];

async function mount(width: number): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(<DataGrid aria-label="People" rows={ROWS} columns={COLUMNS} rowKey={(p) => p.id} />));
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

/** A column's head cell, by its position. */
function head(at: HTMLElement, i: number): HTMLElement {
  return at.querySelector('.crewlet-data-grid__head')!.children[i] as HTMLElement;
}

/** Every value a column draws, as its truncating box. */
function values(at: HTMLElement, i: number): HTMLElement[] {
  return [...at.querySelectorAll('.crewlet-data-grid__body .crewlet-data-grid__row')].map(
    (row) => row.querySelectorAll('.crewlet-data-grid__cell')[i]!.querySelector<HTMLElement>('.crewlet-data-grid__truncate')!,
  );
}

const cut = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1;

/** The room a column leaves empty: its narrowest cell's box less its widest value. */
function spare(at: HTMLElement, i: number): number {
  const boxes = values(at, i);
  const widest = Math.max(...boxes.map((b) => b.scrollWidth), head(at, i).scrollWidth - 24);
  return Math.min(...boxes.map((b) => b.clientWidth)) - widest;
}

test('where the values do not fit, a short column takes what it holds and the long ones share the rest', async () => {
  await page.viewport(1400, 800);
  // Each column's widest value, read off a grid wide enough to draw them all.
  const wide = await mount(1300);
  const natural = [0, 1, 2, 3].map((i) => Math.max(...values(wide, i).map((b) => b.scrollWidth)) + 24);
  flushSync(() => root?.unmount());
  host?.remove();
  // A grid a quarter narrower than all of them side by side.
  const at = await mount(Math.round(natural.reduce((a, b) => a + b, 0) * 0.75));
  const say = `natural ${natural.join('/')}, heads ${[0, 1, 2, 3].map((i) => Math.round(head(at, i).getBoundingClientRect().width)).join('/')}`;
  expect(at.querySelector('.crewlet-data-grid__head'), `the grid keeps its columns (${say})`).not.toBeNull();
  expect(values(at, 0).some(cut), `the long name is cut (${say})`).toBe(true);
  expect(values(at, 1).some(cut), `the short team column is not (${say})`).toBe(false);
  expect(spare(at, 1), `the team column keeps no empty room while a name is cut (${say})`).toBeLessThanOrEqual(2);
  expect(values(at, 2).some(cut), `the shrink column keeps its values whole (${say})`).toBe(false);
  expect(head(at, 0).getBoundingClientRect().width, say).toBeGreaterThan(head(at, 1).getBoundingClientRect().width * 2);
});

test('where every value fits, the grid still fills its box', async () => {
  await page.viewport(1400, 800);
  const at = await mount(1200);
  for (const i of [0, 1, 2, 3]) expect(values(at, i).some(cut), `column ${i} is whole`).toBe(false);
  const grid = at.querySelector<HTMLElement>('.crewlet-data-grid')!;
  const inner = grid.getBoundingClientRect().left + grid.clientLeft + grid.clientWidth;
  expect(Math.abs(head(at, 3).getBoundingClientRect().right - inner)).toBeLessThanOrEqual(1);
});
