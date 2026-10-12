/**
 * Regions of the plane bounded by straight edges: the union of some polygons
 * less the union of others, returned as the closed rings that bound it.
 *
 * WHY THE CHARACTERS NEED IT. A character is drawn from parts that overlap (a
 * leg under a body, a lobe over a lobe), with a face and holes cut out of it.
 * Cut with an SVG mask, a hole was paint: a mask's black is a fill, and a
 * host's stylesheet repaints a fill. OrgLabel's and AddPill's icon zones set
 * `fill: currentColor` on every path and group in them, which filled each eye
 * with a share of the ink that changed with the hue and the theme. Cut here, a
 * hole is geometry, a ring wound against the outline round it, and no
 * stylesheet can fill it. The keyline is a ring in the same way.
 *
 * HOW. The plane is cut into horizontal slabs at every vertex and at every
 * crossing of two edges, so no two edges cross inside a slab. In each slab the
 * edges are swept left to right with a winding count per set, and the spans
 * where the first set winds and the second does not are the region. Each
 * span's sides, and each horizontal step between the spans of two slabs, are
 * the boundary, directed so the region lies on its right. Chained end to end
 * they close into rings: an outline runs clockwise on screen and a hole
 * counter-clockwise, so either fill rule draws them.
 *
 * NO CASE ANALYSIS of touching or collinear edges is needed, which is where
 * clipping algorithms usually fail: an edge two parts share is two edges in
 * one slab whose windings add, and two rings that meet at a point are two
 * spans that touch.
 */

export type Point = readonly [number, number];
export type Ring = readonly Point[];

interface Edge {
  /** Its top end. */
  readonly x0: number;
  readonly y0: number;
  /** Its bottom end. */
  readonly x1: number;
  readonly y1: number;
  /** 1 where its ring runs down the screen, -1 where it runs up. */
  readonly wind: number;
  /** Whether it bounds what is added (true) or what is taken away. */
  readonly add: boolean;
}

/** One span of the region inside a slab: its left and right edge, each at the slab's top and bottom. */
interface Span {
  readonly left: Point;
  readonly right: Point;
}

type Interval = readonly [number, number];
type Segment = readonly [Point, Point];

/** Twice the signed area of a ring: positive for one written clockwise on screen. */
export const twiceArea = (ring: Ring) =>
  ring.reduce((sum, p, i) => {
    const q = ring[(i + 1) % ring.length]!;
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0);

function collect(rings: readonly Ring[], add: boolean, into: Edge[]): void {
  for (const ring of rings) {
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length]!;
      if (p[1] === q[1]) return;
      into.push(
        p[1] < q[1]
          ? { x0: p[0], y0: p[1], x1: q[0], y1: q[1], wind: 1, add }
          : { x0: q[0], y0: q[1], x1: p[0], y1: p[1], wind: -1, add },
      );
    });
  }
}

/*
 * An edge's x at a height. Exact at its own two ends, so two edges meeting at
 * a vertex report the same point there and the boundary chains through it.
 */
const xAt = (e: Edge, y: number) =>
  y === e.y0 ? e.x0 : y === e.y1 ? e.x1 : e.x0 + ((y - e.y0) * (e.x1 - e.x0)) / (e.y1 - e.y0);

/** Every height a slab must start at: each vertex, and each crossing of two edges. Edges come sorted by their top. */
function heights(edges: readonly Edge[]): number[] {
  const ys = new Set<number>();
  for (const e of edges) {
    ys.add(e.y0);
    ys.add(e.y1);
  }
  for (let i = 0; i < edges.length; i += 1) {
    const a = edges[i]!;
    for (let j = i + 1; j < edges.length && edges[j]!.y0 < a.y1; j += 1) {
      const b = edges[j]!;
      const top = Math.max(a.y0, b.y0);
      const bottom = Math.min(a.y1, b.y1);
      if (bottom <= top) continue;
      const above = xAt(a, top) - xAt(b, top);
      const below = xAt(a, bottom) - xAt(b, bottom);
      if (above * below < 0) ys.add(top + ((bottom - top) * above) / (above - below));
    }
  }
  return [...ys].sort((p, q) => p - q);
}

/*
 * One x for every edge that reaches a height at (as near as arithmetic can
 * tell) the same point. Two edges crossing at a slab's edge each compute that
 * crossing for themselves, and the two answers can differ in their last bit:
 * left apart, two spans that touch there would overlap or part by that bit,
 * and the boundary would not close. Every x read at a height goes through
 * here, so neighbouring slabs and touching spans meet exactly.
 */
const SNAP = 1e-9;

