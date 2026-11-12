/**
 * The layout of a layered map, as pure functions: lanes read left to right,
 * bands stacked under each other, groups inside a lane, and orthogonal edges.
 *
 * ONE ROW GRID PER BAND. Every card is the same size and stands in a cell of
 * its band's grid, a group's header takes a row of its own, and an empty lane
 * keeps the rows its message needs. Because every lane of a band shares the
 * rows, the gaps between rows are free of cards in every lane at once, so an
 * edge that crosses a lane runs along a gap and never through a card.
 *
 * LANES ARE INPUT. Nothing here assigns ranks: a cycle is an edge drawn back
 * across a lane, and the order inside a lane is a fixed number of barycentric
 * sweeps, ties broken by the caller's order, so the same input always gives
 * the same picture.
 */

import type { CanvasPoint, CanvasRect } from '../Canvas/geometry.js';

/** A band of lanes, top to bottom; its lanes read left to right. */
export interface GraphLayoutBand {
  id: string;
  /** Whether the band draws a title above its lane headers. */
  titled: boolean;
  /** The ids of its lanes, in reading order. */
  lanes: readonly string[];
}

export interface GraphLayoutNode {
  id: string;
  lane: string;
  group?: string | undefined;
  /**
   * The column of its lane it stands in, from 0, for a lane wider than one
   * column whose columns mean something (a depth: what calls stands left of
   * what is called). Read for a lane that holds no groups; elsewhere the lane
   * fills row by row.
   */
  column?: number | undefined;
}

export interface GraphLayoutGroup {
  id: string;
  lane: string;
}

/** An edge from the entry that relies to the entry relied on. */
export interface GraphLayoutEdge {
  id: string;
  from: string;
  to: string;
}

/** The sizes the layout is drawn at, measured from the stylesheet. */
export interface GraphMetrics {
  cardWidth: number;
  cardHeight: number;
  /** The channel between two columns, where vertical runs of edges go. */
  gutter: number;
  /** The gap between two rows, where horizontal runs of edges go. */
  rowGap: number;
  /** The room a lane's header takes above its first row. */
  laneHead: number;
  /** The room a titled band's title takes above its lane headers. */
  bandHead: number;
  /** The space between two bands. */
  bandGap: number;
  /** How far a lane's panel reaches past its cards. */
  lanePad: number;
  /** The space around the whole map. */
  margin: number;
}

export interface GraphLayoutInput {
  bands: readonly GraphLayoutBand[];
  nodes: readonly GraphLayoutNode[];
  groups?: readonly GraphLayoutGroup[] | undefined;
  /** Whether a group is drawn open. A closed group is one summary card. */
  open: (groupId: string) => boolean;
  /** The edges drawn at rest. */
  edges: readonly GraphLayoutEdge[];
  /** The edges that decide the order inside a lane: `edges` unless given, so hiding a line never moves a card. */
  ordering?: readonly GraphLayoutEdge[] | undefined;
  /** How many columns a lane asks for, by lane id. Unlisted lanes ask for one. */
  laneColumns?: ReadonlyMap<string, number> | undefined;
  /** The height an empty lane's message takes, by lane id. Unlisted lanes keep one row. */
  emptyHeights?: ReadonlyMap<string, number> | undefined;
}

/**
 * What stands in a cell: an entry, a closed group's summary, an open group's
 * header row, or the message of an empty lane.
 */
export type GraphItemKind = 'node' | 'summary' | 'head' | 'empty';

export interface GraphItem extends CanvasRect {
  /** Unique across kinds: see [graphItemKey]. */
  key: string;
  kind: GraphItemKind;
  /** The entry's id, the group's id, or the lane's id for an empty lane. */
  id: string;
  lane: string;
  band: number;
  /** The first column and row it covers, in its band's grid. */
  col: number;
  row: number;
  cols: number;
  rows: number;
}

export interface GraphLanePlaced {
  id: string;
  band: number;
  /** The first column, and how many it spans. */
  col: number;
  span: number;
  rows: number;
  /** Its panel: the header and every row, with its padding. */
  panel: CanvasRect;
  /** Its header's box, above the first row. */
  head: CanvasRect;
  /** Its items, in reading order, which is the order the keyboard walks. */
  items: string[];
  /** How many entries it holds, closed groups' members included. */
  count: number;
}

export interface GraphBandPlaced {
  id: string;
  index: number;
  /** Its title's box, for a titled band. */
  title: CanvasRect | null;
  rowsTop: number;
  rows: number;
}

export interface GraphGroupPlaced {
  id: string;
  lane: string;
  open: boolean;
  /** The box drawn round an open group's header and members; a closed group draws its summary instead. */
  box: CanvasRect | null;
  /** Its members' ids, in drawn order. */
  members: string[];
}

/** One drawn edge. Several edges between the same two items are one route. */
export interface GraphRoute {
  key: string;
  from: string;
  to: string;
  /** The edges it draws. */
  edges: string[];
  points: CanvasPoint[];
  /** The path, ending at the arrowhead's base. */
  d: string;
  /** The arrowhead, as a closed path. */
  arrow: string;
  /** The box round every point, for drawing only the routes near the view. */
  box: CanvasRect;
}

export interface GraphLayout {
  bounds: CanvasRect;
  metrics: GraphMetrics;
  columns: number;
  bands: GraphBandPlaced[];
  lanes: GraphLanePlaced[];
  laneById: ReadonlyMap<string, GraphLanePlaced>;
  items: GraphItem[];
  itemByKey: ReadonlyMap<string, GraphItem>;
  /** The item an entry is drawn as: its own card, or its closed group's summary. */
  itemOfNode: ReadonlyMap<string, string>;
  groups: GraphGroupPlaced[];
  groupById: ReadonlyMap<string, GraphGroupPlaced>;
  routes: GraphRoute[];
  /** The route each at-rest edge is drawn by. */
  routeOfEdge: ReadonlyMap<string, string>;
  /** What routing another set of edges needs: see [routeGraphEdges]. */
  grid: GraphGrid;
}

