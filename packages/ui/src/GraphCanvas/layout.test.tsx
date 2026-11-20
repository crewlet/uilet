/**
 * The layered map's layout, routing, walk and reach, without a DOM. The
 * random maps come from a seeded PRNG, and a failure names its seed.
 */

import { describe, expect, test } from 'vitest';
import { CANVAS_FIT_PADDING, fitView } from '../Canvas/geometry.js';
import {
  GRAPH_LAYOUT_ROOM,
  GRAPH_SPLIT_GAIN,
  graphItemKey,
  graphTileLines,
  graphTrunks,
  placeTrunkLabels,
  layoutGraph,
  routeGraphEdges,
  type GraphLayout,
  type GraphLayoutBand,
  type GraphLayoutEdge,
  type GraphLayoutGroup,
  type GraphLayoutInput,
  type GraphLayoutNode,
  type GraphMetrics,
  type GraphReading,
  type GraphRoute,
  type GraphTrunk,
} from './layout.js';
import { graphNeighbourhood, graphReach } from './reach.js';
import { graphStep } from './walk.js';

const METRICS: GraphMetrics = {
  cardWidth: 216,
  cardMinWidth: 160,
  cardMaxWidth: 320,
  cardHeight: 52,
  cardTallHeight: 72,
  cardBare: 60,
  gutter: 64,
  rowGap: 20,
  laneHead: 32,
  bandHead: 40,
  bandGap: 24,
  lanePad: 12,
  margin: 24,
};

const BANDS: GraphLayoutBand[] = [
  { id: 'request', titled: false, lanes: ['entry', 'services', 'runtime', 'data', 'platforms'] },
  { id: 'around', titled: true, lanes: ['code', 'observability', 'tools'] },
];
const LANES = BANDS.flatMap((band) => band.lanes);

/** A room wide enough that no band splits. */
const WIDE_ROOM = { width: 4000, height: 900 };

/** The rooms the invariants hold in: the default, a wide and short window's, and a phone's. */
const ROOMS = [GRAPH_LAYOUT_ROOM, { width: 2400, height: 560 }, { width: 420, height: 760 }];

/** Each entry's card width with its name on one line, from 120 to 420: short names and long. */
function namesOf(seed: number, nodes: readonly GraphLayoutNode[]): Map<string, number> {
  const random = prng(seed * 7 + 1);
  return new Map(nodes.map((node) => [graphItemKey('node', node.id), 120 + Math.floor(random() * 300)]));
}

/** mulberry32. */
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A random map: entries spread over the lanes, some in groups of their lane,
 * and edges that mostly point rightwards, as dependencies do, with a few
 * running back and a few inside one lane.
 */
function randomMap(seed: number, count: number, edgesPer = 1.5): Omit<GraphLayoutInput, 'open'> {
  const random = prng(seed);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const groups: GraphLayoutGroup[] = [];
  for (const lane of LANES) for (let g = 0; g < 3; g++) groups.push({ id: `${lane}-g${g}`, lane });
  const nodes: GraphLayoutNode[] = [];
  for (let i = 0; i < count; i++) {
    const lane = pick(LANES);
    const grouped = random() < 0.7;
    nodes.push({ id: `n${i}`, lane, group: grouped ? `${lane}-g${Math.floor(random() * 3)}` : undefined });
  }
  const laneIndex = new Map(LANES.map((lane, i) => [lane, i]));
  const edges: GraphLayoutEdge[] = [];
  const total = Math.floor(count * edgesPer);
  for (let i = 0; i < total && nodes.length > 1; i++) {
    const a = pick(nodes);
    let b = pick(nodes);
    if (random() < 0.85 && laneIndex.get(b.lane)! <= laneIndex.get(a.lane)!) {
      const later = nodes.filter((node) => laneIndex.get(node.lane)! > laneIndex.get(a.lane)!);
      if (later.length > 0) b = pick(later);
    }
    if (a.id !== b.id) edges.push({ id: `e${i}`, from: a.id, to: b.id });
  }
  return {
    bands: BANDS,
    nodes,
    groups: groups.filter((group) => nodes.some((node) => node.group === group.id)),
    edges,
  };
}

/**
 * A map shaped like a company's: hostnames on services, services on servers
 * and databases, a few services on each other, and tool servers on servers.
 */
function layeredMap(seed: number, count: number): Omit<GraphLayoutInput, 'open'> {
  const random = prng(seed);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const weights = [
    'entry',
    'entry',
    'services',
    'services',
    'services',
    'runtime',
    'runtime',
    'data',
    'data',
    'platforms',
  ];
  const spread = [...weights, 'code', 'observability', 'tools'];
  const byLane = new Map<string, string[]>();
  const nodes: GraphLayoutNode[] = [];
  for (let i = 0; i < count; i++) {
    const lane = pick(spread);
    nodes.push({ id: `n${i}`, lane });
    byLane.set(lane, [...(byLane.get(lane) ?? []), `n${i}`]);
  }
  const edges: GraphLayoutEdge[] = [];
  const add = (from: string, to: string) => {
    if (from !== to) edges.push({ id: `e${edges.length}`, from, to });
  };
  const of = (lane: string) => byLane.get(lane) ?? [];
  for (const id of of('entry')) if (of('services').length > 0) add(id, pick(of('services')));
  for (const id of of('services')) {
    if (of('runtime').length > 0) add(id, pick(of('runtime')));
    if (of('data').length > 0 && random() < 0.7) add(id, pick(of('data')));
    if (random() < 0.2) add(id, pick(of('services')));
  }
  for (const id of of('tools')) if (of('runtime').length > 0 && random() < 0.3) add(id, pick(of('runtime')));
  return { bands: BANDS, nodes, edges };
}

