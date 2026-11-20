/**
 * A trunk's count never stands on a title, card or other count, measured in a
 * browser: each count takes a clear place or is not written.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { GraphCanvas, type GraphBand, type GraphEdge, type GraphNode } from '@crewlethq/ui';

const BANDS: GraphBand[] = [
  {
    id: 'request',
    lanes: [
      { id: 'services', label: 'Services', columns: 3 },
      { id: 'data', label: 'Data', columns: 2 },
    ],
  },
  {
    id: 'under',
    lanes: [
      { id: 'runtime', label: 'Runtime', columns: 2 },
      { id: 'platforms', label: 'Platforms' },
    ],
  },
];

const many = (lane: string, count: number): GraphNode[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${lane}-${i}`, lane, name: `${lane}-${i}.example` }));

const NODES = [...many('services', 30), ...many('data', 10), ...many('runtime', 12), ...many('platforms', 6)];

/** Two trunks leave each upper cluster: one to each lower one. */
const EDGES: GraphEdge[] = [
  ...Array.from({ length: 17 }, (_, i) => ({ id: `s${i}`, from: `services-${i}`, to: `runtime-${i % 12}`, family: 'support' as const })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `sp${i}`, from: `services-${20 + i}`, to: `platforms-${i}`, family: 'support' as const })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, from: `data-${i}`, to: `runtime-${i}`, family: 'support' as const })),
  { id: 'dp', from: 'data-9', to: 'platforms-5', family: 'support' as const },
];

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
});

async function mapAt(k: number | null): Promise<HTMLElement> {
  await page.viewport(1480, 760);
  host = document.createElement('div');
  host.style.cssText = 'width: 1440px; height: 544px; display: flex; flex-direction: column;';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <GraphCanvas
        label="Map"
        bands={BANDS}
        nodes={NODES}
        edges={EDGES}
        initialView={k === null ? undefined : { x: 24, y: 24, k }}
      />,
    ),
  );
  await expect.poll(() => host!.querySelector<HTMLElement>('.crewlet-graph-canvas__world')?.dataset.detail).toBeDefined();
  await expect.poll(() => host!.querySelectorAll('.crewlet-graph-canvas__trunk-label').length).toBe(4);
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return host;
}

const rects = (map: HTMLElement, selector: string) =>
  [...map.querySelectorAll(selector)].filter((el) => getComputedStyle(el).visibility !== 'hidden').map((el) => el.getBoundingClientRect());

const meet = (a: DOMRect, b: DOMRect) =>
  a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;

function clashes(map: HTMLElement): string[] {
  const labels = rects(map, '.crewlet-graph-canvas__trunk-label');
  const titles = rects(map, '.crewlet-graph-canvas__world .crewlet-graph-canvas__lane-title');
  const cards = rects(map, '.crewlet-graph-canvas__items .crewlet-graph-canvas__card');
  const out: string[] = [];
  labels.forEach((label, i) => {
    if (titles.some((title) => meet(label, title))) out.push(`count ${i} on a title`);
    if (cards.some((card) => meet(label, card))) out.push(`count ${i} on a card`);
    labels.forEach((other, j) => {
      if (j > i && meet(label, other)) out.push(`count ${i} on count ${j}`);
    });
  });
  return out;
}

describe("a trunk's count", () => {
  for (const k of [null, 0.58, 1]) {
    test(`at ${k === null ? 'the fit' : `${Math.round(k * 100)}%`} stands on no title, card or other count`, async () => {
      const map = await mapAt(k);
      expect(clashes(map)).toEqual([]);
    });
  }

  test('at actual size every count is written', async () => {
    const map = await mapAt(1);
    expect(rects(map, '.crewlet-graph-canvas__trunk-label')).toHaveLength(4);
  });
});