/** The streets and cells edges are routed through. */
export interface GraphGrid {
  /** Each column's left edge. */
  colX: readonly number[];
  /** Each vertical channel's centre: channel `c` is left of column `c`, the last one right of the last column. */
  channelX: readonly number[];
  /** Every horizontal street, top to bottom. */
  streets: readonly GraphStreet[];
  /** Each band's own streets, as indices into `streets`, top to bottom. */
  bandStreets: readonly (readonly number[])[];
  /** The street in the gap above each band after the first, by the band's index. */
  gapStreets: ReadonlyMap<number, number>;
  /** Whether a cell holds anything, by band: `occupied[band][row * columns + col]`. */
  occupied: readonly Uint8Array[];
  bandRows: readonly number[];
  bandRowsTop: readonly number[];
}

export interface GraphStreet {
  y: number;
  /** The band whose rows it runs between, or -1 for the gap between two bands. */
  band: number;
  /** For the gap between two bands, the lower band's index; -1 otherwise. */
  gap: number;
  /** Whether a group box's edge runs beside it in a column, by column: a run there would double that edge. */
  dirty: Uint8Array;
  /** Whether it runs through an empty lane's message in a column, by column. */
  blocked: Uint8Array;
}

/**
 * HOW MANY ORDERING SWEEPS: four each way. On the suite's fixtures the
 * crossings stopped falling at eight (twelve drew the same maps), and each
 * sweep is linear in the entries and edges.
 */
export const GRAPH_ORDER_SWEEPS = 8;

/** The space between two parallel runs in one channel or street. */
const TRACK_STEP = 6;
const STREET_TRACK_STEP = 4;
/** How far a corner is rounded. */
const CORNER = 6;
/** The arrowhead's length and half width. */
const ARROW_LENGTH = 7;
const ARROW_HALF = 3.5;
/** Ports stay this far inside a card's top and bottom corners. */
const PORT_INSET = 8;

/** An item's key, unique across kinds even when an entry, a group and a lane share an id. */
export function graphItemKey(kind: GraphItemKind, id: string): string {
  return `${kind}:${id}`;
}

/** A group block, or a lone card: what a lane is ordered in. */
interface Block {
  kind: 'group' | 'closed' | 'loose';
  /** The group's id, or the entry's for a loose card. */
  id: string;
  members: string[];
  index: number;
}

/**
 * Lays out a map. Throws on input that cannot be drawn: an entry or a group in
 * a lane no band lists, an entry in a group of another lane, or a repeated id.
 */
