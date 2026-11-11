/**
 * The layered map's layout, routing, walk and reach, without a DOM.
 *
 * What these protect: no two items overlap; every edge has a route that
 * leaves its source and ends at its target's side; no route runs through a
 * card it does not belong to; a closed group folds its members' edges into
 * one card; the ordering sweeps cross fewer edges than the caller's order; the
 * same input gives the same map; the walk reaches every item; and a large map
 * lays out in bounded time. The random maps come from a seeded PRNG, and a
 * failure names its seed.
 */

import { describe, expect, test } from 'vitest';
import {
  graphItemKey,
  layoutGraph,
  routeGraphEdges,
  type GraphLayout,
  type GraphLayoutBand,
  type GraphLayoutEdge,
  type GraphLayoutGroup,
  type GraphLayoutInput,
  type GraphLayoutNode,
  type GraphMetrics,
  type GraphRoute,
} from './layout.js';
import { graphNeighbourhood, graphReach } from './reach.js';
import { graphStep } from './walk.js';

const METRICS: GraphMetrics = {
  cardWidth: 216,
  cardHeight: 52,
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
  test('no two items overlap, over random maps', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const layout = layoutGraph({ ...randomMap(seed, 60), open: (id) => !id.endsWith('g2') }, METRICS);
      for (let i = 0; i < layout.items.length; i++) {
        for (let j = i + 1; j < layout.items.length; j++) {
          const a = layout.items[i]!;
          const b = layout.items[j]!;
          expect(overlaps(a, b), `seed ${seed}: ${a.key} overlaps ${b.key}`).toBe(false);
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

  test('no route runs through a card or a header it does not belong to', () => {
    const through: string[] = [];
    for (let seed = 1; seed <= 25; seed++) {
      const layout = layoutGraph({ ...randomMap(seed, 70), open: (id) => !id.endsWith('g1') }, METRICS);
      for (const route of layout.routes) {
        for (const item of layout.items) {
          if (item.key === route.from || item.key === route.to) continue;
          route.points.slice(1).forEach((point, i) => {
            if (crossesInside(route.points[i]!, point, item))
              through.push(`seed ${seed}: ${route.key} through ${item.key}`);
          });
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

  test('a band with fewer lanes gives its spare columns to its fullest lane, whose cards flow across it', () => {
    const nodes = [
      ...Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, lane: 'code' })),
      ...Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, lane: 'tools' })),
    ];
    const layout = layoutGraph({ bands: BANDS, nodes, edges: [], open: allOpen }, METRICS);
    expect(layout.columns).toBe(5);
    const spans = BANDS[1]!.lanes.map((lane) => layout.laneById.get(lane)!.span);
    // Six tool servers take the first spare column and five repositories the second; the empty lane takes none.
    expect(spans).toEqual([2, 1, 2]);
    const code = layout.items.filter((item) => item.lane === 'code');
    expect(code.map((item) => [item.row, item.col])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ]);
  });

  test('spare columns no lane gains from are shared out evenly', () => {
    const nodes = ['code', 'observability', 'tools'].map((lane) => ({ id: lane, lane }));
    const layout = layoutGraph({ bands: BANDS, nodes, edges: [], open: allOpen }, METRICS);
    expect(BANDS[1]!.lanes.map((lane) => layout.laneById.get(lane)!.span)).toEqual([2, 2, 1]);
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
    expect(before).toBe(2591);
    expect(after).toBeLessThanOrEqual(1547);
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

describe('graphStep', () => {
  const layout = layoutGraph(
    {
      bands: BANDS,
      nodes: [
        { id: 'site', lane: 'entry' },
        { id: 'api', lane: 'services' },
        { id: 'jobs', lane: 'services' },
        { id: 'web', lane: 'runtime', group: 'aws' },
        { id: 'repo', lane: 'code' },
      ],
      groups: [{ id: 'aws', lane: 'runtime' }],
      edges: [],
      open: allOpen,
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

  test('a group header is a stop of its own, and the walk crosses into the band below and back', () => {
    expect(graphStep(layout, node('web'), { key: 'ArrowUp' })).toBe(graphItemKey('head', 'aws'));
    expect(graphStep(layout, node('site'), { key: 'ArrowDown' })).toBe(node('repo'));
    expect(graphStep(layout, node('repo'), { key: 'ArrowUp' })).toBe(node('site'));
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