const allOpen = () => true;

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return (
    a.x < b.x + b.width - 0.01 &&
    b.x < a.x + a.width - 0.01 &&
    a.y < b.y + b.height - 0.01 &&
    b.y < a.y + a.height - 0.01
  );
}

/** Whether a horizontal or vertical segment passes through the inside of a rectangle. */
function crossesInside(
  a: { x: number; y: number },
  b: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const inset = 1;
  const left = rect.x + inset;
  const right = rect.x + rect.width - inset;
  const top = rect.y + inset;
  const bottom = rect.y + rect.height - inset;
  if (a.y === b.y) {
    if (a.y <= top || a.y >= bottom) return false;
    return Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right;
  }
  if (a.x <= left || a.x >= right) return false;
  return Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom;
}

/** How many pairs of routes cross at a right angle. */
function crossings(routes: readonly GraphRoute[]): number {
  const segments = routes.flatMap((route, r) =>
    route.points.slice(1).map((point, i) => ({ r, a: route.points[i]!, b: point })),
  );
  const horizontal = segments.filter((s) => s.a.y === s.b.y);
  const vertical = segments.filter((s) => s.a.x === s.b.x);
  let count = 0;
  for (const h of horizontal) {
    const x1 = Math.min(h.a.x, h.b.x);
    const x2 = Math.max(h.a.x, h.b.x);
    for (const v of vertical) {
      if (v.r === h.r) continue;
      const y1 = Math.min(v.a.y, v.b.y);
      const y2 = Math.max(v.a.y, v.b.y);
      if (v.a.x > x1 && v.a.x < x2 && h.a.y > y1 && h.a.y < y2) count += 1;
    }
  }
  return count;
}