export function layoutGraph(input: GraphLayoutInput, metrics: GraphMetrics): GraphLayout {
  const { bands, nodes, open } = input;
  const groups = input.groups ?? [];
  const laneBand = new Map<string, number>();
  bands.forEach((band, b) =>
    band.lanes.forEach((lane) => {
      if (laneBand.has(lane)) throw new Error(`GraphCanvas: lane "${lane}" is listed twice`);
      laneBand.set(lane, b);
    }),
  );
  const groupLane = new Map<string, string>();
  for (const group of groups) {
    if (groupLane.has(group.id)) throw new Error(`GraphCanvas: group "${group.id}" is listed twice`);
    if (!laneBand.has(group.lane))
      throw new Error(`GraphCanvas: group "${group.id}" is in unknown lane "${group.lane}"`);
    groupLane.set(group.id, group.lane);
  }
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) throw new Error(`GraphCanvas: entry "${node.id}" is listed twice`);
    seen.add(node.id);
    if (!laneBand.has(node.lane)) throw new Error(`GraphCanvas: entry "${node.id}" is in unknown lane "${node.lane}"`);
    if (node.group !== undefined && groupLane.get(node.group) !== node.lane) {
      throw new Error(
        `GraphCanvas: entry "${node.id}" names group "${node.group}", which is not in lane "${node.lane}"`,
      );
    }
  }

  // ---- blocks per lane, in the caller's order
  const blocksOf = new Map<string, Block[]>();
  const groupBlock = new Map<string, Block>();
  for (const band of bands) for (const lane of band.lanes) blocksOf.set(lane, []);
  nodes.forEach((node, index) => {
    const list = blocksOf.get(node.lane)!;
    if (node.group === undefined) {
      list.push({ kind: 'loose', id: node.id, members: [node.id], index });
      return;
    }
    let block = groupBlock.get(node.group);
    if (!block) {
      block = { kind: open(node.group) ? 'group' : 'closed', id: node.group, members: [], index };
      groupBlock.set(node.group, block);
      list.push(block);
    }
    block.members.push(node.id);
  });

  // The key each entry is drawn under, which a closed group folds into its summary.
  const keyOfNode = new Map<string, string>();
  for (const blocks of blocksOf.values()) {
    for (const block of blocks) {
      for (const id of block.members) {
        keyOfNode.set(id, block.kind === 'closed' ? graphItemKey('summary', block.id) : graphItemKey('node', id));
      }
    }
  }

  // ---- the drawn items that are ordered (entries and closed groups), by index, with their
  // neighbours in other lanes along the at-rest edges: the sweeps read numbers, not strings
  const allLanes = bands.flatMap((band) => band.lanes);
  const laneNumber = new Map(allLanes.map((lane, i) => [lane, i]));
  const itemIndex = new Map<string, number>();
  const itemLane: number[] = [];
  for (const lane of allLanes) {
    for (const block of blocksOf.get(lane)!) {
      const keys =
        block.kind === 'closed'
          ? [graphItemKey('summary', block.id)]
          : block.members.map((id) => graphItemKey('node', id));
      for (const key of keys) {
        itemIndex.set(key, itemLane.length);
        itemLane.push(laneNumber.get(lane)!);
      }
    }
  }
  const adjacent: number[][] = itemLane.map(() => []);
  for (const edge of input.ordering ?? input.edges) {
    const a = itemIndex.get(keyOfNode.get(edge.from) ?? '');
    const b = itemIndex.get(keyOfNode.get(edge.to) ?? '');
    if (a === undefined || b === undefined || a === b || itemLane[a] === itemLane[b]) continue;
    adjacent[a]!.push(b);
    adjacent[b]!.push(a);
  }

  const columnOf = new Map<string, number>();
  for (const node of nodes) if (node.column !== undefined && node.group === undefined) columnOf.set(node.id, node.column);

  // ---- rows: where each block of a lane lands
  const pitch = metrics.cardHeight + metrics.rowGap;
  const emptyRowsOf = (lane: string): number => {
    const height = input.emptyHeights?.get(lane);
    if (height === undefined || height <= 0) return 1;
    return Math.max(1, Math.ceil((height + metrics.rowGap) / pitch));
  };
  interface Cell {
    key: string;
    kind: GraphItemKind;
    id: string;
    col: number;
    row: number;
    cols: number;
    rows: number;
  }
  const placeLane = (lane: string, span = laneCols.get(lane)!.span): { cells: Cell[]; rows: number } => {
    const blocks = blocksOf.get(lane)!;
    const cells: Cell[] = [];
    if (blocks.length === 0) {
      const rows = emptyRowsOf(lane);
      cells.push({ key: graphItemKey('empty', lane), kind: 'empty', id: lane, col: 0, row: 0, cols: span, rows });
      return { cells, rows };
    }
    // COLUMNS THAT MEAN SOMETHING: a lane of loose entries, some naming a column, stands column by
    // column, each column in the lane's order and centred on the tallest.
    if (span > 1 && blocks.every((block) => block.kind === 'loose') && blocks.some((block) => columnOf.has(block.id))) {
      const stacks: Block[][] = Array.from({ length: span }, () => []);
      for (const block of blocks) {
        const named = columnOf.get(block.id);
        let at = 0;
        if (named === undefined) {
          for (let c = 1; c < span; c++) if (stacks[c]!.length < stacks[at]!.length) at = c;
        } else at = Math.min(span - 1, Math.max(0, Math.trunc(named)));
        stacks[at]!.push(block);
      }
      const rows = Math.max(...stacks.map((stack) => stack.length));
      stacks.forEach((stack, c) => {
        const first = Math.floor((rows - stack.length) / 2);
        stack.forEach((block, i) =>
          cells.push({
            key: graphItemKey('node', block.id),
            kind: 'node',
            id: block.id,
            col: c,
            row: first + i,
            cols: 1,
            rows: 1,
          }),
        );
      });
      return { cells, rows };
    }
    let row = 0;
    let col = 0;
    const cell = (key: string, kind: GraphItemKind, id: string) => {
      cells.push({ key, kind, id, col, row, cols: 1, rows: 1 });
      col += 1;
      if (col === span) {
        col = 0;
        row += 1;
      }
    };
    for (const block of blocks) {
      if (block.kind === 'loose') cell(graphItemKey('node', block.id), 'node', block.id);
      else if (block.kind === 'closed') cell(graphItemKey('summary', block.id), 'summary', block.id);
      else {
        if (col > 0) {
          col = 0;
          row += 1;
        }
        cells.push({
          key: graphItemKey('head', block.id),
          kind: 'head',
          id: block.id,
          col: 0,
          row,
          cols: span,
          rows: 1,
        });
        row += 1;
        for (const id of block.members) cell(graphItemKey('node', id), 'node', id);
        if (col > 0) {
          col = 0;
          row += 1;
        }
      }
    }
    if (col > 0) row += 1;
    return { cells, rows: row };
  };

  // ---- columns: every band as wide as the widest. A lane takes the columns it asks for; a narrower
  // band shares its spare columns out evenly, then gives each one left to the tallest lane it makes
  // shorter, so the band ends as soon as it can; when no lane gains from one, the narrowest lane
  // takes it. An empty lane gains nothing.
  const asked = (lane: string) => Math.max(1, Math.trunc(input.laneColumns?.get(lane) ?? 1));
  const widthOf = (band: GraphLayoutBand) => band.lanes.reduce((sum, lane) => sum + asked(lane), 0);
  const columns = Math.max(1, ...bands.map(widthOf));
  const laneCols = new Map<string, { col: number; span: number }>();
  for (const band of bands) {
    const even = Math.floor((columns - widthOf(band)) / Math.max(1, band.lanes.length));
    const spans = band.lanes.map((lane) => asked(lane) + even);
    const rowsAt = (i: number, span: number) => {
      const lane = band.lanes[i]!;
      return blocksOf.get(lane)!.length === 0 ? 1 : placeLane(lane, span).rows;
    };
    for (let spare = columns - spans.reduce((sum, span) => sum + span, 0); spare > 0; spare--) {
      let pick = 0;
      let best: [number, number, number] = [-1, -1, -Infinity];
      spans.forEach((span, i) => {
        const now = rowsAt(i, span);
        const gains = now > rowsAt(i, span + 1);
        const score: [number, number, number] = [gains ? 1 : 0, gains ? now : 0, -span];
        if (
          score[0] > best[0] ||
          (score[0] === best[0] && (score[1] > best[1] || (score[1] === best[1] && score[2] > best[2])))
        ) {
          best = score;
          pick = i;
        }
      });
      spans[pick]! += 1;
    }
    let col = 0;
    band.lanes.forEach((lane, i) => {
      laneCols.set(lane, { col, span: spans[i]! });
      col += spans[i]!;
    });
  }

  // ---- ordering: barycentric sweeps over the lanes, both ways
  /* An item's place for ordering: its band, then its row, then its column, as one number. */
  const rank = new Float64Array(itemLane.length);
  const rankLane = (lane: string) => {
    const b = laneBand.get(lane)!;
    const { col } = laneCols.get(lane)!;
    for (const cell of placeLane(lane).cells) {
      const index = itemIndex.get(cell.key);
      if (index !== undefined) rank[index] = b * 1e6 + cell.row * columns + col + cell.col;
    }
  };
  allLanes.forEach(rankLane);
  /* The mean place of an item's neighbours, or NaN for an item with none. */
  const barycentre = (index: number): number => {
    const list = adjacent[index]!;
    if (list.length === 0) return NaN;
    let sum = 0;
    for (const other of list) sum += rank[other]!;
    return sum / list.length;
  };
  for (let sweep = 0; sweep < GRAPH_ORDER_SWEEPS; sweep++) {
    const order = sweep % 2 === 0 ? allLanes : [...allLanes].reverse();
    for (const lane of order) {
      const blocks = blocksOf.get(lane)!;
      if (blocks.length === 0) continue;
      const keyed = blocks.map((block, position) => {
        const indices =
          block.kind === 'closed'
            ? [itemIndex.get(graphItemKey('summary', block.id))!]
            : block.members.map((id) => itemIndex.get(graphItemKey('node', id))!);
        const bary = indices.map(barycentre);
        if (block.kind === 'group') {
          const scored = block.members.map((id, i) => ({
            id,
            i,
            at: Number.isNaN(bary[i]!) ? rank[indices[i]!]! : bary[i]!,
          }));
          scored.sort((a, b) => a.at - b.at || a.i - b.i);
          block.members = scored.map((one) => one.id);
        }
        let sum = 0;
        let count = 0;
        for (const value of bary) {
          if (Number.isNaN(value)) continue;
          sum += value;
          count += 1;
        }
        return { block, position, at: count > 0 ? sum / count : rank[indices[0]!]! };
      });
      keyed.sort((a, b) => a.at - b.at || a.position - b.position);
      blocksOf.set(
        lane,
        keyed.map((one) => one.block),
      );
      rankLane(lane);
    }
  }

  // ---- geometry
  const { cardWidth, cardHeight, gutter, rowGap, laneHead, bandHead, bandGap, lanePad, margin } = metrics;
  const colX = Array.from({ length: columns }, (_, c) => margin + gutter / 2 + c * (cardWidth + gutter));
  const channelX = Array.from({ length: columns + 1 }, (_, c) => margin + c * (cardWidth + gutter));
  const placedLanes = new Map(allLanes.map((lane) => [lane, placeLane(lane)]));
  const bandRows = bands.map((band) => Math.max(1, ...band.lanes.map((lane) => placedLanes.get(lane)!.rows)));
  const bandsPlaced: GraphBandPlaced[] = [];
  const bandRowsTop: number[] = [];
  let y = margin;
  bands.forEach((band, b) => {
    const title = band.titled
      ? { x: channelX[0]!, y, width: channelX[columns]! - channelX[0]!, height: bandHead }
      : null;
    if (band.titled) y += bandHead;
    const rowsTop = y + laneHead;
    bandRowsTop.push(rowsTop);
    bandsPlaced.push({ id: band.id, index: b, title, rowsTop, rows: bandRows[b]! });
    y = rowsTop + bandRows[b]! * pitch - rowGap + lanePad + (b < bands.length - 1 ? bandGap : 0);
  });
  const bounds: CanvasRect = { x: 0, y: 0, width: channelX[columns]! + margin, height: y + margin };

  const items: GraphItem[] = [];
  const itemByKey = new Map<string, GraphItem>();
  const lanes: GraphLanePlaced[] = [];
  const occupied = bands.map((_, b) => new Uint8Array(bandRows[b]! * columns));
  const rowY = (b: number, row: number) => bandRowsTop[b]! + row * pitch;
  for (const lane of allLanes) {
    const b = laneBand.get(lane)!;
    const { col, span } = laneCols.get(lane)!;
    const { cells } = placedLanes.get(lane)!;
    const left = colX[col]!;
    const right = colX[col + span - 1]! + cardWidth;
    const rowsTop = bandRowsTop[b]!;
    const rowsBottom = rowsTop + bandRows[b]! * pitch - rowGap;
    const head: CanvasRect = { x: left, y: rowsTop - laneHead, width: right - left, height: laneHead };
    const keys: string[] = [];
    for (const cell of cells) {
      const x = colX[col + cell.col]!;
      // A header is one column wide even in a wider lane, so the channels inside the lane stay clear of it.
      const width =
        cell.cols === 1 || cell.kind === 'head' ? cardWidth : colX[col + cell.col + cell.cols - 1]! + cardWidth - x;
      // A header is the lower half of its row: the upper half is the room above its box.
      const top = rowY(b, cell.row) + (cell.kind === 'head' ? cardHeight / 2 : 0);
      const item: GraphItem = {
        key: cell.key,
        kind: cell.kind,
        id: cell.id,
        lane,
        band: b,
        col: col + cell.col,
        row: cell.row,
        cols: cell.cols,
        rows: cell.rows,
        x,
        y: top,
        width,
        height: cell.kind === 'head' ? cardHeight / 2 : cell.rows * pitch - rowGap,
      };
      items.push(item);
      itemByKey.set(item.key, item);
      keys.push(item.key);
      for (let r = cell.row; r < cell.row + cell.rows; r++) {
        for (let c = item.col; c < item.col + cell.cols; c++) occupied[b]![r * columns + c] = 1;
      }
    }
    const count = (blocksOf.get(lane) ?? []).reduce((sum, block) => sum + block.members.length, 0);
    lanes.push({
      id: lane,
      band: b,
      col,
      span,
      rows: placedLanes.get(lane)!.rows,
      panel: {
        x: left - lanePad,
        y: head.y,
        width: right - left + 2 * lanePad,
        height: rowsBottom + lanePad - head.y,
      },
      head,
      items: keys,
      count,
    });
  }

  // ---- groups: an open group's box runs from its header row to its last member
  const groupsPlaced: GraphGroupPlaced[] = [];
  const boxBottoms: { band: number; col: number; span: number; row: number }[] = [];
  for (const lane of allLanes) {
    for (const block of blocksOf.get(lane)!) {
      if (block.kind === 'loose') continue;
      if (block.kind === 'closed') {
        groupsPlaced.push({ id: block.id, lane, open: false, box: null, members: [...block.members] });
        continue;
      }
      const head = itemByKey.get(graphItemKey('head', block.id))!;
      const last = block.members.reduce((bottom, id) => {
        const item = itemByKey.get(graphItemKey('node', id))!;
        return Math.max(bottom, item.row);
      }, head.row);
      const { col, span } = laneCols.get(lane)!;
      const top = head.y;
      const bottom = rowY(head.band, last) + cardHeight + lanePad / 2;
      groupsPlaced.push({
        id: block.id,
        lane,
        open: true,
        box: {
          x: colX[col]! - lanePad / 2,
          y: top,
          width: colX[col + span - 1]! + cardWidth - colX[col]! + lanePad,
          height: bottom - top,
        },
        members: [...block.members],
      });
      boxBottoms.push({ band: head.band, col, span, row: last });
    }
  }

  // ---- streets: the gap under every row, and the middle of every band gap
  const streets: GraphStreet[] = [];
  const empties = items.filter((item) => item.kind === 'empty');
  bands.forEach((_, b) => {
    for (let row = 0; row < bandRows[b]!; row++) {
      const dirty = new Uint8Array(columns);
      const blocked = new Uint8Array(columns);
      for (const box of boxBottoms) {
        if (box.band !== b || box.row !== row) continue;
        for (let c = box.col; c < box.col + box.span; c++) dirty[c] = 1;
      }
      for (const empty of empties) {
        if (empty.band !== b || row < empty.row || row >= empty.row + empty.rows - 1) continue;
        for (let c = empty.col; c < empty.col + empty.cols; c++) blocked[c] = 1;
      }
      streets.push({ y: rowY(b, row) + cardHeight + rowGap / 2, band: b, gap: -1, dirty, blocked });
    }
  });
  bandsPlaced.forEach((band, b) => {
    if (b === 0) return;
    const above = bandRowsTop[b - 1]! + bandRows[b - 1]! * pitch - rowGap + lanePad;
    const below = band.title ? band.title.y : band.rowsTop - laneHead;
    streets.push({
      y: (above + below) / 2,
      band: -1,
      gap: b,
      dirty: new Uint8Array(columns),
      blocked: new Uint8Array(columns),
    });
  });
  streets.sort((a, b) => a.y - b.y);
  const bandStreets: number[][] = bands.map(() => []);
  const gapStreets = new Map<number, number>();
  streets.forEach((street, i) => {
    if (street.band >= 0) bandStreets[street.band]!.push(i);
    else gapStreets.set(street.gap, i);
  });

  const grid: GraphGrid = { colX, channelX, streets, bandStreets, gapStreets, occupied, bandRows, bandRowsTop };
  const itemOfNode = keyOfNode;

  const partial = { metrics, columns, itemByKey, itemOfNode, grid };
  const routed = routeAll(partial, input.edges);

  return {
    bounds,
    metrics,
    columns,
    bands: bandsPlaced,
    lanes,
    laneById: new Map(lanes.map((lane) => [lane.id, lane])),
    items,
    itemByKey,
    itemOfNode,
    groups: groupsPlaced,
    groupById: new Map(groupsPlaced.map((group) => [group.id, group])),
    routes: routed.routes,
    routeOfEdge: routed.routeOfEdge,
    grid,
  };
}

