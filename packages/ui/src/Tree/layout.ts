/**
 * A tidy layout for a forest of variable size boxes, as a pure function.
 *
 * WHY IT IS HAND WRITTEN. The package ships no layout library: the ones that
 * exist either lay out general graphs (and cost two orders of magnitude more
 * code and time for a tree) or assume every node is the same size, and a unit
 * card that stacks its seats inside it is as tall as its membership. This is
 * the Reingold-Tilford family, sized to that problem.
 *
 * THE RULES IT KEEPS.
 *
 * - SIZES ARE INPUT. Nothing here measures anything: the caller passes each
 *   box's width and height (measured in a browser by `useMeasuredSizes`,
 *   injected in a test), so the layout is deterministic and testable without a
 *   DOM.
 * - CHILDREN SIT AT THEIR PARENT'S BOTTOM PLUS `gapY` (`ranks: 'per-parent'`,
 *   the default), or on a band shared by every box of their depth
 *   (`ranks: 'shared'`). Per-parent is the tidier of the two where cards vary
 *   in height, because a short card's children do not hang a tall neighbour's
 *   height below it; shared is what an ORG CHART looks like, where a rank of
 *   the organization is a row a reader scans across, and it is what the
 *   console's own chart draws. See [LayoutGaps.ranks].
 * - SEPARATION IS BY VERTICAL EXTENT, NOT BY DEPTH. A tall card in one subtree
 *   can sit beside a grandchild in the next, and a contour indexed by depth
 *   would let the two overlap. Each subtree's left and right outline is kept
 *   as a function of y, and a neighbour is placed `gapX` clear of every y they
 *   share, including the band between a parent and its children where the
 *   connector runs. On shared ranks that band carries no constraint, because
 *   nothing is ever drawn between two ranks: a subtree is then held clear of
 *   its neighbour exactly where the two have boxes on one rank, which is the
 *   separation a rank-and-order layout keeps and is why a wide subtree's outer
 *   grandchild may sit under its parent's neighbour.
 * - PARENTS ARE CENTRED over their first and last child.
 * - SIBLINGS ARE PACKED FROM BOTH SIDES AND AVERAGED. Packing only from the
 *   left pushes a small subtree between two large ones against its left
 *   neighbour. Both packings satisfy every separation, the constraints are
 *   linear, so their average does too; the result is also mirror symmetric,
 *   which is what reads as tidy.
 * - A ZERO HEIGHT BOX STILL OCCUPIES ITS ROW, so two of them are never drawn
 *   on top of each other.
 *
 * Coordinates come back with the forest's top left corner at the origin plus
 * `margin`, and boxes in pre-order. The outline merge costs time proportional to a subtree's
 * breakpoints, so a layout is roughly quadratic in the worst case; for the few
 * hundred boxes of an organization chart that is well under a millisecond per
 * hundred nodes, and it runs on a size change, never per frame.
 */

import type { CanvasRect } from '../Canvas/geometry.js';

/** One box to lay out: a size, an id and its children. */
export interface LayoutNode {
  id: string;
  width: number;
  height: number;
  children: readonly LayoutNode[];
}

/**
 * Where a box's top edge sits: under its own parent, or on its depth's band.
 *
 * `per-parent` puts every box `gapY` under its own parent's bottom, so a rank
 * of the chart is not a straight line and a short card's children ride up
 * beside a tall neighbour's. It is the tidier drawing of a forest whose cards
 * vary a lot in height.
 *
 * `shared` gives every depth ONE band, as tall as the tallest box in it, and
 * centres each box in its band; the next band starts `gapY` below. That is
 * what an ORG CHART is: a rank is a row a reader scans across, and two units
 * of one company sit on one line whether or not one of them carries a lead
 * along its bottom edge. It is also what a rank-and-order graph layout
 * produces for a tree, which is what the console's chart is drawn with.
 */
export type LayoutRanks = 'per-parent' | 'shared';