describe('layoutGraph', () => {
  test('no two items and no two lane frames overlap, over random maps in every room', () => {
    for (const room of ROOMS) {
      for (let seed = 1; seed <= 25; seed++) {
        const map = randomMap(seed, 60);
        const layout = layoutGraph(
          { ...map, open: (id) => !id.endsWith('g2'), room, itemWidths: namesOf(seed, map.nodes) },
          METRICS,
        );
        for (let i = 0; i < layout.items.length; i++) {
          for (let j = i + 1; j < layout.items.length; j++) {
            const a = layout.items[i]!;
            const b = layout.items[j]!;
            expect(overlaps(a, b), `seed ${seed} in ${room.width}x${room.height}: ${a.key} overlaps ${b.key}`).toBe(false);
          }
        }
        for (let i = 0; i < layout.lanes.length; i++) {
          for (let j = i + 1; j < layout.lanes.length; j++) {
            const a = layout.lanes[i]!;
            const b = layout.lanes[j]!;
            expect(overlaps(a.panel, b.panel), `seed ${seed}: ${a.id} overlaps ${b.id}`).toBe(false);
          }
          const panel = layout.lanes[i]!.panel;
          // Nothing outside the map, which is what a fit shows.
          expect(panel.x).toBeGreaterThanOrEqual(0);
          expect(panel.y).toBeGreaterThanOrEqual(0);
          expect(panel.x + panel.width).toBeLessThanOrEqual(layout.bounds.width);
          expect(panel.y + panel.height).toBeLessThanOrEqual(layout.bounds.height);
        }
      }
    }
  });

  test('every lane is drawn, and each item stands inside its own lane panel', () => {
    const layout = layoutGraph({ ...randomMap(7, 40), open: allOpen }, METRICS);
    expect(layout.lanes.map((lane) => lane.id)).toEqual(LANES);
    for (const item of layout.items) {
      const panel = layout.laneById.get(item.lane)!.panel;
      expect(item.x).toBeGreaterThanOrEqual(panel.x);
      expect(item.x + item.width).toBeLessThanOrEqual(panel.x + panel.width);
      expect(item.y).toBeGreaterThanOrEqual(panel.y);
      expect(item.y + item.height).toBeLessThanOrEqual(panel.y + panel.height);
    }
  });

  test('every edge has a route from its source to its target side, ending under an arrowhead', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const map = randomMap(seed, 50);
      const layout = layoutGraph({ ...map, open: allOpen }, METRICS);
      for (const edge of map.edges) {
        const route = layout.routes.find((one) => one.key === layout.routeOfEdge.get(edge.id));
        expect(route, `seed ${seed}: ${edge.id} has no route`).toBeDefined();
        const from = layout.itemByKey.get(graphItemKey('node', edge.from))!;
        const to = layout.itemByKey.get(graphItemKey('node', edge.to))!;
        const first = route!.points[0]!;
        const last = route!.points[route!.points.length - 1]!;
        expect([from.x, from.x + from.width]).toContain(first.x);
        expect(first.y).toBeGreaterThan(from.y);
        expect(first.y).toBeLessThan(from.y + from.height);
        expect([to.x, to.x + to.width]).toContain(last.x);
        expect(last.y).toBeGreaterThan(to.y);
        expect(last.y).toBeLessThan(to.y + to.height);
        expect(route!.arrow.startsWith(`M${Math.round(last.x * 10) / 10} `)).toBe(true);
        // Every run is horizontal or vertical.
        route!.points.slice(1).forEach((point, i) => {
          const before = route!.points[i]!;
          expect(point.x === before.x || point.y === before.y).toBe(true);
        });
      }
    }
  });

  // Mutation: cross a shelf between by the target's own channel instead of an alley, and a route
  // split across shelves runs through the cards of the shelf between.
  test('no route runs through a card or a header it does not belong to, in every room', () => {
    const through: string[] = [];
    for (const room of ROOMS) {
      for (let seed = 1; seed <= 25; seed++) {
        const map = randomMap(seed, 70);
        const layout = layoutGraph(
          { ...map, open: (id) => !id.endsWith('g1'), room, itemWidths: namesOf(seed, map.nodes) },
          METRICS,
        );
        for (const route of layout.routes) {
          const own = new Set([layout.itemByKey.get(route.from)!.lane, layout.itemByKey.get(route.to)!.lane]);
          // A lane's title band is crossed by no route but its own lanes' runs.
          const heads = layout.lanes
            .filter((lane) => !own.has(lane.id))
            .map((lane) => ({ ...lane.head, key: `head of ${lane.id}` }));
          for (const item of [...layout.items, ...heads]) {
            if (item.key === route.from || item.key === route.to) continue;
            route.points.slice(1).forEach((point, i) => {
              if (crossesInside(route.points[i]!, point, item))
                through.push(`seed ${seed} in ${room.width}x${room.height}: ${route.key} through ${item.key}`);
            });
          }
        }
      }
    }
    expect(through).toEqual([]);
  });

  test('a closed group is one card, and its members edges are its own', () => {
    const map = {
      bands: BANDS,
      nodes: [
        { id: 'api', lane: 'services' },
        { id: 'web-1', lane: 'runtime', group: 'aws' },
        { id: 'web-2', lane: 'runtime', group: 'aws' },
        { id: 'db', lane: 'data' },
      ],
      groups: [{ id: 'aws', lane: 'runtime' }],
      edges: [
        { id: 'a', from: 'api', to: 'web-1' },
        { id: 'b', from: 'api', to: 'web-2' },
        { id: 'c', from: 'web-1', to: 'db' },
        { id: 'd', from: 'web-1', to: 'web-2' },
      ],
    };
    const closed = layoutGraph({ ...map, open: () => false }, METRICS);
    const summary = graphItemKey('summary', 'aws');
    expect(closed.itemOfNode.get('web-1')).toBe(summary);
    expect(closed.items.filter((item) => item.lane === 'runtime').map((item) => item.key)).toEqual([summary]);
    // Two edges into the group are one route, and an edge inside it is none.
    expect(closed.routes.map((route) => route.key).sort()).toEqual([`node:api>${summary}`, `${summary}>node:db`]);
    expect(closed.routes.find((route) => route.key === `node:api>${summary}`)!.edges).toEqual(['a', 'b']);
    expect(closed.groupById.get('aws')).toMatchObject({ open: false, box: null, members: ['web-1', 'web-2'] });

    const opened = layoutGraph({ ...map, open: () => true }, METRICS);
    expect(opened.items.filter((item) => item.lane === 'runtime').map((item) => item.kind)).toEqual([
      'head',
      'node',
      'node',
    ]);
    const box = opened.groupById.get('aws')!.box!;
    for (const id of ['web-1', 'web-2']) {
      const card = opened.itemByKey.get(graphItemKey('node', id))!;
      expect(card.y).toBeGreaterThan(box.y);
      expect(card.y + card.height).toBeLessThan(box.y + box.height);
    }
  });

  // Mutation: stand every lane of a shelf as many rows as its tallest, as the shared grid did, and
  // the data lane's frame runs down beside the entry lane's empty.
  test('each lane is a frame sized to what it holds, ending at its own last row', () => {
    const nodes = [
      ...Array.from({ length: 19 }, (_, i) => ({ id: `e${i}`, lane: 'entry' })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `d${i}`, lane: 'data' })),
    ];
    const layout = layoutGraph({ bands: BANDS, nodes, edges: [], open: allOpen, room: WIDE_ROOM }, METRICS);
    const entry = layout.laneById.get('entry')!;
    const data = layout.laneById.get('data')!;
    expect(entry.band).toBe(data.band);
    const pitch = METRICS.cardHeight + METRICS.rowGap;
    for (const lane of [entry, data]) {
      const lastRow = Math.max(...lane.items.map((key) => layout.itemByKey.get(key)!.row));
      const lastBottom = layout.grid.bandRowsTop[lane.band]! + lastRow * pitch + METRICS.cardHeight;
      expect(lane.panel.y + lane.panel.height).toBeCloseTo(lastBottom + METRICS.lanePad, 6);
    }
    expect(data.panel.height).toBeLessThan(entry.panel.height);
  });

  test('a lane stands in at least the columns it asks for, and the pack gives it more where that fits the room', () => {
    const nodes = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, lane: 'services' }));
    const asked = layoutGraph(
      { bands: BANDS, nodes, edges: [], open: allOpen, laneColumns: new Map([['services', 3]]) },
      METRICS,
    );
    expect(asked.laneById.get('services')!.span).toBeGreaterThanOrEqual(3);
    // A wide, short room lays twelve services out wide; a tall, narrow one stacks them.
    const wide = layoutGraph({ bands: BANDS, nodes, edges: [], open: allOpen, room: { width: 2400, height: 500 } }, METRICS);
    const tall = layoutGraph({ bands: BANDS, nodes, edges: [], open: allOpen, room: { width: 500, height: 2400 } }, METRICS);
    expect(wide.laneById.get('services')!.span).toBeGreaterThan(tall.laneById.get('services')!.span);
    expect(wide.laneById.get('services')!.rows).toBeLessThan(tall.laneById.get('services')!.rows);
  });

  test('entries that name a column stand in it, each column centred on the tallest', () => {
    const nodes = [
      { id: 'web', lane: 'services', column: 0 },
      { id: 'checkout', lane: 'services', column: 1 },
      { id: 'search', lane: 'services', column: 1 },
      { id: 'notify', lane: 'services', column: 1 },
      { id: 'billing', lane: 'services', column: 2 },
      { id: 'orders', lane: 'services', column: 9 },
    ];
    const layout = layoutGraph(
      {
        bands: BANDS,
        nodes,
        edges: [],
        open: allOpen,
        laneColumns: new Map([['services', 3]]),
        // A tall room, where the pack gives the lane no column more than it asks for.
        room: { width: 1200, height: 2400 },
      },
      METRICS,
    );
    const services = layout.laneById.get('services')!;
    expect(services.span).toBe(3);
    const at = (id: string) => {
      const item = layout.itemByKey.get(graphItemKey('node', id))!;
      return [item.col - services.col, item.row];
    };
    // One entry beside three stands on the middle row.
    expect(at('web')).toEqual([0, 1]);
    expect(['checkout', 'search', 'notify'].map((id) => at(id)[0])).toEqual([1, 1, 1]);
    expect(['checkout', 'search', 'notify'].map((id) => at(id)[1]).sort()).toEqual([0, 1, 2]);
    // A column past the lane's last is its last.
    expect(at('billing')[0]).toBe(2);
    expect(at('orders')[0]).toBe(2);
    expect(services.rows).toBe(3);
  });

  test('the edges that order a lane are not the edges drawn, so hiding a line moves no card', () => {
    const map = layeredMap(4, 60);
    const all = layoutGraph({ ...map, open: allOpen }, METRICS);
    const hidden = layoutGraph({ ...map, edges: [], ordering: map.edges, open: allOpen }, METRICS);
    expect(hidden.routes).toHaveLength(0);
    expect(hidden.items.map((item) => [item.key, item.x, item.y])).toEqual(
      all.items.map((item) => [item.key, item.x, item.y]),
    );
  });

  test('a trunk stands for every edge between two lanes of neighbouring bands, with its count', () => {
    const nodes = [
      { id: 'api', lane: 'services' },
      { id: 'jobs', lane: 'services' },
      { id: 'db', lane: 'data' },
      { id: 'repo', lane: 'code' },
      { id: 'monitor', lane: 'observability' },
    ];
    const layout = layoutGraph({ bands: BANDS, nodes, edges: [], open: allOpen }, METRICS);
    const laneOf = (id: string) => nodes.find((node) => node.id === id)?.lane;
    const trunks = graphTrunks(
      layout,
      [
        { id: 'a', from: 'api', to: 'repo' },
        { id: 'b', from: 'jobs', to: 'repo' },
        // Drawn the other way, it is the same pair of lanes.
        { id: 'c', from: 'monitor', to: 'db' },
        // Inside one band there is no trunk.
        { id: 'd', from: 'api', to: 'db' },
      ],
      laneOf,
    );
    expect(trunks.map((trunk) => [trunk.key, trunk.count])).toEqual([
      ['services>code', 2],
      ['data>observability', 1],
    ]);
    for (const trunk of trunks) {
      const upper = layout.laneById.get(trunk.from)!.panel;
      const lower = layout.laneById.get(trunk.to)!.panel;
      // It runs through the gap between the two bands and nowhere else.
      expect(trunk.box.y).toBeGreaterThanOrEqual(upper.y + upper.height - 4);
      expect(trunk.box.y + trunk.box.height).toBeLessThanOrEqual(lower.y + 4);
      expect(trunk.label.y).toBeGreaterThan(upper.y + upper.height);
      expect(trunk.label.y).toBeLessThan(lower.y);
    }
  });

  test('an empty lane keeps the rows its message needs', () => {
    const layout = layoutGraph(
      { bands: BANDS, nodes: [], edges: [], open: allOpen, emptyHeights: new Map([['runtime', 150]]) },
      METRICS,
    );
    const pitch = METRICS.cardHeight + METRICS.rowGap;
    const runtime = layout.itemByKey.get(graphItemKey('empty', 'runtime'))!;
    expect(runtime.rows).toBe(Math.ceil((150 + METRICS.rowGap) / pitch));
    expect(runtime.height).toBeGreaterThanOrEqual(150);
    expect(layout.itemByKey.get(graphItemKey('empty', 'entry'))!.rows).toBe(1);
    // Every lane is still drawn, each with its one message.
    expect(layout.items.filter((item) => item.kind === 'empty')).toHaveLength(LANES.length);
  });

  test('the ordering sweeps cross fewer edges than the order the caller gave', () => {
    let before = 0;
    let after = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const map = layeredMap(seed, 60);
      after += crossings(layoutGraph({ ...map, open: allOpen }, METRICS).routes);
      before += crossings(unswept({ ...map, open: allOpen }).routes);
    }
    // The fixtures' own figures, so an ordering that draws worse maps is seen.
    expect(before).toBe(1983);
    expect(after).toBeLessThanOrEqual(913);
  });

  test('the same input gives the same map', () => {
    const map = randomMap(42, 120);
    const a = layoutGraph({ ...map, open: (id) => id.endsWith('g0') }, METRICS);
    const b = layoutGraph({ ...map, open: (id) => id.endsWith('g0') }, METRICS);
    expect(b.items).toEqual(a.items);
    expect(b.routes.map((route) => route.d)).toEqual(a.routes.map((route) => route.d));
  });

  test('a repeated id or an unknown lane is refused, naming it', () => {
    expect(() =>
      layoutGraph({ bands: BANDS, nodes: [{ id: 'x', lane: 'nowhere' }], edges: [], open: allOpen }, METRICS),
    ).toThrow(/unknown lane "nowhere"/);
    expect(() =>
      layoutGraph(
        {
          bands: BANDS,
          nodes: [
            { id: 'x', lane: 'data' },
            { id: 'x', lane: 'data' },
          ],
          edges: [],
          open: allOpen,
        },
        METRICS,
      ),
    ).toThrow(/"x" is listed twice/);
    expect(() =>
      layoutGraph(
        {
          bands: BANDS,
          nodes: [{ id: 'x', lane: 'data', group: 'aws' }],
          groups: [{ id: 'aws', lane: 'runtime' }],
          edges: [],
          open: allOpen,
        },
        METRICS,
      ),
    ).toThrow(/not in lane "data"/);
  });

  test('two thousand entries lay out in bounded time', () => {
    const map = randomMap(2026, 2000, 1.5);
    const started = performance.now();
    const layout = layoutGraph({ ...map, open: allOpen }, METRICS);
    const took = performance.now() - started;
    expect(layout.items.filter((item) => item.kind === 'node')).toHaveLength(2000);
    // About 150 ms on a laptop under jsdom; the bound is loose for a shared CI runner.
    expect(took).toBeLessThan(1500);
  });

  test('edges a selection reveals are routed over the placed map', () => {
    const map = randomMap(3, 30);
    const layout = layoutGraph({ ...map, open: allOpen }, METRICS);
    const extra = [{ id: 'x', from: map.nodes[0]!.id, to: map.nodes[1]!.id }];
    const routes = routeGraphEdges(layout, extra);
    expect(routes).toHaveLength(1);
    expect(routes[0]!.edges).toEqual(['x']);
  });
});