/** The parts of a layout routing reads. */
type Routable = Pick<GraphLayout, 'metrics' | 'columns' | 'itemByKey' | 'itemOfNode' | 'grid'>;

/**
 * Routes a set of edges over a layout that is already placed, such as the
 * edges a selection reveals: each pair of drawn items once, in its own tracks.
 */
export function routeGraphEdges(layout: GraphLayout, edges: readonly GraphLayoutEdge[]): GraphRoute[] {
  return routeAll(layout, edges).routes;
}

type Side = 'left' | 'right';

interface Plan {
  key: string;
  from: GraphItem;
  to: GraphItem;
  edges: string[];
  exit: Side;
  entry: Side;
  /** The channel the run leaving the source takes, and the one arriving at the target. */
  out: number;
  in: number;
  /** The street between them, when the two channels differ and no row runs straight through. */
  street: number | null;
  /** A straight run along the source's row, when the cells between are empty. */
  straight: boolean;
  fromY: number;
  toY: number;
  outX: number;
  inX: number;
  streetY: number;
}

function routeAll(
  layout: Routable,
  edges: readonly GraphLayoutEdge[],
): { routes: GraphRoute[]; routeOfEdge: Map<string, string> } {
  const { itemByKey, itemOfNode, grid, columns, metrics } = layout;
  const plans = new Map<string, Plan>();
  const routeOfEdge = new Map<string, string>();
  for (const edge of edges) {
    const a = itemOfNode.get(edge.from);
    const b = itemOfNode.get(edge.to);
    if (a === undefined || b === undefined || a === b) continue;
    const key = `${a}>${b}`;
    routeOfEdge.set(edge.id, key);
    const known = plans.get(key);
    if (known) {
      known.edges.push(edge.id);
      continue;
    }
    plans.set(key, plan(key, itemByKey.get(a)!, itemByKey.get(b)!, edge.id, grid, columns, metrics));
  }
  const list = [...plans.values()];

  // ---- ports: the edges on one side of a card spread down it, in the order of where they go
  const sides = new Map<string, { plan: Plan; end: 'from' | 'to'; toward: number }[]>();
  const attach = (item: GraphItem, side: Side, entry: { plan: Plan; end: 'from' | 'to'; toward: number }) => {
    const key = `${item.key}|${side}`;
    let list = sides.get(key);
    if (!list) sides.set(key, (list = []));
    list.push(entry);
  };
  const centre = (item: GraphItem) => item.y + item.height / 2;
  for (const one of list) {
    attach(one.from, one.exit, {
      plan: one,
      end: 'from',
      toward: one.street === null ? centre(one.to) : grid.streets[one.street]!.y,
    });
    attach(one.to, one.entry, {
      plan: one,
      end: 'to',
      toward: one.street === null ? centre(one.from) : grid.streets[one.street]!.y,
    });
  }
  for (const [key, entries] of sides) {
    const item = itemByKey.get(key.slice(0, key.lastIndexOf('|')))!;
    entries.sort((a, b) => a.toward - b.toward || byText(a.plan.key, b.plan.key));
    const top = item.y + Math.min(PORT_INSET, item.height / 4);
    const room = item.height - 2 * (top - item.y);
    entries.forEach((entry, i) => {
      const y = entries.length === 1 ? centre(item) : top + (room * (i + 0.5)) / entries.length;
      if (entry.end === 'from') entry.plan.fromY = y;
      else entry.plan.toY = y;
    });
  }

  // ---- tracks: parallel runs in one channel or street stand apart
  interface Run {
    plan: Plan;
    which: 'out' | 'in' | 'street';
    lo: number;
    hi: number;
  }
  const verticals = new Map<number, Run[]>();
  const horizontals = new Map<number, Run[]>();
  const push = <K>(map: Map<K, Run[]>, key: K, run: Run) => {
    let runs = map.get(key);
    if (!runs) map.set(key, (runs = []));
    runs.push(run);
  };
  for (const one of list) {
    if (one.straight) {
      push(verticals, one.in, {
        plan: one,
        which: 'in',
        lo: Math.min(one.fromY, one.toY),
        hi: Math.max(one.fromY, one.toY),
      });
    } else if (one.street === null) {
      push(verticals, one.out, {
        plan: one,
        which: 'out',
        lo: Math.min(one.fromY, one.toY),
        hi: Math.max(one.fromY, one.toY),
      });
    } else {
      const sy = grid.streets[one.street]!.y;
      push(verticals, one.out, { plan: one, which: 'out', lo: Math.min(one.fromY, sy), hi: Math.max(one.fromY, sy) });
      push(verticals, one.in, { plan: one, which: 'in', lo: Math.min(sy, one.toY), hi: Math.max(sy, one.toY) });
      const ax = grid.channelX[one.out]!;
      const bx = grid.channelX[one.in]!;
      push(horizontals, one.street, { plan: one, which: 'street', lo: Math.min(ax, bx), hi: Math.max(ax, bx) });
    }
  }
  const verticalRoom = Math.max(0, metrics.gutter - 2 * metrics.lanePad);
  for (const [channel, runs] of verticals) {
    const offsets = assignTracks(runs, TRACK_STEP, verticalRoom);
    runs.forEach((run, i) => {
      const x = grid.channelX[channel]! + offsets[i]!;
      if (run.which === 'out') run.plan.outX = x;
      else run.plan.inX = x;
    });
  }
  for (const [street, runs] of horizontals) {
    const offsets = assignTracks(runs, STREET_TRACK_STEP, Math.max(0, metrics.rowGap - 4));
    runs.forEach((run, i) => {
      run.plan.streetY = grid.streets[street]!.y + offsets[i]!;
    });
  }

  // ---- the drawing
  const routes: GraphRoute[] = list.map((one) => {
    const startX = one.exit === 'right' ? one.from.x + one.from.width : one.from.x;
    const endX = one.entry === 'right' ? one.to.x + one.to.width : one.to.x;
    let points: CanvasPoint[];
    if (one.straight) {
      points = [
        { x: startX, y: one.fromY },
        { x: one.inX, y: one.fromY },
        { x: one.inX, y: one.toY },
        { x: endX, y: one.toY },
      ];
    } else if (one.street === null) {
      points = [
        { x: startX, y: one.fromY },
        { x: one.outX, y: one.fromY },
        { x: one.outX, y: one.toY },
        { x: endX, y: one.toY },
      ];
    } else {
      points = [
        { x: startX, y: one.fromY },
        { x: one.outX, y: one.fromY },
        { x: one.outX, y: one.streetY },
        { x: one.inX, y: one.streetY },
        { x: one.inX, y: one.toY },
        { x: endX, y: one.toY },
      ];
    }
    points = simplify(points);
    // The line stops at the arrowhead's base, so its end never shows through the point.
    const direction = one.entry === 'right' ? -1 : 1;
    const base = { x: endX - direction * ARROW_LENGTH, y: one.toY };
    const drawn = [...points.slice(0, -1), base];
    return {
      key: one.key,
      from: one.from.key,
      to: one.to.key,
      edges: one.edges,
      points,
      d: pathOf(drawn),
      arrow: `M${n(endX)} ${n(one.toY)}L${n(base.x)} ${n(one.toY - ARROW_HALF)}L${n(base.x)} ${n(one.toY + ARROW_HALF)}Z`,
      box: boxOf(points),
    };
  });
  return { routes, routeOfEdge };
}