function snapper(): (y: number, x: number) => number {
  const seen = new Map<number, number[]>();
  return (y, x) => {
    let xs = seen.get(y);
    if (!xs) seen.set(y, (xs = []));
    for (const known of xs) if (Math.abs(known - x) <= SNAP) return known;
    xs.push(x);
    return x;
  };
}

/*
 * The region's spans in one slab. Every edge on one exact line (two parts
 * sharing an edge) changes its count before the region is read, so a shared
 * edge opens or closes nothing.
 */
function spansOf(active: readonly Edge[], top: number, bottom: number, snap: (y: number, x: number) => number): Span[] {
  const at = active
    .map((e) => ({ e, a: snap(top, xAt(e, top)), b: snap(bottom, xAt(e, bottom)) }))
    .sort((p, q) => p.a + p.b - (q.a + q.b));
  const spans: Span[] = [];
  let added = 0;
  let removed = 0;
  let inside = false;
  let from: Point = [0, 0];
  for (let i = 0; i < at.length; ) {
    const { a, b } = at[i]!;
    for (; i < at.length && at[i]!.a === a && at[i]!.b === b; i += 1) {
      const { e } = at[i]!;
      if (e.add) added += e.wind;
      else removed += e.wind;
    }
    const now = added !== 0 && removed === 0;
    if (now && !inside) from = [a, b];
    else if (!now && inside) spans.push({ left: from, right: [a, b] });
    inside = now;
  }
  return spans;
}

/** The parts of sorted intervals `a` that sorted intervals `b` do not cover. */
function minus(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  let j = 0;
  for (const [start, end] of a) {
    let from = start;
    while (j < b.length && b[j]![1] <= from) j += 1;
    for (let k = j; k < b.length && b[k]![0] < end && from < end; k += 1) {
      const [bStart, bEnd] = b[k]!;
      if (bStart > from) out.push([from, bStart]);
      from = Math.max(from, bEnd);
    }
    if (from < end) out.push([from, end]);
  }
  return out;
}

/** The directed boundary: every span's sides, and every step between the spans of neighbouring slabs. */
function boundaryOf(ys: readonly number[], slabs: readonly Span[][]): Segment[] {
  const out: Segment[] = [];
  slabs.forEach((spans, k) => {
    const top = ys[k]!;
    const bottom = ys[k + 1]!;
    for (const { left, right } of spans) {
      out.push([
        [right[0], top],
        [right[1], bottom],
      ]);
      out.push([
        [left[1], bottom],
        [left[0], top],
      ]);
    }
  });
  ys.forEach((y, k) => {
    // What the slab above covers at its foot, and what the slab below covers at its head.
    const above: Interval[] = k > 0 ? slabs[k - 1]!.map(({ left, right }) => [left[1], right[1]]) : [];
    const below: Interval[] = k < slabs.length ? slabs[k]!.map(({ left, right }) => [left[0], right[0]]) : [];
    for (const [a, b] of minus(below, above)) {
      out.push([
        [a, y],
        [b, y],
      ]);
    }
    for (const [a, b] of minus(above, below)) {
      out.push([
        [b, y],
        [a, y],
      ]);
    }
  });
  return out.filter(([a, b]) => a[0] !== b[0] || a[1] !== b[1]);
}

/*
 * The rings with every vertex that is not a corner taken out: the joins
 * between slabs along one straight edge, the near-coincident points a
 * crossing leaves, and the spike of a sliver no wider than rounding.
 */
const EPSILON = 1e-9;

function simplify(ring: readonly Point[]): Point[] {
  let points = [...ring];
  let changed = true;
  while (changed && points.length >= 3) {
    changed = false;
    const kept: Point[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const prev = kept.length > 0 ? kept[kept.length - 1]! : points[points.length - 1]!;
      const p = points[i]!;
      const next = points[(i + 1) % points.length]!;
      const ux = p[0] - prev[0];
      const uy = p[1] - prev[1];
      const vx = next[0] - p[0];
      const vy = next[1] - p[1];
      const short = Math.hypot(ux, uy) < EPSILON;
      const straight = Math.abs(ux * vy - uy * vx) < EPSILON;
      if (short || straight) {
        changed = true;
        continue;
      }
      kept.push(p);
    }
    points = kept;
  }
  return points;
}

function chain(segments: readonly Segment[]): Point[][] {
  const key = (p: Point) => `${p[0]} ${p[1]}`;
  const from = new Map<string, number[]>();
  segments.forEach(([a], i) => {
    const list = from.get(key(a));
    if (list) list.push(i);
    else from.set(key(a), [i]);
  });
  const used = new Uint8Array(segments.length);
  const rings: Point[][] = [];
  segments.forEach((first, i) => {
    if (used[i]) return;
    const ring: Point[] = [];
    let at: number | undefined = i;
    while (at !== undefined) {
      used[at] = 1;
      const [a, b]: Segment = segments[at]!;
      ring.push(a);
      if (b[0] === first[0][0] && b[1] === first[0][1]) break;
      at = from.get(key(b))?.find((n) => !used[n]);
    }
    rings.push(ring);
  });
  return rings.map(simplify).filter((ring) => ring.length >= 3 && Math.abs(twiceArea(ring)) > EPSILON);
}

