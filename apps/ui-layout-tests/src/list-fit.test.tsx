/**
 * A fitting list in a block of a set height shows the rows that fit whole,
 * never one cut in half, and refits when the block is resized.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { useState, type ReactNode } from 'react';
import { ArrangeFrame, ArrangeGrid, Card, List, ListItem } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function frames() {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(ui: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = '960px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(ui));
  await document.fonts.ready;
  await frames();
  return host;
}

/** A Home-shaped card: a head, a fitting list of `items` rows and a foot counting the rest. */
function Fitted({ items, lines = 1 }: { items: number; lines?: number }) {
  const [shown, setShown] = useState(items);
  return (
    <Card padding="none">
      <Card.Header>
        <Card.Title>Executors</Card.Title>
      </Card.Header>
      <List fit onFit={setShown}>
        {Array.from({ length: items }, (_, i) => (
          <ListItem key={i} href="#">
            {Array.from({ length: i % 3 === 1 ? lines : 1 }, (_, l) => (
              <span key={l} style={{ display: 'block' }}>{`Row ${i + 1}, line ${l + 1}`}</span>
            ))}
          </ListItem>
        ))}
      </List>
      <Card.Footer variant="meta">
        <span data-testid="more">{shown < items ? `+${items - shown} more` : 'All shown'}</span>
      </Card.Footer>
    </Card>
  );
}

const block = (rows: number | null, ui: ReactNode) => (
  <ArrangeGrid columns={12}>
    <ArrangeFrame name="Executors" editing={false} columns={4} rows={rows} rowHeight={16}>
      {ui}
    </ArrangeFrame>
  </ArrangeGrid>
);

function measure(at: HTMLElement) {
  const frame = at.querySelector<HTMLElement>('.crewlet-arrange-frame')!.getBoundingClientRect();
  const list = at.querySelector<HTMLElement>('.crewlet-list')!;
  const edge = list.getBoundingClientRect().bottom;
  const rows = Array.from(list.children) as HTMLElement[];
  const shown = rows.filter((r) => getComputedStyle(r).visibility !== 'hidden');
  const foot = at.querySelector<HTMLElement>('.crewlet-card__footer')!.getBoundingClientRect();
  return { frame, edge, rows, shown, foot, more: at.querySelector('[data-testid="more"]')!.textContent };
}

test('a block of a set height shows only whole rows, and its foot counts the rest', async () => {
  await page.viewport(1200, 900);
  const at = await mount(block(20, <Fitted items={30} lines={3} />));
  const { frame, edge, rows, shown, foot, more } = measure(at);
  expect(shown.length).toBeGreaterThan(0);
  expect(shown.length).toBeLessThan(rows.length);
  // The shown rows are the first ones, each ending inside the list's box.
  expect(shown).toEqual(rows.slice(0, shown.length));
  for (const row of shown) expect(row.getBoundingClientRect().bottom).toBeLessThanOrEqual(edge + 0.5);
  // The first hidden row is the one the edge would have cut.
  expect(rows[shown.length]!.getBoundingClientRect().bottom).toBeGreaterThan(edge);
  expect(more).toBe(`+${rows.length - shown.length} more`);
  // The foot is inside the block, never pushed out of it.
  expect(foot.bottom).toBeLessThanOrEqual(frame.bottom + 0.5);
});

test('a taller block shows more rows, and a block of its content height shows them all', async () => {
  await page.viewport(1200, 900);
  const short = measure(await mount(block(14, <Fitted items={30} />))).shown.length;
  flushSync(() => root!.render(block(30, <Fitted items={30} />)));
  await frames();
  const tall = measure(host!);
  expect(tall.shown.length).toBeGreaterThan(short);
  flushSync(() => root!.render(block(null, <Fitted items={8} />)));
  await frames();
  const content = measure(host!);
  expect(content.shown.length).toBe(8);
  expect(content.more).toBe('All shown');
});

test('a divided list settles at every height, never refitting the row on its edge', async () => {
  await page.viewport(1200, 900);
  let fits = 0;
  const at = (px: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: px, width: 320 }}>
      <Card padding="none" style={{ minHeight: 0 }}>
        <List fit onFit={() => (fits += 1)}>
          {Array.from({ length: 40 }, (_, i) => (
            <ListItem key={i} href="#">{`Row ${i + 1}`}</ListItem>
          ))}
        </List>
      </Card>
    </div>
  );
  await mount(at(200));
  // Every height between two rows' edges, a pixel at a time: each one refits once at most.
  for (let px = 201; px <= 260; px++) {
    fits = 0;
    flushSync(() => root!.render(at(px)));
    await frames();
    expect(fits, `${px}px`).toBeLessThanOrEqual(1);
  }
});