/** Every line between two lanes of a kind that is not drawn one by one, as one line with its count. */
export interface GraphTrunk {
  /** The two lanes, upper then lower: `services>runtime`. */
  key: string;
  from: string;
  to: string;
  /** How many edges it stands for. */
  count: number;
  d: string;
  /** Where its count is written: the middle of its run. */
  label: CanvasPoint;
  box: CanvasRect;
}

/** How far a trunk stays inside the corners of the two panels it joins. */
const TRUNK_INSET = 48;

/**
 * The trunks of a set of edges: one per pair of lanes in neighbouring bands,
 * straight down where the two panels overlap and stepped through the gap
 * between the bands where they do not. Edges inside one band have no trunk.
 */
export function graphTrunks(
  layout: Pick<GraphLayout, 'laneById'>,
  edges: readonly GraphLayoutEdge[],
  laneOf: (node: string) => string | undefined,
): GraphTrunk[] {
  const pairs = new Map<string, { upper: GraphLanePlaced; lower: GraphLanePlaced; count: number }>();
  for (const edge of edges) {
    const a = layout.laneById.get(laneOf(edge.from) ?? '');
    const b = layout.laneById.get(laneOf(edge.to) ?? '');
    if (!a || !b || Math.abs(a.band - b.band) !== 1) continue;
    const [upper, lower] = a.band < b.band ? [a, b] : [b, a];
    const key = `${upper.id}>${lower.id}`;
    const pair = pairs.get(key);
    if (pair) pair.count += 1;
    else pairs.set(key, { upper, lower, count: 1 });
  }
  return [...pairs].map(([key, { upper, lower, count }]) => {
    const from = upper.panel;
    const to = lower.panel;
    const inset = Math.min(TRUNK_INSET, from.width / 4, to.width / 4);
    const lo = Math.max(from.x, to.x) + inset;
    const hi = Math.min(from.x + from.width, to.x + to.width) - inset;
    const mid = from.x + from.width / 2;
    const left = to.x + to.width / 2 < mid;
    const x1 = lo <= hi ? Math.min(hi, Math.max(lo, mid)) : left ? from.x + inset : from.x + from.width - inset;
    const x2 = lo <= hi ? x1 : left ? to.x + to.width - inset : to.x + inset;
    const y1 = from.y + from.height;
    const y2 = to.y;
    const turn = (y1 + y2) / 2;
    const points = simplify([
      { x: x1, y: y1 },
      { x: x1, y: turn },
      { x: x2, y: turn },
      { x: x2, y: y2 },
    ]);
    return {
      key,
      from: upper.id,
      to: lower.id,
      count,
      d: pathOf(points),
      label: { x: (x1 + x2) / 2, y: turn },
      box: boxOf(points),
    };
  });
}