/**
 * The region `add` covers and `remove` does not, each set filled by the
 * nonzero rule, as the rings that bound it: each outline clockwise on screen,
 * each hole counter-clockwise.
 */
export function region(add: readonly Ring[], remove: readonly Ring[] = []): Ring[] {
  const edges: Edge[] = [];
  collect(add, true, edges);
  collect(remove, false, edges);
  edges.sort((p, q) => p.y0 - q.y0);
  const ys = heights(edges);
  const snap = snapper();
  const slabs: Span[][] = [];
  let next = 0;
  let active: Edge[] = [];
  for (let k = 0; k + 1 < ys.length; k += 1) {
    const top = ys[k]!;
    const bottom = ys[k + 1]!;
    while (next < edges.length && edges[next]!.y0 <= top) active.push(edges[next++]!);
    active = active.filter((e) => e.y1 > top);
    slabs.push(spansOf(active, top, bottom, snap));
  }
  return chain(boundaryOf(ys, slabs));
}

/** The area a region's rings enclose, holes taken off. */
export const areaOf = (rings: readonly Ring[]) => rings.reduce((sum, ring) => sum + twiceArea(ring), 0) / 2;

/** The centroid of the area a region's rings enclose, holes taken off. */
export function centroidOf(rings: readonly Ring[]): Point {
  let x = 0;
  let y = 0;
  for (const ring of rings) {
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length]!;
      const cross = p[0] * q[1] - q[0] * p[1];
      x += (p[0] + q[0]) * cross;
      y += (p[1] + q[1]) * cross;
    });
  }
  const six = 6 * areaOf(rings);
  return [x / six, y / six];
}

/** A ring turned clockwise on screen, if it was written the other way. */
const clockwise = (ring: Point[]): Ring => (twiceArea(ring) < 0 ? ring.reverse() : ring);

/**
 * The band a stroke `distance` to either side of every edge of some rings
 * covers, its corners mitred as an SVG stroke mitres them (bevelled past the
 * limit), as convex pieces wound one way. Its union with the rings is the
 * rings grown by `distance`, which is how a keyline is measured off an
 * outline.
 */
export function strokeBand(rings: readonly Ring[], distance: number, miterLimit = 4): Ring[] {
  const pieces: Ring[] = [];
  for (const ring of rings) {
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length]!;
      const r = ring[(i + 2) % ring.length]!;
      // The left normal of each edge, which is the outside of a clockwise turn.
      const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const nx = (q[1] - p[1]) / length;
      const ny = -(q[0] - p[0]) / length;
      const onward = Math.hypot(r[0] - q[0], r[1] - q[1]);
      const mx = (r[1] - q[1]) / onward;
      const my = -(r[0] - q[0]) / onward;
      const d = distance;
      pieces.push(
        clockwise([
          [p[0] + nx * d, p[1] + ny * d],
          [q[0] + nx * d, q[1] + ny * d],
          [q[0] - nx * d, q[1] - ny * d],
          [p[0] - nx * d, p[1] - ny * d],
        ]),
      );
      const turn = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
      if (turn === 0) return;
      // The join goes on the outside of the turn: the left of a clockwise one.
      const side = turn > 0 ? 1 : -1;
      const a: Point = [q[0] + side * nx * d, q[1] + side * ny * d];
      const b: Point = [q[0] + side * mx * d, q[1] + side * my * d];
      const sx = nx + mx;
      const sy = ny + my;
      const reach = sx * sx + sy * sy;
      // The mitre's length over the stroke's width is 2 / |n1 + n2|, the ratio miterlimit bounds.
      if (reach > 0 && 2 / Math.sqrt(reach) <= miterLimit) {
        const tip: Point = [q[0] + (side * sx * 2 * d) / reach, q[1] + (side * sy * 2 * d) / reach];
        pieces.push(clockwise([q, a, tip, b]));
      } else {
        pieces.push(clockwise([q, a, b]));
      }
    });
  }
  return pieces;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Rings as one path's data, to two decimals, each closed. */
export function pathOfRings(rings: readonly Ring[]): string {
  return rings
    .map((ring) => {
      const points = ring.map(([x, y]) => `${round(x)} ${round(y)}`).filter((p, i, all) => p !== all[i - 1]);
      return `M${points.join('L')}Z`;
    })
    .join('');
}
