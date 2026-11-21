/**
 * A MAP STAYS FITTED WHEN ITS CARDS ARE MEASURED ANEW, in a browser: a caller
 * that widens the cards (`--crewlet-graph-canvas-card-width`) and asks for a
 * fit in the same render had the fit land on the old layout, since the card's
 * probe measures the new width only after that render, and the wider map ran
 * off the canvas. A view the reader moved is kept.
 */
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { CANVAS_FIT_PADDING, GraphCanvas, type GraphBand, type GraphNode } from '@crewlethq/ui';

const BANDS: GraphBand[] = [
  {
    id: 'request',
    lanes: [
      { id: 'entry', label: 'Entry', columns: 2 },
      { id: 'services', label: 'Services', columns: 3 },
      { id: 'data', label: 'Data', columns: 2 },
    ],
  },
  { id: 'around', lanes: [{ id: 'code', label: 'Code and delivery', columns: 3 }] },
];
const LANES = BANDS.flatMap((band) => band.lanes.map((lane) => lane.id));
const NODES: GraphNode[] = Array.from({ length: 40 }, (_, i) => ({
  id: `n${i}`,
  lane: LANES[i % LANES.length]!,
  name: `entry-${i}.example`,
}));
/** A box wider than the map at the kit's card width, so the fit is set by its height until the cards widen. */
const BOX = { width: 1440, height: 544 };

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
});

const map = () => host!.querySelector<HTMLElement>('.crewlet-graph-canvas')!;
const canvasBox = () => host!.querySelector('.crewlet-canvas__viewport')!.getBoundingClientRect();
const worldBox = () => host!.querySelector('.crewlet-graph-canvas__world')!.getBoundingClientRect();
const zoom = () =>
  Number(/scale\(([-\d.e]+)\)/.exec(host!.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform)![1]);

/** Resolves after `count` painted frames. */
const frames = (count: number) =>
  new Promise<void>((done) => {
    const step = (left: number) => (left === 0 ? done() : requestAnimationFrame(() => step(left - 1)));
    step(count);
  });

function draw(fitKey: string) {
  root!.render(<GraphCanvas label="Map" bands={BANDS} nodes={NODES} edges={[]} fitKey={fitKey} />);
}

test('cards widened with a new fit key in one render: the map is fitted to its new width', async () => {
  await page.viewport(BOX.width + 40, BOX.height + 200);
  host = document.createElement('div');
  host.style.cssText = `width: ${BOX.width}px; height: ${BOX.height}px; display: flex; flex-direction: column;`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => draw('narrow'));
  await expect.poll(() => host!.querySelector('.crewlet-canvas')?.getAttribute('data-ready')).toBe('true');
  await frames(4);
  const before = zoom();

  // What a caller does: the wider cards and the fit it asks for, in one render.
  flushSync(() => {
    map().style.setProperty('--crewlet-graph-canvas-card-width', '33rem');
    draw('wide');
  });
  await frames(6);
  const canvas = canvasBox();
  const world = worldBox();
  expect(world.left).toBeGreaterThanOrEqual(canvas.left - 0.5);
  expect(world.right).toBeLessThanOrEqual(canvas.right + 0.5);
  expect(zoom()).toBeLessThan(before);
  // Filling the width it has, centred.
  expect(world.width / (canvas.width - 2 * CANVAS_FIT_PADDING)).toBeGreaterThan(0.98);
  expect(Math.abs(world.left - canvas.left - (canvas.right - world.right))).toBeLessThan(1);

  // A reader zooms in; cards measured anew keep their view.
  host!.querySelector<HTMLElement>('.crewlet-canvas__viewport')!.focus();
  await userEvent.keyboard('+');
  await frames(6);
  const theirs = zoom();
  map().style.removeProperty('--crewlet-graph-canvas-card-width');
  await frames(6);
  expect(zoom()).toBe(theirs);
});