/** Decides which channels and street an edge takes, before ports and tracks are known. */
function plan(
  key: string,
  from: GraphItem,
  to: GraphItem,
  edge: string,
  grid: GraphGrid,
  columns: number,
  metrics: GraphMetrics,
): Plan {
  const forward = to.col > from.col;
  const back = to.col < from.col;
  const exit: Side = back ? 'left' : 'right';
  const entry: Side = forward ? 'left' : 'right';
  const out = forward ? from.col + 1 : back ? from.col : from.col + 1;
  const into = forward ? to.col : back ? to.col + 1 : to.col + 1;
  const fromY = from.y + from.height / 2;
  const toY = to.y + to.height / 2;
  const base: Plan = {
    key,
    from,
    to,
    edges: [edge],
    exit,
    entry,
    out,
    in: into,
    street: null,
    straight: false,
    fromY,
    toY,
    outX: grid.channelX[out]!,
    inX: grid.channelX[into]!,
    streetY: 0,
  };
  if (out === into && from.band === to.band) return base;
  // Straight along the source's row, when every cell it crosses is empty.
  if (from.band === to.band && from.row === to.row) {
    const lo = Math.min(from.col, to.col) + 1;
    const hi = Math.max(from.col, to.col) - 1;
    const cells = grid.occupied[from.band]!;
    let free = true;
    for (let c = lo; c <= hi && free; c++) if (cells[from.row * columns + c]) free = false;
    if (free) return { ...base, straight: true };
  }
  // Otherwise along a street: inside the band, one between the two rows, nearest the target, clear
  // of a group's edge and an empty lane's message; between bands, the gap beside the source's band.
  const lo = Math.min(fromY, toY);
  const hi = Math.max(fromY, toY);
  const crossed: number[] = [];
  for (let c = Math.min(out, into); c < Math.max(out, into); c++) crossed.push(c);
  const pitch = metrics.cardHeight + metrics.rowGap;
  if (from.band !== to.band) {
    const gap = grid.gapStreets.get(from.band < to.band ? from.band + 1 : from.band);
    return { ...base, street: gap ?? null };
  }
  const cost = (i: number) => {
    const street = grid.streets[i]!;
    const between = street.y >= lo && street.y <= hi;
    let penalty = between ? 0 : pitch * 4;
    for (const c of crossed) {
      if (street.blocked[c]) penalty += pitch * 50;
      else if (street.dirty[c]) penalty += pitch * 2;
    }
    return Math.abs(street.y - toY) + penalty;
  };
  // Outward from the street nearest the target: a street further away than the best cost so far cannot win.
  const list = grid.bandStreets[from.band]!;
  let at = 0;
  let top = list.length;
  while (at < top) {
    const mid = (at + top) >> 1;
    if (grid.streets[list[mid]!]!.y < toY) at = mid + 1;
    else top = mid;
  }
  let best = -1;
  let bestCost = Infinity;
  for (let i = at; i < list.length && grid.streets[list[i]!]!.y - toY < bestCost; i++) {
    const value = cost(list[i]!);
    if (value < bestCost) {
      bestCost = value;
      best = list[i]!;
    }
  }
  for (let i = at - 1; i >= 0 && toY - grid.streets[list[i]!]!.y < bestCost; i--) {
    const value = cost(list[i]!);
    if (value < bestCost) {
      bestCost = value;
      best = list[i]!;
    }
  }
  return { ...base, street: best < 0 ? null : best };
}

