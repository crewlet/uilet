/**
 * A packed board starts each block under the nearest one above it in its
 * columns: a short card beside a tall one leaves no hole under it.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrangeBoard, ArrangeFrame, ArrangeGrid, ArrangeGroup } from '@crewlethq/ui';
import { packGrid } from '../../../packages/ui/src/ArrangeGrid/usePackedGrid.js';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function frames() {
  for (let i = 0; i < 3; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** `ui` drawn in a box of its own (as a page's flex column holds a board), before any frame. */
async function draw(ui: ReactNode, width = 960): Promise<HTMLElement> {
  await page.viewport(1200, 900);
  host = document.createElement('div');
  host.style.width = `${width}px`;
  host.style.display = 'flow-root';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(ui));
  return host;
}

async function mount(ui: ReactNode, width = 960): Promise<HTMLElement> {
  const at = await draw(ui, width);
  await frames();
  return at;
}

interface Spec {
  name: string;
  columns: number;
  height: number;
}

const frame = (b: Spec, editing = false) => (
  <ArrangeFrame key={b.name} name={b.name} editing={editing} columns={b.columns} data-name={b.name}>
    <div style={{ height: b.height, border: '1px solid' }}>{b.name}</div>
  </ArrangeFrame>
);

const box = (at: HTMLElement, name: string) => at.querySelector(`[data-name="${name}"]`)!.getBoundingClientRect();

const HOME: Spec[] = [
  { name: 'Decisions', columns: 8, height: 600 },
  { name: 'Live', columns: 4, height: 160 },
  { name: 'Completed', columns: 4, height: 120 },
  { name: 'Tokens', columns: 4, height: 120 },
  { name: 'Feed', columns: 12, height: 80 },
];

test('a short block beside a tall one has the next blocks under it, a gap apart', async () => {
  const at = await mount(<ArrangeGrid pack>{HOME.map((b) => frame(b))}</ArrangeGrid>);
  const [decisions, live, completed, tokens, feed] = HOME.map((b) => box(at, b.name));
  expect(completed!.left).toBe(live!.left);
  expect(completed!.top).toBe(live!.bottom + 16);
  expect(tokens!.left).toBe(live!.left);
  expect(tokens!.top).toBe(completed!.bottom + 16);
  // The page-wide block waits for the tall one, and nothing is left below the last.
  expect(feed!.top).toBe(decisions!.bottom + 16);
  expect(at.getBoundingClientRect().bottom).toBe(feed!.bottom);
  // The column's last block reaches down to the next one, so the two columns end together.
  expect(tokens!.bottom).toBe(decisions!.bottom);
  expect(completed!.height).toBe(120);
});

test('cards whose feet are a step apart are one row: the cards after them start level', async () => {
  const blocks: Spec[] = [
    { name: 'Decisions', columns: 8, height: 170 },
    { name: 'Live', columns: 4, height: 199 },
    { name: 'Completed', columns: 4, height: 280 },
    { name: 'Tokens', columns: 4, height: 230 },
    { name: 'Projects', columns: 4, height: 310 },
  ];
  const at = await mount(<ArrangeGrid pack>{blocks.map((b) => frame(b))}</ArrangeGrid>);
  const top = box(at, 'Live').bottom + 16;
  expect(['Completed', 'Tokens', 'Projects'].map((name) => box(at, name).top)).toEqual([top, top, top]);
  expect(box(at, 'Decisions').bottom).toBe(box(at, 'Live').bottom);
  expect(box(at, 'Completed').bottom).toBe(box(at, 'Projects').bottom);
});

test('a block with a height of its own keeps it, and the space under it stays open', async () => {
  const at = await mount(
    <ArrangeGrid pack>
      {frame({ name: 'Decisions', columns: 8, height: 600 })}
      <ArrangeFrame name="Live" editing={false} columns={4} rows={10} rowHeight={16} data-name="Live">
        <div>Live</div>
      </ArrangeFrame>
      {frame({ name: 'Feed', columns: 12, height: 80 })}
    </ArrangeGrid>,
  );
  expect(box(at, 'Live').height).toBe(160);
  expect(box(at, 'Feed').top).toBe(box(at, 'Decisions').bottom + 16);
});

test('the first frame drawn is already packed', async () => {
  const at = await draw(<ArrangeGrid pack>{HOME.map((b) => frame(b))}</ArrangeGrid>);
  expect(box(at, 'Completed').top).toBe(box(at, 'Live').bottom + 16);
});

