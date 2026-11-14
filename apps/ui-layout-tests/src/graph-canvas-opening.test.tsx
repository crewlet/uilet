/**
 * A MAP OPENS FITTED TO ITS VIEW, measured in a browser: every cluster of the
 * map drawn inside the canvas the moment it is shown, centred, at the zoom
 * that fits it and at the level of detail that zoom draws, with no other view
 * painted first. Where it opened on its start at three quarters instead, a
 * map too large to read whole at half size ran off the canvas on the right
 * and the bottom, and a reader pressed Fit by hand.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import {
  CANVAS_FIT_PADDING,
  GRAPH_CANVAS_FOCUS_ZOOM,
  GraphCanvas,
  graphDetail,
  graphItemKey,
  type GraphBand,
  type GraphDetail,
  type GraphNode,
} from '@crewlethq/ui';

/** Three bands of lanes, the shape of a company's map: what a request travels, what that stands on, what stands around. */
const BANDS: GraphBand[] = [
  {
    id: 'request',
    lanes: [
      { id: 'entry', label: 'Entry', columns: 2 },
      { id: 'services', label: 'Services', columns: 3 },
      { id: 'data', label: 'Data', columns: 2 },
    ],
  },
  {
    id: 'stands-on',
    lanes: [
      { id: 'runtime', label: 'Runtime', columns: 2 },
      { id: 'platforms', label: 'Platforms' },
    ],
  },
  {
    id: 'around',
    label: 'Around it',
    lanes: [
      { id: 'code', label: 'Code and delivery' },
      { id: 'observability', label: 'Observability' },
      { id: 'tools', label: 'Tools and models' },
    ],
  },
];
const LANES = BANDS.flatMap((band) => band.lanes.map((lane) => lane.id));

const glyph = (
  <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true">
    <circle cx="8" cy="8" r="6" />
  </svg>
);

const company = (count: number): GraphNode[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    lane: LANES[i % LANES.length]!,
    name: `entry-${i}.example`,
    glyph,
  }));

/** The map's box on the atlas page: its share of a laptop's window, and its least height on a phone. */
const WIDE = { width: 1440, height: 544 };
const PHONE = { width: 390, height: 352 };

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
});

const viewportOf = () => host!.querySelector<HTMLElement>('.crewlet-canvas__viewport')!;
const worldOf = () => host!.querySelector<HTMLElement>('.crewlet-graph-canvas__world')!;

/** The view the world is drawn at, from its transform. */
function view(): { x: number; y: number; k: number } {
  const transform = host!.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform;
  const [, x, y, k] = /translate\(([-\d.e]+)px, ([-\d.e]+)px\) scale\(([-\d.e]+)\)/.exec(transform)!;
  return { x: Number(x), y: Number(y), k: Number(k) };
}

/**
 * Mounts a map in a box of `size` and samples every frame until it has been
 * shown for a dozen: the views the canvas painted while it showed the map.
 */