export interface LayoutGaps {
  /** Horizontal space between neighbouring boxes that share any height. */
  gapX: number;
  /**
   * Vertical space between ranks: a box's bottom and its children's tops on
   * `per-parent`, one band's bottom and the next band's top on `shared`.
   */
  gapY: number;
  /** Where a box's top edge sits. Unset, `per-parent`. */
  ranks?: LayoutRanks | undefined;
  /**
   * Space kept on all four sides of the forest.
   *
   * IT IS PART OF THE LAYOUT rather than padding on whatever draws it, because
   * the canvas scrolls and CLIPS: a margin drawn as padding is outside the
   * scrollable content, so the outermost card's halo, its focus ring and the
   * control hanging under it are cut off at the frame at exactly the moment a
   * reader has panned to that card. Unset, none.
   */
  margin?: number | undefined;
}

/** A box where the layout put it. */
export interface PlacedNode extends CanvasRect {
  id: string;
  depth: number;
  parent: string | null;
}

export interface ForestLayout {
  /** Every box, in pre-order. */
  nodes: PlacedNode[];
  byId: Map<string, PlacedNode>;
  /** The forest's extent: always at the origin. */
  bounds: CanvasRect;
}

/** The height a zero height box occupies in an outline: see the module doc. */
const MIN_OUTLINE_HEIGHT = 1;

/** One run of an outline: over `[top, bottom)` the extreme x is `value`. */
interface Segment {
  top: number;
  bottom: number;
  value: number;
}

/** Sorted, non-overlapping segments. */
type Outline = Segment[];

interface Subtree {
  node: LayoutNode;
  kids: Subtree[];
  /** Each child's centre, relative to this box's centre. */
  offsets: number[];
  /** How far below the top of its rank this box sits: zero off shared ranks. */
  inBand: number;
  /** Relative to this box's centre, and to the top of its rank. */
  left: Outline;
  right: Outline;
}

/**
 * Where each depth's band starts and how tall it is, on shared ranks.
 *
 * ONE PASS OVER THE WHOLE FOREST BEFORE ANY BOX IS PLACED, because a band is
 * as tall as the tallest box anywhere at that depth: a unit carrying a lead
 * along its bottom edge sets the height of the rank its leadless siblings are
 * drawn on, three subtrees away.
 */
interface Bands {
  /** The top of each depth's band, from the forest's top. */
  top: number[];
  /** The tallest box at each depth. */
  height: number[];
}

function bandsOf(roots: readonly LayoutNode[], gapY: number): Bands {
  const height: number[] = [];
  const visit = (node: LayoutNode, depth: number) => {
    height[depth] = Math.max(height[depth] ?? 0, node.height);
    node.children.forEach((child) => visit(child, depth + 1));
  };
  roots.forEach((root) => visit(root, 0));
  const top: number[] = [];
  let at = 0;
  for (let depth = 0; depth < height.length; depth++) {
    top[depth] = at;
    at += height[depth]! + gapY;
  }
  return { top, height };
}

function shift(outline: Outline, dx: number, dy: number): Outline {
  return outline.map((s) => ({ top: s.top + dy, bottom: s.bottom + dy, value: s.value + dx }));
}

function mirror(outline: Outline): Outline {
  return outline.map((s) => ({ ...s, value: -s.value }));
}

/** Two outlines as one, taking `pick` of the two values wherever both have one. */
function merge(a: Outline, b: Outline, pick: (x: number, y: number) => number): Outline {
  const cuts = [...new Set([...a, ...b].flatMap((s) => [s.top, s.bottom]))].sort((x, y) => x - y);
  const out: Outline = [];
  let i = 0;
  let j = 0;
  for (let k = 0; k + 1 < cuts.length; k++) {
    const lo = cuts[k]!;
    const hi = cuts[k + 1]!;
    while (i < a.length && a[i]!.bottom <= lo) i++;
    while (j < b.length && b[j]!.bottom <= lo) j++;
    const va = i < a.length && a[i]!.top <= lo ? a[i]!.value : undefined;
    const vb = j < b.length && b[j]!.top <= lo ? b[j]!.value : undefined;
    const value = va !== undefined && vb !== undefined ? pick(va, vb) : (va ?? vb);
    if (value === undefined) continue;
    const last = out[out.length - 1];
    if (last && last.bottom === lo && last.value === value) last.bottom = hi;
    else out.push({ top: lo, bottom: hi, value });
  }
  return out;
}