/** The layout with the ordering sweeps undone: the caller's order, routed the same way. */
function unswept(input: GraphLayoutInput): GraphLayout {
  // A map whose entries carry no edges is never reordered, so the edges are
  // routed over the caller's order by laying out without them first.
  const placed = layoutGraph({ ...input, edges: [] }, METRICS);
  return { ...placed, routes: routeGraphEdges(placed, input.edges) };
}

/** The atlas's three rows of lanes, and the reference company's counts in them. */
const ATLAS_BANDS: GraphLayoutBand[] = [
  { id: 'request', titled: false, lanes: ['entry', 'services', 'data'] },
  { id: 'under', titled: false, lanes: ['runtime', 'platforms'] },
  { id: 'around', titled: false, lanes: ['code', 'observability', 'tools'] },
];
const ATLAS_COUNTS: Record<string, number> = {
  entry: 19,
  services: 11,
  data: 3,
  runtime: 3,
  platforms: 9,
  code: 17,
  observability: 11,
  tools: 8,
};
function atlasMap(): Omit<GraphLayoutInput, 'open'> {
  const nodes = Object.entries(ATLAS_COUNTS).flatMap(([lane, count]) =>
    Array.from({ length: count }, (_, i) => ({ id: `${lane}-${i}`, lane })),
  );
  return { bands: ATLAS_BANDS, nodes, edges: [] };
}
const READING: GraphReading = { cardsZoom: 0.5, tilesZoom: 0.3, cardName: 13, tileName: 10 };