test('unpacked, the same blocks wait under the tall one, as a board laid in rows does', async () => {
  const at = await mount(<ArrangeGrid>{HOME.map((b) => frame(b))}</ArrangeGrid>);
  expect(box(at, 'Completed').top).toBe(box(at, 'Decisions').bottom + 16);
});

test('the blocks keep their order: none starts above one before it, and the document order is theirs', async () => {
  const blocks: Spec[] = [
    { name: 'A', columns: 6, height: 300 },
    { name: 'B', columns: 3, height: 80 },
    { name: 'C', columns: 8, height: 100 },
    { name: 'D', columns: 3, height: 90 },
    { name: 'E', columns: 4, height: 200 },
    { name: 'F', columns: 5, height: 60 },
  ];
  const at = await mount(<ArrangeGrid pack>{blocks.map((b) => frame(b))}</ArrangeGrid>);
  const tops = blocks.map((b) => box(at, b.name).top);
  for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeGreaterThanOrEqual(tops[i - 1]!);
  const order = Array.from(at.querySelectorAll('[data-name]'), (el) => el.getAttribute('data-name'));
  expect(order).toEqual(blocks.map((b) => b.name));
});

/** A block's own content, growing from its own state, as a widget's data arrives: the grid does not render again. */
function LiveContent() {
  const [tall, setTall] = useState(false);
  return (
    <button type="button" style={{ display: 'block', height: tall ? 360 : 160 }} onClick={() => flushSync(() => setTall(true))}>
      Live
    </button>
  );
}

function Growing() {
  return (
    <ArrangeGrid pack>
      {frame({ name: 'Decisions', columns: 8, height: 600 })}
      <ArrangeFrame name="Live" editing={false} columns={4} data-name="Live">
        <LiveContent />
      </ArrangeFrame>
      {frame({ name: 'Completed', columns: 4, height: 120 })}
    </ArrangeGrid>
  );
}

test('a block whose content grows moves the ones under it before the next frame is drawn', async () => {
  const at = await mount(<Growing />);
  at.querySelector('button')!.click();
  // The mutation's own task: no frame has been drawn since the content grew.
  await Promise.resolve();
  expect(box(at, 'Live').height).toBe(360);
  expect(box(at, 'Completed').top).toBe(box(at, 'Live').bottom + 16);
});

function Shrinking() {
  const [short, setShort] = useState(false);
  return (
    <ArrangeGrid pack>
      <ArrangeFrame name="Decisions" editing={false} columns={8} data-name="Decisions">
        <button type="button" style={{ display: 'block', height: short ? 100 : 600 }} onClick={() => flushSync(() => setShort(true))}>
          Decisions
        </button>
      </ArrangeFrame>
      {frame({ name: 'Live', columns: 4, height: 160 })}
      {frame({ name: 'Last', columns: 4, height: 120 })}
      {frame({ name: 'Feed', columns: 12, height: 80 })}
    </ArrangeGrid>
  );
}

test('a stretched block is measured at its own height, so the page closes up when the tall one shrinks', async () => {
  const at = await mount(<Shrinking />);
  expect(box(at, 'Last').bottom).toBe(box(at, 'Decisions').bottom);
  at.querySelector('button')!.click();
  await Promise.resolve();
  // Last moves under the shorter card, and the page-wide one follows its own 120 pixels.
  expect(box(at, 'Last').left).toBe(box(at, 'Decisions').left);
  expect(box(at, 'Last').top).toBe(box(at, 'Decisions').bottom + 16);
  expect(box(at, 'Feed').top).toBe(box(at, 'Last').top + 120 + 16);
});

const REORDERED: Record<string, Spec> = {
  A: { name: 'A', columns: 8, height: 170 },
  B: { name: 'B', columns: 4, height: 199 },
  C: { name: 'C', columns: 4, height: 100 },
  D: { name: 'D', columns: 8, height: 60 },
};

/** Records where D stands in its own layout effect, which runs after the grid's, as a reorder's glide measures. */
function Reordering({ seen }: { seen: number[] }) {
  const [order, setOrder] = useState(['A', 'B', 'C', 'D']);
  const page = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const d = page.current?.querySelector('[data-name="D"]');
    if (d) seen.push(d.getBoundingClientRect().top);
  });
  return (
    <div ref={page}>
      <button type="button" onClick={() => flushSync(() => setOrder(['A', 'C', 'B', 'D']))}>
        Move C
      </button>
      <ArrangeGrid pack>{order.map((name) => frame(REORDERED[name]!))}</ArrangeGrid>
    </div>
  );
}

