/**
 * The tidy tree's promises, over hand built cases and random forests.
 *
 * The properties are what a reader of the chart relies on: no card is drawn
 * over another, a parent sits over its children, children hang from their
 * parent's bottom, the order given is the order drawn, and the same input
 * always draws the same chart. The random forests come from a seeded PRNG in
 * this file, and a failure names its seed so the case can be replayed.
 *
 * Ported from the engine dashboard's `ui/tidytree.test.ts`.
 */

import { describe, expect, test } from 'vitest';
import {
  layoutConnectors,
  layoutForest,
  placeGroups,
  type ForestLayout,
  type LayoutGaps,
  type LayoutGroup,
  type LayoutNode,
  type PlacedNode,
} from './layout.js';

const EPS = 1e-6;

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

function box(id: string, width: number, height: number, children: LayoutNode[] = []): LayoutNode {
  return { id, width, height, children };
}

/** A random forest: 1 to 3 roots, fan out shrinking with depth, sizes like real cards. */
function forest(seed: number): { roots: LayoutNode[]; gaps: LayoutGaps } {
  const random = prng(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  let next = 0;
  const grow = (depth: number): LayoutNode => {
    const fanout = depth >= 5 ? 0 : int(0, Math.max(0, 4 - depth));
    return box(
      `n${next++}`,
      int(40, 320),
      // Unit cards stack their seats, so heights vary far more than widths.
      int(1, 400),
      Array.from({ length: fanout }, () => grow(depth + 1)),
    );
  };
  const roots = Array.from({ length: int(1, 3) }, () => grow(0));
  return { roots, gaps: { gapX: int(0, 40), gapY: int(0, 60) } };
}

function all(roots: readonly LayoutNode[]): LayoutNode[] {
  return roots.flatMap((root) => [root, ...all(root.children)]);
}

function mirrorTree(node: LayoutNode): LayoutNode {
  return { ...node, children: [...node.children].reverse().map(mirrorTree) };
}

/** Every broken promise in one layout, as sentences. */
function violations(roots: LayoutNode[], gaps: LayoutGaps, layout: ForestLayout): string[] {
  const out: string[] = [];
  const input = all(roots);
  if (layout.nodes.length !== input.length) out.push(`${layout.nodes.length} placed of ${input.length}`);
  for (const node of input) {
    const placed = layout.byId.get(node.id);
    if (!placed) {
      out.push(`${node.id} was not placed`);
      continue;
    }
    if (placed.width !== node.width || placed.height !== node.height) out.push(`${node.id} changed size`);
    if (node.children.length > 0) {
      const kids = node.children.map((child) => layout.byId.get(child.id)!);
      const centre = (one: PlacedNode) => one.x + one.width / 2;
      const middle = (centre(kids[0]!) + centre(kids[kids.length - 1]!)) / 2;
      if (Math.abs(centre(placed) - middle) > EPS) out.push(`${node.id} is not centred over its children`);
      for (const kid of kids) {
        if (Math.abs(kid.y - (placed.y + placed.height + gaps.gapY)) > EPS) {
          out.push(`${kid.id} does not hang from ${node.id}'s bottom`);
        }
        if (kid.parent !== node.id || kid.depth !== placed.depth + 1) out.push(`${kid.id} lost its parent`);
      }
      for (let i = 1; i < kids.length; i++) {
        if (centre(kids[i]!) <= centre(kids[i - 1]!)) out.push(`${kids[i]!.id} is out of order`);
      }
    }
  }
  for (const root of roots) {
    if (layout.byId.get(root.id)!.y !== 0) out.push(`root ${root.id} is not at the top`);
  }
  // No two boxes that share any height are closer than gapX.
  const placed = layout.nodes;
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]!;
      const b = placed[j]!;
      const shared = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (shared <= EPS) continue;
      const apart = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
      if (apart < gaps.gapX - EPS) out.push(`${a.id} and ${b.id} are ${apart} apart`);
    }
  }
  const { bounds } = layout;
  const minX = Math.min(...placed.map((one) => one.x));
  if (Math.abs(minX) > EPS) out.push(`the forest starts at x ${minX}`);
  for (const one of placed) {
    if (one.x + one.width > bounds.width + EPS || one.y + one.height > bounds.height + EPS) {
      out.push(`${one.id} is outside the bounds`);
    }
  }
  return out;
}

