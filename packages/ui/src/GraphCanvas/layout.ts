/**
 * The layout of a layered map, as pure functions. Each lane is a frame sized
 * to what it holds: its own columns, its cards as wide as their names (up to a
 * cap, past which a name takes two lines) and as many rows as it fills. The
 * caller's bands are rows of meaning, top to bottom; the pack splits a band
 * into shelves of lanes where that fits the room better, and picks each lane's
 * columns so the whole map fits the room as large as it can. The lanes of a
 * shelf share its row grid, so an edge runs along a gap between rows or
 * lanes, never through a card. The same input always gives the same picture.
 */

import { CANVAS_FIT_MAX_ZOOM, CANVAS_FIT_PADDING } from '../Canvas/geometry.js';
import type { CanvasPoint, CanvasRect, CanvasSize } from '../Canvas/geometry.js';

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
   * Its column (from 0) in a lane whose columns mean something, such as call
   * depth. Read only for a lane with no groups; others fill row by row.
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
  /** A card whose width is not measured, and each column of an empty lane. */
  cardWidth: number;
  /** The narrowest a card sized to its name is: `cardWidth` unless named. */
  cardMinWidth?: number | undefined;
  /** The widest a card sized to its name is; a longer name takes two lines. `cardWidth` unless named. */
  cardMaxWidth?: number | undefined;
  cardHeight: number;
  /** A card whose name takes two lines: `cardHeight` unless named. */
  cardTallHeight?: number | undefined;
  /** A card's own parts with no name, which each measured name is added to. */
  cardBare?: number | undefined;
  /** The channel between two columns, where vertical runs of edges go. */
  gutter: number;
  /** The gap between two rows, where horizontal runs of edges go. */
  rowGap: number;
  /** The room a lane's header takes above its first row. */
  laneHead: number;
  /** The room a titled band's title takes above its lane headers. */
  bandHead: number;
  /** The space between two shelves, and between two lanes of one shelf. */
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
  /** The fewest columns a lane stands in, by lane id. Unlisted lanes take what the pack gives them. */
  laneColumns?: ReadonlyMap<string, number> | undefined;
  /** The height an empty lane's message takes, by lane id, set [GRAPH_EMPTY_COLUMNS] cards wide. Unlisted lanes keep one row. */
  emptyHeights?: ReadonlyMap<string, number> | undefined;
  /** Each card's width with its name on one line, by item key ([graphItemKey]). An unlisted card is `cardWidth` wide. */
  itemWidths?: ReadonlyMap<string, number> | undefined;
  /** Each lane's title width at full size, by lane id: its panel is never narrower than its title at the fit. */
  titleWidths?: ReadonlyMap<string, number> | undefined;
  /** The room the map is fitted into: [GRAPH_LAYOUT_ROOM] unless named. */
  room?: CanvasSize | undefined;
  /** The corner of the room a bar covers, in screen pixels: the top or bottom shelf leaves it clear. */
  corner?: GraphCorner | undefined;
  /** How a name is drawn at a zoom, so the cards are styled for the most names whole at the fit. */
  reading?: GraphReading | undefined;
}

/** A corner of the room something is drawn over, at its right end. */
export interface GraphCorner {
  width: number;
  height: number;
  at: 'top' | 'bottom';
}

/**
 * How the map draws a name at a zoom: at its own size, never under `tileName`
 * on screen, and nowhere under `tilesZoom`.
 */
export interface GraphReading {
  /** From this zoom up a tall card draws its name on two lines. */
  cardsZoom: number;
  /** From this zoom up to `cardsZoom`, a tall tile takes two lines where it is tall enough: see [graphTileLines]. */
  tilesZoom: number;
  /** A name's own size in the world, and the least it draws at on screen. */
  cardName: number;
  tileName: number;
}

/** How wide a card grows for its name, and whether a longer name takes a second line or is cut. */
interface CardStyle {
  cap: number;
  wrap: boolean;
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
  /** The shelf it stands on. */
  band: number;
  /** The first column and row it covers, in its shelf's grid. */
  col: number;
  row: number;
  cols: number;
  rows: number;
}

export interface GraphLanePlaced {
  id: string;
  /** The shelf it stands on. */
  band: number;
  /** The caller's band it belongs to. */
  source: number;
  /** The first column, in its shelf's grid, and how many it spans. */
  col: number;
  span: number;
  rows: number;
  /** Its panel: the header and every row it fills, with its padding. */
  panel: CanvasRect;
  /** Its header's box, above the first row. */
  head: CanvasRect;
  /** Its items, in reading order, which is the order the keyboard walks. */
  items: string[];
  /** How many entries it holds, closed groups' members included. */
  count: number;
}

/** A shelf: a row of lanes from one of the caller's bands, which may stand on several. */
export interface GraphBandPlaced {
  id: string;
  index: number;
  /** The caller's band its lanes belong to. */
  source: number;
  /** Its title's box, on the first shelf of a titled band. */
  title: CanvasRect | null;
  rowsTop: number;
  rows: number;
  /** The foot of its tallest lane. */
  bottom: number;
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
  /** The shelves, top to bottom. */
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
  /** The zoom the room fits the map at, which the pack made as large as it could. */
  fit: number;
}

/** The streets and channels edges are routed through, each shelf its own grid. */
export interface GraphGrid {
  /** Each shelf's column left edges. */
  colX: readonly (readonly number[])[];
  /** Each shelf's vertical channel centres: channel `c` is left of column `c`, the last one right of the last column. */
  channelX: readonly (readonly number[])[];
  /** Each shelf's channels clear from its top to its bottom: the ones either side of each lane. */
  alleys: readonly (readonly number[])[];
  /** How far parallel runs in a channel may spread, by shelf then channel. */
  channelRoom: readonly (readonly number[])[];
  /** How many columns each shelf has. */
  bandColumns: readonly number[];
  /** Every horizontal street, top to bottom. */
  streets: readonly GraphStreet[];
  /** Each shelf's own streets, as indices into `streets`, top to bottom. */
  bandStreets: readonly (readonly number[])[];
  /** The street in the gap above each shelf after the first, by the shelf's index. */
  gapStreets: ReadonlyMap<number, number>;
  /** Whether a cell holds anything, by shelf: `occupied[band][row * bandColumns[band] + col]`. */
  occupied: readonly Uint8Array[];
  bandRows: readonly number[];
  bandRowsTop: readonly number[];
}