test("a reorder is packed before the page's own layout effects measure it", async () => {
  const seen: number[] = [];
  const at = await mount(<Reordering seen={seen} />);
  // A and B are levelled; moved before B, C is too short to level A, so D rises.
  at.querySelector('button')!.click();
  const measured = seen[seen.length - 1];
  await frames();
  expect(box(at, 'D').top).toBe(box(at, 'A').bottom + 16);
  expect(measured).toBe(box(at, 'D').top);
});

test('a narrower page re-packs at the next frame', async () => {
  const at = await mount(
    <ArrangeGrid pack>
      {frame({ name: 'Decisions', columns: 8, height: 600 })}
      <ArrangeFrame name="Live" editing={false} columns={4} data-name="Live">
        <p style={{ margin: 0 }}>{'A line of words that wraps when its column narrows. '.repeat(6)}</p>
      </ArrangeFrame>
      {frame({ name: 'Completed', columns: 4, height: 120 })}
    </ArrangeGrid>,
  );
  const was = box(at, 'Live').height;
  at.style.width = '600px';
  await frames();
  expect(box(at, 'Live').height).toBeGreaterThan(was);
  // Wrapped words end on a fraction of a pixel, which the one-pixel rows round.
  expect(Math.abs(box(at, 'Completed').top - box(at, 'Live').bottom - 16)).toBeLessThanOrEqual(0.5);
});

test('arranged, the blocks stand the wider editing gap apart', async () => {
  const at = await mount(
    <ArrangeBoard editing>
      <ArrangeGrid pack>{HOME.map((b) => frame(b, true))}</ArrangeGrid>
    </ArrangeBoard>,
  );
  expect(box(at, 'Completed').top).toBe(box(at, 'Live').bottom + 20);
  expect(box(at, 'Feed').top).toBe(box(at, 'Decisions').bottom + 20);
});

const group = (variant?: 'section') => (
  <ArrangeFrame name="Delivery" editing={false} columns={8} data-name="Delivery">
    <ArrangeGroup title="Delivery" variant={variant} collapsed={false} onCollapsedChange={() => {}}>
      {frame({ name: 'Tall', columns: 6, height: 400 })}
      {frame({ name: 'Short', columns: 6, height: 100 })}
      {frame({ name: 'Under', columns: 6, height: 100 })}
    </ArrangeGroup>
  </ArrangeFrame>
);

test("a group's body packs as the page does, and the page packs around the group", async () => {
  const at = await mount(
    <ArrangeGrid pack>
      {group()}
      {frame({ name: 'Side', columns: 4, height: 120 })}
      {frame({ name: 'Next', columns: 4, height: 120 })}
      {frame({ name: 'Wide', columns: 12, height: 60 })}
    </ArrangeGrid>,
  );
  expect(box(at, 'Under').left).toBe(box(at, 'Short').left);
  expect(box(at, 'Under').top).toBe(box(at, 'Short').bottom + 16);
  expect(box(at, 'Next').left).toBe(box(at, 'Side').left);
  expect(box(at, 'Next').top).toBe(box(at, 'Side').bottom + 16);
  expect(box(at, 'Wide').top).toBe(box(at, 'Delivery').bottom + 16);
});

test('a group stretched beside a taller block keeps its own blocks at their heights, and settles', async () => {
  const at = await mount(
    <ArrangeGrid pack>
      {group()}
      {frame({ name: 'Side', columns: 4, height: 900 })}
      {frame({ name: 'Wide', columns: 12, height: 60 })}
    </ArrangeGrid>,
  );
  expect(box(at, 'Delivery').bottom).toBe(box(at, 'Side').bottom);
  expect(box(at, 'Tall').height).toBe(400);
  expect(box(at, 'Wide').top).toBe(box(at, 'Side').bottom + 16);
  const settled = JSON.stringify(['Delivery', 'Tall', 'Wide'].map((n) => box(at, n)));
  await frames();
  expect(JSON.stringify(['Delivery', 'Tall', 'Wide'].map((n) => box(at, n)))).toBe(settled);
});

test("a section group's foot is its last block's: no gap hangs under it", async () => {
  const at = await mount(
    <ArrangeGrid pack>
      {group('section')}
      {frame({ name: 'Wide', columns: 12, height: 60 })}
    </ArrangeGrid>,
  );
  const body = at.querySelector('.crewlet-arrange-group__body')!.getBoundingClientRect();
  expect(body.bottom).toBe(box(at, 'Tall').bottom);
  expect(box(at, 'Wide').top).toBe(box(at, 'Tall').bottom + 16);
});