describe('hand built cases', () => {
  test('two children under a parent, parent centred, children at its bottom plus the gap', () => {
    const layout = layoutForest([box('r', 100, 50, [box('a', 100, 50), box('b', 100, 50)])], {
      gapX: 20,
      gapY: 10,
    });
    expect(layout.byId.get('a')).toMatchObject({ x: 0, y: 60 });
    expect(layout.byId.get('b')).toMatchObject({ x: 120, y: 60 });
    expect(layout.byId.get('r')).toMatchObject({ x: 60, y: 0 });
    expect(layout.bounds).toEqual({ x: 0, y: 0, width: 220, height: 110 });
  });

  test('a tall card pushes a wide grandchild in the next subtree clear, which a per depth contour would not', () => {
    // A is a unit card 300 tall. B is short, and its child C (at depth two)
    // sits beside A's lower half. Compared only depth by depth, C would be
    // drawn over A.
    const gaps = { gapX: 10, gapY: 10 };
    const layout = layoutForest(
      [box('root', 60, 20, [box('A', 100, 300), box('B', 100, 50, [box('C', 300, 50)])])],
      gaps,
    );
    const a = layout.byId.get('A')!;
    const c = layout.byId.get('C')!;
    expect(c.x).toBeGreaterThanOrEqual(a.x + a.width + gaps.gapX - EPS);
  });

  test('a small subtree between two large ones is spread evenly, not packed against its left', () => {
    const wide = (id: string) => box(id, 40, 40, [box(`${id}1`, 200, 40), box(`${id}2`, 200, 40)]);
    const layout = layoutForest([box('r', 40, 40, [wide('L'), box('m', 40, 40), wide('R')])], {
      gapX: 20,
      gapY: 20,
    });
    const centre = (id: string) => layout.byId.get(id)!.x + layout.byId.get(id)!.width / 2;
    expect(centre('m') - centre('L')).toBeCloseTo(centre('R') - centre('m'));
  });

  test('a neighbour is kept clear of the connector bar between a parent and its children', () => {
    // P is short with two children far apart, so the bar joining them runs
    // well past P's own edges through the gap below it. Q is just tall enough
    // to reach into that gap and no further.
    const gaps = { gapX: 10, gapY: 60 };
    const layout = layoutForest(
      [box('root', 40, 20, [box('P', 40, 20, [box('P1', 200, 40), box('P2', 200, 40)]), box('Q', 40, 50)])],
      gaps,
    );
    const p2 = layout.byId.get('P2')!;
    const q = layout.byId.get('Q')!;
    expect(q.x).toBeGreaterThanOrEqual(p2.x + p2.width / 2 + gaps.gapX - EPS);
  });

  test('zero height boxes in one row are still kept apart', () => {
    const layout = layoutForest([box('a', 50, 0), box('b', 50, 0)], { gapX: 8, gapY: 0 });
    expect(layout.byId.get('b')!.x - (layout.byId.get('a')!.x + 50)).toBeCloseTo(8);

    // The case that needs it: zero height parents whose narrow children would
    // otherwise be the only thing the outline knows about.
    const parents = layoutForest(
      [box('p', 50, 0, [box('p1', 10, 10)]), box('q', 50, 0, [box('q1', 10, 10)])],
      { gapX: 8, gapY: 0 },
    );
    expect(parents.byId.get('q')!.x - (parents.byId.get('p')!.x + 50)).toBeGreaterThanOrEqual(8 - EPS);
  });

  test('an empty forest has empty bounds', () => {
    expect(layoutForest([], { gapX: 1, gapY: 1 })).toEqual({
      nodes: [],
      byId: new Map(),
      groups: [],
      ranks: 'per-parent',
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    });
  });

  test('invalid input is refused with the id that caused it', () => {
    expect(() => layoutForest([box('x', 10, 10), box('x', 10, 10)], { gapX: 0, gapY: 0 })).toThrow(
      /"x" appears twice/,
    );
    expect(() => layoutForest([box('nan', Number.NaN, 10)], { gapX: 0, gapY: 0 })).toThrow(/"nan"/);
    expect(() => layoutForest([box('a', 10, 10)], { gapX: -1, gapY: 0 })).toThrow(/gapX, gapY and margin/);
  });
});