export interface GraphStreet {
  y: number;
  /** The shelf whose rows it runs between, or -1 for the gap between two shelves. */
  band: number;
  /** For the gap between two shelves, the lower shelf's index; -1 otherwise. */
  gap: number;
  /** How far parallel runs along it may spread. */
  room: number;
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

/** The room a map is packed for when its caller names none: a 16:9 screen's. */
export const GRAPH_LAYOUT_ROOM: CanvasSize = { width: 1600, height: 900 };

/** How many cards wide an empty lane's message is set: one card wide, a sentence of twenty words stood eight lines tall. */
export const GRAPH_EMPTY_COLUMNS = 2;

/**
 * HOW MUCH LARGER A FIT A SPLIT BAND MUST BUY: a band on two shelves reads as
 * two rows, so the pack keeps a band whole unless splitting it fits the map
 * more than a twentieth larger.
 */
export const GRAPH_SPLIT_GAIN = 1.05;

/**
 * THE LEAST ZOOM A LANE'S TITLE IS WIDENED FOR. A title holds its size on
 * screen, so at a fit under full size it is wider in world units than its
 * frame, and under the zoom names are drawn at it is what is left to read.
 * Frames are widened for it down to a fifth; under that a title gives way.
 */
const TITLE_HOLD_FLOOR = 0.2;

/**
 * HOW MANY TIMES THE PACK SIZES THE TITLES FOR THE FIT IT FOUND, each time a
 * little over the last fit, until the titles are as wide as that fit needs:
 * wider titles lower the fit a little, so it settles in a few.
 */
const TITLE_PASSES = 8;
const TITLE_SLACK = 0.03;

/**
 * HOW TALL A TILE MUST BE ON SCREEN, in its name's own size, for that name to
 * take two lines: two lines and a tenth of a line above and below.
 */
export const GRAPH_TILE_TWO_LINES = 2.2;

/** How many lines a tile `height` tall in the world gives its name at `zoom`. */
export function graphTileLines(zoom: number, height: number, tileName: number): 1 | 2 {
  return zoom * height >= GRAPH_TILE_TWO_LINES * tileName ? 2 : 1;
}

/** How much of a second line a name fills, the line breaking between words: a judgement, nine tenths. */
const TWO_LINE_FILL = 0.9;

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

/** A lane as the pack reads it. */
export interface GraphLaneShape {
  id: string;
  /** The caller's band it belongs to. */
  source: number;
  /** How many rows it fills at `columns` columns, from `minColumns` to `maxColumns`. */
  rows: (columns: number) => number;
  minColumns: number;
  maxColumns: number;
  cardWidth: number;
  cardHeight: number;
  /** Its title's width at full size. */
  title: number;
}

/** What the pack decided: each shelf's lanes, each lane's columns, and the fit it expects. */
export interface GraphPack {
  shelves: { source: number; lanes: string[] }[];
  columns: Map<string, number>;
  fit: number;
  /** How much wider than at full size each lane's title was taken to be. */
  hold: number;
  /** How many rows each lane under the corner stands down (or up, at the bottom) to leave it clear. */
  drops: Map<string, number>;
}

interface ShelfOption {
  width: number;
  height: number;
  columns: number[];
  /** Each lane's right edge from the shelf's start, and the rows it fills. */
  rights: number[];
  rows: number[];
  pitch: number;
  /** The room above its first row: a band's title and the lane headers. */
  head: number;
}

/**
 * Packs lanes into shelves for a room: each caller's band on one shelf or a
 * few in reading order, and each lane as many columns as keeps it no taller
 * than its shelf needs. Among the packs that fit the room largest (a split
 * band must buy [GRAPH_SPLIT_GAIN]), the one with the fewest shelves.
 */
export function packGraphLanes(
  bands: readonly GraphLayoutBand[],
  shapes: ReadonlyMap<string, GraphLaneShape>,
  metrics: GraphMetrics,
  room: CanvasSize,
  corner?: GraphCorner,
): GraphPack {
  const { gutter, rowGap, laneHead, bandHead, bandGap, lanePad, margin } = metrics;
  const roomX = Math.max(1, room.width - 2 * CANVAS_FIT_PADDING);
  const roomY = Math.max(1, room.height - 2 * CANVAS_FIT_PADDING);
  const fitOf = (width: number, height: number) => Math.min(roomX / width, roomY / height);

  // The fewest columns that keep a lane at most `rows` tall: rows never grow with columns.
  const columnsFor = (shape: GraphLaneShape, rows: number): number => {
    let lo = shape.minColumns;
    let hi = shape.maxColumns;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (shape.rows(mid) <= rows) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };

  const attempt = (hold: number) => {
    const laneWidth = (shape: GraphLaneShape, columns: number) =>
      Math.max(columns * shape.cardWidth + (columns - 1) * gutter, shape.title * hold) + 2 * lanePad;
    // ---- each run of lanes one shelf could hold: its widths and heights, narrowest last
    const options = new Map<string, ShelfOption[]>();
    const shelfOptions = (b: number, start: number, end: number): ShelfOption[] => {
      const key = `${b}:${start}:${end}`;
      const known = options.get(key);
      if (known) return known;
      const lanes = bands[b]!.lanes.slice(start, end).map((id) => shapes.get(id)!);
      const pitch = Math.max(...lanes.map((shape) => shape.cardHeight)) + rowGap;
      const head = (start === 0 && bands[b]!.titled ? bandHead : 0) + laneHead;
      const least = Math.max(...lanes.map((shape) => shape.rows(shape.maxColumns)));
      const heights = new Set<number>();
      for (const shape of lanes) {
        for (let c = shape.minColumns; c <= shape.maxColumns; c++) {
          const rows = shape.rows(c);
          if (rows >= least) heights.add(rows);
          if (rows <= least) break;
        }
      }
      const found: ShelfOption[] = [];
      for (const rows of [...heights].sort((a, b) => a - b)) {
        const columns = lanes.map((shape) => columnsFor(shape, rows));
        const filled = lanes.map((shape, i) => shape.rows(columns[i]!));
        const rights: number[] = [];
        let width = 0;
        lanes.forEach((shape, i) => {
          width += (i > 0 ? bandGap : 0) + laneWidth(shape, columns[i]!);
          rights.push(width);
        });
        const height = head + Math.max(...filled) * pitch - rowGap + lanePad;
        found.push({ width, height, columns, rights, rows: filled, pitch, head });
      }
      // Widest (and shortest) first; keep only those a narrower one does not beat on height.
      found.sort((a, b) => b.width - a.width || a.height - b.height);
      const kept: ShelfOption[] = [];
      for (const option of found) {
        const last = kept[kept.length - 1];
        if (!last || option.width < last.width - 1e-6) kept.push(option);
      }
      options.set(key, kept);
      return kept;
    };
    // The shortest option of a shelf no wider than `most`: the options run widest and shortest first.
    const within = (list: readonly ShelfOption[], most: number): ShelfOption | null => {
      let lo = 0;
      let hi = list.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (list[mid]!.width <= most + 1e-6) hi = mid;
        else lo = mid + 1;
      }
      return list[lo] ?? null;
    };
    // ---- the ways each band splits into shelves, in reading order
    const splits = bands.map((band) => {
      const count = band.lanes.length;
      const out: number[][] = [];
      for (let mask = 0; mask < 1 << Math.max(0, count - 1); mask++) {
        const cuts = [0];
        for (let i = 1; i < count; i++) if (mask & (1 << (i - 1))) cuts.push(i);
        cuts.push(count);
        out.push(cuts);
      }
      return out;
    });
    const widths = new Set<number>();
    splits.forEach((list, b) => {
      for (const cuts of list) {
        for (let i = 0; i + 1 < cuts.length; i++) for (const option of shelfOptions(b, cuts[i]!, cuts[i + 1]!)) widths.add(option.width);
      }
    });
    // ---- every width the map could be held to, at each most shelves a band may take
    interface Candidate {
      fit: number;
      shelves: number;
      area: number;
      chosen: { b: number; cuts: number[]; picks: ShelfOption[] }[];
      drops: Map<string, number>;
    }
    const candidates: Candidate[] = [];
    const most = Math.max(1, ...bands.map((band) => band.lanes.length));
    const sorted = [...widths].sort((a, b) => a - b);
    for (let allowed = 1; allowed <= most; allowed++) {
      for (const width of sorted) {
        let height = 0;
        let wide = 0;
        let shelves = 0;
        const chosen: Candidate['chosen'] = [];
        let fits = true;
        for (let b = 0; b < bands.length && fits; b++) {
          let best: { height: number; wide: number; cuts: number[]; picks: ShelfOption[] } | null = null;
          for (const cuts of splits[b]!) {
            if (cuts.length - 1 > allowed) continue;
            let h = (cuts.length - 2) * bandGap;
            let w = 0;
            const picks: ShelfOption[] = [];
            for (let i = 0; i + 1 < cuts.length; i++) {
              const pick = within(shelfOptions(b, cuts[i]!, cuts[i + 1]!), width);
              if (!pick) {
                h = Infinity;
                break;
              }
              h += pick.height;
              w = Math.max(w, pick.width);
              picks.push(pick);
            }
            if (h === Infinity) continue;
            if (!best || h < best.height - 1e-6) best = { height: h, wide: w, cuts, picks };
          }
          if (!best) fits = false;
          else {
            height += best.height + (b > 0 ? bandGap : 0);
            wide = Math.max(wide, best.wide);
            shelves += best.cuts.length - 1;
            chosen.push({ b, cuts: best.cuts, picks: best.picks });
          }
        }
        if (!fits) continue;
        const w = wide + 2 * margin;
        let h = height + 2 * margin;
        const drops = new Map<string, number>();
        // THE SHELF AT THE CORNERED END KEEPS THE CORNER CLEAR: each of its lanes the corner reaches
        // over stands as many rows away as it covers, which costs nothing while the lane is shorter
        // than its shelf. Where the map is narrower than the room, the slack beside it counts.
        if (corner && corner.width > 0 && corner.height > 0) {
          const k = fitOf(w, h);
          const slackX = Math.max(0, roomX - w * k) / 2;
          const slackY = Math.max(0, roomY - h * k) / 2;
          const reach = Math.max(0, corner.width - CANVAS_FIT_PADDING - slackX) / k;
          const top = corner.at === 'top';
          const band = top ? chosen[0]! : chosen[chosen.length - 1]!;
          const index = top ? 0 : band.picks.length - 1;
          const pick = band.picks[index]!;
          const lanes = bands[band.b]!.lanes.slice(band.cuts[index]!, band.cuts[index + 1]!);
          const offset = (top ? pick.head - laneHead : 0) + margin;
          const away = Math.ceil(Math.max(0, (corner.height - CANVAS_FIT_PADDING - slackY) / k - offset) / pick.pitch);
          if (reach > 0 && away > 0) {
            let filled = 0;
            lanes.forEach((lane, i) => {
              const under = pick.rights[i]! > w - 2 * margin - reach;
              if (under) drops.set(lane, away);
              filled = Math.max(filled, pick.rows[i]! + (under ? away : 0));
            });
            h += Math.max(0, pick.head + filled * pick.pitch - rowGap + lanePad - pick.height);
          }
        }
        candidates.push({ fit: fitOf(w, h), shelves, area: w * h, chosen, drops });
      }
    }
    const capped = (one: Candidate) => Math.min(CANVAS_FIT_MAX_ZOOM, one.fit);
    const top = Math.max(...candidates.map(capped));
    let pick = candidates[0]!;
    for (const one of candidates) {
      if (capped(one) * GRAPH_SPLIT_GAIN < top) continue;
      const better =
        capped(pick) * GRAPH_SPLIT_GAIN < top ||
        one.shelves < pick.shelves ||
        (one.shelves === pick.shelves &&
          (capped(one) > capped(pick) + 1e-9 ||
            (Math.abs(capped(one) - capped(pick)) <= 1e-9 && one.area < pick.area - 1e-6)));
      if (better) pick = one;
    }
    return pick;
  };

