/**
 * A MAP'S CARD IS NEVER A BLANK BOX, measured in a browser at each level of
 * detail. Under half size a card is a tile whose glyph and name are drawn at
 * a size that reads on screen; past a word fitting a card it is a filled mark
 * in a colour that is not the ground's; and a cluster's title and count read
 * at their own size at every zoom, where scaled with the map they were under
 * five pixels by the zoom a whole map fits at.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import {
  GRAPH_CANVAS_DETAIL_ZOOM,
  GRAPH_CANVAS_TILE_ZOOM,
  GraphCanvas,
  type GraphBand,
  type GraphNode,
} from '@crewlethq/ui';

const BANDS: GraphBand[] = [
  {
    id: 'request',
    lanes: [
      { id: 'entry', label: 'Entry', columns: 2 },
      { id: 'services', label: 'Services', columns: 2 },
    ],
  },
];

const glyph = (
  <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true">
    <circle cx="8" cy="8" r="6" />
  </svg>
);

/**
 * A CLUSTER FIFTY ROWS TALL in a small window, because a map zooms out no
 * further than the fit of all of it: this one fits at under a tenth, so every
 * level of detail is a zoom it can be drawn at.
 */
const ENTRIES = 100;

const NODES: GraphNode[] = [
  ...Array.from({ length: ENTRIES }, (_, i) => ({
    id: `e${i}`,
    lane: 'entry',
    name: `app-${i}.example.com`,
    glyph,
  })),
  { id: 's0', lane: 'services', name: 'orders-api', glyph, attention: { tone: 'danger' as const, label: 'Alerting' } },
  { id: 's1', lane: 'services', name: 'orders-worker', glyph },
];

/** The least a word is drawn at and still read as one: the kit's smallest type, less a rounding pixel. */
const READS = 9;

/**
 * The least a cluster is drawn at and still holds a three-figure count beside
 * its padding: four mono characters at 11px and the title's own inset. Under
 * it (a two-column cluster at a tenth is 45px) the figure stands past the
 * cluster's edge rather than being cut, which is the one thing it may not be.
 */
const WIDE_ENOUGH = 64;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
});

async function mapAt(k: number): Promise<HTMLElement> {
  await page.viewport(1440, 900);
  host = document.createElement('div');
  host.style.cssText = 'width: 320px; height: 200px;';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(<GraphCanvas label="Map" bands={BANDS} nodes={NODES} edges={[]} initialView={{ x: 40, y: 60, k }} />),
  );
  await expect.poll(() => host!.querySelector('.crewlet-graph-canvas__world .crewlet-graph-canvas__lane-title')).not.toBeNull();
  await expect
    .poll(() => host!.querySelector<HTMLElement>('.crewlet-graph-canvas__world')!.dataset.detail)
    .toBeDefined();
  return host;
}

/** How tall an element is on screen, after the map's own scale. */
const drawn = (el: Element) => el.getBoundingClientRect().height;

/** The zoom the map is drawn at: the one asked for, or the fit where that is the least it zooms out to. */
function zoomOf(map: HTMLElement): number {
  const transform = map.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform;
  return Number(/scale\(([-\d.e]+)\)/.exec(transform)![1]);
}

/** The size an element's type is drawn at on screen: its own size times the map's zoom. */
function typeOnScreen(el: Element, k: number): number {
  return Number.parseFloat(getComputedStyle(el).fontSize) * k;
}