/** How many names a layout leaves whole at its fit, read as [GraphReading] says. */
function wholeNames(layout: GraphLayout, widths: ReadonlyMap<string, number>): number {
  const k = Math.min(1, layout.fit);
  if (k < READING.tilesZoom) return 0;
  const grown = Math.max(1, READING.tileName / (READING.cardName * k));
  const bare = METRICS.cardBare!;
  return layout.items.filter((item) => {
    if (item.kind !== 'node') return false;
    const tall = item.height > METRICS.cardHeight + 0.5;
    const lines = tall && (k >= READING.cardsZoom || graphTileLines(k, item.height, READING.tileName) === 2) ? 1.8 : 1;
    return (widths.get(item.key)! - bare) * grown <= (item.width - bare) * lines + 0.5;
  }).length;
}

describe('the pack', () => {
  // THE FIT EACH ROOM THE ATLAS IS READ IN GIVES THE REFERENCE COMPANY, at no
  // less than these floors (the figures measured, less a twentieth). Mutation:
  // give every lane its fewest columns, as one shared grid did, and the wide
  // rooms fall under their floors.
  test.each([
    ['1920 by 860', { width: 1626, height: 494 }, 0.477],
    ['1440 by 900', { width: 1146, height: 494 }, 0.418],
    ['1024 by 768', { width: 730, height: 502 }, 0.334],
    ['390 by 844', { width: 350, height: 457 }, 0.208],
  ])('the reference company fits a %s window at least as large as its floor', (_, room, floor) => {
    const layout = layoutGraph({ ...atlasMap(), open: allOpen, room }, METRICS);
    expect(layout.fit).toBeGreaterThanOrEqual(floor);
    const view = fitView(layout.bounds, room, CANVAS_FIT_PADDING, 0);
    expect(view.k).toBeCloseTo(Math.min(1, layout.fit), 6);
    // Nothing is outside the canvas at the fit.
    for (const lane of layout.lanes) {
      expect(lane.panel.x * view.k + view.x).toBeGreaterThanOrEqual(-0.5);
      expect(lane.panel.y * view.k + view.y).toBeGreaterThanOrEqual(-0.5);
      expect((lane.panel.x + lane.panel.width) * view.k + view.x).toBeLessThanOrEqual(room.width + 0.5);
      expect((lane.panel.y + lane.panel.height) * view.k + view.y).toBeLessThanOrEqual(room.height + 0.5);
    }
  });

  // Mutation: never split a band, and the tall room fits the map no larger than the wide
  // room's arrangement does.
  test('a band stands on several shelves only where that fits the room better, and the map still reads in order', () => {
    const wide = layoutGraph({ ...atlasMap(), open: allOpen, room: { width: 1626, height: 494 } }, METRICS);
    expect(wide.bands.map((band) => band.source)).toEqual([0, 1, 2]);
    const room = { width: 300, height: 900 };
    const tall = layoutGraph({ ...atlasMap(), open: allOpen, room }, METRICS);
    expect(tall.bands.length).toBeGreaterThan(3);
    expect(tall.fit).toBeGreaterThan(fitView(wide.bounds, room, CANVAS_FIT_PADDING, 0).k * GRAPH_SPLIT_GAIN);
    for (const layout of [wide, tall]) {
      // Shelf by shelf and left to right is the caller's order of bands and lanes.
      expect(layout.lanes.map((lane) => lane.id)).toEqual(ATLAS_BANDS.flatMap((band) => band.lanes));
      expect(layout.lanes.map((lane) => lane.source)).toEqual([0, 0, 0, 1, 1, 2, 2, 2]);
    }
  });

  test('a lane sizes its cards to its widest name between the bounds, and a longer name takes two lines', () => {
    const nodes = [
      { id: 'short', lane: 'data' },
      { id: 'shorter', lane: 'data' },
      { id: 'mid', lane: 'services' },
      { id: 'long', lane: 'entry' },
      { id: 'longer', lane: 'entry' },
    ];
    const widths = new Map([
      [graphItemKey('node', 'short'), 120],
      [graphItemKey('node', 'shorter'), 100],
      [graphItemKey('node', 'mid'), 250],
      [graphItemKey('node', 'long'), 300],
      [graphItemKey('node', 'longer'), 500],
    ]);
    const layout = layoutGraph({ bands: ATLAS_BANDS, nodes, edges: [], open: allOpen, itemWidths: widths, room: WIDE_ROOM }, METRICS);
    const card = (id: string) => layout.itemByKey.get(graphItemKey('node', id))!;
    expect(card('short').width).toBe(METRICS.cardMinWidth);
    expect(card('mid').width).toBe(250);
    expect(card('long').width).toBe(METRICS.cardMaxWidth);
    expect(card('longer').height).toBe(METRICS.cardTallHeight);
    // A shelf's cards are one height, so its rows stay one grid.
    expect(card('short').height).toBe(METRICS.cardTallHeight);
  });

  // Mutation: keep the first style rather than the one that leaves the most
  // names whole, and the wide cards' names are cut at the fit.
  test('cards are styled for the most names whole at the fit', () => {
    const map = atlasMap();
    // Names a little past a card at its standard width: two lines of it read them where the widest
    // cards, the first style tried, cost the fit too much to.
    const widths = new Map(
      map.nodes.map((node, i) => [graphItemKey('node', node.id), 150 + ((i * 37) % 100)] as const),
    );
    const room = { width: 1626, height: 494 };
    const styled = layoutGraph({ ...map, open: allOpen, room, itemWidths: widths, reading: READING }, METRICS);
    const narrow = layoutGraph(
      { ...map, open: allOpen, room, itemWidths: widths },
      { ...METRICS, cardMaxWidth: METRICS.cardWidth },
    );
    const wide = layoutGraph({ ...map, open: allOpen, room, itemWidths: widths }, METRICS);
    expect(wholeNames(styled, widths)).toBeGreaterThanOrEqual(wholeNames(narrow, widths));
    expect(wholeNames(styled, widths)).toBeGreaterThan(wholeNames(wide, widths));
    expect(wholeNames(styled, widths)).toBeGreaterThan(map.nodes.length / 2);
  });

  // Mutation: drop the corner from the pack, and the lane at the top right of
  // the map is drawn under the zoom bar.
  test.each([
    ['1920 by 860', { width: 1626, height: 494 }],
    ['1440 by 900', { width: 1146, height: 494 }],
    ['1024 by 768', { width: 730, height: 502 }],
  ])('the corner a bar covers stays clear at the fit of a %s window', (_, room) => {
    const corner = { width: 186, height: 48, at: 'top' as const };
    const layout = layoutGraph({ ...atlasMap(), open: allOpen, room, corner }, METRICS);
    const view = fitView(layout.bounds, room, CANVAS_FIT_PADDING, 0);
    const bar = { x: room.width - corner.width, y: 0, width: corner.width, height: corner.height };
    for (const lane of layout.lanes) {
      const drawn = {
        x: lane.panel.x * view.k + view.x,
        y: lane.panel.y * view.k + view.y,
        width: lane.panel.width * view.k,
        height: lane.panel.height * view.k,
      };
      expect(overlaps(drawn, bar), `${lane.id} under the bar`).toBe(false);
    }
  });

  // Mutation: size the frames for titles at full size, and a narrow lane's
  // title, held at its size on screen, is cut at the fit.
  test('a lane is never narrower than its title at the fit', () => {
    const titles = new Map(ATLAS_BANDS.flatMap((band) => band.lanes).map((lane) => [lane, 180] as const));
    for (const room of [{ width: 1626, height: 494 }, { width: 730, height: 502 }]) {
      const layout = layoutGraph({ ...atlasMap(), open: allOpen, room, titleWidths: titles }, METRICS);
      const k = Math.min(1, layout.fit);
      for (const lane of layout.lanes) expect(lane.head.width * k, lane.id).toBeGreaterThanOrEqual(180 - 0.5);
    }
  });
});