  // A title holds its size on screen, so in world units it depends on the fit: a pack at full size
  // says about what the fit is, and each next one sizes the titles for the fit the last one found.
  let hold = 1;
  let chosen = attempt(hold);
  for (let pass = 1; pass < TITLE_PASSES; pass++) {
    const needed = 1 / Math.min(1, Math.max(TITLE_HOLD_FLOOR, chosen.fit));
    if (needed <= hold + 1e-9) break;
    // A little over the last fit, which the wider titles lower a little more.
    hold = needed * (1 + TITLE_SLACK);
    chosen = attempt(hold);
  }
  const shelves: GraphPack['shelves'] = [];
  const columns = new Map<string, number>();
  for (const { b, cuts, picks } of chosen.chosen) {
    for (let i = 0; i + 1 < cuts.length; i++) {
      const lanes = bands[b]!.lanes.slice(cuts[i]!, cuts[i + 1]!);
      lanes.forEach((lane, j) => columns.set(lane, picks[i]!.columns[j]!));
      shelves.push({ source: b, lanes: [...lanes] });
    }
  }
  return { shelves, columns, fit: chosen.fit, hold, drops: chosen.drops };
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

  // ---- each lane's cards: as wide as its widest name up to a cap, past which a name takes two
  // lines or is cut, as the style the pack picks says
  const { cardWidth, cardHeight, gutter, rowGap, laneHead, bandHead, bandGap, lanePad, margin } = metrics;
  const cardMin = Math.min(cardWidth, metrics.cardMinWidth ?? cardWidth);
  const cardMax = Math.max(cardWidth, metrics.cardMaxWidth ?? cardWidth);
  const tallHeight = Math.max(cardHeight, metrics.cardTallHeight ?? cardHeight);
  const laneKeys = new Map<string, string[]>();
  for (const lane of allLanes) {
    laneKeys.set(
      lane,
      blocksOf
        .get(lane)!
        .flatMap((block) =>
          block.kind === 'closed'
            ? [graphItemKey('summary', block.id)]
            : block.members.map((id) => graphItemKey('node', id)),
        ),
    );
  }
  const widthOf = (key: string) => input.itemWidths?.get(key) ?? cardWidth;
  const cardsFor = (style: CardStyle) => {
    const out = new Map<string, { width: number; height: number }>();
    for (const lane of allLanes) {
      const keys = laneKeys.get(lane)!;
      let widest = keys.length === 0 ? cardWidth : 0;
      // Only an entry's name takes a second line: a closed group's is a vendor's, one word.
      let longest = 0;
      for (const key of keys) {
        widest = Math.max(widest, widthOf(key));
        if (key.startsWith('node:')) longest = Math.max(longest, widthOf(key));
      }
      out.set(lane, {
        width: Math.min(style.cap, Math.max(cardMin, widest)),
        height: style.wrap && longest > style.cap + 0.5 ? tallHeight : cardHeight,
      });
    }
    return out;
  };
  // How many names a fit at `zoom` leaves whole.
  const readable = (cards: ReadonlyMap<string, { width: number; height: number }>, zoom: number): number => {
    const reading = input.reading;
    if (!reading) return 0;
    const k = Math.min(CANVAS_FIT_MAX_ZOOM, zoom);
    const bare = metrics.cardBare ?? 0;
    if (k < reading.tilesZoom) return 0;
    // A name holds a tile's size on screen, so under that it is wider in the world than at full size.
    const grown = Math.max(1, reading.tileName / (reading.cardName * k));
    let count = 0;
    for (const lane of allLanes) {
      const card = cards.get(lane)!;
      const room = card.width - bare;
      const tall = card.height > cardHeight + 0.5;
      // A second line holds a little less than the first: a line breaks between words.
      const lines =
        tall && (k >= reading.cardsZoom || graphTileLines(k, card.height, reading.tileName) === 2) ? 2 * TWO_LINE_FILL : 1;
      for (const key of laneKeys.get(lane)!) {
        const most = key.startsWith('node:') ? lines : 1;
        if ((widthOf(key) - bare) * grown <= room * most + 0.5) count += 1;
      }
    }
    return count;
  };