describe('a map zoomed out', () => {
  test('at full size a card is a card, and its type is its own', async () => {
    const map = await mapAt(1);
    expect(map.querySelector<HTMLElement>('.crewlet-graph-canvas__world')!.dataset.detail).toBe('cards');
    const title = map.querySelector('.crewlet-graph-canvas__world .crewlet-graph-canvas__lane-title')!;
    // Nothing grows past its own size when the map is not zoomed out.
    expect(typeOnScreen(title, 1)).toBeLessThanOrEqual(11.5);
  });

  for (const k of [GRAPH_CANVAS_DETAIL_ZOOM - 0.05, 0.4, GRAPH_CANVAS_TILE_ZOOM]) {
    test(`at ${Math.round(k * 100)}% every card is a tile: a glyph and a name that read, inside the card`, async () => {
      const map = await mapAt(k);
      expect(map.querySelector<HTMLElement>('.crewlet-graph-canvas__world')!.dataset.detail).toBe('tiles');
      expect(map.querySelector('.crewlet-graph-canvas__shapes')).toBeNull();
      // The cards near the view: every one of them is held to the same.
      const cards = [...map.querySelectorAll('.crewlet-graph-canvas__items .crewlet-graph-canvas__card')];
      expect(cards.length).toBeGreaterThan(8);
      for (const card of cards) {
        const box = card.getBoundingClientRect();
        const name = card.querySelector('.crewlet-graph-canvas__name')!;
        const cell = card.querySelector('.crewlet-graph-canvas__cell svg')!;
        expect(typeOnScreen(name, k), 'the name reads').toBeGreaterThanOrEqual(READS);
        // The name is one line that fits its card, top to bottom and side to side.
        const words = name.getBoundingClientRect();
        expect(words.top).toBeGreaterThanOrEqual(box.top - 0.5);
        expect(words.bottom).toBeLessThanOrEqual(box.bottom + 0.5);
        expect(words.right).toBeLessThanOrEqual(box.right + 0.5);
        expect(words.width, 'the name has room for letters').toBeGreaterThan(READS * 2);
        // The glyph fills most of the card's height, where at its card size it was a third of it.
        expect(drawn(cell) / box.height, 'the glyph fills the cell').toBeGreaterThan(0.55);
      }
    });
  }

  test('past a word fitting a card every card is a filled mark, in a colour the ground does not have', async () => {
    const map = await mapAt(0.2);
    expect(map.querySelector<HTMLElement>('.crewlet-graph-canvas__world')!.dataset.detail).toBe('marks');
    const fill = (shape: string) =>
      getComputedStyle(map.querySelector(`.crewlet-graph-canvas__shapes [data-shape="${shape}"]`)!).fill;
    const pane = getComputedStyle(map.querySelector('.crewlet-graph-canvas__lane')!).fill;
    const ground = getComputedStyle(map.querySelector('.crewlet-graph-canvas__world .crewlet-graph-canvas__lane-title')!).backgroundColor;
    for (const shape of ['card', 'danger']) {
      expect(fill(shape), shape).not.toBe('none');
      expect(fill(shape), shape).not.toBe(pane);
      expect(fill(shape), shape).not.toBe(ground);
    }
    expect(fill('danger')).not.toBe(fill('card'));
  });

  for (const k of [0.75, 0.4, 0.2, 0.1]) {
    test(`at ${Math.round(k * 100)}% a cluster's title and count hold their size on screen, inside the cluster`, async () => {
      const map = await mapAt(k);
      const shown = zoomOf(map);
      expect(shown).toBeLessThanOrEqual(Math.max(k, 0.2));
      const lanes = [...map.querySelectorAll('.crewlet-graph-canvas__lane')];
      const titles = [...map.querySelectorAll('.crewlet-graph-canvas__world .crewlet-graph-canvas__lane-title')];
      expect(titles).toHaveLength(BANDS[0]!.lanes.length);
      titles.forEach((title, i) => {
        expect(typeOnScreen(title, shown)).toBeGreaterThanOrEqual(10.5);
        expect(typeOnScreen(title, shown)).toBeLessThanOrEqual(11.5);
        const figure = title.querySelector('.crewlet-graph-canvas__lane-count')!;
        const count = figure.getBoundingClientRect();
        const lane = lanes[i]!.getBoundingClientRect();
        // The count is never the part that gives way: its figure is drawn whole, at its own width.
        expect(figure.scrollWidth).toBeLessThanOrEqual(Math.ceil(figure.clientWidth) + 1);
        expect(count.width * k).toBeGreaterThan(0);
        // And inside its cluster, wherever the cluster is as wide as a figure and its padding.
        if (lane.width >= WIDE_ENOUGH) expect(count.right).toBeLessThanOrEqual(lane.right + 0.5);
      });
    });
  }
});
