/**
 * A block on a scrolling page never keeps its wheel: a resized block hands it
 * back at its ends, and a flush card clips without becoming a scroll container.
 */
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { CSSProperties, ReactNode } from 'react';
import { ArrangeFrame, ArrangeGrid, Card, DataGrid, Toolbar } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  window.scrollTo(0, 0);
});

async function frames() {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** `ui` above a page tall enough to scroll, at the top of the window. */
async function mount(ui: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = '960px';
  host.style.padding = '24px';
  host.style.paddingBottom = '2400px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(ui));
  await document.fonts.ready;
  await frames();
  return host;
}

/** A flush card of `rows` lines, the shape every Home card takes. */
const card = (rows: number, style?: CSSProperties) => (
  <Card padding="none" style={style}>
    <Card.Header>
      <Card.Title>Live now</Card.Title>
    </Card.Header>
    <Card.Body>
      {Array.from({ length: rows }, (_, i) => (
        <p key={i}>Line {i + 1}</p>
      ))}
    </Card.Body>
  </Card>
);

/** A block of the board at `rows` sixteen-pixel rows, holding `content`. */
const block = (rows: number, content: ReactNode) => (
  <ArrangeGrid columns={12}>
    <ArrangeFrame name="Live now" editing={false} columns={4} rows={rows} rowHeight={16}>
      {content}
    </ArrangeFrame>
  </ArrangeGrid>
);

async function wheelOver(el: Element, y: number) {
  await userEvent.wheel(el, { delta: { y } });
  await frames();
}

test('a resized block whose content fits passes the wheel to the page', async () => {
  await page.viewport(1200, 700);
  const at = await mount(block(20, card(2)));
  const box = at.querySelector<HTMLElement>('.crewlet-card')!;
  expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight);
  await wheelOver(box, 200);
  expect(window.scrollY).toBeGreaterThan(0);
});

test('a resized block scrolls its own content, then hands the wheel to the page at its end', async () => {
  await page.viewport(1200, 700);
  const at = await mount(block(12, card(40)));
  const box = at.querySelector<HTMLElement>('.crewlet-card')!;
  await wheelOver(box, 100);
  expect(box.scrollTop).toBeGreaterThan(0);
  expect(window.scrollY).toBe(0);
  box.scrollTop = box.scrollHeight;
  await frames();
  await wheelOver(box, 200);
  expect(window.scrollY).toBeGreaterThan(0);
});

test('a flush card held shorter than its content is not a scroll container', async () => {
  await page.viewport(1200, 700);
  const column = (ui: ReactNode) => <div style={{ display: 'flex', flexDirection: 'column', height: 120 }}>{ui}</div>;
  const at = await mount(column(card(20, { minHeight: 0 })));
  const box = at.querySelector<HTMLElement>('.crewlet-card')!;
  expect(box.getBoundingClientRect().height).toBeCloseTo(120, 0);
  expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
  box.scrollTop = 80;
  expect(box.scrollTop).toBe(0);
  await wheelOver(box, 200);
  expect(window.scrollY).toBeGreaterThan(0);
});

test('a flush card in a column of a set height keeps its content height, never cut short', async () => {
  await page.viewport(1200, 700);
  const at = await mount(<div style={{ display: 'flex', flexDirection: 'column', height: 120 }}>{card(20)}</div>);
  const box = at.querySelector<HTMLElement>('.crewlet-card')!;
  expect(box.getBoundingClientRect().height).toBeGreaterThan(120);
  expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight);
});

const STICKY: [string, ReactNode, string][] = [
  [
    "a data grid's head",
    <DataGrid
      key="grid"
      aria-label="Tasks"
      rows={Array.from({ length: 60 }, (_, i) => ({ id: `task-${i}` }))}
      rowKey={(r) => r.id}
      columns={[{ key: 'name', header: 'Name', cell: (r) => r.id }]}
    />,
    '.crewlet-data-grid__head',
  ],
  [
    'a sticky toolbar',
    <div key="toolbar">
      <Toolbar sticky label="Filters">
        Filters
      </Toolbar>
      {Array.from({ length: 60 }, (_, i) => (
        <p key={i}>Row {i + 1}</p>
      ))}
    </div>,
    '.crewlet-toolbar--sticky',
  ],
];

test.each(STICKY)('%s in a flush card sticks to the page', async (_, content, selector) => {
  await page.viewport(1000, 600);
  const at = await mount(
    <div style={{ paddingTop: 200 }}>
      <Card padding="none">
        <Card.Header>
          <Card.Title>Tasks</Card.Title>
        </Card.Header>
        {content}
      </Card>
    </div>,
  );
  const sticky = at.querySelector(selector)!;
  window.scrollTo(0, sticky.getBoundingClientRect().top + 400);
  await frames();
  expect(sticky.getBoundingClientRect().top).toBeCloseTo(0, 0);
});
