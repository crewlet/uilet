/**
 * A grid's head and rows stay inside the rounded corners of whatever frames it,
 * its own border or a card's, without the card clipping anything else it holds.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Card, Combobox, DataGrid, RailList } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  window.scrollTo(0, 0);
});

async function mount(ui: ReactNode, width: number): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  host.style.padding = '24px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(ui));
  await document.fonts.ready;
  await frames();
  return host;
}

async function frames() {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
}

const grid = (rows = 2, flush = false) => (
  <DataGrid
    flush={flush}
    aria-label="Servers"
    rows={Array.from({ length: rows }, (_, i) => ({ id: `server-${i}` }))}
    rowKey={(r) => r.id}
    rowHref={(r) => `#${r.id}`}
    columns={[
      { key: 'name', header: 'Server', sortValue: (r) => r.id, cell: (r) => r.id },
      { key: 'kind', header: 'Connection', cell: () => 'Remote' },
      { key: 'tools', header: 'Tools', align: 'right', shrink: true, cell: () => '4' },
    ]}
  />
);

/** What a point inside each corner of the frame, outside its curve, hits: never `part` or anything in it. */
function corners(frame: HTMLElement, part: HTMLElement = frame): string[] {
  const r = frame.getBoundingClientRect();
  const at = (x: number, y: number) => {
    const hit = document.elementFromPoint(x, y)!;
    return part.contains(hit) && hit !== frame ? hit.className : 'outside';
  };
  return [at(r.left + 2, r.top + 2), at(r.right - 3, r.top + 2), at(r.left + 2, r.bottom - 3), at(r.right - 3, r.bottom - 3)];
}

const OUTSIDE = ['outside', 'outside', 'outside', 'outside'];

const SHAPES: [string, () => ReactNode, string][] = [
  ['standing alone', () => grid(), '.crewlet-data-grid'],
  ['given to a card with no inset', () => <Card padding="none">{grid()}</Card>, '.crewlet-card'],
  [
    'in a flush card',
    () => (
      <Card padding="none">
        <Card.Header>
          <Card.Title>Servers</Card.Title>
        </Card.Header>
        {grid()}
      </Card>
    ),
    '.crewlet-card',
  ],
];

test.each(SHAPES)('keeps the head and the rows inside the corners %s', async (_, ui, frameSelector) => {
  await page.viewport(1440, 900);
  const at = await mount(ui(), 720);
  const frame = at.querySelector<HTMLElement>(frameSelector)!;
  expect(Number.parseFloat(getComputedStyle(frame).borderTopLeftRadius)).toBeGreaterThan(4);
  expect(corners(frame)).toEqual(OUTSIDE);
});

const railList = (list: ReactNode, toolbar?: ReactNode) => (
  <RailList
    label="Categories"
    items={[
      { key: 'all', label: 'All', count: 6 },
      { key: 'chat', label: 'Chat', count: 2 },
    ]}
    value="all"
    onChange={() => {}}
    toolbar={toolbar}
  >
    {list}
  </RailList>
);

// A rail list's grid sits in its list column, which meets the card's end
// corners beside the rail (the top one only with no bar over it) and both
// bottom corners folded under its picker.
test.each([
  ['beside its rail', 1100, undefined, [1, 3]],
  ['beside its rail under a toolbar', 1100, <input aria-label="Search" />, [3]],
  ['folded under its picker', 520, undefined, [2, 3]],
])("keeps a rail list's grid inside the card's corners %s", async (_, width, toolbar, at) => {
  await page.viewport(1440, 900);
  const host = await mount(railList(grid(6, true), toolbar), width);
  const card = host.querySelector<HTMLElement>('.crewlet-card')!;
  const hits = corners(card, host.querySelector<HTMLElement>('.crewlet-data-grid')!);
  expect(at.map((i) => hits[i])).toEqual(at.map(() => 'outside'));
  // Under a bar the grid's top is mid-card, and keeps a square corner there.
  if (!at.includes(1)) {
    expect(getComputedStyle(host.querySelector('.crewlet-data-grid')!).borderTopRightRadius).toBe('0px');
  }
});

test("keeps a phone's card rows inside the corners of a card with no inset", async () => {
  await page.viewport(390, 844);
  const at = await mount(<Card padding="none">{grid()}</Card>, 342);
  expect(at.querySelector('.crewlet-data-grid[data-stacked]')).not.toBeNull();
  expect(corners(at.querySelector<HTMLElement>('.crewlet-card')!)).toEqual(OUTSIDE);
});

test("draws no rule of the grid's own over the top edge of a card with no inset", async () => {
  await page.viewport(1440, 900);
  const at = await mount(<Card padding="none">{grid()}</Card>, 720);
  expect(getComputedStyle(at.querySelector('.crewlet-data-grid')!).borderTopWidth).toBe('0px');
});

test('keeps the head sticking to the page in a card with no inset', async () => {
  await page.viewport(1000, 600);
  const at = await mount(<Card padding="none">{grid(60)}</Card>, 600);
  const head = at.querySelector('.crewlet-data-grid__head')!;
  window.scrollTo(0, head.getBoundingClientRect().top + 400);
  await frames();
  expect(head.getBoundingClientRect().top).toBeCloseTo(0, 0);
});

// The corners are the grid's to round: the card, or a rail list's column,
// still lets a list drawn in place (a Combobox's) hang past its edge.
test.each([
  ['a card with no inset', (ui: ReactNode) => <Card padding="none">{ui}</Card>, '.crewlet-card'],
  ["a rail list's column", (ui: ReactNode) => railList(ui), '.crewlet-rail-list__list'],
])('leaves a list opened in place free to hang past %s', async (_, frame, frameSelector) => {
  await page.viewport(1440, 900);
  const at = await mount(
    frame(
      <Combobox
        label="Seats"
        aria-label="Owner"
        value=""
        onValueChange={() => {}}
        options={['Software Engineer', 'Site Reliability', 'Designer', 'Product Manager'].map((value) => ({ value }))}
        open
        onOpenChange={() => {}}
      />,
    ),
    1100,
  );
  const box = at.querySelector(frameSelector)!.getBoundingClientRect();
  const last = [...at.querySelectorAll('[role="option"]')].at(-1)!.getBoundingClientRect();
  expect(last.top).toBeGreaterThan(box.bottom);
  const hit = document.elementFromPoint(last.left + 8, last.top + last.height / 2);
  expect(hit?.closest('[role="option"]')).not.toBeNull();
});