/** How far right of `right` the outline `left` must start so they are `gap` apart. */
function separation(right: Outline, left: Outline, gap: number): number {
  let need = -Infinity;
  let i = 0;
  for (const s of left) {
    while (i < right.length && right[i]!.bottom <= s.top) i++;
    for (let k = i; k < right.length && right[k]!.top < s.bottom; k++) {
      need = Math.max(need, right[k]!.value - s.value);
    }
  }
  if (Number.isFinite(need)) return need + gap;
  // No shared height at all, which siblings (all starting at the same top)
  // never reach. Keeping the whole extents apart is safe and deterministic.
  const maxRight = right.reduce((m, s) => Math.max(m, s.value), -Infinity);
  const minLeft = left.reduce((m, s) => Math.min(m, s.value), Infinity);
  return maxRight - minLeft + gap;
}

/** Siblings packed left to right, each as close to the previous ones as its outline allows. */
function packFromLeft(kids: readonly { left: Outline; right: Outline }[], gap: number): number[] {
  const positions = [0];
  let reach = kids[0]!.right;
  for (let i = 1; i < kids.length; i++) {
    const at = separation(reach, kids[i]!.left, gap);
    positions.push(at);
    reach = merge(reach, shift(kids[i]!.right, at, 0), Math.max);
  }
  return positions;
}

/** Sibling centres: the average of packing from each side, centred on zero. */
function pack(kids: readonly Subtree[], gap: number): number[] {
  const fromLeft = packFromLeft(kids, gap);
  // Packing from the right is packing the mirror image from the left.
  const mirrored = [...kids].reverse().map((k) => ({ left: mirror(k.right), right: mirror(k.left) }));
  const fromRight = packFromLeft(mirrored, gap)
    .map((p) => -p)
    .reverse();
  const first = fromRight[0]!;
  const averaged = fromLeft.map((p, i) => (p + fromRight[i]! - first) / 2);
  const centre = (averaged[0]! + averaged[averaged.length - 1]!) / 2;
  return averaged.map((p) => p - centre);
}

function build(node: LayoutNode, gaps: LayoutGaps, bands: Bands | null, depth: number): Subtree {
  const kids = node.children.map((child) => build(child, gaps, bands, depth + 1));
  const half = node.width / 2;
  const tall = Math.max(node.height, MIN_OUTLINE_HEIGHT);
  // CENTRED IN ITS BAND, which is what a rank-and-order layout does with a box
  // shorter than the rank it is on: a seat beside a unit that carries a lead
  // reads as one row rather than as two boxes hung from one line.
  const inBand = bands ? (bands.height[depth]! - node.height) / 2 : 0;
  let left: Outline = [{ top: inBand, bottom: inBand + tall, value: -half }];
  let right: Outline = [{ top: inBand, bottom: inBand + tall, value: half }];
  if (kids.length === 0) return { node, kids, offsets: [], inBand, left, right };

  const offsets = pack(kids, gaps.gapX);
  const childTop = bands ? bands.top[depth + 1]! - bands.top[depth]! : node.height + gaps.gapY;
  // THE CONNECTOR BAND: from this box's bottom to its children's tops, as wide
  // as the box or the bar joining the outermost children, whichever is wider.
  // NOT COMPUTED ON SHARED RANKS, where it can constrain nothing: the band is
  // never wider than this box or than the children row below it, and BOTH of
  // those are on ranks of their own, where the same separation is already
  // kept. Two merges a node, over a stretch of chart nothing is drawn in.
  if (!bands && childTop > node.height) {
    const band = (value: number): Outline => [{ top: node.height, bottom: childTop, value }];
    left = merge(left, band(Math.min(-half, offsets[0]!)), Math.min);
    right = merge(right, band(Math.max(half, offsets[offsets.length - 1]!)), Math.max);
  }
  kids.forEach((kid, i) => {
    left = merge(left, shift(kid.left, offsets[i]!, childTop), Math.min);
    right = merge(right, shift(kid.right, offsets[i]!, childTop), Math.max);
  });
  return { node, kids, offsets, inBand, left, right };
}