describe('placeTrunkLabels', () => {
  /** A trunk across a gap from y 100 to 132, its level run at 116. */
  const trunk = (key: string, x1: number, x2: number, count = 1): GraphTrunk => ({
    key,
    from: 'upper',
    to: 'lower',
    count,
    d: '',
    label: { x: (x1 + x2) / 2, y: 116 },
    run: { x1, x2, y: 116, top: 100, bottom: 132 },
    box: { x: Math.min(x1, x2), y: 100, width: Math.abs(x2 - x1), height: 32 },
  });
  const size = { width: 60, height: 18 };
  const boxOf = (at: { x: number; y: number }) => ({ x: at.x - 30, y: at.y - 9, width: 60, height: 18 });
  const meet = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  test('a count with nothing in its way is written at the middle of its run', () => {
    const at = placeTrunkLabels([trunk('a', 200, 400)], new Map([['a', size]]), []);
    expect(at.get('a')).toEqual({ x: 300, y: 116 });
  });

  // Mutation: place every count at its middle and the two leaving one cluster sit on each other.
  test('two trunks leaving one cluster write their counts apart, the larger first', () => {
    // Their middles stand 60 apart, as wide as one count.
    const at = placeTrunkLabels(
      [trunk('a', 300, 240), trunk('b', 300, 360, 6)],
      new Map([
        ['a', size],
        ['b', size],
      ]),
      [],
    );
    const a = at.get('a')!;
    const b = at.get('b')!;
    expect(b).toEqual({ x: 330, y: 116 });
    expect(a).toEqual({ x: 255, y: 116 });
    expect(meet(boxOf(a), boxOf(b))).toBe(false);
  });

  // Mutation: place the larger count first whatever its run, and the long run
  // takes the only place the straight trunk had.
  test('a trunk that drops straight down is placed before a longer run takes its place', () => {
    const at = placeTrunkLabels(
      [trunk('long', 200, 440, 6), trunk('straight', 300, 300, 3)],
      new Map([
        ['long', size],
        ['straight', size],
      ]),
      [],
    );
    expect(at.get('straight')).toEqual({ x: 300, y: 116 });
    const long = at.get('long')!;
    expect(long).not.toBeNull();
    expect(meet(boxOf(long), boxOf(at.get('straight')!))).toBe(false);
  });

  // Mutation: try counts only along their runs, and of two trunks that cross
  // (sharing one short run) the second is not written.
  test('two trunks that cross write both counts, one just past the end of the shared run', () => {
    const at = placeTrunkLabels(
      [trunk('down-right', 605, 709, 3), trunk('down-left', 709, 605, 6)],
      new Map([
        ['down-right', size],
        ['down-left', size],
      ]),
      [],
    );
    const a = at.get('down-right');
    const b = at.get('down-left');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(meet(boxOf(a!), boxOf(b!))).toBe(false);
  });

  // Mutation: drop the titles from what is in the way and the count stands on the lower cluster's title.
  test('a count never covers a title or a card, moving along its run or hanging from the upper cluster', () => {
    const title = { x: 250, y: 123, width: 140, height: 18 };
    const at = placeTrunkLabels([trunk('a', 300, 300)], new Map([['a', size]]), [title]);
    const placed = at.get('a')!;
    expect(placed).toEqual({ x: 300, y: 110 });
    expect(meet(boxOf(placed), title)).toBe(false);
  });

  test('a count with nowhere clear is not written', () => {
    const wide = { x: 0, y: 90, width: 1000, height: 60 };
    const at = placeTrunkLabels([trunk('a', 200, 400)], new Map([['a', size]]), [wide]);
    expect(at.get('a')).toBeNull();
  });
});