  // ---- rows: where each block of a lane lands
  const emptyRowsOf = (lane: string, pitch: number): number => {
    const height = input.emptyHeights?.get(lane);
    if (height === undefined || height <= 0) return 1;
    return Math.max(1, Math.ceil((height + rowGap) / pitch));
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
  const asked = (lane: string) => Math.max(1, Math.trunc(input.laneColumns?.get(lane) ?? 1));
  const named = (lane: string) =>
    blocksOf.get(lane)!.every((block) => block.kind === 'loose') &&
    blocksOf.get(lane)!.some((block) => columnOf.has(block.id));
  const placeLane = (lane: string, span: number, pitch: number): { cells: Cell[]; rows: number } => {
    const blocks = blocksOf.get(lane)!;
    const cells: Cell[] = [];
    if (blocks.length === 0) {
      const rows = emptyRowsOf(lane, pitch);
      cells.push({ key: graphItemKey('empty', lane), kind: 'empty', id: lane, col: 0, row: 0, cols: span, rows });
      return { cells, rows };
    }
    // COLUMNS THAT MEAN SOMETHING: a lane of loose entries, some naming a column, stands column by
    // column, each column in the lane's order and centred on the tallest.
    if (span > 1 && named(lane)) {
      const stacks: Block[][] = Array.from({ length: span }, () => []);
      for (const block of blocks) {
        const column = columnOf.get(block.id);
        let at = 0;
        if (column === undefined) {
          for (let c = 1; c < span; c++) if (stacks[c]!.length < stacks[at]!.length) at = c;
        } else at = Math.min(span - 1, Math.max(0, Math.trunc(column)));
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

  // ---- the pack: which lanes share a shelf, and how many columns each lane takes
  const standardPitch = cardHeight + rowGap;
  const forms = new Map<string, Omit<GraphLaneShape, 'cardWidth' | 'cardHeight'>>();
  for (const lane of allLanes) {
    const blocks = blocksOf.get(lane)!;
    const title = input.titleWidths?.get(lane) ?? 0;
    if (blocks.length === 0) {
      const columns = Math.max(asked(lane), GRAPH_EMPTY_COLUMNS);
      const rows = emptyRowsOf(lane, standardPitch);
      forms.set(lane, { id: lane, source: laneBand.get(lane)!, rows: () => rows, minColumns: columns, maxColumns: columns, title });
      continue;
    }
    // A run of cards between open groups wraps at the lane's width; past its longest run a column adds nothing.
    let run = 0;
    let longest = 1;
    let cellsCount = 0;
    for (const block of blocks) {
      if (block.kind === 'group') {
        longest = Math.max(longest, run, block.members.length);
        run = 0;
        cellsCount += block.members.length;
      } else {
        run += 1;
        cellsCount += 1;
      }
    }
    longest = Math.max(longest, run);
    // A lane whose entries name columns stands in as many as they name, or as the caller asks, past
    // which a named column is the lane's last.
    const isNamed = named(lane);
    let least = 1;
    if (isNamed && !input.laneColumns?.has(lane)) {
      for (const block of blocks) least = Math.max(least, Math.trunc(columnOf.get(block.id) ?? 0) + 1);
    }
    const maxColumns = isNamed ? cellsCount : longest;
    const minColumns = Math.min(maxColumns, Math.max(least, asked(lane)));
    const memo = new Map<number, number>();
    const rows = (columns: number) => {
      let known = memo.get(columns);
      if (known === undefined) memo.set(columns, (known = placeLane(lane, columns, standardPitch).rows));
      return known;
    };
    forms.set(lane, { id: lane, source: laneBand.get(lane)!, rows, minColumns, maxColumns, title });
  }
  // THE STYLE THAT LEAVES THE MOST NAMES WHOLE AND LEGIBLE AT THE FIT, then the largest fit: wide
  // cards and second lines read more of each name, and cost the fit the room they take.
  const caps = [cardMax, (cardWidth + cardMax) / 2, cardWidth];
  const styles: CardStyle[] =
    input.reading && input.itemWidths
      ? caps.flatMap((cap) => [
          { cap, wrap: true },
          { cap, wrap: false },
        ])
      : [{ cap: cardMax, wrap: true }];
  let chosen: { cards: Map<string, { width: number; height: number }>; packed: GraphPack; score: number } | null = null;
  for (const style of styles) {
    const cards = cardsFor(style);
    const shapes = new Map<string, GraphLaneShape>();
    for (const [lane, form] of forms) {
      const card = cards.get(lane)!;
      shapes.set(lane, { ...form, cardWidth: card.width, cardHeight: card.height });
    }
    const packed = packGraphLanes(bands, shapes, metrics, input.room ?? GRAPH_LAYOUT_ROOM, input.corner);
    const score = readable(cards, packed.fit);
    const fit = Math.min(CANVAS_FIT_MAX_ZOOM, packed.fit);
    if (
      !chosen ||
      score > chosen.score + 1e-6 ||
      (Math.abs(score - chosen.score) <= 1e-6 && fit > Math.min(CANVAS_FIT_MAX_ZOOM, chosen.packed.fit) + 1e-9)
    ) {
      chosen = { cards, packed, score };
    }
  }
  const laneCard = chosen!.cards;
  const packed = chosen!.packed;

  // ---- each shelf's lanes, their first column in the shelf's grid, and its card height and pitch
  const shelves = packed.shelves;
  const laneShelf = new Map<string, number>();
  const laneCols = new Map<string, { col: number; span: number }>();
  const shelfColumns: number[] = [];
  const shelfCard: number[] = [];
  shelves.forEach((shelf, s) => {
    let col = 0;
    for (const lane of shelf.lanes) {
      const span = packed.columns.get(lane)!;
      laneShelf.set(lane, s);
      laneCols.set(lane, { col, span });
      col += span;
    }
    shelfColumns.push(col);
    shelfCard.push(Math.max(...shelf.lanes.map((lane) => laneCard.get(lane)!.height)));
  });
  const pitchOf = (s: number) => shelfCard[s]! + rowGap;
  const widestShelf = Math.max(1, ...shelfColumns);

  // ---- ordering: barycentric sweeps over the lanes, both ways
  /* An item's place for ordering: its shelf, then its row, then its column, as one number. */
  const rank = new Float64Array(itemLane.length);
  const rankLane = (lane: string) => {
    const s = laneShelf.get(lane)!;
    const { col, span } = laneCols.get(lane)!;
    for (const cell of placeLane(lane, span, pitchOf(s)).cells) {
      const index = itemIndex.get(cell.key);
      if (index !== undefined) rank[index] = s * 1e6 + cell.row * widestShelf + col + cell.col;
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

  // ---- geometry: each shelf's lanes side by side from the left margin, each lane its own columns
  // A lane under the corner stands its drop away from it: rows down at the top, up at the bottom.
  const dropOf = (lane: string) => packed.drops.get(lane) ?? 0;
  const placedLanes = new Map(
    allLanes.map((lane) => {
      const placed = placeLane(lane, laneCols.get(lane)!.span, pitchOf(laneShelf.get(lane)!));
      return [lane, placed] as const;
    }),
  );
  const colX: number[][] = [];
  const channelX: number[][] = [];
  const alleys: number[][] = [];
  const channelRoom: number[][] = [];
  const laneLeft = new Map<string, { panel: number; first: number; right: number }>();
  let worldRight = margin;
  shelves.forEach((shelf) => {
    const xs: number[] = [];
    const channels: number[] = [];
    const rooms: number[] = [];
    const clear: number[] = [];
    let x = margin;
    shelf.lanes.forEach((lane, i) => {
      const { span } = laneCols.get(lane)!;
      const card = laneCard.get(lane)!;
      const first = x + lanePad;
      const cards = span * card.width + (span - 1) * gutter;
      const title = (input.titleWidths?.get(lane) ?? 0) * packed.hold;
      const right = x + Math.max(cards, title) + 2 * lanePad;
      // The channel left of the lane's first column is the alley before it.
      clear.push(xs.length);
      channels.push(i === 0 ? Math.max(0, x - bandGap / 2) : x - bandGap / 2);
      rooms.push(Math.max(0, bandGap - 2 * TRACK_STEP));
      for (let c = 0; c < span; c++) {
        if (c > 0) {
          channels.push(first + c * (card.width + gutter) - gutter / 2);
          rooms.push(Math.max(0, gutter - 2 * lanePad));
        }
        xs.push(first + c * (card.width + gutter));
      }
      laneLeft.set(lane, { panel: x, first, right });
      x = right + bandGap;
    });
    const end = x - bandGap;
    clear.push(xs.length);
    channels.push(end + bandGap / 2);
    rooms.push(Math.max(0, bandGap - 2 * TRACK_STEP));
    colX.push(xs);
    channelX.push(channels);
    alleys.push(clear);
    channelRoom.push(rooms);
    worldRight = Math.max(worldRight, end);
  });
  const bandRows = shelves.map((shelf) =>
    Math.max(1, ...shelf.lanes.map((lane) => placedLanes.get(lane)!.rows + dropOf(lane))),
  );
  const fromTop = input.corner?.at === 'top';
  const bandsPlaced: GraphBandPlaced[] = [];
  const bandRowsTop: number[] = [];
  let y = margin;
  shelves.forEach((shelf, s) => {
    const firstOfBand = s === 0 || shelves[s - 1]!.source !== shelf.source;
    const titled = firstOfBand && bands[shelf.source]!.titled;
    const title = titled ? { x: margin, y, width: worldRight - margin, height: bandHead } : null;
    if (titled) y += bandHead;
    const rowsTop = y + laneHead;
    bandRowsTop.push(rowsTop);
    bandsPlaced.push({
      id: firstOfBand ? bands[shelf.source]!.id : `${bands[shelf.source]!.id}:${s}`,
      index: s,
      source: shelf.source,
      title,
      rowsTop,
      rows: bandRows[s]!,
      bottom: rowsTop + bandRows[s]! * pitchOf(s) - rowGap + lanePad,
    });
    y = rowsTop + bandRows[s]! * pitchOf(s) - rowGap + lanePad + (s < shelves.length - 1 ? bandGap : 0);
  });
  const bounds: CanvasRect = { x: 0, y: 0, width: worldRight + margin, height: y + margin };

  const items: GraphItem[] = [];
  const itemByKey = new Map<string, GraphItem>();
  const lanes: GraphLanePlaced[] = [];
  const occupied = shelves.map((_, s) => new Uint8Array(bandRows[s]! * shelfColumns[s]!));
  const rowY = (s: number, row: number) => bandRowsTop[s]! + row * pitchOf(s);
  for (const lane of allLanes) {
    const s = laneShelf.get(lane)!;
    const { col, span } = laneCols.get(lane)!;
    const own = placedLanes.get(lane)!;
    const shift = fromTop ? dropOf(lane) : 0;
    const cells = shift === 0 ? own.cells : own.cells.map((cell) => ({ ...cell, row: cell.row + shift }));
    const rows = own.rows;
    const card = laneCard.get(lane)!;
    const height = shelfCard[s]!;
    const pitch = pitchOf(s);
    const at = laneLeft.get(lane)!;
    const rowsTop = bandRowsTop[s]!;
    const rowsBottom = rowsTop + (rows + shift) * pitch - rowGap;
    const head: CanvasRect = {
      x: at.first,
      y: rowsTop + shift * pitch - laneHead,
      width: at.right - lanePad - at.first,
      height: laneHead,
    };
    const keys: string[] = [];
    for (const cell of cells) {
      const x = colX[s]![col + cell.col]!;
      // A header is one column wide even in a wider lane, so the channels inside the lane stay clear of it.
      const width =
        cell.kind === 'empty'
          ? at.right - lanePad - x
          : cell.cols === 1 || cell.kind === 'head'
            ? card.width
            : colX[s]![col + cell.col + cell.cols - 1]! + card.width - x;
      // A header is the lower half of its row: the upper half is the room above its box.
      const top = rowY(s, cell.row) + (cell.kind === 'head' ? height / 2 : 0);
      const item: GraphItem = {
        key: cell.key,
        kind: cell.kind,
        id: cell.id,
        lane,
        band: s,
        col: col + cell.col,
        row: cell.row,
        cols: cell.cols,
        rows: cell.rows,
        x,
        y: top,
        width,
        height: cell.kind === 'head' ? height / 2 : cell.rows * pitch - rowGap,
      };
      items.push(item);
      itemByKey.set(item.key, item);
      keys.push(item.key);
      const columns = shelfColumns[s]!;
      for (let r = cell.row; r < cell.row + cell.rows; r++) {
        for (let c = item.col; c < Math.min(columns, item.col + cell.cols); c++) occupied[s]![r * columns + c] = 1;
      }
    }
    const count = (blocksOf.get(lane) ?? []).reduce((sum, block) => sum + block.members.length, 0);
    lanes.push({
      id: lane,
      band: s,
      source: laneBand.get(lane)!,
      col,
      span,
      rows,
      panel: {
        x: at.panel,
        y: head.y,
        width: at.right - at.panel,
        height: rowsBottom + lanePad - head.y,
      },
      head,
      items: keys,
      count,
    });
  }
  // The walk and the reading order go shelf by shelf, left to right.
  lanes.sort((a, b) => a.band - b.band || a.col - b.col);

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
      const s = head.band;
      const top = head.y;
      const bottom = rowY(s, last) + shelfCard[s]! + lanePad / 2;
      const left = colX[s]![col]!;
      groupsPlaced.push({
        id: block.id,
        lane,
        open: true,
        box: {
          x: left - lanePad / 2,
          y: top,
          width: colX[s]![col + span - 1]! + laneCard.get(lane)!.width - left + lanePad,
          height: bottom - top,
        },
        members: [...block.members],
      });
      boxBottoms.push({ band: s, col, span, row: last });
    }
  }

  // ---- streets: the gap under every row of a shelf, and the middle of every gap between shelves
  const streets: GraphStreet[] = [];
  const empties = items.filter((item) => item.kind === 'empty');
  shelves.forEach((_, s) => {
    const columns = shelfColumns[s]!;
    for (let row = 0; row < bandRows[s]!; row++) {
      const dirty = new Uint8Array(columns);
      const blocked = new Uint8Array(columns);
      for (const box of boxBottoms) {
        if (box.band !== s || box.row !== row) continue;
        for (let c = box.col; c < box.col + box.span; c++) dirty[c] = 1;
      }
      for (const empty of empties) {
        if (empty.band !== s || row < empty.row || row >= empty.row + empty.rows - 1) continue;
        for (let c = empty.col; c < Math.min(columns, empty.col + empty.cols); c++) blocked[c] = 1;
      }
      streets.push({
        y: rowY(s, row) + shelfCard[s]! + rowGap / 2,
        band: s,
        gap: -1,
        room: Math.max(0, rowGap - 4),
        dirty,
        blocked,
      });
    }
  });
  bandsPlaced.forEach((band, s) => {
    if (s === 0) return;
    const above = bandRowsTop[s - 1]! + bandRows[s - 1]! * pitchOf(s - 1) - rowGap + lanePad;
    const below = band.title ? band.title.y : band.rowsTop - laneHead;
    streets.push({
      y: (above + below) / 2,
      band: -1,
      gap: s,
      room: Math.max(0, below - above - 2 * STREET_TRACK_STEP),
      dirty: new Uint8Array(0),
      blocked: new Uint8Array(0),
    });
  });
  streets.sort((a, b) => a.y - b.y);
  const bandStreets: number[][] = shelves.map(() => []);
  const gapStreets = new Map<number, number>();
  streets.forEach((street, i) => {
    if (street.band >= 0) bandStreets[street.band]!.push(i);
    else gapStreets.set(street.gap, i);
  });

  const grid: GraphGrid = {
    colX,
    channelX,
    alleys,
    channelRoom,
    bandColumns: shelfColumns,
    streets,
    bandStreets,
    gapStreets,
    occupied,
    bandRows,
    bandRowsTop,
  };
  const itemOfNode = keyOfNode;

  const partial = { metrics, itemByKey, itemOfNode, grid };
  const routed = routeAll(partial, input.edges);

  return {
    bounds,
    metrics,
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
    fit: packed.fit,
  };
}

/** The parts of a layout routing reads. */
type Routable = Pick<GraphLayout, 'metrics' | 'itemByKey' | 'itemOfNode' | 'grid'>;

/**
 * Routes a set of edges over a layout that is already placed, such as the
 * edges a selection reveals: each pair of drawn items once, in its own tracks.
 */
export function routeGraphEdges(layout: GraphLayout, edges: readonly GraphLayoutEdge[]): GraphRoute[] {
  return routeAll(layout, edges).routes;
}

type Side = 'left' | 'right';

/** A vertical corridor: a channel of one shelf. */
interface Channel {
  band: number;
  channel: number;
}

interface Plan {
  key: string;
  from: GraphItem;
  to: GraphItem;
  edges: string[];
  exit: Side;
  entry: Side;
  /**
   * The channels the path runs up or down, in order: the one beside the
   * source, any alleys it crosses shelves by, and the one beside the target.
   */
  channels: Channel[];
  /** The street between each two channels in turn. */
  streets: number[];
  fromY: number;
  toY: number;
  /** Each channel's run, and each street's, once tracks are given. */
  xs: number[];
  ys: number[];
}

function routeAll(
  layout: Routable,
  edges: readonly GraphLayoutEdge[],
): { routes: GraphRoute[]; routeOfEdge: Map<string, string> } {
  const { itemByKey, itemOfNode, grid, metrics } = layout;
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
    plans.set(key, plan(key, itemByKey.get(a)!, itemByKey.get(b)!, edge.id, grid, metrics));
  }
  const list = [...plans.values()];
  const channelAt = (one: Channel) => grid.channelX[one.band]![one.channel]!;

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
    const first = one.streets[0];
    const last = one.streets[one.streets.length - 1];
    attach(one.from, one.exit, {
      plan: one,
      end: 'from',
      toward: first === undefined ? centre(one.to) : grid.streets[first]!.y,
    });
    attach(one.to, one.entry, {
      plan: one,
      end: 'to',
      toward: last === undefined ? centre(one.from) : grid.streets[last]!.y,
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
    /** Which of its plan's channels or streets it is. */
    at: number;
    lo: number;
    hi: number;
  }
  const verticals = new Map<string, { channel: Channel; runs: Run[] }>();
  const horizontals = new Map<number, Run[]>();
  for (const one of list) {
    const n = one.channels.length;
    one.channels.forEach((channel, i) => {
      const a = i === 0 ? one.fromY : grid.streets[one.streets[i - 1]!]!.y;
      const b = i === n - 1 ? one.toY : grid.streets[one.streets[i]!]!.y;
      const key = `${channel.band}:${channel.channel}`;
      let slot = verticals.get(key);
      if (!slot) verticals.set(key, (slot = { channel, runs: [] }));
      slot.runs.push({ plan: one, at: i, lo: Math.min(a, b), hi: Math.max(a, b) });
    });
    one.streets.forEach((street, j) => {
      const a = channelAt(one.channels[j]!);
      const b = channelAt(one.channels[j + 1]!);
      let runs = horizontals.get(street);
      if (!runs) horizontals.set(street, (runs = []));
      runs.push({ plan: one, at: j, lo: Math.min(a, b), hi: Math.max(a, b) });
    });
  }
  for (const { channel, runs } of verticals.values()) {
    const offsets = assignTracks(runs, TRACK_STEP, grid.channelRoom[channel.band]![channel.channel] ?? 0);
    runs.forEach((run, i) => {
      run.plan.xs[run.at] = channelAt(channel) + offsets[i]!;
    });
  }
  for (const [street, runs] of horizontals) {
    const offsets = assignTracks(runs, STREET_TRACK_STEP, grid.streets[street]!.room);
    runs.forEach((run, i) => {
      run.plan.ys[run.at] = grid.streets[street]!.y + offsets[i]!;
    });
  }

  // ---- the drawing
  const routes: GraphRoute[] = list.map((one) => {
    const startX = one.exit === 'right' ? one.from.x + one.from.width : one.from.x;
    const endX = one.entry === 'right' ? one.to.x + one.to.width : one.to.x;
    let points: CanvasPoint[] = [
      { x: startX, y: one.fromY },
      { x: one.xs[0]!, y: one.fromY },
    ];
    one.streets.forEach((_, j) => {
      points.push({ x: one.xs[j]!, y: one.ys[j]! }, { x: one.xs[j + 1]!, y: one.ys[j]! });
    });
    points.push({ x: one.xs[one.xs.length - 1]!, y: one.toY }, { x: endX, y: one.toY });
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
  /** The middle of its run: where its count is written while nothing is in the way there. */
  label: CanvasPoint;
  /**
   * The gap it crosses into the lower cluster: from the foot of what stands
   * above (`top`) to the lower cluster's head (`bottom`), with its level run at
   * `y` from `x1` to `x2`. Where its count may be written: see [placeTrunkLabels].
   */
  run: { x1: number; x2: number; y: number; top: number; bottom: number };
  box: CanvasRect;
}

/** How far a trunk stays inside the corners of the two panels it joins. */
const TRUNK_INSET = 48;

/**
 * The trunks of a set of edges: one per pair of lanes in neighbouring bands of
 * the caller's, straight down where the two panels overlap and stepped through
 * the gap between their shelves where they do not. Where a band stands on
 * several shelves, a trunk crosses those between by the alley nearest its
 * lower end. Edges inside one band have no trunk.
 */
export function graphTrunks(
  layout: Pick<GraphLayout, 'laneById' | 'grid' | 'bands'>,
  edges: readonly GraphLayoutEdge[],
  laneOf: (node: string) => string | undefined,
): GraphTrunk[] {
  const pairs = new Map<string, { upper: GraphLanePlaced; lower: GraphLanePlaced; count: number }>();
  for (const edge of edges) {
    const a = layout.laneById.get(laneOf(edge.from) ?? '');
    const b = layout.laneById.get(laneOf(edge.to) ?? '');
    if (!a || !b || Math.abs(a.source - b.source) !== 1) continue;
    const [upper, lower] = a.band < b.band ? [a, b] : [b, a];
    const key = `${upper.id}>${lower.id}`;
    const pair = pairs.get(key);
    if (pair) pair.count += 1;
    else pairs.set(key, { upper, lower, count: 1 });
  }
  const { grid } = layout;
  const gapY = (band: number) => grid.streets[grid.gapStreets.get(band)!]!.y;
  return [...pairs].map(([key, { upper, lower, count }]) => {
    const from = upper.panel;
    const to = lower.panel;
    const inset = Math.min(TRUNK_INSET, from.width / 4, to.width / 4);
    const lo = Math.max(from.x, to.x) + inset;
    const hi = Math.min(from.x + from.width, to.x + to.width) - inset;
    const mid = from.x + from.width / 2;
    const left = to.x + to.width / 2 < mid;
    const y1 = from.y + from.height;
    const y2 = to.y;
    let points: CanvasPoint[];
    let run: GraphTrunk['run'];
    if (lower.band === upper.band + 1) {
      const x1 = lo <= hi ? Math.min(hi, Math.max(lo, mid)) : left ? from.x + inset : from.x + from.width - inset;
      const x2 = lo <= hi ? x1 : left ? to.x + to.width - inset : to.x + inset;
      const turn = gapY(lower.band);
      points = [
        { x: x1, y: y1 },
        { x: x1, y: turn },
        { x: x2, y: turn },
        { x: x2, y: y2 },
      ];
      run = { x1, x2, y: turn, top: y1, bottom: y2 };
    } else {
      // Down into the gap under the upper shelf, through each shelf between by its alley nearest
      // the lower end, and into the gap over the lower shelf.
      const x1 = Math.min(from.x + from.width - inset, Math.max(from.x + inset, mid));
      const x2 = Math.min(to.x + to.width - inset, Math.max(to.x + inset, to.x + to.width / 2));
      points = [{ x: x1, y: y1 }];
      let x = x1;
      for (let band = upper.band + 1; band < lower.band; band++) {
        const across = grid.channelX[band]![nearestAlley(grid, band, x2)]!;
        points.push({ x, y: gapY(band) }, { x: across, y: gapY(band) });
        x = across;
      }
      const turn = gapY(lower.band);
      points.push({ x, y: turn }, { x: x2, y: turn }, { x: x2, y: y2 });
      run = { x1: x, x2, y: turn, top: layout.bands[lower.band - 1]!.bottom, bottom: y2 };
    }
    points = simplify(points);
    return {
      key,
      from: upper.id,
      to: lower.id,
      count,
      d: pathOf(points),
      label: { x: (run.x1 + run.x2) / 2, y: run.y },
      run,
      box: boxOf(points),
    };
  });
}

/** The alley of a shelf nearest `x`: a channel clear from the shelf's top to its bottom. */
function nearestAlley(grid: Pick<GraphGrid, 'alleys' | 'channelX'>, band: number, x: number): number {
  let best = 0;
  let bestDistance = Infinity;
  for (const channel of grid.alleys[band]!) {
    const distance = Math.abs(grid.channelX[band]![channel]! - x);
    if (distance < bestDistance - 1e-6) {
      bestDistance = distance;
      best = channel;
    }
  }
  return best;
}

/** How far apart two counts written in one gap stand, so they never touch. */
const LABEL_GAP = 4;

/** Where along its level run a count is tried, the middle first. */
const ALONG = [0.5, 0.25, 0.75, 0, 1];

/** How far a count tried past either end of its run still covers the trunk's corner. */
const ON_THE_CORNER = 8;

/**
 * Where each trunk's count is written, or null where no place in its gap is
 * clear of titles, cards (`obstacles`, world units) and counts already placed.
 * `sizes` is each count's box in world units at the map's zoom, by trunk key.
 */
export function placeTrunkLabels(
  trunks: readonly GraphTrunk[],
  sizes: ReadonlyMap<string, { width: number; height: number }>,
  obstacles: readonly CanvasRect[],
): Map<string, CanvasPoint | null> {
  const out = new Map<string, CanvasPoint | null>();
  const placed: CanvasRect[] = [];
  // THE LEAST FREE FIRST: a trunk that drops straight down has one place
  // across, and one with a level run has five, so the straight one is placed
  // before a longer run takes its spot; then the larger counts.
  const free = (trunk: GraphTrunk) => (trunk.run.x1 === trunk.run.x2 ? 0 : 1);
  const order = [...trunks].sort((a, b) => free(a) - free(b) || b.count - a.count || byText(a.key, b.key));
  for (const trunk of order) {
    const size = sizes.get(trunk.key);
    if (!size || size.width <= 0 || size.height <= 0) {
      out.set(trunk.key, null);
      continue;
    }
    const { x1, x2, y, top, bottom } = trunk.run;
    const { width: w, height: h } = size;
    // Along the run, then just past either end of it, still on the trunk's
    // corner: two trunks that cross share one run, often too short for two
    // counts side by side and in a gap too short to stack them.
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    const xs = [
      ...(x1 === x2 ? [x1] : ALONG.map((t) => x1 + (x2 - x1) * t)),
      lo - w / 2 + ON_THE_CORNER,
      hi + w / 2 - ON_THE_CORNER,
    ];
    const ys = [y, top + h / 2 + 1, bottom - h / 2 - 1];
    // What could stand in the way of this count: whatever is near its run.
    const near = (box: CanvasRect) =>
      box.x < Math.max(x1, x2) + w && box.x + box.width > Math.min(x1, x2) - w &&
      box.y < bottom + h && box.y + box.height > top - h;
    const against = obstacles.filter(near);
    let at: CanvasPoint | null = null;
    for (const cx of xs) {
      for (const cy of ys) {
        const box = { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
        if (against.some((other) => overlaps(box, other, 0))) continue;
        if (placed.some((other) => overlaps(box, other, LABEL_GAP))) continue;
        at = { x: cx, y: cy };
        placed.push(box);
        break;
      }
      if (at) break;
    }
    out.set(trunk.key, at);
  }
  return out;
}

function overlaps(a: CanvasRect, b: CanvasRect, gap: number): boolean {
  return (
    a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y
  );
}

/**
 * Decides which channels and streets an edge takes, before ports and tracks
 * are known. Inside one shelf, as before: a channel beside each end and the
 * street between them. Across shelves: down (or up) the channel beside the
 * source to the gap next to its shelf, through each shelf between by its
 * alley nearest the target, and into the target's shelf by the channel beside it.
 */
function plan(key: string, from: GraphItem, to: GraphItem, edge: string, grid: GraphGrid, metrics: GraphMetrics): Plan {
  const fromY = from.y + from.height / 2;
  const toY = to.y + to.height / 2;
  const base = (exit: Side, entry: Side, channels: Channel[], streets: number[]): Plan => ({
    key,
    from,
    to,
    edges: [edge],
    exit,
    entry,
    channels,
    streets,
    fromY,
    toY,
    xs: channels.map((one) => grid.channelX[one.band]![one.channel]!),
    ys: streets.map((street) => grid.streets[street]!.y),
  });
  if (from.band !== to.band) {
    const forward = to.x >= from.x + from.width;
    const back = to.x + to.width <= from.x;
    const exit: Side = back ? 'left' : 'right';
    const entry: Side = forward ? 'left' : 'right';
    const out = exit === 'right' ? from.col + 1 : from.col;
    const into = entry === 'left' ? to.col : to.col + 1;
    const step = to.band > from.band ? 1 : -1;
    const target = grid.channelX[to.band]![into]!;
    const channels: Channel[] = [{ band: from.band, channel: out }];
    const streets: number[] = [];
    for (let band = from.band; band !== to.band; band += step) {
      streets.push(grid.gapStreets.get(step > 0 ? band + 1 : band)!);
      const next = band + step;
      channels.push(next === to.band ? { band: next, channel: into } : { band: next, channel: nearestAlley(grid, next, target) });
    }
    return base(exit, entry, channels, streets);
  }
  const forward = to.col > from.col;
  const back = to.col < from.col;
  const exit: Side = back ? 'left' : 'right';
  const entry: Side = forward ? 'left' : 'right';
  const out = forward ? from.col + 1 : back ? from.col : from.col + 1;
  const into = forward ? to.col : back ? to.col + 1 : to.col + 1;
  const band = from.band;
  if (out === into) return base(exit, entry, [{ band, channel: out }], []);
  const columns = grid.bandColumns[band]!;
  // Straight along the source's row, when every cell it crosses is empty.
  if (from.row === to.row) {
    const lo = Math.min(from.col, to.col) + 1;
    const hi = Math.max(from.col, to.col) - 1;
    const cells = grid.occupied[band]!;
    let free = true;
    for (let c = lo; c <= hi && free; c++) if (cells[from.row * columns + c]) free = false;
    if (free) return base(exit, entry, [{ band, channel: into }], []);
  }
  // Otherwise along a street of the shelf: one between the two rows, nearest the target, clear of a
  // group's edge and an empty lane's message.
  const lo = Math.min(fromY, toY);
  const hi = Math.max(fromY, toY);
  const crossed: number[] = [];
  for (let c = Math.min(out, into); c < Math.max(out, into); c++) crossed.push(c);
  const pitch = metrics.cardHeight + metrics.rowGap;
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
  const list = grid.bandStreets[band]!;
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
  if (best < 0) return base(exit, entry, [{ band, channel: out }], []);
  return base(
    exit,
    entry,
    [
      { band, channel: out },
      { band, channel: into },
    ],
    [best],
  );
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