function validate(roots: readonly LayoutNode[], gaps: LayoutGaps): void {
  const size = (value: number) => Number.isFinite(value) && value >= 0;
  if (!size(gaps.gapX) || !size(gaps.gapY) || !size(gaps.margin ?? 0)) {
    throw new RangeError(
      `layoutForest: gapX, gapY and margin must be finite and non-negative, got ${JSON.stringify(gaps)}`,
    );
  }
  if (gaps.ranks !== undefined && gaps.ranks !== 'per-parent' && gaps.ranks !== 'shared') {
    throw new RangeError(`layoutForest: ranks is "${gaps.ranks}"; it is "per-parent" or "shared"`);
  }
  const seen = new Set<string>();
  const visit = (node: LayoutNode) => {
    if (seen.has(node.id)) {
      throw new RangeError(`layoutForest: the id "${node.id}" appears twice; every box needs its own id`);
    }
    seen.add(node.id);
    if (!size(node.width) || !size(node.height)) {
      throw new RangeError(
        `layoutForest: "${node.id}" is ${node.width} by ${node.height}; a size must be finite and non-negative`,
      );
    }
    node.children.forEach(visit);
  };
  roots.forEach(visit);
}

/** Lays out a forest of measured boxes: see the module doc for the rules. */
export function layoutForest(roots: readonly LayoutNode[], gaps: LayoutGaps): ForestLayout {
  validate(roots, gaps);
  const margin = gaps.margin ?? 0;
  const nodes: PlacedNode[] = [];
  if (roots.length === 0) {
    return { nodes, byId: new Map(), bounds: { x: 0, y: 0, width: 0, height: 0 } };
  }
  const bands = gaps.ranks === 'shared' ? bandsOf(roots, gaps.gapY) : null;
  const trees = roots.map((root) => build(root, gaps, bands, 0));
  const centres = pack(trees, gaps.gapX);

  // `top` is the top of the box's RANK, which off shared ranks is the box's
  // own top: `inBand` is then zero and the two are the same number.
  const place = (tree: Subtree, centre: number, top: number, depth: number, parent: string | null) => {
    const { node } = tree;
    nodes.push({
      id: node.id,
      x: centre - node.width / 2,
      y: top + tree.inBand,
      width: node.width,
      height: node.height,
      depth,
      parent,
    });
    const childTop = bands ? bands.top[depth + 1]! : top + node.height + gaps.gapY;
    tree.kids.forEach((kid, i) => place(kid, centre + tree.offsets[i]!, childTop, depth + 1, node.id));
  };
  trees.forEach((tree, i) => place(tree, centres[i]!, bands ? bands.top[0]! : 0, 0, null));

  // A loop rather than `Math.min(...xs)`: spreading a large array into
  // arguments overflows the call stack long before a layout is slow.
  let minX = Infinity;
  for (const node of nodes) minX = Math.min(minX, node.x);
  let maxX = -Infinity;
  let maxY = 0;
  for (const node of nodes) {
    node.x += margin - minX;
    node.y += margin;
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }
  return {
    nodes,
    byId: new Map(nodes.map((node) => [node.id, node])),
    bounds: { x: 0, y: 0, width: maxX + margin, height: maxY + margin },
  };
}

/**
 * How far a connector's corner is rounded, in layout units.
 *
 * Big enough to read as a curve at a glance and small enough that the vertical
 * leaving the parent and the vertical arriving at the child are both still
 * plainly vertical. It is clamped per connector to half of whichever run it
 * turns out of, so a child directly under its parent and a child one card away
 * both draw a corner that fits.
 */
const CONNECTOR_RADIUS = 12;