describe('properties over random forests', () => {
  const SEEDS = Array.from({ length: 250 }, (_, i) => 0x5eed + i);

  test('no overlap, centred parents, hanging children, input order, bounds at the origin', () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const { roots, gaps } = forest(seed);
      const found = violations(roots, gaps, layoutForest(roots, gaps));
      if (found.length) failures.push(`seed ${seed}: ${found.slice(0, 3).join('; ')}`);
    }
    expect(failures).toEqual([]);
  });

  test('the same input always draws the same chart', () => {
    const failures: string[] = [];
    for (const seed of SEEDS.slice(0, 50)) {
      const { roots, gaps } = forest(seed);
      if (
        JSON.stringify(layoutForest(roots, gaps).nodes) !== JSON.stringify(layoutForest(roots, gaps).nodes)
      ) {
        failures.push(`seed ${seed}`);
      }
    }
    expect(failures).toEqual([]);
  });

  test('a mirrored forest draws as the mirror image', () => {
    const failures: string[] = [];
    for (const seed of SEEDS.slice(0, 100)) {
      const { roots, gaps } = forest(seed);
      const plain = layoutForest(roots, gaps);
      const flipped = layoutForest([...roots].reverse().map(mirrorTree), gaps);
      const width = plain.bounds.width;
      for (const node of plain.nodes) {
        const mirrored = flipped.byId.get(node.id)!;
        if (Math.abs(mirrored.x - (width - node.x - node.width)) > 1e-6 || mirrored.y !== node.y) {
          failures.push(`seed ${seed}: ${node.id}`);
          break;
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('connectors', () => {
  test('one path per parented box, from the bottom centre above to the top centre below', () => {
    const layout = layoutForest([box('r', 100, 50, [box('a', 100, 50), box('b', 100, 50)])], {
      gapX: 20,
      gapY: 10,
    });
    const paths = layoutConnectors(layout);
    expect(paths).toHaveLength(2);
    // r spans x 60 to 160 and ends at y 50; a spans x 0 to 100 and starts at 60.
    // The gap is 10, so each corner is clamped to half of it: a quarter
    // circle of 5 into the run and another out of it.
    expect(paths[0]).toEqual({ id: 'a', parent: 'r', d: 'M110 50V50A5 5 0 0 1 105 55H55A5 5 0 0 0 50 60V60' });
    expect(paths[1]).toEqual({ id: 'b', parent: 'r', d: 'M110 50V50A5 5 0 0 0 115 55H165A5 5 0 0 1 170 60V60' });
  });

  /* The softer drawing this chart had before the elbow, still one ask away. */
  test('the step shape turns in quadratics of its own, larger radius', () => {
    const layout = layoutForest([box('r', 100, 50, [box('a', 100, 50), box('b', 100, 50)])], {
      gapX: 20,
      gapY: 10,
    });
    expect(layoutConnectors(layout, 'step').map((one) => one.d)).toEqual([
      'M110 50V50Q110 55,105 55H55Q50 55,50 60V60',
      'M110 50V50Q110 55,115 55H165Q170 55,170 60V60',
    ]);
    const deep = layoutForest([box('r', 40, 20, [box('a', 200, 40), box('b', 200, 40)])], { gapX: 20, gapY: 60 });
    for (const { d } of layoutConnectors(deep, 'step')) {
      const across = /H([\d.-]+)Q([\d.-]+) /.exec(d)!;
      expect(Math.abs(Number(across[1]) - Number(across[2]))).toBeCloseTo(12, 5);
    }
  });

  /* A dense chart's drawing: one segment, and nothing shared between siblings. */
  test('the straight shape is one segment from the bottom centre to the top centre', () => {
    const layout = layoutForest([box('r', 100, 50, [box('a', 100, 50), box('b', 100, 50)])], {
      gapX: 20,
      gapY: 10,
    });
    expect(layoutConnectors(layout, 'straight').map((one) => one.d)).toEqual([
      'M110 50L50 60',
      'M110 50L170 60',
    ]);
  });

  /*
   * A CONNECTOR NAMES THE CHILD IT ARRIVES AT, so a chart that tints a node can
   * tint the line into it. Without the id the caller has only an index into an
   * array whose order is the layout's, which is the pre-order of the forest and
   * not anything a caller states.
   */
  test('each connector names the box it arrives at and the box it leaves', () => {
    const layout = layoutForest([box('r', 100, 50, [box('a', 100, 50, [box('a1', 100, 50)])])], {
      gapX: 20,
      gapY: 10,
    });
    expect(layoutConnectors(layout).map((one) => [one.parent, one.id])).toEqual([
      ['r', 'a'],
      ['a', 'a1'],
    ]);
  });

  /*
   * THE DROP INTO EACH CHILD IS VERTICAL however far to the side it is, which
   * is what keeps a connector reading as a branch rather than as a line passing
   * under the parent. A subtree is as wide as everything under it, so the
   * horizontal distance grows without bound while the vertical gap stays one
   * rank: the shape has to hold at 400 across and 100 down, which is where a
   * single cubic through the middle of the gap stopped holding.
   */
  test('the branch turns near the child, and drops into it vertically', () => {
    const layout = layoutForest([box('r', 40, 20, [box('a', 200, 40), box('b', 200, 40)])], {
      gapX: 20,
      gapY: 60,
    });
    const paths = layoutConnectors(layout);
    expect(paths).toHaveLength(2);
    for (const { d } of paths) {
      // Down, a corner, across, a corner, down: the verticals at each end are
      // what a square step had and a curve through the gap did not.
      expect(d).toMatch(/^M[\d.-]+ [\d.-]+V[\d.-]+A.+H[\d.-]+A.+V[\d.-]+$/);
      // The horizontal run stops a corner short of the child's centre, so the
      // turn belongs to this child rather than to the run its siblings share;
      // and the corner is the design's 6, the `--radius-sm` step.
      const across = /H([\d.-]+)A6 6 0 0 [01] ([\d.-]+) /.exec(d)!;
      expect(across).not.toBeNull();
      expect(Math.abs(Number(across[1]) - Number(across[2]))).toBeCloseTo(6, 5);
    }
  });

  /*
   * THE OTHER SHAPE, which the console's org chart draws: one cubic from the
   * parent's bottom to the child's top, both control points on the middle of
   * the gap. The tangents at each end are vertical, which is what the step
   * shape spends two corners on, and the cost is the one the function's own
   * doc states: at 400 across and 100 down the curve is mostly a horizontal
   * run through the middle of the gap.
   */
  test('the curve shape is a single cubic with both handles in the gap', () => {
    const layout = layoutForest([box('r', 100, 50, [box('a', 100, 50), box('b', 100, 50)])], {
      gapX: 20,
      gapY: 10,
    });
    const paths = layoutConnectors(layout, 'curve');
    expect(paths.map((one) => one.d)).toEqual([
      'M 110 50 C 110 55, 50 55, 50 60',
      'M 110 50 C 110 55, 170 55, 170 60',
    ]);
  });

  /* Not even the case the step shape draws as a bare vertical: a cubic whose
     handles sit on one vertical IS that line, so the shape stays one rule. */
  test('the curve shape draws a child centred under its parent as one cubic too', () => {
    const layout = layoutForest([box('r', 100, 50, [box('a', 100, 50)])], { gapX: 20, gapY: 10 });
    expect(layoutConnectors(layout, 'curve').map((one) => one.d)).toEqual([
      'M 50 50 C 50 55, 50 55, 50 60',
    ]);
  });

  /* A child centred under its parent has no corner to draw, and two arcs there
     would cancel each other out into a kink. */
  test('a child directly below its parent takes a straight line', () => {
    const layout = layoutForest([box('r', 100, 50, [box('a', 100, 50)])], { gapX: 20, gapY: 10 });
    expect(layoutConnectors(layout).map((one) => one.d)).toEqual(['M50 50V60']);
  });

  test('a forest of roots draws no connector at all', () => {
    expect(layoutConnectors(layoutForest([box('a', 10, 10), box('b', 10, 10)], { gapX: 4, gapY: 4 }))).toEqual(
      [],
    );
  });
});

/*
 * SHARED RANKS: the org chart drawing, where a depth is a row a reader scans
 * across. The promises are different from the tidy one's and each of them is
 * something the console's chart relies on, so they are checked over the same
 * random forests rather than over one hand built case.
 */
function rankViolations(roots: LayoutNode[], gaps: LayoutGaps, layout: ForestLayout): string[] {
  const out: string[] = [];
  const margin = gaps.margin ?? 0;
  const byDepth = new Map<number, PlacedNode[]>();
  for (const node of layout.nodes) {
    const rank = byDepth.get(node.depth) ?? [];
    rank.push(node);
    byDepth.set(node.depth, rank);
  }
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const top = (depth: number) => Math.min(...byDepth.get(depth)!.map((one) => one.y));
  const tall = (depth: number) => Math.max(...byDepth.get(depth)!.map((one) => one.height));
  for (const depth of depths) {
    const band = byDepth.get(depth)!;
    // Centred in the band: one middle line for the whole rank.
    const middle = band[0]!.y + band[0]!.height / 2;
    for (const one of band) {
      if (Math.abs(one.y + one.height / 2 - middle) > EPS) out.push(`${one.id} is off its rank's line`);
    }
    // Neighbours on one rank, gapX clear.
    const across = [...band].sort((a, b) => a.x - b.x);
    for (let i = 1; i < across.length; i++) {
      const apart = across[i]!.x - (across[i - 1]!.x + across[i - 1]!.width);
      if (apart < gaps.gapX - EPS) out.push(`${across[i]!.id} is ${apart} from ${across[i - 1]!.id}`);
    }
  }
  for (let i = 1; i < depths.length; i++) {
    const above = top(depths[i - 1]!) + tall(depths[i - 1]!);
    if (Math.abs(top(depths[i]!) - (above + gaps.gapY)) > EPS) {
      out.push(`rank ${depths[i]} does not start a gap below rank ${depths[i - 1]}`);
    }
  }
  for (const node of all(roots)) {
    const placed = layout.byId.get(node.id);
    if (!placed) {
      out.push(`${node.id} was not placed`);
      continue;
    }
    if (node.children.length === 0) continue;
    const kids = node.children.map((child) => layout.byId.get(child.id)!);
    const centre = (one: PlacedNode) => one.x + one.width / 2;
    const middle = (centre(kids[0]!) + centre(kids[kids.length - 1]!)) / 2;
    if (Math.abs(centre(placed) - middle) > EPS) out.push(`${node.id} is not centred over its children`);
    for (let i = 1; i < kids.length; i++) {
      if (centre(kids[i]!) <= centre(kids[i - 1]!)) out.push(`${kids[i]!.id} is out of order`);
    }
  }
  const minX = Math.min(...layout.nodes.map((one) => one.x));
  const minY = Math.min(...layout.nodes.map((one) => one.y));
  if (Math.abs(minX - margin) > EPS) out.push(`the forest starts at x ${minX}, not the margin`);
  if (Math.abs(minY - margin) > EPS) out.push(`the forest starts at y ${minY}, not the margin`);
  const maxX = Math.max(...layout.nodes.map((one) => one.x + one.width));
  const maxY = Math.max(...layout.nodes.map((one) => one.y + one.height));
  if (Math.abs(layout.bounds.width - (maxX + margin)) > EPS) out.push('the bounds lost the right margin');
  if (Math.abs(layout.bounds.height - (maxY + margin)) > EPS) out.push('the bounds lost the bottom margin');
  return out;
}

describe('shared ranks', () => {
  test('every box of a depth sits on one band, as tall as the tallest box in it', () => {
    const layout = layoutForest(
      [box('r', 100, 40, [box('a', 100, 40), box('b', 100, 80, [box('c', 100, 40)])])],
      { gapX: 20, gapY: 30, ranks: 'shared' },
    );
    // Rank 0 is 40 tall, rank 1 is 80 (b sets it), rank 2 is 40.
    expect(layout.byId.get('r')!.y).toBe(0);
    // a is 40 in an 80 band, so it is centred: 70 + 20.
    expect(layout.byId.get('a')!.y).toBe(90);
    expect(layout.byId.get('b')!.y).toBe(70);
    expect(layout.byId.get('c')!.y).toBe(180);
  });

  test("a short box's children do NOT ride up beside a tall neighbour's", () => {
    const roots = [box('r', 100, 40, [box('tall', 100, 200, [box('t1', 100, 40)]), box('short', 100, 40, [box('s1', 100, 40)])])];
    const perParent = layoutForest(roots, { gapX: 20, gapY: 30 });
    const shared = layoutForest(roots, { gapX: 20, gapY: 30, ranks: 'shared' });
    expect(perParent.byId.get('s1')!.y).toBeLessThan(perParent.byId.get('t1')!.y);
    expect(shared.byId.get('s1')!.y).toBe(shared.byId.get('t1')!.y);
  });

  test('separation is per rank, so a subtree may reach under a taller neighbour', () => {
    // `short`'s own child is on rank 2, and `tall` is on rank 1: they share no
    // rank, so nothing holds them apart and the child spreads under `tall`.
    // The tidy layout separates by vertical EXTENT, where `tall` reaches down
    // beside that child and pushes the whole subtree clear of it, which is the
    // same organization drawn much wider.
    const roots = [
      box('r', 60, 20, [box('tall', 60, 300), box('short', 60, 20, [box('s1', 200, 20)])]),
    ];
    const gaps: LayoutGaps = { gapX: 10, gapY: 10 };
    const shared = layoutForest(roots, { ...gaps, ranks: 'shared' });
    const tidy = layoutForest(roots, gaps);
    const reach = (layout: ForestLayout) => layout.byId.get('tall')!.x + 60;
    expect(shared.byId.get('s1')!.x).toBeLessThan(reach(shared));
    expect(tidy.byId.get('s1')!.x).toBeGreaterThanOrEqual(reach(tidy));
    expect(shared.bounds.width).toBeLessThan(tidy.bounds.width);
  });

  test('the margin is kept on all four sides and is part of the bounds', () => {
    const plain = layoutForest([box('r', 100, 40, [box('a', 100, 40)])], { gapX: 20, gapY: 30 });
    const inset = layoutForest([box('r', 100, 40, [box('a', 100, 40)])], {
      gapX: 20,
      gapY: 30,
      margin: 36,
    });
    expect(inset.byId.get('r')!.x).toBe(plain.byId.get('r')!.x + 36);
    expect(inset.byId.get('r')!.y).toBe(plain.byId.get('r')!.y + 36);
    expect(inset.bounds).toEqual({
      x: 0,
      y: 0,
      width: plain.bounds.width + 72,
      height: plain.bounds.height + 72,
    });
  });

  test('one line per rank, one gap between ranks, nothing closer than gapX on a rank', () => {
    const failures: string[] = [];
    for (const seed of SEEDS_SHARED) {
      const { roots, gaps } = forest(seed);
      const ranked: LayoutGaps = { ...gaps, ranks: 'shared', margin: seed % 5 === 0 ? 36 : 0 };
      const found = rankViolations(roots, ranked, layoutForest(roots, ranked));
      if (found.length) failures.push(`seed ${seed}: ${found.slice(0, 3).join('; ')}`);
    }
    expect(failures).toEqual([]);
  });

  test('a margin and a rank mode are refused when they are not a size or a name', () => {
    expect(() => layoutForest([box('r', 10, 10)], { gapX: 0, gapY: 0, margin: -1 })).toThrow(/margin/);
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the refusal is the point
      layoutForest([box('r', 10, 10)], { gapX: 0, gapY: 0, ranks: 'byDepth' as any }),
    ).toThrow(/per-parent/);
  });
});

const SEEDS_SHARED = Array.from({ length: 250 }, (_, i) => 0x5eed + i);

/*
 * THE ELBOW IS ORTHOGONAL: every straight piece of it is vertical or
 * horizontal, and every turn is a quarter circle whose centre is INSIDE the
 * turn, which is what makes it a rounded corner rather than a bulge. Read as
 * the drawing it is, piece by piece, rather than matched as a string: a path
 * with a diagonal in it, a corner turning the wrong way or a turn of the wrong
 * size is named by what it is.
 */
interface Point {
  x: number;
  y: number;
}

function elbowFaults(d: string, from: Point, to: Point): string[] {
  const faults: string[] = [];
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  if (tokens[i++] !== 'M') return [`${d} does not start with a move`];
  let at: Point = { x: num(), y: num() };
  if (Math.abs(at.x - from.x) > EPS || Math.abs(at.y - from.y) > EPS) faults.push(`${d} does not leave the parent's bottom centre`);
  /** Which way the line is travelling: down out of the parent, to start with. */
  let heading: 'v' | 'h' = 'v';
  while (i < tokens.length) {
    const command = tokens[i++]!;
    if (command === 'V') {
      at = { x: at.x, y: num() };
      heading = 'v';
    } else if (command === 'H') {
      at = { x: num(), y: at.y };
      heading = 'h';
    } else if (command === 'A') {
      const rx = num();
      const ry = num();
      const rotation = num();
      const large = num();
      const sweep = num();
      const end = { x: num(), y: num() };
      if (rx !== ry || rotation !== 0 || large !== 0) faults.push(`${d}: a corner that is not a quarter circle`);
      if (Math.abs(Math.abs(end.x - at.x) - rx) > EPS || Math.abs(Math.abs(end.y - at.y) - rx) > EPS) {
        faults.push(`${d}: a corner that does not turn by its own radius`);
      }
      // The centre is inside the turn: level with the start when arriving
      // vertically, above or below it when arriving horizontally.
      const centre = heading === 'v' ? { x: end.x, y: at.y } : { x: at.x, y: end.y };
      const cross = (at.x - centre.x) * (end.y - centre.y) - (at.y - centre.y) * (end.x - centre.x);
      // In SVG's y-down space a positive cross product is the clockwise sweep.
      if (rx > 0 && (cross > 0 ? 1 : 0) !== sweep) faults.push(`${d}: a corner that bulges out of its turn`);
      heading = heading === 'v' ? 'h' : 'v';
      at = end;
    } else {
      faults.push(`${d}: a ${command} piece, which is not vertical, horizontal or a corner`);
      break;
    }
  }
  if (Math.abs(at.x - to.x) > EPS || Math.abs(at.y - to.y) > EPS) faults.push(`${d} does not arrive at the child's top centre`);
  if (heading !== 'v') faults.push(`${d} does not arrive vertically`);
  return faults;
}

/** The run across a parent's children, as its height and its two ends, or null for a bare drop. */
function runOf(d: string): { y: number; from: number; to: number } | null {
  const run = /A[\d.]+ [\d.]+ 0 0 [01] (-?[\d.]+) (-?[\d.]+)H(-?[\d.]+)/.exec(d);
  if (!run) return null;
  return { y: Number(run[2]), from: Number(run[1]), to: Number(run[3]) };
}

/** Random runs of siblings for a random forest, some of them, with random insets. */
function groupsFor(roots: readonly LayoutNode[], seed: number): LayoutGroup[] {
  const random = prng(seed ^ 0x9e3779b9);
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const groups: LayoutGroup[] = [];
  const consider = (siblings: readonly LayoutNode[]) => {
    if (siblings.length > 0 && random() < 0.6) {
      const first = int(0, siblings.length - 1);
      const last = int(first, siblings.length - 1);
      groups.push({
        id: `g${groups.length}`,
        // In reverse: the order members are named in is not the order drawn.
        members: siblings.slice(first, last + 1).map((one) => one.id).reverse(),
        inset: { x: int(0, 16), top: int(0, 40), bottom: int(0, 16) },
      });
    }
    siblings.forEach((one) => consider(one.children));
  };
  consider(roots);
  return groups;
}

/** Every broken promise a layout's groups make, as sentences. */
function groupViolations(gaps: LayoutGaps, layout: ForestLayout): string[] {
  const out: string[] = [];
  const groups = layout.groups ?? [];
  const byId = new Map(groups.map((one) => [one.id, one]));
  const apart = (a: { x: number; width: number }, b: { x: number; width: number }) =>
    Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
  const share = (a: { y: number; height: number }, b: { y: number; height: number }) =>
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > EPS;
  for (const group of gaps.groups ?? []) {
    const placed = byId.get(group.id);
    if (!placed) {
      out.push(`${group.id} was not placed`);
      continue;
    }
    // EXACTLY its members' bounds plus its inset: not a pixel more or less.
    const members = group.members.map((id) => layout.byId.get(id)!);
    const left = Math.min(...members.map((one) => one.x));
    const top = Math.min(...members.map((one) => one.y));
    const right = Math.max(...members.map((one) => one.x + one.width));
    const bottom = Math.max(...members.map((one) => one.y + one.height));
    const want = {
      x: left - group.inset.x,
      y: top - group.inset.top,
      width: right - left + 2 * group.inset.x,
      height: bottom - top + group.inset.top + group.inset.bottom,
    };
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      if (Math.abs(placed[key] - want[key]) > EPS) out.push(`${group.id}'s ${key} is ${placed[key]}, not ${want[key]}`);
    }
    // No box outside it is drawn in it, or nearer than a gap beside it.
    const inside = new Set(group.members);
    for (const node of layout.nodes) {
      if (inside.has(node.id) || !share(node, placed)) continue;
      const gap = apart(node, placed);
      if (gap < gaps.gapX - EPS) out.push(`${node.id} is ${gap} from ${group.id}`);
    }
    // Nor is another box.
    for (const other of groups) {
      if (other.id <= group.id || !share(other, placed)) continue;
      const gap = apart(other, placed);
      if (gap < gaps.gapX - EPS) out.push(`${other.id} is ${gap} from ${group.id}`);
    }
    const margin = gaps.margin ?? 0;
    if (placed.x < margin - EPS || placed.y < margin - EPS) out.push(`${group.id} is inside the margin`);
    if (placed.x + placed.width > layout.bounds.width - margin + EPS) out.push(`${group.id} is outside the bounds`);
    if (placed.y + placed.height > layout.bounds.height - margin + EPS) out.push(`${group.id} is below the bounds`);
  }
  // A RUN ACROSS crosses no box and no group: it is drawn in space that is clear.
  for (const { d, id } of layoutConnectors(layout)) {
    const run = runOf(d);
    if (!run) continue;
    const lo = Math.min(run.from, run.to);
    const hi = Math.max(run.from, run.to);
    for (const one of [...layout.nodes, ...groups]) {
      if (run.y > one.y + EPS && run.y < one.y + one.height - EPS && hi > one.x + EPS && lo < one.x + one.width - EPS) {
        out.push(`the run into ${id} crosses ${one.id}`);
      }
    }
  }
  return out;
}

describe('the elbow', () => {
  const SEEDS = Array.from({ length: 150 }, (_, i) => 0xe1b0 + i);

  test('every connector is orthogonal: no diagonal piece, and every corner a quarter circle turning its way', () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const { roots, gaps } = forest(seed);
      for (const ranks of ['per-parent', 'shared'] as const) {
        const groups = seed % 2 === 0 ? groupsFor(roots, seed) : [];
        const layout = layoutForest(roots, { ...gaps, ranks, groups });
        for (const { id, parent, d } of layoutConnectors(layout)) {
          const up = layout.byId.get(parent)!;
          const down = layout.byId.get(id)!;
          const found = elbowFaults(
            d,
            { x: up.x + up.width / 2, y: up.y + up.height },
            { x: down.x + down.width / 2, y: down.y },
          );
          if (found.length) failures.push(`seed ${seed} ${ranks}: ${found[0]}`);
        }
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });

  /*
   * THE BUG A SHARED RANK MADE. A short parent is centred in a band as tall as
   * its tallest neighbour, and its children's row may reach under that
   * neighbour: a run halfway between the short parent's own bottom and its
   * children was inside the parent's rank, and ran straight through the
   * neighbour's card. Between the ranks it crosses nothing.
   */
  test("on shared ranks a run is drawn between the ranks, never through a neighbour's card", () => {
    const roots = [
      box('root', 60, 20, [box('P', 60, 20, [box('p1', 200, 20), box('p2', 200, 20)]), box('T', 60, 200)]),
    ];
    const layout = layoutForest(roots, { gapX: 10, gapY: 40, ranks: 'shared' });
    expect(groupViolations({ gapX: 10, gapY: 40 }, layout)).toEqual([]);
    const tall = layout.byId.get('T')!;
    for (const { d, parent } of layoutConnectors(layout)) {
      if (parent !== 'P') continue;
      // Halfway through the gap below the tallest card on P's rank.
      expect(runOf(d)!.y).toBeCloseTo(tall.y + tall.height + 20, 6);
    }
  });
});

describe('groups', () => {
  const inset = { x: 8, top: 20, bottom: 6 };

  test("a group box encloses exactly its members' bounds plus its inset", () => {
    const layout = layoutForest(
      [box('r', 100, 40, [box('a', 100, 40), box('b', 100, 60), box('c', 100, 40)])],
      { gapX: 10, gapY: 30, groups: [{ id: 'unit', members: ['b', 'a'], inset }] },
    );
    const [a, b, c] = ['a', 'b', 'c'].map((id) => layout.byId.get(id)!);
    expect(layout.groups).toEqual([
      {
        id: 'unit',
        members: ['b', 'a'],
        inset,
        x: a!.x - 8,
        y: a!.y - 20,
        width: b!.x + 100 - a!.x + 16,
        height: 60 + 26,
      },
    ]);
    // Two members are a gap apart; a card outside the box is a gap from the BOX.
    expect(b!.x - (a!.x + 100)).toBeCloseTo(10, 6);
    const unit = layout.groups![0]!;
    expect(c!.x - (unit.x + unit.width)).toBeCloseTo(10, 6);
    // The header is above the rank: the children hang the gap plus the header
    // below their parent.
    expect(a!.y).toBe(40 + 30 + 20);
  });

  test('the space round a box is part of the chart, and a box of roots keeps its header above them', () => {
    const layout = layoutForest([box('a', 50, 20), box('b', 50, 20)], {
      gapX: 10,
      gapY: 10,
      margin: 4,
      groups: [{ id: 'g', members: ['a', 'b'], inset }],
    });
    expect(layout.groups![0]).toMatchObject({ x: 4, y: 4 });
    expect(layout.bounds).toEqual({ x: 0, y: 0, width: 4 + 8 + 110 + 8 + 4, height: 4 + 20 + 20 + 6 + 4 });
  });

  /*
   * A SHORT MEMBER'S CHILDREN HANG BELOW ITS BOX, not below itself: the box is
   * as tall as its tallest member, and children started under a short one
   * would be drawn inside it.
   */
  test("a short member's children start below the box, not below the member", () => {
    const layout = layoutForest(
      [box('r', 40, 20, [box('a', 60, 20, [box('a1', 60, 20)]), box('b', 60, 100)])],
      { gapX: 10, gapY: 30, groups: [{ id: 'g', members: ['a', 'b'], inset }] },
    );
    const group = layout.groups![0]!;
    expect(layout.byId.get('a1')!.y).toBe(group.y + group.height + 30);
  });

  test("the run into a box's members is drawn halfway through the space above it", () => {
    for (const ranks of ['per-parent', 'shared'] as const) {
      const layout = layoutForest(
        [box('r', 100, 40, [box('a', 100, 40), box('b', 100, 40)])],
        { gapX: 10, gapY: 30, ranks, groups: [{ id: 'g', members: ['a', 'b'], inset }] },
      );
      const top = layout.groups![0]!.y;
      for (const { d } of layoutConnectors(layout)) expect(runOf(d)!.y).toBeCloseTo((40 + top) / 2, 6);
    }
  });

  test('on shared ranks a box keeps its header above its whole rank', () => {
    const layout = layoutForest(
      [box('r', 40, 20, [box('a', 60, 20), box('b', 60, 20, [box('b1', 60, 20)])])],
      { gapX: 10, gapY: 30, ranks: 'shared', groups: [{ id: 'g', members: ['b1'], inset }] },
    );
    // Rank 2 starts after rank 1, its gap and the header rank 2's box keeps.
    expect(layout.byId.get('b1')!.y).toBe(20 + 30 + 20 + 30 + 20);
  });

  test('a box travels with its members: it is recomputed from where they are drawn', () => {
    const layout = layoutForest([box('r', 40, 20, [box('a', 60, 20), box('b', 60, 20)])], {
      gapX: 10,
      gapY: 30,
      groups: [{ id: 'g', members: ['a', 'b'], inset }],
    });
    const moved = new Map([...layout.byId].map(([id, one]) => [id, { ...one, x: one.x + 7, y: one.y + 3 }]));
    const [was] = layout.groups!;
    expect(placeGroups(moved, layout.groups!)[0]).toEqual({ ...was, x: was!.x + 7, y: was!.y + 3 });
  });

  test('a group that is not a run of siblings is refused by name', () => {
    const roots = [box('r', 10, 10, [box('a', 10, 10, [box('a1', 10, 10)]), box('b', 10, 10), box('c', 10, 10)])];
    const refuse = (groups: LayoutGroup[]) => () => layoutForest(roots, { gapX: 1, gapY: 1, groups });
    expect(refuse([{ id: 'g', members: ['a', 'a1'], inset }])).toThrow(/"g" holds boxes of different parents/);
    expect(refuse([{ id: 'g', members: ['a', 'c'], inset }])).toThrow(/"g" skips a sibling/);
    expect(refuse([{ id: 'g', members: ['x'], inset }])).toThrow(/"g" names "x"/);
    expect(refuse([{ id: 'g', members: [], inset }])).toThrow(/"g" has no members/);
    expect(
      refuse([
        { id: 'g', members: ['a'], inset },
        { id: 'h', members: ['a', 'b'], inset },
      ]),
    ).toThrow(/"a" is in the group "g" and in "h"/);
    expect(
      refuse([
        { id: 'g', members: ['a'], inset },
        { id: 'g', members: ['b'], inset },
      ]),
    ).toThrow(/the group "g" appears twice/);
    expect(refuse([{ id: 'g', members: ['a'], inset: { x: -1, top: 0, bottom: 0 } }])).toThrow(/"g" has the inset/);
  });

  test('a forest with no groups is laid out exactly as it was', () => {
    for (const seed of Array.from({ length: 30 }, (_, i) => 0x9a0 + i)) {
      const { roots, gaps } = forest(seed);
      expect(layoutForest(roots, { ...gaps, groups: [] }).nodes).toEqual(layoutForest(roots, gaps).nodes);
    }
  });

  test('over random forests: exact boxes, nothing drawn in or beside a box it is not in, runs in clear space', () => {
    const failures: string[] = [];
    for (const seed of Array.from({ length: 250 }, (_, i) => 0x6a0 + i)) {
      const { roots, gaps } = forest(seed);
      for (const ranks of ['per-parent', 'shared'] as const) {
        const grouped: LayoutGaps = { ...gaps, ranks, groups: groupsFor(roots, seed), margin: seed % 3 === 0 ? 12 : 0 };
        const layout = layoutForest(roots, grouped);
        const found = groupViolations(grouped, layout);
        // And every promise the chart made without groups, bar the ones a
        // header or a box's padding is meant to move.
        const plain = (ranks === 'shared' ? rankViolations(roots, grouped, layout) : violations(roots, grouped, layout)).filter(
          (one) => !/hang|start a gap|at the top|starts at y|bottom margin|right margin|starts at x|outside the bounds/.test(one),
        );
        if (found.length || plain.length) failures.push(`seed ${seed} ${ranks}: ${[...found, ...plain].slice(0, 3).join('; ')}`);
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });
});
