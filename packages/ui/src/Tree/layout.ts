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
 * - A GROUP IS ROOM THE LAYOUT KEEPS, NOT A BOX DRAWN OVER IT AFTERWARDS. A
 *   run of siblings can be enclosed in a box (a unit's seats, say) whose
 *   padding and header are part of every member's outline, so a neighbour
 *   that is not a member is held `gapX` clear of the BOX rather than of the
 *   member card, while two members of one box stay `gapX` apart from each
 *   other. The header is reserved above the run's rank and the padding below
 *   it, on both rank modes, so a box never reaches into the gap a connector
 *   runs through. See [LayoutGroup].
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
   * Runs of siblings enclosed in a box: see [LayoutGroup]. Unset, none.
   */
  groups?: readonly LayoutGroup[] | undefined;
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

/** The room a group's box keeps around its members: see [LayoutGroup]. */
export interface LayoutGroupInset {
  /** Between the box's side and its outermost member, on each side. */
  x: number;
  /** Between the box's top and its members' tops: its header lives here. */
  top: number;
  /** Between its members' bottoms and the box's bottom. */
  bottom: number;
}

/**
 * A box drawn round a RUN OF SIBLINGS: consecutive children of one parent, or
 * consecutive roots.
 *
 * WHY SIBLINGS, AND WHY CONSECUTIVE. A box is one rectangle, and a rectangle
 * round boxes that are not next to each other in the drawing encloses
 * whatever lies between them: a member two ranks down, or a neighbour placed
 * between two members, would be drawn inside a group it does not belong to.
 * A run of siblings is the one shape a tidy layout keeps together on one rank
 * with nothing between its members, so it is the shape a box can be drawn
 * round honestly; anything else is refused by name rather than drawn wrong.
 * An organization's unit is such a run: the seats that report to one lead.
 *
 * Each group carries its own inset because a header's height is a MEASURED
 * value (a label and whatever chip rides beside it), and two groups need not
 * say the same amount.
 */
export interface LayoutGroup {
  id: string;
  /** The boxes it encloses, in any order. Every one is a box of the forest. */
  members: readonly string[];
  inset: LayoutGroupInset;
}

/** A group where the layout put it: its members' extent plus its inset. */
export interface PlacedGroup extends CanvasRect {
  id: string;
  members: readonly string[];
  inset: LayoutGroupInset;
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
  /**
   * Every group, in the order it was given, as the rectangle its box is drawn
   * in. Absent from a layout built by hand with none.
   */
  groups?: PlacedGroup[];
  /**
   * The rank mode it was laid out on, which is where a connector's run goes:
   * see [layoutConnectors]. Absent from a layout built by hand, which is then
   * read as `per-parent`.
   */
  ranks?: LayoutRanks;
  /** The forest's extent, groups included: always at the origin. */
  bounds: CanvasRect;
}

/** The height a zero height box occupies in an outline: see the module doc. */
const MIN_OUTLINE_HEIGHT = 1;

/**
 * One run of an outline: over `[top, bottom)` the extreme x is `value`.
 *
 * A member of a group is entered at its BOX's edge rather than its own, with
 * the group it belongs to and how far past its own edge that is: against
 * anything else the box is what has to be kept clear, and against another
 * member of the same box the members themselves are.
 */
interface Segment {
  top: number;
  bottom: number;
  value: number;
  /** The group whose box this edge is, or null for a box in none (and a connector band). */
  group: string | null;
  /** How far `value` stands outside the member's own edge. */
  pad: number;
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

/** What the layout knows about the group a box is in. */
interface Membership {
  group: LayoutGroup;
  /** The tallest member, which is how tall the box's body is. */
  tallest: number;
}

/**
 * The header a box's rank has to keep above it and the padding below it: the
 * most any group on that rank asks for, since a rank is one line.
 */
function roomOf(membership: Membership | undefined): { head: number; foot: number } {
  return { head: membership?.group.inset.top ?? 0, foot: membership?.group.inset.bottom ?? 0 };
}

function bandsOf(roots: readonly LayoutNode[], gapY: number, groupOf: ReadonlyMap<string, Membership>): Bands {
  const height: number[] = [];
  const head: number[] = [];
  const foot: number[] = [];
  const visit = (node: LayoutNode, depth: number) => {
    const room = roomOf(groupOf.get(node.id));
    height[depth] = Math.max(height[depth] ?? 0, node.height);
    head[depth] = Math.max(head[depth] ?? 0, room.head);
    foot[depth] = Math.max(foot[depth] ?? 0, room.foot);
    node.children.forEach((child) => visit(child, depth + 1));
  };
  roots.forEach((root) => visit(root, 0));
  // A BAND'S TOP IS WHERE ITS BOXES SIT, and the header a group on it keeps is
  // above that and the padding below its bottom: both inside the rank rather
  // than in the gap between ranks, which is where the connectors run.
  const top: number[] = [];
  let at = 0;
  for (let depth = 0; depth < height.length; depth++) {
    top[depth] = at + head[depth]!;
    at = top[depth]! + height[depth]! + foot[depth]! + gapY;
  }
  return { top, height };
}

function shift(outline: Outline, dx: number, dy: number): Outline {
  return outline.map((s) => ({ ...s, top: s.top + dy, bottom: s.bottom + dy, value: s.value + dx }));
}

function mirror(outline: Outline): Outline {
  return outline.map((s) => ({ ...s, value: -s.value }));
}

/**
 * Two outlines as one, keeping the `keep` most of the two edges wherever both
 * have one, and with it the group that edge belongs to.
 */
function merge(a: Outline, b: Outline, keep: 'min' | 'max'): Outline {
  const cuts = [...new Set([...a, ...b].flatMap((s) => [s.top, s.bottom]))].sort((x, y) => x - y);
  const out: Outline = [];
  let i = 0;
  let j = 0;
  for (let k = 0; k + 1 < cuts.length; k++) {
    const lo = cuts[k]!;
    const hi = cuts[k + 1]!;
    while (i < a.length && a[i]!.bottom <= lo) i++;
    while (j < b.length && b[j]!.bottom <= lo) j++;
    const sa = i < a.length && a[i]!.top <= lo ? a[i]! : undefined;
    const sb = j < b.length && b[j]!.top <= lo ? b[j]! : undefined;
    const chosen =
      sa && sb ? ((keep === 'max' ? sb.value > sa.value : sb.value < sa.value) ? sb : sa) : (sa ?? sb);
    if (chosen === undefined) continue;
    const last = out[out.length - 1];
    if (last && last.bottom === lo && last.value === chosen.value && last.group === chosen.group) {
      last.bottom = hi;
    } else {
      out.push({ top: lo, bottom: hi, value: chosen.value, group: chosen.group, pad: chosen.pad });
    }
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
      const edge = right[k]!;
      // TWO MEMBERS OF ONE BOX are kept apart by their own edges; everything
      // else by the box's.
      const inside = edge.group !== null && edge.group === s.group ? edge.pad + s.pad : 0;
      need = Math.max(need, edge.value - s.value - inside);
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
    reach = merge(reach, shift(kids[i]!.right, at, 0), 'max');
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

/**
 * How far below a box's rank top its children's rank starts, off shared ranks:
 * its body (a member's is its whole box's, so a short member's children do
 * not start inside its box), the padding under a box, the gap, and the header
 * any group among its children keeps above them.
 */
function childDrop(node: LayoutNode, gaps: LayoutGaps, groupOf: ReadonlyMap<string, Membership>): number {
  const own = groupOf.get(node.id);
  const body = own ? own.tallest : node.height;
  let head = 0;
  for (const child of node.children) head = Math.max(head, roomOf(groupOf.get(child.id)).head);
  return body + roomOf(own).foot + gaps.gapY + head;
}

function build(
  node: LayoutNode,
  gaps: LayoutGaps,
  bands: Bands | null,
  depth: number,
  groupOf: ReadonlyMap<string, Membership>,
): Subtree {
  const kids = node.children.map((child) => build(child, gaps, bands, depth + 1, groupOf));
  const half = node.width / 2;
  const tall = Math.max(node.height, MIN_OUTLINE_HEIGHT);
  // CENTRED IN ITS BAND, which is what a rank-and-order layout does with a box
  // shorter than the rank it is on: a seat beside a unit that carries a lead
  // reads as one row rather than as two boxes hung from one line.
  const inBand = bands ? (bands.height[depth]! - node.height) / 2 : 0;
  // A MEMBER STANDS FOR ITS WHOLE BOX, top to bottom: the box is as tall as
  // its tallest member plus its header and padding, and a shorter member that
  // entered only its own height would let a neighbour's box reach in under it.
  const member = groupOf.get(node.id);
  const pad = member?.group.inset.x ?? 0;
  const group = member?.group.id ?? null;
  let top = inBand;
  let bottom = inBand + tall;
  if (member) {
    const body = Math.max(member.tallest, MIN_OUTLINE_HEIGHT);
    const at = bands ? (bands.height[depth]! - member.tallest) / 2 : 0;
    top = at - member.group.inset.top;
    bottom = at + body + member.group.inset.bottom;
  }
  let left: Outline = [{ top, bottom, value: -half - pad, group, pad }];
  let right: Outline = [{ top, bottom, value: half + pad, group, pad }];
  if (kids.length === 0) return { node, kids, offsets: [], inBand, left, right };

  const offsets = pack(kids, gaps.gapX);
  const childTop = bands ? bands.top[depth + 1]! - bands.top[depth]! : childDrop(node, gaps, groupOf);
  // THE CONNECTOR BAND: from this box's bottom to its children's tops, as wide
  // as the box or the bar joining the outermost children, whichever is wider.
  // NOT COMPUTED ON SHARED RANKS, where it can constrain nothing: the band is
  // never wider than this box or than the children row below it, and BOTH of
  // those are on ranks of their own, where the same separation is already
  // kept. Two merges a node, over a stretch of chart nothing is drawn in.
  if (!bands && childTop > node.height) {
    const band = (value: number): Outline => [{ top: node.height, bottom: childTop, value, group: null, pad: 0 }];
    left = merge(left, band(Math.min(-half, offsets[0]!)), 'min');
    right = merge(right, band(Math.max(half, offsets[offsets.length - 1]!)), 'max');
  }
  kids.forEach((kid, i) => {
    left = merge(left, shift(kid.left, offsets[i]!, childTop), 'min');
    right = merge(right, shift(kid.right, offsets[i]!, childTop), 'max');
  });
  return { node, kids, offsets, inBand, left, right };
}

function validate(roots: readonly LayoutNode[], gaps: LayoutGaps): Map<string, Membership> {
  const size = (value: number) => Number.isFinite(value) && value >= 0;
  if (!size(gaps.gapX) || !size(gaps.gapY) || !size(gaps.margin ?? 0)) {
    throw new RangeError(
      `layoutForest: gapX, gapY and margin must be finite and non-negative, got ${JSON.stringify(gaps)}`,
    );
  }
  if (gaps.ranks !== undefined && gaps.ranks !== 'per-parent' && gaps.ranks !== 'shared') {
    throw new RangeError(`layoutForest: ranks is "${gaps.ranks}"; it is "per-parent" or "shared"`);
  }
  const seen = new Map<string, LayoutNode>();
  /** Each box's parent, and where it stands among its siblings. */
  const place = new Map<string, { parent: string | null; index: number }>();
  const visit = (node: LayoutNode, parent: string | null, index: number) => {
    if (seen.has(node.id)) {
      throw new RangeError(`layoutForest: the id "${node.id}" appears twice; every box needs its own id`);
    }
    seen.set(node.id, node);
    place.set(node.id, { parent, index });
    if (!size(node.width) || !size(node.height)) {
      throw new RangeError(
        `layoutForest: "${node.id}" is ${node.width} by ${node.height}; a size must be finite and non-negative`,
      );
    }
    node.children.forEach((child, i) => visit(child, node.id, i));
  };
  roots.forEach((root, i) => visit(root, null, i));

  const groupOf = new Map<string, Membership>();
  const named = new Set<string>();
  for (const group of gaps.groups ?? []) {
    const { id, members, inset } = group;
    if (named.has(id)) throw new RangeError(`layoutForest: the group "${id}" appears twice`);
    named.add(id);
    if (!size(inset.x) || !size(inset.top) || !size(inset.bottom)) {
      throw new RangeError(
        `layoutForest: the group "${id}" has the inset ${JSON.stringify(inset)}; each side must be finite and non-negative`,
      );
    }
    if (members.length === 0) throw new RangeError(`layoutForest: the group "${id}" has no members`);
    let tallest = 0;
    const indices: number[] = [];
    let parent: string | null | undefined;
    for (const member of members) {
      const node = seen.get(member);
      if (!node) throw new RangeError(`layoutForest: the group "${id}" names "${member}", which is no box of the forest`);
      const other = groupOf.get(member);
      if (other) {
        throw new RangeError(
          `layoutForest: "${member}" is in the group "${other.group.id}" and in "${id}"; a box is in one group at most`,
        );
      }
      const at = place.get(member)!;
      if (parent !== undefined && at.parent !== parent) {
        throw new RangeError(
          `layoutForest: the group "${id}" holds boxes of different parents; a group is a run of siblings`,
        );
      }
      parent = at.parent;
      indices.push(at.index);
      tallest = Math.max(tallest, node.height);
      groupOf.set(member, { group, tallest: 0 });
    }
    indices.sort((a, b) => a - b);
    if (indices[indices.length - 1]! - indices[0]! + 1 !== indices.length) {
      throw new RangeError(
        `layoutForest: the group "${id}" skips a sibling between its members; a group is a CONSECUTIVE run of siblings`,
      );
    }
    for (const member of members) groupOf.set(member, { group, tallest });
  }
  return groupOf;
}

/**
 * Each group's rectangle: its members' extent, plus its inset on every side.
 *
 * Exported because the extent is a function of where the members are DRAWN,
 * which during a relayout is on the way to where the layout put them: a box
 * computed once from the target would sit at the end of a journey its members
 * are still making.
 */
export function placeGroups(
  byId: ReadonlyMap<string, CanvasRect>,
  groups: readonly Pick<LayoutGroup, 'id' | 'members' | 'inset'>[],
): PlacedGroup[] {
  return groups.map(({ id, members, inset }) => {
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const member of members) {
      const box = byId.get(member);
      if (!box) continue;
      left = Math.min(left, box.x);
      top = Math.min(top, box.y);
      right = Math.max(right, box.x + box.width);
      bottom = Math.max(bottom, box.y + box.height);
    }
    return {
      id,
      members,
      inset,
      x: left - inset.x,
      y: top - inset.top,
      width: right - left + inset.x * 2,
      height: bottom - top + inset.top + inset.bottom,
    };
  });
}

/** Lays out a forest of measured boxes: see the module doc for the rules. */
export function layoutForest(roots: readonly LayoutNode[], gaps: LayoutGaps): ForestLayout {
  const groupOf = validate(roots, gaps);
  const margin = gaps.margin ?? 0;
  const nodes: PlacedNode[] = [];
  if (roots.length === 0) {
    return {
      nodes,
      byId: new Map(),
      groups: [],
      ranks: gaps.ranks ?? 'per-parent',
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    };
  }
  const bands = gaps.ranks === 'shared' ? bandsOf(roots, gaps.gapY, groupOf) : null;
  const trees = roots.map((root) => build(root, gaps, bands, 0, groupOf));
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
    const childTop = bands ? bands.top[depth + 1]! : top + childDrop(node, gaps, groupOf);
    tree.kids.forEach((kid, i) => place(kid, centre + tree.offsets[i]!, childTop, depth + 1, node.id));
  };
  // Off shared ranks the roots are a rank too, and a group of roots keeps its
  // header above them exactly as a group further down does.
  let rootHead = 0;
  for (const root of roots) rootHead = Math.max(rootHead, roomOf(groupOf.get(root.id)).head);
  trees.forEach((tree, i) => place(tree, centres[i]!, bands ? bands.top[0]! : rootHead, 0, null));

  // A loop rather than `Math.min(...xs)`: spreading a large array into
  // arguments overflows the call stack long before a layout is slow. A box's
  // extent is its GROUP's where it has one, so a margin is kept round the box
  // rather than round the card inside it.
  const padOf = (id: string) => groupOf.get(id)?.group.inset.x ?? 0;
  let minX = Infinity;
  for (const node of nodes) minX = Math.min(minX, node.x - padOf(node.id));
  for (const node of nodes) {
    node.x += margin - minX;
    node.y += margin;
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const groups = placeGroups(byId, gaps.groups ?? []);
  let maxX = -Infinity;
  let maxY = 0;
  for (const one of [...nodes, ...groups]) {
    maxX = Math.max(maxX, one.x + one.width);
    maxY = Math.max(maxY, one.y + one.height);
  }
  return {
    nodes,
    byId,
    groups,
    ranks: gaps.ranks ?? 'per-parent',
    bounds: { x: 0, y: 0, width: maxX + margin, height: maxY + margin },
  };
}

/**
 * How far an ELBOW's corner is rounded, in layout units: the approved design's
 * 6px, which is the `--radius-sm` step.
 *
 * A CONSTANT RATHER THAN A PROBE, unlike the gaps, because no radius scales
 * with density: `--radius-sm` is 6px at every density, so a value read from
 * the stylesheet would only ever read this back. Small, because an elbow is a
 * square turn that has had its point taken off, not a curve: at 12 the corner
 * of a connector between two ranks a card's height apart was a sixth of the
 * drop and read as a bend in the line. Clamped per connector to half of
 * whichever run it turns out of, so a child one card away and a child nearly
 * under its parent both draw a corner that fits.
 */
const ELBOW_RADIUS = 6;

/** Closer than this, in layout units, a child is centred under its parent: floating point noise. */
const CENTRED = 1e-6;

/**
 * How far a STEP's corner is rounded, in layout units.
 *
 * Big enough to read as a curve at a glance and small enough that the vertical
 * leaving the parent and the vertical arriving at the child are both still
 * plainly vertical. Clamped per connector as the elbow's is.
 */
const STEP_RADIUS = 12;

/**
 * The shapes a connector is drawn in: see [layoutConnectors].
 *
 * `elbow` (the default) and `straight` are the org chart's own pair; `step` and
 * `curve` are the two drawings this chart had before the elbow, kept because
 * each is a real choice a caller makes knowing what it costs.
 */
export type TreeConnectorShape = 'elbow' | 'straight' | 'step' | 'curve';

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
 * Where the run across a parent's children is drawn: halfway through the CLEAR
 * space between the parent and them, one height for every child.
 *
 * CLEAR OF EVERY GROUP BOX. The space below a parent starts at the bottom of
 * the parent's box where it is in one, and ends at the top of the box its
 * children are in where they are: a run at the plain midpoint would pass
 * through a unit's header, or through the padding under the parent's own unit,
 * and read as a line inside a box it only passes. And ONE HEIGHT FOR ALL THE
 * CHILDREN, the nearest of their tops deciding it, because two runs a few
 * pixels apart under one parent read as two branches.
 *
 * ON SHARED RANKS THE SPACE IS BETWEEN THE RANKS, not below the parent. A
 * short parent is centred in a band as tall as its tallest neighbour, and its
 * children's run is as wide as their row, which on shared ranks may reach
 * under that neighbour: a run halfway between the short parent's own bottom
 * and its children was inside the parent's RANK, and crossed the neighbour's
 * card. Between the bottom of everything on the parent's rank and the top of
 * everything on the next, it crosses nothing, and every run between two ranks
 * is on one line, which is what an org chart's are.
 */
function busOf(layout: ForestLayout): Map<string, number> {
  const boxOf = new Map<string, PlacedGroup>();
  for (const group of layout.groups ?? []) for (const member of group.members) boxOf.set(member, group);
  /** How far up a box reaches, its group's header included, and how far down. */
  const topOf = (node: PlacedNode) => Math.min(boxOf.get(node.id)?.y ?? node.y, node.y);
  const bottomOf = (node: PlacedNode) => {
    const box = boxOf.get(node.id);
    return Math.max(box ? box.y + box.height : -Infinity, node.y + node.height);
  };
  const shared = layout.ranks === 'shared';
  const rankTop = new Map<number, number>();
  const rankBottom = new Map<number, number>();
  if (shared) {
    for (const node of layout.nodes) {
      rankTop.set(node.depth, Math.min(rankTop.get(node.depth) ?? Infinity, topOf(node)));
      rankBottom.set(node.depth, Math.max(rankBottom.get(node.depth) ?? -Infinity, bottomOf(node)));
    }
  }
  const reach = new Map<string, number>();
  for (const node of layout.nodes) {
    if (node.parent === null) continue;
    const top = shared ? rankTop.get(node.depth)! : topOf(node);
    reach.set(node.parent, Math.min(reach.get(node.parent) ?? Infinity, top));
  }
  const bus = new Map<string, number>();
  for (const [id, top] of reach) {
    const parent = layout.byId.get(id);
    if (!parent) continue;
    const bottom = parent.y + parent.height;
    const from = shared ? rankBottom.get(parent.depth)! : bottomOf(parent);
    // Never above the parent's own edge or below the nearest child's, which a
    // box reaching past the space between them would otherwise put it.
    bus.set(id, Math.min(Math.max(from + (top - from) / 2, bottom), top));
  }
  return bus;
}

/**
 * The connector from each box to its parent, as SVG path data: down from the
 * parent's bottom centre and into the child's top centre.
 *
 * `elbow`, THE DEFAULT, is ORTHOGONAL: down, a quarter circle of
 * [ELBOW_RADIUS], across the run the parent's children share, another quarter
 * circle, and down into the child. Every straight piece of it is vertical or
 * horizontal, so a branch reads as a line of the org chart rather than as a
 * drawing, and the corner is where the branch turns, near the CHILD, so which
 * corner belongs to which child is read without tracing. The corners are true
 * circular arcs (`A`), which is what a radius is; a quadratic through the
 * corner point is not round and bulges at the size the design draws.
 *
 * `straight` is one segment from the parent's bottom centre to the child's
 * top: the drawing for a chart dense enough that the run a parent's children
 * share would be a line with forty corners on it.
 *
 * `step` is the elbow with a softer [STEP_RADIUS] turn drawn in quadratics,
 * which this chart drew before the elbow. `curve` is a single cubic from the
 * parent's bottom to the child's top, both handles on the run: the console's
 * own org chart draws it, and it loses definition exactly where a chart is
 * widest, because a subtree is as wide as everything under it while the gap
 * stays one rank, so an outer child's curve spends most of its length running
 * flat through the gap. Measured on a three-unit company: 430 units across,
 * 105 down.
 *
 * Every shape but `straight` runs across at the same height, [busOf], which
 * keeps it clear of every group box.
 *
 * Here rather than in the component that draws them, because it is arithmetic
 * over the layout and nothing about it is React's.
 */
export function layoutConnectors(
  layout: ForestLayout,
  shape: TreeConnectorShape = 'elbow',
): TreeConnector[] {
  const out: TreeConnector[] = [];
  const bus = busOf(layout);
  for (const node of layout.nodes) {
    if (node.parent === null) continue;
    const parent = layout.byId.get(node.parent);
    if (!parent) continue;
    const fromX = parent.x + parent.width / 2;
    const fromY = parent.y + parent.height;
    const toX = node.x + node.width / 2;
    const toY = node.y;
    const midY = bus.get(parent.id) ?? fromY + (toY - fromY) / 2;
    const across = toX - fromX;
    const at = (d: string) => out.push({ id: node.id, parent: parent.id, d });
    if (shape === 'straight') {
      at(`M${fromX} ${fromY}L${toX} ${toY}`);
      continue;
    }
    if (shape === 'curve') {
      // Both control points on the run, directly under the parent and
      // directly over the child: the tangent leaves and arrives vertical,
      // which is what makes the branch read as leaving the card.
      at(`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`);
      continue;
    }
    // A child centred under its parent has no corner to draw at all, and a
    // rounded one there would be two turns cancelling each other out. EXACTLY
    // centred, to the layout's own rounding: a child a fraction of a pixel to
    // the side used to be drawn a bare vertical that ended beside its top
    // centre, and gets the two corners, clamped to half of that fraction,
    // which is what arrives where the child is.
    if (Math.abs(across) < CENTRED) {
      at(`M${fromX} ${fromY}V${toY}`);
      continue;
    }
    // Never more than half of either run, so the two corners of a short
    // connector meet rather than overshoot.
    const radius = Math.min(
      shape === 'elbow' ? ELBOW_RADIUS : STEP_RADIUS,
      Math.abs(across) / 2,
      Math.max(0, midY - fromY),
      Math.max(0, toY - midY),
    );
    const step = across > 0 ? radius : -radius;
    if (shape === 'elbow') {
      // Down then across is a turn to the traveller's left when the child is
      // to the right, which in SVG's y-down space is the anticlockwise sweep;
      // across then down is the opposite turn.
      const first = across > 0 ? 0 : 1;
      at(
        `M${fromX} ${fromY}` +
          `V${midY - radius}` +
          `A${radius} ${radius} 0 0 ${first} ${fromX + step} ${midY}` +
          `H${toX - step}` +
          `A${radius} ${radius} 0 0 ${1 - first} ${toX} ${midY + radius}` +
          `V${toY}`,
      );
      continue;
    }
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