describe('graphStep', () => {
  const layout = layoutGraph(
    {
      bands: BANDS,
      nodes: [
        { id: 'site', lane: 'entry' },
        // One column named, so the two stand one over the other.
        { id: 'api', lane: 'services', column: 0 },
        { id: 'jobs', lane: 'services', column: 0 },
        { id: 'web', lane: 'runtime', group: 'aws' },
        { id: 'repo', lane: 'code' },
      ],
      groups: [{ id: 'aws', lane: 'runtime' }],
      edges: [],
      open: allOpen,
      room: WIDE_ROOM,
    },
    METRICS,
  );
  const node = (id: string) => graphItemKey('node', id);

  test('Up and Down walk a lane, Left and Right cross to the nearest item beside', () => {
    expect(graphStep(layout, node('api'), { key: 'ArrowDown' })).toBe(node('jobs'));
    expect(graphStep(layout, node('jobs'), { key: 'ArrowUp' })).toBe(node('api'));
    expect(graphStep(layout, node('api'), { key: 'ArrowLeft' })).toBe(node('site'));
    expect(graphStep(layout, node('jobs'), { key: 'ArrowRight' })).toBe(node('web'));
    // An empty lane is a stop, so its message is read.
    expect(graphStep(layout, node('web'), { key: 'ArrowRight' })).toBe(graphItemKey('empty', 'data'));
  });

  test('in a lane of several columns the arrows move the way they point', () => {
    const wide = layoutGraph(
      {
        bands: BANDS,
        nodes: [
          { id: 'site', lane: 'entry' },
          { id: 'a', lane: 'services', column: 0 },
          { id: 'b', lane: 'services', column: 0 },
          { id: 'c', lane: 'services', column: 1 },
          { id: 'd', lane: 'services', column: 1 },
          { id: 'db', lane: 'data' },
        ],
        edges: [],
        open: allOpen,
        laneColumns: new Map([['services', 2]]),
        room: WIDE_ROOM,
      },
      METRICS,
    );
    expect(graphStep(wide, node('a'), { key: 'ArrowDown' })).toBe(node('b'));
    expect(graphStep(wide, node('a'), { key: 'ArrowRight' })).toBe(node('c'));
    expect(graphStep(wide, node('b'), { key: 'ArrowRight' })).toBe(node('d'));
    expect(graphStep(wide, node('d'), { key: 'ArrowLeft' })).toBe(node('b'));
    expect(graphStep(wide, node('d'), { key: 'ArrowUp' })).toBe(node('c'));
    // Past the lane's last column, the lane beside.
    expect(graphStep(wide, node('c'), { key: 'ArrowRight' })).toBe(graphItemKey('empty', 'runtime'));
    expect(graphStep(wide, node('a'), { key: 'ArrowLeft' })).toBe(node('site'));
  });

  test('a group header is a stop of its own, and the walk crosses into the band below and back', () => {
    expect(graphStep(layout, node('web'), { key: 'ArrowUp' })).toBe(graphItemKey('head', 'aws'));
    expect(graphStep(layout, node('site'), { key: 'ArrowDown' })).toBe(node('repo'));
    expect(graphStep(layout, node('repo'), { key: 'ArrowUp' })).toBe(node('site'));
  });

  // Mutation: walk to the next lane of the shelf, as the walk did when a band was one row, and the
  // last lane of a shelf is a dead end.
  test('a band split over shelves walks on from the end of one shelf to the next lane of its band', () => {
    const narrow = layoutGraph(
      {
        bands: BANDS,
        nodes: LANES.map((lane) => ({ id: lane, lane })),
        edges: [],
        open: allOpen,
        room: { width: 360, height: 1400 },
      },
      METRICS,
    );
    const request = narrow.lanes.filter((lane) => lane.source === 0);
    expect(new Set(request.map((lane) => lane.band)).size).toBeGreaterThan(1);
    for (let i = 0; i + 1 < request.length; i++) {
      expect(graphStep(narrow, request[i]!.items[0]!, { key: 'ArrowRight' })).toBe(request[i + 1]!.items[0]);
      expect(graphStep(narrow, request[i + 1]!.items[0]!, { key: 'ArrowLeft' })).toBe(request[i]!.items[0]);
    }
  });

  test('Home and End go to a lane ends, and with Control to the map ends; a key the walk has no use for is not its', () => {
    expect(graphStep(layout, node('jobs'), { key: 'Home' })).toBe(node('api'));
    expect(graphStep(layout, node('api'), { key: 'End' })).toBe(node('jobs'));
    expect(graphStep(layout, node('jobs'), { key: 'Home', ctrlKey: true })).toBe(node('site'));
    expect(graphStep(layout, node('site'), { key: 'End', metaKey: true })).toBe(graphItemKey('empty', 'tools'));
    expect(graphStep(layout, node('site'), { key: 'ArrowLeft' })).toBeNull();
    expect(graphStep(layout, node('site'), { key: 'x' })).toBeUndefined();
  });

  test('the walk reaches every item from the first', () => {
    const map = randomMap(11, 80);
    const big = layoutGraph({ ...map, open: (id) => !id.endsWith('g1') }, METRICS);
    const seen = new Set<string>();
    const queue = [big.lanes[0]!.items[0]!];
    while (queue.length > 0) {
      const key = queue.pop()!;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const press of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
        const next = graphStep(big, key, { key: press });
        if (next) queue.push(next);
      }
    }
    expect(seen.size).toBe(big.items.length);
  });
});