/** The two shapes a connector is drawn in: see [layoutConnectors]. */
export type TreeConnectorShape = 'step' | 'curve';

/**
 * One connector: the child it arrives at, the parent it leaves, and the path.
 *
 * IT CARRIES THE CHILD'S ID because a connector can be the child's own colour.
 * A chart that tints a node by what it holds tints the line into it too, or the
 * branch arrives at a tinted card in the chart's neutral ink and reads as
 * somebody else's. The id is the only thing a caller needs to ask its own
 * question about the line, and it costs nothing to the caller that has none.
 */
export interface TreeConnector {
  /** The box the connector arrives at. */
  id: string;
  /** The box it leaves. */
  parent: string;
  /** SVG path data, in layout coordinates. */
  d: string;
}

/**
 * The connector from each box to its parent, as SVG path data: down from the
 * parent's bottom centre and into the child's top centre.
 *
 * TWO SHAPES, AND THE DEFAULT IS THE STEP: down, a rounded corner, across the
 * middle of the gap, another rounded corner, and down into the child. The
 * square step and the single cubic were both tried here first.
 *
 * A SQUARE step reads correctly at any width but meets its own siblings at a
 * right angle on the shared horizontal run, so a parent with four children
 * draws one long line with four corners on it and which corner belongs to
 * which child is read by tracing.
 *
 * A single CUBIC from the parent's bottom to the child's top (`curve`) fixes
 * that when the children sit close together, and loses definition exactly
 * where a chart is widest. A subtree is as wide as everything under it, so the
 * horizontal distance between a parent and an outer child grows without bound
 * while the vertical gap stays one rank; with both control points halfway down
 * that gap, the curve spends most of its length running horizontally in the
 * middle of the gap and reads as a long flat line passing under the parent,
 * its ends two stubs nowhere near it. Measured on a three-unit company: 430
 * units across, 105 down.
 *
 * The rounded step is the shape that keeps both properties, so it is what a
 * chart gets unless it asks otherwise: the corner is where the branch turns,
 * so it sits near the CHILD rather than shared with its siblings, and the drop
 * into each child is vertical however far to the side it is. `curve` is the
 * shape of the console's own org chart, which this package is drawn to match,
 * and a caller that wants that drawing asks for it knowing the above.
 *
 * Here rather than in the component that draws them, because it is arithmetic
 * over the layout and nothing about it is React's.
 */
export function layoutConnectors(
  layout: ForestLayout,
  shape: TreeConnectorShape = 'step',
): TreeConnector[] {
  const out: TreeConnector[] = [];
  for (const node of layout.nodes) {
    if (node.parent === null) continue;
    const parent = layout.byId.get(node.parent);
    if (!parent) continue;
    const fromX = parent.x + parent.width / 2;
    const fromY = parent.y + parent.height;
    const toX = node.x + node.width / 2;
    const toY = node.y;
    const midY = fromY + (toY - fromY) / 2;
    const across = toX - fromX;
    const at = (d: string) => out.push({ id: node.id, parent: parent.id, d });
    if (shape === 'curve') {
      // Both control points on the middle of the gap, directly under the
      // parent and directly over the child: the tangent leaves and arrives
      // vertical, which is what makes the branch read as leaving the card.
      at(`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`);
      continue;
    }
    // A child centred under its parent has no corner to draw at all, and a
    // rounded one there would be two arcs cancelling each other out.
    if (Math.abs(across) < 0.5) {
      at(`M${fromX} ${fromY}V${toY}`);
      continue;
    }
    // Never more than half of either run, so the two corners of a short
    // connector meet rather than overshoot.
    const radius = Math.min(CONNECTOR_RADIUS, Math.abs(across) / 2, Math.abs(midY - fromY));
    const step = across > 0 ? radius : -radius;
    at(
      `M${fromX} ${fromY}` +
        `V${midY - radius}` +
        `Q${fromX} ${midY},${fromX + step} ${midY}` +
        `H${toX - step}` +
        `Q${toX} ${midY},${toX} ${midY + radius}` +
        `V${toY}`,
    );
  }
  return out;
}