async function open(size: { width: number; height: number }, nodes: GraphNode[], initialNode?: string) {
  await page.viewport(size.width + 40, size.height + 200);
  host = document.createElement('div');
  host.style.cssText = `width: ${size.width}px; height: ${size.height}px; display: flex; flex-direction: column;`;
  document.body.append(host);
  root = createRoot(host);
  const painted: string[] = [];
  const sampled = new Promise<void>((done) => {
    const sample = () => {
      const canvas = host?.querySelector<HTMLElement>('.crewlet-canvas');
      const world = host?.querySelector<HTMLElement>('.crewlet-canvas__world');
      if (canvas?.dataset.ready === 'true' && world && getComputedStyle(world).visibility !== 'hidden') {
        painted.push(world.style.transform);
      }
      if (painted.length >= 12) done();
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  flushSync(() =>
    root!.render(
      <GraphCanvas
        label="Map"
        bands={BANDS}
        nodes={nodes}
        edges={[]}
        initialNode={initialNode}
        selectedId={initialNode}
      />,
    ),
  );
  await sampled;
  return { painted: [...new Set(painted)] };
}

/** Whether `inner` is drawn inside `outer`, to half a pixel. */
function inside(inner: DOMRect, outer: DOMRect): boolean {
  return (
    inner.left >= outer.left - 0.5 &&
    inner.top >= outer.top - 0.5 &&
    inner.right <= outer.right + 0.5 &&
    inner.bottom <= outer.bottom + 0.5
  );
}

/** The band of the canvas the bar across from the zoom bar (the legend) leaves, top to bottom. */
function roomOf(canvas: DOMRect): { top: number; bottom: number } {
  const bar = host!.querySelector('.crewlet-canvas__controls--end > *')?.getBoundingClientRect();
  if (!bar || bar.height === 0) return { top: canvas.top, bottom: canvas.bottom };
  const middle = canvas.top + canvas.height / 2;
  return bar.top < middle ? { top: bar.bottom, bottom: canvas.bottom } : { top: canvas.top, bottom: bar.top };
}

const cases: Array<{ name: string; size: typeof WIDE; count: number; detail: GraphDetail }> = [
  { name: 'a small map on a laptop, as cards', size: WIDE, count: 12, detail: 'cards' },
  { name: 'a hundred and twenty entries on a laptop, as tiles', size: WIDE, count: 120, detail: 'tiles' },
  { name: 'six hundred entries on a laptop, as marks', size: WIDE, count: 600, detail: 'marks' },
  { name: 'a hundred and twenty entries on a phone, as marks', size: PHONE, count: 120, detail: 'marks' },
];

describe('a map opens fitted to its view', () => {
  for (const one of cases) {
    test(`${one.name}: every cluster inside the canvas, centred, from the first frame shown`, async () => {
      const { painted } = await open(one.size, company(one.count));
      // ONE VIEW from the first frame the map was shown: no other zoom painted before the fit.
      expect(painted).toHaveLength(1);
      const canvas = viewportOf().getBoundingClientRect();
      const lanes = [...host!.querySelectorAll('.crewlet-graph-canvas__lane')];
      expect(lanes).toHaveLength(LANES.length);
      for (const lane of lanes) expect(inside(lane.getBoundingClientRect(), canvas), 'a cluster is in view').toBe(true);
      const world = worldOf().getBoundingClientRect();
      expect(inside(world, canvas), 'the whole map is in view').toBe(true);
      // CENTRED across, and filling the room the bars leave along one side unless it is drawn at actual size.
      expect(Math.abs(world.left - canvas.left - (canvas.right - world.right))).toBeLessThan(1);
      const room = roomOf(canvas);
      expect(world.top).toBeGreaterThanOrEqual(room.top - 0.5);
      expect(world.bottom).toBeLessThanOrEqual(room.bottom + 0.5);
      const pad = 2 * CANVAS_FIT_PADDING;
      const fills = Math.max(world.width / (canvas.width - pad), world.height / (room.bottom - room.top - pad));
      expect(fills > 0.98 || view().k === 1, 'the fit uses the room it has').toBe(true);
      // At the level of detail its zoom draws, and never a blank box.
      expect(worldOf().dataset.detail).toBe(graphDetail(view().k));
      expect(worldOf().dataset.detail).toBe(one.detail);
      if (one.detail === 'marks') {
        expect(host!.querySelector('.crewlet-graph-canvas__shapes [data-shape="card"]')).not.toBeNull();
      } else {
        const cards = [...host!.querySelectorAll('.crewlet-graph-canvas__items .crewlet-graph-canvas__card')];
        expect(cards.length).toBeGreaterThan(0);
        for (const card of cards) {
          const name = card.querySelector('.crewlet-graph-canvas__name')!;
          expect(name.textContent).not.toBe('');
          expect(name.getBoundingClientRect().width, 'the name is drawn').toBeGreaterThan(8);
        }
      }
    });
  }

  test('a map opened on one entry draws it in the middle of the canvas, as a card that reads', async () => {
    const { painted } = await open(WIDE, company(600), 'n301');
    expect(painted).toHaveLength(1);
    expect(view().k).toBe(GRAPH_CANVAS_FOCUS_ZOOM);
    expect(worldOf().dataset.detail).toBe('cards');
    const canvas = viewportOf().getBoundingClientRect();
    const card = host!.querySelector(`[data-graph-key="${graphItemKey('node', 'n301')}"]`)!.getBoundingClientRect();
    expect(Math.abs(card.left + card.width / 2 - (canvas.left + canvas.width / 2))).toBeLessThan(1);
    // In the middle of the room the legend at the foot leaves.
    expect(card.top).toBeGreaterThan(canvas.top + canvas.height / 4);
    expect(card.bottom).toBeLessThan(canvas.bottom - canvas.height / 4);
  });
});