describe('graphReach', () => {
  const edges: GraphLayoutEdge[] = [
    { id: 'web>api', from: 'web', to: 'api' },
    { id: 'api>db', from: 'api', to: 'db' },
    { id: 'jobs>db', from: 'jobs', to: 'db' },
    { id: 'db>disk', from: 'db', to: 'disk' },
    { id: 'api>web', from: 'api', to: 'web' },
  ];

  test('up is what depends on the start, with each entry at its shortest distance', () => {
    const up = graphReach(edges, 'db', 'up', Infinity);
    expect(Object.fromEntries(up.nodes)).toEqual({ db: 0, api: 1, jobs: 1, web: 2 });
    expect([...up.edges].sort()).toEqual(['api>db', 'api>web', 'jobs>db', 'web>api']);
  });

  test('the hop limit stops the walk, and down and both go the other way and both ways', () => {
    expect([...graphReach(edges, 'db', 'up', 1).nodes.keys()].sort()).toEqual(['api', 'db', 'jobs']);
    expect([...graphReach(edges, 'api', 'down', 1).nodes.keys()].sort()).toEqual(['api', 'db', 'web']);
    expect([...graphReach(edges, 'db', 'both', 1).nodes.keys()].sort()).toEqual(['api', 'db', 'disk', 'jobs']);
  });

  test('a neighbourhood is one hop either way', () => {
    const near = graphNeighbourhood(edges, 'db');
    expect([...near.nodes.keys()].sort()).toEqual(['api', 'db', 'disk', 'jobs']);
    expect([...near.edges].sort()).toEqual(['api>db', 'db>disk', 'jobs>db']);
  });
});