/**
 * Track offsets for runs sharing one channel: runs that overlap stand a step
 * apart, centre first, then alternating sides, within `room`. Past the room
 * the tracks wrap, and two runs share one.
 */
function assignTracks(
  runs: readonly { lo: number; hi: number; plan: { key: string } }[],
  step: number,
  room: number,
): number[] {
  const order = runs
    .map((_, i) => i)
    .sort(
      (a, b) => runs[a]!.lo - runs[b]!.lo || runs[a]!.hi - runs[b]!.hi || byText(runs[a]!.plan.key, runs[b]!.plan.key),
    );
  // First fit, by two heaps: the lowest track whose last run ended before this one starts.
  const track = new Array<number>(runs.length).fill(0);
  const busy = new Heap<[number, number]>((a, b) => a[0] - b[0] || a[1] - b[1]);
  const free = new Heap<number>((a, b) => a - b);
  let tracks = 0;
  for (const i of order) {
    const run = runs[i]!;
    while (busy.size > 0 && busy.peek()![0] < run.lo - 1) free.push(busy.pop()![1]);
    const t = free.size > 0 ? free.pop()! : tracks++;
    busy.push([run.hi, t]);
    track[i] = t;
  }
  const most = Math.max(1, Math.floor(room / step) + 1);
  return track.map((t) => {
    const slot = t % most;
    const side = slot % 2 === 0 ? 1 : -1;
    return side * Math.ceil(slot / 2) * step;
  });
}