test("a block drawn mid-glide is placed where it is laid out, not where the glide draws it", async () => {
  const at = await mount(<ArrangeGrid pack>{HOME.map((b) => frame(b))}</ArrangeGrid>);
  const settled = JSON.stringify(HOME.map((b) => box(at, b.name)));
  const live = at.querySelector<HTMLElement>('[data-name="Live"]')!;
  live.style.transform = 'translate(-200px, 300px)';
  window.dispatchEvent(new Event('resize'));
  live.style.transform = '';
  expect(JSON.stringify(HOME.map((b) => box(at, b.name)))).toBe(settled);
});

test('a grid drawn hidden stays in rows, and packs once it is shown', async () => {
  const at = await draw(
    <div data-testid="tab" style={{ display: 'none' }}>
      <ArrangeGrid pack>{HOME.map((b) => frame(b))}</ArrangeGrid>
    </div>,
  );
  expect(at.querySelector('.crewlet-arrange-grid')!.hasAttribute('data-packed')).toBe(false);
  at.querySelector<HTMLElement>('[data-testid="tab"]')!.style.display = '';
  await frames();
  expect(box(at, 'Completed').top).toBe(box(at, 'Live').bottom + 16);
});

test('a gap set inline on the grid does not open between its fine rows', async () => {
  const at = await mount(
    <ArrangeGrid pack style={{ gap: 24 }}>
      {HOME.map((b) => frame(b))}
    </ArrangeGrid>,
  );
  expect(box(at, 'Feed').top).toBe(box(at, 'Decisions').bottom + 16);
  expect(at.getBoundingClientRect().height).toBeLessThan(1000);
});

test('a pass over a board at rest changes nothing, levelled feet and stretches included', async () => {
  const blocks: Spec[] = [
    { name: 'Decisions', columns: 8, height: 170 },
    { name: 'Live', columns: 4, height: 199 },
    { name: 'Completed', columns: 4, height: 280 },
    { name: 'Tokens', columns: 4, height: 230 },
  ];
  const at = await mount(<ArrangeGrid pack>{blocks.map((b) => frame(b))}</ArrangeGrid>);
  expect(packGrid(at.querySelector<HTMLElement>('.crewlet-arrange-grid')!)).toBe(false);
});

function Columns() {
  const [columns, setColumns] = useState(12);
  return (
    <>
      <button type="button" onClick={() => flushSync(() => setColumns(6))}>
        Six columns
      </button>
      <ArrangeGrid pack columns={columns}>
        {['A', 'B', 'C'].map((name, i) => (
          <ArrangeFrame key={name} name={name} editing={false} columns={6} rows={i === 0 ? 15 : 5} rowHeight={20} data-name={name}>
            <div>{name}</div>
          </ArrangeFrame>
        ))}
      </ArrangeGrid>
    </>
  );
}

test('a grid given fewer columns lays its blocks again, even at the same heights', async () => {
  const at = await mount(<Columns />);
  expect(box(at, 'C').top).toBe(box(at, 'B').bottom + 16);
  at.querySelector('button')!.click();
  await frames();
  // One block a row now: each a gap under the one before.
  expect(box(at, 'B').top).toBe(box(at, 'A').bottom + 16);
  expect(box(at, 'C').top).toBe(box(at, 'B').bottom + 16);
});

test('a grid of a fractional width keeps whole gaps and level feet', async () => {
  const at = await mount(<ArrangeGrid pack>{HOME.map((b) => frame(b))}</ArrangeGrid>, 959.5);
  expect(box(at, 'Feed').top - box(at, 'Decisions').bottom).toBeCloseTo(16, 1);
  expect(box(at, 'Tokens').bottom).toBeCloseTo(box(at, 'Decisions').bottom, 1);
});

test('a board drawn scaled down (a preview) packs in its own pixels', async () => {
  const at = await mount(
    <div style={{ transform: 'scale(0.5)', transformOrigin: '0 0' }}>
      <ArrangeGrid pack>{HOME.map((b) => frame(b))}</ArrangeGrid>
    </div>,
  );
  expect(box(at, 'Completed').top).toBe(box(at, 'Live').bottom + 8);
  expect(box(at, 'Feed').top).toBe(box(at, 'Decisions').bottom + 8);
});

test('one column: every block spans the page and they stack in order, a gap apart', async () => {
  const at = await mount(
    <ArrangeGrid pack columns={1}>
      {HOME.map((b) => frame({ ...b, columns: 1 }))}
    </ArrangeGrid>,
    360,
  );
  const boxes = HOME.map((b) => box(at, b.name));
  for (const b of boxes) expect(b.width).toBe(360);
  for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.top).toBe(boxes[i - 1]!.bottom + 16);
});