/** A binary min-heap. */
class Heap<T> {
  private readonly items: T[] = [];
  constructor(private readonly before: (a: T, b: T) => number) {}
  get size(): number {
    return this.items.length;
  }
  peek(): T | undefined {
    return this.items[0];
  }
  push(item: T): void {
    const items = this.items;
    items.push(item);
    let at = items.length - 1;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (this.before(items[at]!, items[parent]!) >= 0) break;
      [items[at], items[parent]] = [items[parent]!, items[at]!];
      at = parent;
    }
  }
  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0 && last !== undefined) {
      items[0] = last;
      let at = 0;
      for (;;) {
        const left = at * 2 + 1;
        const right = left + 1;
        let least = at;
        if (left < items.length && this.before(items[left]!, items[least]!) < 0) least = left;
        if (right < items.length && this.before(items[right]!, items[least]!) < 0) least = right;
        if (least === at) break;
        [items[at], items[least]] = [items[least]!, items[at]!];
        at = least;
      }
    }
    return top;
  }
}

/** Orders two keys by their code units: deterministic everywhere, unlike a locale's collation, and cheap. */
function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The rectangle round a set of points, widened by the arrowhead's half width. */
function boxOf(points: readonly CanvasPoint[]): CanvasRect {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const point of points) {
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }
  return { x: left, y: top - ARROW_HALF, width: right - left, height: bottom - top + 2 * ARROW_HALF };
}

/** Drops repeated points and the middle of three in a line. */
function simplify(points: CanvasPoint[]): CanvasPoint[] {
  const out: CanvasPoint[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - point.x) < 0.01 && Math.abs(last.y - point.y) < 0.01) continue;
    const before = out[out.length - 2];
    if (before && last) {
      const inLine =
        (Math.abs(before.x - last.x) < 0.01 && Math.abs(last.x - point.x) < 0.01) ||
        (Math.abs(before.y - last.y) < 0.01 && Math.abs(last.y - point.y) < 0.01);
      if (inLine) out.pop();
    }
    out.push(point);
  }
  return out;
}

/** An orthogonal polyline with each corner rounded, never past half of either leg. */
function pathOf(points: readonly CanvasPoint[]): string {
  if (points.length === 0) return '';
  let d = `M${n(points[0]!.x)} ${n(points[0]!.y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const r = Math.min(CORNER, distance(a, b) / 2, distance(b, c) / 2);
    const inPoint = toward(b, a, r);
    const outPoint = toward(b, c, r);
    d += `L${n(inPoint.x)} ${n(inPoint.y)}Q${n(b.x)} ${n(b.y)} ${n(outPoint.x)} ${n(outPoint.y)}`;
  }
  const last = points[points.length - 1]!;
  return `${d}L${n(last.x)} ${n(last.y)}`;
}

function distance(a: CanvasPoint, b: CanvasPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function toward(from: CanvasPoint, to: CanvasPoint, by: number): CanvasPoint {
  const length = distance(from, to);
  if (length === 0) return from;
  return { x: from.x + ((to.x - from.x) * by) / length, y: from.y + ((to.y - from.y) * by) / length };
}

/** A coordinate written short: a tenth of a pixel is below what a screen draws. */
function n(value: number): string {
  return String(Math.round(value * 10) / 10);
}
