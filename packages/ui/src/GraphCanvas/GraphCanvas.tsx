/**
 * A layered map on a canvas: entries stand in clusters (lanes) read left to
 * right, bands of clusters under each other, groups that open and close, and
 * right-angled lines from each entry to what it relies on.
 *
 * PURE PRESENTATION. Entries, edges, the selection and the trace come in as
 * props and every decision goes out through a callback; nothing is fetched.
 * The layout is `layout.ts` (pure, tested without a DOM), the walk `walk.ts`
 * and the reach `reach.ts`; this component measures, draws and listens.
 *
 * THREE FAMILIES OF LINE. `flow` is the path a request takes: drawn at rest,
 * with dashes moving along it that say which way it points (direction, never
 * volume). `support` is what something runs on: at rest it is one trunk per
 * pair of clusters, with its count. `context` is everything around (an
 * account, a repository, a monitor). The last two are drawn line by line for
 * the entry a reader stands on, or when the legend turns them on, which is
 * what keeps a few hundred entries from being a tangle.
 *
 * ONE LOOK, INSIDE THE WORLD ONLY. Outlined boxes on a fine grid, a ruled
 * glyph cell, square corners and mono labels are the drawing of clusters,
 * entries, lines and trunks. The legend, the card, the dock and the zoom bar
 * are the kit's own surfaces.
 *
 * IT STAYS LIGHT AT THOUSANDS OF ENTRIES. Every card is one size, so nothing
 * is measured per card; only the cards near the view are mounted; edges are a
 * few paths rather than one element each; and zoomed out past legibility the
 * cards are drawn as shapes on one layer rather than as elements at all.
 */

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import {
  ChevronDownGlyph,
  ChevronRightGlyph,
  CircleAlertGlyph,
  InfoGlyph,
  TriangleAlertGlyph,
} from '@crewlethq/icons/glyphs';
import {
  CANVAS_FIT_PADDING,
  Canvas,
  fitView,
  type CanvasGround,
  type CanvasHandle,
  type CanvasLabels,
  type CanvasPoint,
  type CanvasRect,
  type CanvasSize,
  type CanvasView,
} from '../Canvas/index.js';
import { FilterChip } from '../FilterChip/index.js';
import { FullscreenToggle } from '../Fullscreen/index.js';
import { LayerHost } from '../Layer/index.js';
import { Text } from '../Text/index.js';
import { isTypeAheadKey, typeAheadBuffer, useMeasuredSizes, type TypeAheadState } from '../Tree/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import {
  graphItemKey,
  graphTrunks,
  layoutGraph,
  routeGraphEdges,
  type GraphItem,
  type GraphLayout,
  type GraphLayoutEdge,
  type GraphMetrics,
  type GraphRoute,
} from './layout.js';
import { graphNeighbourhood, graphReach, type GraphReach, type GraphTraceDirection } from './reach.js';
import { graphStep } from './walk.js';

/** A lane: one column of the map, or several in a band with fewer lanes. */
export interface GraphLane {
  id: string;
  /** Its name, set into its outline: "Runtime". */
  label: string;
  /** How many columns of entries it is wide. One unless named. */
  columns?: number | undefined;
  /** What an empty lane says would fill it. Drawn in the lane, and read when the walk reaches it. */
  empty?: ReactNode;
}

/** A band of lanes. The first is the map's main row; a later one is drawn under it. */
export interface GraphBand {
  id: string;
  /** A title drawn over a later band, such as "Around it". */
  label?: string | undefined;
  lanes: readonly GraphLane[];
}

/** A group of entries inside one lane, drawn as a box with a header, or closed to one card. */
export interface GraphGroup {
  id: string;
  lane: string;
  /** Its name: "AWS". */
  label: string;
  /** A mark ahead of the name, such as a vendor's. Decorative: the label is read. */
  lead?: ReactNode;
}

/**
 * What needs attention on an entry: a notch on its leading edge in the tone,
 * and a badge with a glyph. Never colour alone, so the word is read with it.
 */
export type GraphAttentionTone = 'danger' | 'warning' | 'info';

export interface GraphAttention {
  tone: GraphAttentionTone;
  /** The word a screen reader hears, such as "Alerting". */
  label: string;
  /** Drawn in the badge in place of the tone's own glyph. */
  glyph?: ReactNode;
}

/** What a line says: a call, what something runs on, or what stands around it. */
export type GraphEdgeFamily = 'flow' | 'support' | 'context';

export const GRAPH_EDGE_FAMILIES: readonly GraphEdgeFamily[] = ['flow', 'support', 'context'];

export interface GraphNode {
  id: string;
  lane: string;
  group?: string | undefined;
  /** The column of its lane it stands in, from 0, in a lane of several: see [GraphLayoutNode]. */
  column?: number | undefined;
  /** Its name, on one line: "orders-db". */
  name: string;
  /** The whole name, where `name` is a short form of it: the hover text, and what is read. */
  title?: string | undefined;
  /** Read after the name and never drawn, a card being one line: "postgres 16, eu-west-1". */
  caption?: string | undefined;
  /** What it is, read after the name: "Database". */
  kind?: string | undefined;
  /** The kind's glyph, drawn in the cell at the card's start. */
  glyph?: ReactNode;
  /** A small mark on the cell's corner, such as a vendor's. Decorative. */
  mark?: ReactNode;
  /** A notch and a badge, only when something needs a person. */
  attention?: GraphAttention | undefined;
  /** Not confirmed by anyone the map trusts: drawn with a dashed edge. */
  unconfirmed?: boolean | undefined;
}

/** An edge from the entry that relies to the entry relied on. */
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  /** The relation, as words a reader hears in a card's description: "runs on". */
  label?: string | undefined;
  /** What it says, which decides how and when it is drawn. A call (`flow`) unless named. */
  family?: GraphEdgeFamily | undefined;
}

/** What a trace lights from the selected entry: which way, and how many hops. */
export interface GraphTrace {
  direction: GraphTraceDirection;
  /** At least one; `Infinity` for no limit. */
  depth: number;
}

/** A relation in a card's spoken description. */
export interface GraphRelationText {
  relation: string | undefined;
  name: string;
}

/** Every string the map says on its own, for another language. */
export interface GraphCanvasLabels extends CanvasLabels {
  /** A lane's name with its count: "Runtime, 3 entries". */
  lane: (label: string, count: number) => string;
  /** A count of entries, under a closed group's name and beside an open one's. */
  entries: (count: number) => string;
  /** An open group's header: "AWS, 12 entries, open". */
  openGroup: (label: string, count: number) => string;
  /** A closed group's card: "AWS, 42 entries, closed". */
  closedGroup: (label: string, count: number) => string;
  /** An empty lane, before its message: "Runtime, empty". */
  emptyLane: (label: string) => string;
  /** Read after an unconfirmed entry's name. */
  unconfirmed: string;
  /** A card's description: what it relies on and what relies on it. */
  relations: (dependsOn: readonly GraphRelationText[], usedBy: readonly GraphRelationText[]) => string;
  /** The legend's name. */
  legend: string;
  /** Each family of line, as its legend switch says it. */
  families: Record<GraphEdgeFamily, string>;
  /** The legend's key for an entry nothing is wrong with. */
  quiet: string;
  /** On a trunk between two clusters: how many lines it stands for. */
  trunk: (lines: number) => string;
  /** The fullscreen control's two names. */
  fullscreen: string;
  leaveFullscreen: string;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const relationWords = (list: readonly GraphRelationText[]) =>
  list.map((one) => `${one.relation ?? 'depends on'} ${one.name}`).join(', ');

export const GRAPH_CANVAS_LABELS: GraphCanvasLabels = {
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Fit to view',
  actualSize: 'Zoom to 100%',
  zoom: (percent) => `Zoom is ${percent} percent. Set a zoom level`,
  zoomLevel: 'Zoom level, percent',
  done: 'Done',
  keys: 'Arrow keys move between items and lanes, Enter selects an item or opens a group, and Escape clears the selection. Plus and minus zoom, and zero fits the map in view.',
  lane: (label, count) => `${label}, ${plural(count, 'item', 'items')}`,
  entries: (count) => plural(count, 'item', 'items'),
  openGroup: (label, count) => `${label}, ${plural(count, 'item', 'items')}, open`,
  closedGroup: (label, count) => `${label}, ${plural(count, 'item', 'items')}, closed`,
  emptyLane: (label) => `${label}, empty`,
  unconfirmed: 'Unconfirmed',
  relations: (dependsOn, usedBy) => {
    const parts: string[] = [];
    if (dependsOn.length > 0) parts.push(`${relationWords(dependsOn)}.`);
    if (usedBy.length > 0) parts.push(`Used by ${usedBy.map((one) => one.name).join(', ')}.`);
    return parts.join(' ');
  },
  legend: 'Legend',
  families: { flow: 'Calls', support: 'Runs on', context: 'Around it' },
  quiet: 'Quiet',
  trunk: (lines) => `${lines} run on`,
  fullscreen: 'Fullscreen',
  leaveFullscreen: 'Leave fullscreen',
};

/**
 * THE ZOOM BELOW WHICH CARDS ARE SHAPES. At half size a 13px name draws at
 * about 6.5px, the least that still reads as words; below it a card's text is
 * texture, so the map draws every card as a shape on one layer instead.
 */
export const GRAPH_CANVAS_DETAIL_ZOOM = 0.5;

/**
 * THE ZOOM A MAP TOO LARGE TO READ WHOLE OPENS AT, on its start: a card's
 * 13px name draws at about 10px, and five lanes still fit across a laptop.
 */
export const GRAPH_CANVAS_OPEN_ZOOM = 0.75;

/**
 * THE LOWEST ZOOM A FIT TAKES, so the whole map is one press away however
 * large: two thousand entries in five lanes fit at about a twentieth.
 */
export const GRAPH_CANVAS_FIT_FLOOR = 0.02;

/**
 * HOW MANY MOVING LINES A VIEW CARRIES. Past this many calls in view the
 * dashes at rest stand still: a few hundred animated dashes cost every frame
 * and say nothing a reader can follow. The lit path always moves.
 */
export const GRAPH_CANVAS_FLOW_LIMIT = 160;

/** How long the pointer rests on a card before its neighbours light, and how long after it leaves, in ms. */
const POINT_IN_MS = 90;
const POINT_OUT_MS = 120;
/** How far a press may travel and still be a press on the ground rather than a drag. */
const PRESS_SLOP = 4;
/**
 * The width, in CSS pixels, under which a map is narrow: its legend and its
 * dock stand under the picture instead of over it, so neither ever covers an entry.
 */
export const GRAPH_CANVAS_NARROW_WIDTH = 800;

/** The room between a card and the card drawn beside it, and between that card and the frame. */
const CARD_GAP = 12;
const CARD_INSET = 8;

/** What a screen can ask of a map it holds a ref to. */
export interface GraphCanvasHandle {
  /** Moves focus to an entry's card, opening its group and bringing it into view. */
  focusNode(id: string): void;
  /** Shows the whole map. */
  fit(): void;
}

export interface GraphCanvasProps {
  /** The map's accessible name: "Atlas map". */
  label: string;
  bands: readonly GraphBand[];
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  groups?: readonly GraphGroup[] | undefined;
  /**
   * Groups start closed when the map holds more entries than this, so a large
   * map opens as a summary. Unset, every group starts open.
   */
  collapseAbove?: number | undefined;
  /** The open groups, when the caller holds them. */
  openGroups?: ReadonlySet<string> | undefined;
  /** Called with the open groups whenever one opens or closes. */
  onOpenGroupsChange?: ((open: ReadonlySet<string>) => void) | undefined;
  selectedId?: string | null | undefined;
  /** A press or Enter on a card selects it; the same on the selected card, a press on the ground or Escape clears with `null`. */
  onSelect?: ((id: string | null) => void) | undefined;
  /**
   * How far the selection lights along the lines that carry a failure (calls
   * and what things run on). Unset, the whole path both ways. What stands
   * around the selection is lit one step away whatever the trace.
   */
  trace?: GraphTrace | null | undefined;
  /** The entry another surface points at, such as a table row under the pointer: lit as the pointer lights one. */
  hoveredId?: string | null | undefined;
  /** Called with the entry the pointer or focus rests on, and `null` when it leaves. */
  onHover?: ((id: string | null) => void) | undefined;
  /** The card drawn beside the entry the pointer or focus rests on. */
  renderCard?: ((id: string) => ReactNode) | undefined;
  /** Drawn over the map's lower edge, such as what is selected and what can be done with it. */
  dock?: ReactNode;
  /** The families of line drawn at rest, when the caller holds them. Calls alone unless named. */
  families?: ReadonlySet<GraphEdgeFamily> | undefined;
  /** Called with the families drawn at rest whenever the legend switches one. */
  onFamiliesChange?: ((families: ReadonlySet<GraphEdgeFamily>) => void) | undefined;
  /** The word for each tone, for the legend and each cluster's tally: "Alerting". A tone with no word has no key. */
  tones?: Partial<Record<GraphAttentionTone, string>> | undefined;
  /**
   * The zoom bar, the legend, the trunks and fullscreen. Off for a small,
   * still diagram, such as one entry among its neighbours.
   */
  chrome?: boolean | undefined;
  /**
   * The fullscreen control in the zoom bar. On by default, taking the map
   * itself; pass the element to take instead where the map opens something
   * beside it (a detail sheet), since a fullscreen element paints only its
   * own subtree.
   */
  fullscreen?: boolean | RefObject<HTMLElement | null> | undefined;
  /** A card pushed back, such as one a legend filter leaves out. */
  cardDimmed?: ((id: string) => boolean) | undefined;
  /** Drawn over the canvas without the transform. */
  overlay?: ReactNode;
  controlsPlacement?: 'top-right' | 'bottom-right' | undefined;
  controlsExtra?: ReactNode;
  controlsBelow?: ReactNode;
  /** A bar in the corner opposite the zoom bar, such as the trace switch. */
  controlsStart?: ReactNode;
  /** More in the bar across from the zoom bar, after the legend. */
  overlayEnd?: ReactNode;
  hint?: ReactNode;
  ground?: CanvasGround | undefined;
  labels?: Partial<GraphCanvasLabels> | undefined;
  /** The lowest zoom a fit may take: [GRAPH_CANVAS_FIT_FLOOR] unless named. */
  minZoom?: number | undefined;
  /** Fits the whole map again whenever this changes. */
  fitKey?: string | number | undefined;
  /** The view to open on instead of the opening fit. */
  initialView?: CanvasView | undefined;
  onViewChange?: ((view: CanvasView, viewport: CanvasSize) => void) | undefined;
  ref?: Ref<GraphCanvasHandle> | undefined;
  className?: string | undefined;
}

const CARD_PROBE = 'crewlet:graph-canvas-card';
const GAP_PROBE = 'crewlet:graph-canvas-gap';
const PAD_PROBE = 'crewlet:graph-canvas-pad';
const HEAD_PROBE = 'crewlet:graph-canvas-head';
const BAND_PROBE = 'crewlet:graph-canvas-band';
const PROBES = [CARD_PROBE, GAP_PROBE, PAD_PROBE, HEAD_PROBE, BAND_PROBE];
const emptyProbe = (lane: string) => `crewlet:graph-canvas-empty:${lane}`;

const NO_GROUPS: readonly GraphGroup[] = [];
const AT_REST: ReadonlySet<GraphEdgeFamily> = new Set<GraphEdgeFamily>(['flow']);
const FAMILY_RANK: Record<GraphEdgeFamily, number> = { context: 0, support: 1, flow: 2 };
const TONES: readonly GraphAttentionTone[] = ['danger', 'warning', 'info'];
type EdgeState = 'dim' | 'rest' | 'lit';
const EDGE_STATES: readonly EdgeState[] = ['dim', 'rest', 'lit'];
const DRAW_ORDER: readonly GraphEdgeFamily[] = ['context', 'support', 'flow'];
const TONE_RANK: Record<GraphAttentionTone, number> = { info: 1, warning: 2, danger: 3 };

/** The part of the world that is mounted: what is near the view, with room to pan before it moves. */
export interface GraphWindow {
  rect: CanvasRect;
  /** Whether cards are drawn as cards, or as shapes for a zoom too far out to read. */
  detail: boolean;
}

export function GraphCanvas({
  label,
  bands,
  nodes,
  edges,
  groups = NO_GROUPS,
  collapseAbove,
  openGroups,
  onOpenGroupsChange,
  selectedId = null,
  onSelect,
  trace = null,
  hoveredId = null,
  onHover,
  renderCard,
  dock,
  families,
  onFamiliesChange,
  tones,
  chrome = true,
  fullscreen = true,
  cardDimmed,
  overlay,
  controlsPlacement,
  controlsExtra,
  controlsBelow,
  controlsStart,
  overlayEnd,
  hint,
  ground,
  labels,
  minZoom = GRAPH_CANVAS_FIT_FLOOR,
  fitKey,
  initialView,
  onViewChange,
  ref,
  className,
}: GraphCanvasProps) {
  const text = useMemo(() => ({ ...GRAPH_CANVAS_LABELS, ...labels }), [labels]);
  const uid = useId();

  // ---- what the caller handed in, indexed ---------------------------------
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const familyOf = useMemo(() => new Map(edges.map((edge) => [edge.id, edge.family ?? 'flow'])), [edges]);
  // ---- which families of line are drawn at rest ---------------------------
  const [ownFamilies, setOwnFamilies] = useState<ReadonlySet<GraphEdgeFamily>>(AT_REST);
  const shown = families ?? ownFamilies;
  const toggleFamily = useCallback(
    (family: GraphEdgeFamily) => {
      const next = new Set(shown);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      if (!families) setOwnFamilies(next);
      onFamiliesChange?.(next);
    },
    [shown, families, onFamiliesChange],
  );
  const restEdges = useMemo(() => edges.filter((edge) => shown.has(edge.family ?? 'flow')), [edges, shown]);
  // WHAT RELIES ON WHAT: a call and a "runs on" both carry a failure upstream; what stands around does not.
  const carrying = useMemo(() => edges.filter((edge) => (edge.family ?? 'flow') !== 'context'), [edges]);
  const groupOf = useCallback((id: string) => nodeById.get(id)?.group, [nodeById]);

  // ---- which groups are open ----------------------------------------------
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const startClosed = collapseAbove !== undefined && nodes.length > collapseAbove;
  const openSet = useMemo(() => {
    if (openGroups) return openGroups;
    const out = new Set<string>();
    for (const group of groups) if (toggled.get(group.id) ?? !startClosed) out.add(group.id);
    return out;
  }, [openGroups, groups, toggled, startClosed]);
  const setGroupOpen = useCallback(
    (id: string, open: boolean) => {
      if (openSet.has(id) === open) return;
      const next = new Set(openSet);
      if (open) next.add(id);
      else next.delete(id);
      if (!openGroups) setToggled((was) => new Map(was).set(id, open));
      onOpenGroupsChange?.(next);
    },
    [openSet, openGroups, onOpenGroupsChange],
  );

  // ---- measuring -------------------------------------------------------------
  const { measure, sizes, measured } = useMeasuredSizes();
  const metrics = useMemo<GraphMetrics | null>(() => {
    if (!measured(PROBES)) return null;
    const card = sizes.get(CARD_PROBE)!;
    const gap = sizes.get(GAP_PROBE)!;
    const pad = sizes.get(PAD_PROBE)!;
    return {
      cardWidth: card.width,
      cardHeight: card.height,
      gutter: gap.width,
      rowGap: gap.height,
      laneHead: sizes.get(HEAD_PROBE)!.height,
      bandHead: sizes.get(BAND_PROBE)!.height,
      bandGap: pad.height,
      lanePad: pad.width,
      margin: pad.height,
    };
  }, [measured, sizes]);

  const emptyLanes = useMemo(() => {
    const filled = new Set(nodes.map((node) => node.lane));
    return bands.flatMap((band) => band.lanes.filter((lane) => !filled.has(lane.id)));
  }, [bands, nodes]);
  const emptyHeights = useMemo(() => {
    const out = new Map<string, number>();
    for (const lane of emptyLanes) {
      const size = sizes.get(emptyProbe(lane.id));
      if (size) out.set(lane.id, size.height);
    }
    return out;
  }, [emptyLanes, sizes]);

  // ---- the layout --------------------------------------------------------------
  const layoutBands = useMemo(
    () => bands.map((band) => ({ id: band.id, titled: Boolean(band.label), lanes: band.lanes.map((lane) => lane.id) })),
    [bands],
  );
  const laneColumns = useMemo(() => {
    const out = new Map<string, number>();
    for (const band of bands) for (const lane of band.lanes) if (lane.columns !== undefined) out.set(lane.id, lane.columns);
    return out;
  }, [bands]);
  const layout = useMemo<GraphLayout | null>(() => {
    if (!metrics) return null;
    return layoutGraph(
      {
        bands: layoutBands,
        nodes,
        groups,
        open: (id) => openSet.has(id),
        edges: restEdges,
        ordering: carrying,
        laneColumns,
        emptyHeights,
      },
      metrics,
    );
  }, [metrics, layoutBands, nodes, groups, openSet, restEdges, carrying, laneColumns, emptyHeights]);
  // The first placement waits for every empty lane's message; a lane emptied later is measured in place.
  const everPlaced = useRef(false);
  const placed = layout !== null && (everPlaced.current || measured(emptyLanes.map((lane) => emptyProbe(lane.id))));
  if (placed) everPlaced.current = true;
  const laneOf = useMemo(() => new Map(bands.flatMap((band) => band.lanes.map((lane) => [lane.id, lane]))), [bands]);

  // ---- selection, trace and what is pushed back ---------------------------------
  // THE POINTER AND FOCUS LIGHT AS A SELECTION DOES, one step out, after a short rest so a pass over the map lights nothing.
  const [own, setOwn] = useState<string | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const pointTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverNow = useRef(onHover);
  hoverNow.current = onHover;
  const point = useCallback((id: string | null, delay: number) => {
    clearTimeout(pointTimer.current);
    const land = () => {
      setOwn(id);
      setCard(id);
      hoverNow.current?.(id);
    };
    if (delay === 0) land();
    else pointTimer.current = setTimeout(land, delay);
  }, []);
  useEffect(() => () => clearTimeout(pointTimer.current), []);
  const pointed = own ?? hoveredId;

  const reach = useMemo<GraphReach | null>(() => {
    const focus = selectedId !== null && nodeById.has(selectedId) ? selectedId : null;
    const beside = pointed !== null && nodeById.has(pointed) ? pointed : null;
    if (focus === null) return beside === null ? null : graphNeighbourhood(edges, beside);
    const far = graphReach(carrying, focus, trace?.direction ?? 'both', trace?.depth ?? Infinity);
    const near = graphNeighbourhood(edges, focus);
    const reached = new Map(far.nodes);
    for (const [id, hops] of near.nodes) if (!reached.has(id)) reached.set(id, hops);
    // The entry under the pointer stays lit beside a selection, so a card never opens on a ghost.
    if (beside !== null && !reached.has(beside)) reached.set(beside, Infinity);
    return { nodes: reached, edges: new Set([...far.edges, ...near.edges]) };
  }, [selectedId, pointed, nodeById, trace, edges, carrying]);
  const focusState = reach === null ? undefined : selectedId !== null && nodeById.has(selectedId) ? 'selected' : 'hover';
  const nodeDimmed = useCallback(
    (id: string) => Boolean(cardDimmed?.(id)) || (reach !== null && !reach.nodes.has(id)),
    [cardDimmed, reach],
  );

  // A selection inside a closed group opens it, so the selected card is drawn.
  const selectedGroup = selectedId === null ? undefined : groupOf(selectedId);
  // Once per selection, so a reader can close the group again afterwards.
  const anchorNext = useRef<{ key: string; before: CanvasPoint } | null>(null);
  const openedFor = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!layout || selectedId === openedFor.current) return;
    openedFor.current = selectedId;
    if (selectedId === null || selectedGroup === undefined || openSet.has(selectedGroup)) return;
    const summary = layout.itemByKey.get(graphItemKey('summary', selectedGroup));
    if (summary) anchorNext.current = { key: graphItemKey('node', selectedId), before: summary };
    setGroupOpen(selectedGroup, true);
  }, [selectedGroup, selectedId, openSet, layout, setGroupOpen]);

  // ---- the edges, as one layer per family and state ----------------------------------
  const drawn = useMemo(() => {
    if (!layout) return null;
    const strongest = (ids: readonly string[], only?: ReadonlySet<string>): GraphEdgeFamily => {
      let best: GraphEdgeFamily = 'context';
      for (const id of ids) {
        if (only && !only.has(id)) continue;
        const family = familyOf.get(id) ?? 'flow';
        if (FAMILY_RANK[family] > FAMILY_RANK[best]) best = family;
      }
      return best;
    };
    // A lit edge with no route at rest lights the route already between its two items, or is routed on top.
    const borrowed = new Map<string, string[]>();
    const extra: GraphLayoutEdge[] = [];
    const known = new Set(layout.routes.map((route) => route.key));
    if (reach) {
      for (const edge of edges) {
        if (!reach.edges.has(edge.id) || layout.routeOfEdge.has(edge.id)) continue;
        const from = layout.itemOfNode.get(edge.from);
        const to = layout.itemOfNode.get(edge.to);
        if (from === undefined || to === undefined || from === to) continue;
        const key = `${from}>${to}`;
        if (!known.has(key)) extra.push(edge);
        else borrowed.set(key, [...(borrowed.get(key) ?? []), edge.id]);
      }
    }
    const itemDimmed = (key: string) => {
      const item = layout.itemByKey.get(key)!;
      if (item.kind === 'node') return nodeDimmed(item.id);
      return layout.groupById.get(item.id)?.members.every(nodeDimmed) ?? false;
    };
    const layers = new Map<string, GraphRoute[]>();
    const put = (family: GraphEdgeFamily, state: EdgeState, route: GraphRoute) => {
      const key = `${family}:${state}`;
      const list = layers.get(key);
      if (list) list.push(route);
      else layers.set(key, [route]);
    };
    for (const route of layout.routes) {
      const also = borrowed.get(route.key);
      const lit = reach !== null && (also !== undefined || route.edges.some((id) => reach.edges.has(id)));
      if (lit) put(strongest(also ? [...route.edges, ...also] : route.edges, reach.edges), 'lit', route);
      else if (reach || itemDimmed(route.from) || itemDimmed(route.to)) put(strongest(route.edges), 'dim', route);
      else put(strongest(route.edges), 'rest', route);
    }
    for (const route of routeGraphEdges(layout, extra)) put(strongest(route.edges), 'lit', route);
    return { layers, itemDimmed };
  }, [layout, reach, edges, nodeDimmed, familyOf]);

  // TRUNKS: while what things run on is not drawn line by line, each pair of clusters it joins is one line with its count.
  const laneOfNode = useCallback((id: string) => nodeById.get(id)?.lane, [nodeById]);
  const trunks = useMemo(() => {
    if (!layout || !chrome || shown.has('support')) return [];
    return graphTrunks(
      layout,
      edges.filter((edge) => edge.family === 'support'),
      laneOfNode,
    );
  }, [layout, chrome, shown, edges, laneOfNode]);

  // ---- what each card says about its relations -------------------------------------
  const relationsOf = useMemo(() => {
    const out = new Map<string, { dependsOn: GraphRelationText[]; usedBy: GraphRelationText[] }>();
    const entry = (id: string) => {
      let one = out.get(id);
      if (!one) out.set(id, (one = { dependsOn: [], usedBy: [] }));
      return one;
    };
    for (const edge of edges) {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to || from === to) continue;
      entry(from.id).dependsOn.push({ relation: edge.label, name: to.name });
      entry(to.id).usedBy.push({ relation: edge.label, name: from.name });
    }
    return out;
  }, [edges, nodeById]);

  // ---- the window that is mounted --------------------------------------------------
  const canvas = useRef<CanvasHandle>(null);
  const [mounted, setMounted] = useState<GraphWindow | null>(null);
  const mountedNow = useRef(mounted);
  mountedNow.current = mounted;
  const viewport = useRef<CanvasSize | null>(null);
  const placeCardNow = useRef<() => void>(() => {});
  const viewChanged = useCallback(
    (view: CanvasView, size: CanvasSize) => {
      onViewChange?.(view, size);
      viewport.current = size;
      placeCardNow.current();
      const next = graphWindow(mountedNow.current, view, size);
      if (next !== mountedNow.current) setMounted(next);
    },
    [onViewChange],
  );

  // Each layer near the mounted window as one path; the lit ones always, whole.
  const paths = useMemo(() => {
    if (!drawn) return null;
    const near = (route: GraphRoute) => !mounted || intersects(route.box, mounted.rect);
    const out = new Map<string, { d: string; arrow: string; count: number }>();
    for (const [key, list] of drawn.layers) {
      const kept = key.endsWith(':lit') ? list : list.filter(near);
      out.set(key, {
        d: kept.map((route) => route.d).join(''),
        arrow: kept.map((route) => route.arrow).join(''),
        count: kept.length,
      });
    }
    return out;
  }, [drawn, mounted]);
  const still = (paths?.get('flow:rest')?.count ?? 0) > GRAPH_CANVAS_FLOW_LIMIT;

  // ---- the card beside the entry the pointer or focus rests on -----------------------
  const cardEl = useRef<HTMLDivElement>(null);
  const cardItem = card === null || !renderCard || !layout ? undefined : layout.itemByKey.get(graphItemKey('node', card));
  // Placed by hand on every move of the view, so a pan never re-renders the map to move one card.
  placeCardNow.current = () => {
    const el = cardEl.current;
    const size = viewport.current;
    if (!el || !cardItem || !size || !canvas.current) return;
    const at = canvas.current.screenRect(cardItem);
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const fitsAfter = at.x + at.width + CARD_GAP + width <= size.width - CARD_INSET;
    const left = fitsAfter ? at.x + at.width + CARD_GAP : Math.max(CARD_INSET, at.x - CARD_GAP - width);
    const top = Math.max(CARD_INSET, Math.min(at.y - CARD_GAP, size.height - height - CARD_INSET));
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  useLayoutEffect(() => placeCardNow.current());

  // ---- the opening view: whole when it reads, else the map's start at a size that does ----
  const root = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<CanvasSize | null>(null);
  // A narrow map has no room to float anything over the picture, so its legend and dock stand under it.
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (!box || box.width <= 0 || box.height <= 0) return;
      setFrame((was) => was ?? { width: box.width, height: box.height });
      setNarrow(box.width < GRAPH_CANVAS_NARROW_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // The canvas's own bars along the top edge, which a map opening on its start must clear.
  const [barsBottom, setBarsBottom] = useState(0);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !frame) return;
    const top = el.getBoundingClientRect().top;
    let bottom = 0;
    for (const bar of el.querySelectorAll('.crewlet-canvas__controls')) {
      const rect = bar.getBoundingClientRect();
      if (rect.height > 0 && rect.top - top < frame.height / 2) bottom = Math.max(bottom, rect.bottom - top);
    }
    setBarsBottom(bottom);
  }, [frame, controlsStart, controlsPlacement]);
  const opening = useMemo<CanvasView | undefined>(() => {
    if (initialView) return initialView;
    if (!layout || !frame) return undefined;
    const fit = fitView(layout.bounds, frame, CANVAS_FIT_PADDING, minZoom);
    if (fit.k >= GRAPH_CANVAS_DETAIL_ZOOM) return undefined;
    const k = GRAPH_CANVAS_OPEN_ZOOM;
    const y = Math.max(CANVAS_FIT_PADDING, barsBottom + CANVAS_FIT_PADDING / 2);
    return { k, x: CANVAS_FIT_PADDING - layout.bounds.x * k, y: y - layout.bounds.y * k };
  }, [initialView, layout, frame, minZoom, barsBottom]);

  // ---- focus: one roving tab stop ----------------------------------------------------
  const [active, setActive] = useState<string | null>(null);
  const selectedKey = selectedId === null || !layout ? null : (layout.itemOfNode.get(selectedId) ?? null);
  const activeKey =
    active !== null && layout?.itemByKey.has(active)
      ? active
      : (selectedKey ?? layout?.lanes.find((lane) => lane.items.length > 0)?.items[0] ?? null);

  const elements = useRef(new Map<string, HTMLElement>());
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const refFor = useCallback((key: string) => {
    let callback = refs.current.get(key);
    if (!callback) {
      callback = (el) => {
        if (el) elements.current.set(key, el);
        else if (elements.current.get(key)?.isConnected === false) elements.current.delete(key);
      };
      refs.current.set(key, callback);
    }
    return callback;
  }, []);

  const pendingFocus = useRef<string | null>(null);
  const focusNow = useCallback(
    (key: string): boolean => {
      const el = elements.current.get(key);
      const item = layout?.itemByKey.get(key);
      if (!el || !el.isConnected || !item) return false;
      el.focus({ preventScroll: true });
      canvas.current?.reveal(item);
      return true;
    },
    [layout],
  );
  const focusItem = useCallback((key: string) => {
    setActive(key);
    pendingFocus.current = key;
  }, []);
  useLayoutEffect(() => {
    const key = pendingFocus.current;
    if (key !== null && focusNow(key)) pendingFocus.current = null;
  });

  // A relayout keeps the item a reader acted on where it was on screen.
  useLayoutEffect(() => {
    const pending = anchorNext.current;
    if (!pending || !layout) return;
    const after = layout.itemByKey.get(pending.key);
    if (!after) return;
    anchorNext.current = null;
    canvas.current?.anchor(pending.before, after);
  }, [layout]);

  const toggleGroup = useCallback(
    (id: string, focus: boolean) => {
      if (!layout) return;
      const open = openSet.has(id);
      const before = layout.itemByKey.get(graphItemKey(open ? 'head' : 'summary', id));
      const next = graphItemKey(open ? 'summary' : 'head', id);
      if (before) anchorNext.current = { key: next, before };
      setGroupOpen(id, !open);
      setActive(next);
      if (focus) pendingFocus.current = next;
    },
    [layout, openSet, setGroupOpen],
  );

  const layoutNow = useRef(layout);
  layoutNow.current = layout;
  const openNow = useRef({ openSet, groupOf, setGroupOpen });
  openNow.current = { openSet, groupOf, setGroupOpen };
  useImperativeHandle(
    ref,
    () => ({
      focusNode: (id: string) => {
        const { openSet: shown, groupOf: owner, setGroupOpen: reveal } = openNow.current;
        const group = owner(id);
        if (group !== undefined && !shown.has(group)) reveal(group, true);
        focusItem(graphItemKey('node', id));
      },
      fit: () => canvas.current?.fit(),
    }),
    [focusItem],
  );

  // A new fit key fits again once its layout is placed; the first placement is the canvas's own.
  const fittedFor = useRef(fitKey);
  const placedOnce = useRef(false);
  useLayoutEffect(() => {
    if (!placed) return;
    if (!placedOnce.current) {
      placedOnce.current = true;
      fittedFor.current = fitKey;
      return;
    }
    if (fitKey === fittedFor.current) return;
    fittedFor.current = fitKey;
    canvas.current?.fit();
  }, [fitKey, placed]);

  // ---- keys and presses ------------------------------------------------------------------
  const typed = useRef<TypeAheadState>({ text: '', at: 0 });
  const activate = useCallback(
    (item: GraphItem, focus: boolean) => {
      if (item.kind === 'node') {
        onSelect?.(item.id === selectedId ? null : item.id);
        setActive(item.key);
        if (focus) pendingFocus.current = item.key;
      } else if (item.kind === 'head' || item.kind === 'summary') {
        toggleGroup(item.id, focus);
      }
    },
    [onSelect, selectedId, toggleGroup],
  );

  // A press on the ground that did not drag clears the selection.
  const pressed = useRef<CanvasPoint | null>(null);
  const onPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pressed.current = { x: event.clientX, y: event.clientY };
  };
  const onGroundClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const from = pressed.current;
    pressed.current = null;
    if (!chrome || selectedId === null || !from) return;
    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > PRESS_SLOP) return;
    if ((event.target as HTMLElement).closest('[data-graph-key], [data-graph-solid], .crewlet-canvas__controls')) return;
    onSelect?.(null);
  };

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!layout) return;
    if (event.key === 'Escape') {
      if (card !== null) setCard(null);
      if (selectedId === null) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect?.(null);
      return;
    }
    // A control inside an empty lane's message keeps its own keys.
    if (event.target !== event.currentTarget) return;
    const key = event.currentTarget.getAttribute('data-graph-key');
    if (key === null) return;
    const item = layout.itemByKey.get(key);
    if (!item) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(item, true);
      return;
    }
    const step = graphStep(layout, key, event);
    if (step !== undefined) {
      event.preventDefault();
      if (step !== null) focusItem(step);
      return;
    }
    const now = Date.now();
    if (isTypeAheadKey(event, typed.current, now)) {
      typed.current = typeAheadBuffer(typed.current, event.key, now);
      const found = typeAhead(layout, key, typed.current.text, (one) => nameOf(one));
      if (found !== null) {
        event.preventDefault();
        focusItem(found);
      }
    }
  }

  // Stable for the memoised items: each reads the newest handler through a ref.
  const handlers = useRef({ onKeyDown, activate, setActive, layout });
  handlers.current = { onKeyDown, activate, setActive, layout };
  const onItemPoint = useCallback(
    (id: string | null, how: 'pointer' | 'focus') =>
      point(id, how === 'focus' ? 0 : id === null ? POINT_OUT_MS : POINT_IN_MS),
    [point],
  );
  const onItemKey = useCallback((event: KeyboardEvent<HTMLElement>) => handlers.current.onKeyDown(event), []);
  const onItemPress = useCallback((key: string) => {
    const item = handlers.current.layout?.itemByKey.get(key);
    if (item) handlers.current.activate(item, true);
  }, []);
  const onItemFocus = useCallback((key: string) => handlers.current.setActive(key), []);

  const nameOf = (item: GraphItem): string => {
    if (item.kind === 'node') return nodeById.get(item.id)?.name ?? '';
    if (item.kind === 'empty') return laneOf.get(item.id)?.label ?? '';
    return groupById.get(item.id)?.label ?? '';
  };

  // ---- what is mounted ---------------------------------------------------------------------
  const shownItems = useMemo(() => {
    if (!layout || !mounted) return [];
    const keep = new Set<string>();
    if (activeKey !== null) keep.add(activeKey);
    if (selectedKey !== null) keep.add(selectedKey);
    return layout.items.filter((item) => {
      if (keep.has(item.key)) return true;
      if (!mounted.detail && item.kind !== 'empty' && item.kind !== 'head') return false;
      return intersects(item, mounted.rect);
    });
  }, [layout, mounted, activeKey, selectedKey]);
  const shownByLane = useMemo(() => {
    const out = new Map<string, GraphItem[]>();
    for (const item of shownItems) {
      let list = out.get(item.lane);
      if (!list) out.set(item.lane, (list = []));
      list.push(item);
    }
    return out;
  }, [shownItems]);

  const worstOf = useCallback(
    (members: readonly string[]): GraphAttention | undefined => {
      let worst: GraphAttention | undefined;
      for (const id of members) {
        const attention = nodeById.get(id)?.attention;
        if (attention && (!worst || TONE_RANK[attention.tone] > TONE_RANK[worst.tone])) worst = attention;
      }
      return worst;
    },
    [nodeById],
  );

  const renderItem = (item: GraphItem) => {
    const common = {
      itemKey: item.key,
      item,
      tabIndex: item.key === activeKey ? 0 : -1,
      refFor,
      onPress: onItemPress,
      onFocusItem: onItemFocus,
      onItemKey,
    };
    if (item.kind === 'node') {
      const node = nodeById.get(item.id)!;
      const relations = relationsOf.get(item.id);
      return (
        <GraphCard
          key={item.key}
          {...common}
          node={node}
          selected={item.id === selectedId}
          state={nodeDimmed(item.id) ? 'dim' : reach?.nodes.has(item.id) ? 'lit' : 'rest'}
          onPoint={onItemPoint}
          description={relations ? text.relations(relations.dependsOn, relations.usedBy) : ''}
          descriptionId={`${uid}-d-${encodeURIComponent(item.key)}`}
          unconfirmedLabel={text.unconfirmed}
        />
      );
    }
    if (item.kind === 'summary' || item.kind === 'head') {
      const group = groupById.get(item.id);
      const members = layout?.groupById.get(item.id)?.members ?? [];
      return (
        <GraphGroupItem
          key={item.key}
          {...common}
          label={group?.label ?? item.id}
          lead={group?.lead}
          count={members.length}
          attention={item.kind === 'summary' ? worstOf(members) : undefined}
          dimmed={drawn?.itemDimmed(item.key) ?? false}
          selected={item.key === selectedKey}
          text={text}
        />
      );
    }
    const lane = laneOf.get(item.id);
    return (
      <GraphEmptyLane key={item.key} {...common} label={text.emptyLane(lane?.label ?? item.id)}>
        {lane?.empty}
      </GraphEmptyLane>
    );
  };

  const width = layout?.bounds.width ?? 0;
  const height = layout?.bounds.height ?? 0;

  // ---- each cluster's tally of what is wrong inside it ------------------------------------
  const tallies = useMemo(() => {
    const out = new Map<string, Partial<Record<GraphAttentionTone, number>>>();
    for (const node of nodes) {
      if (!node.attention) continue;
      let tally = out.get(node.lane);
      if (!tally) out.set(node.lane, (tally = {}));
      tally[node.attention.tone] = (tally[node.attention.tone] ?? 0) + 1;
    }
    return out;
  }, [nodes]);
  const laneName = (id: string, count: number) => {
    const tally = tallies.get(id);
    const words = TONES.flatMap((tone) => (tally?.[tone] && tones?.[tone] ? [`${tally[tone]} ${tones[tone]}`] : []));
    return [text.lane(laneOf.get(id)?.label ?? id, count), ...words].join(', ');
  };

  // ---- the legend, the card and the dock: the kit's own surfaces, outside the world --------
  const legend = chrome ? (
    <div className="crewlet-graph-canvas__legend" role="group" aria-label={text.legend}>
      {TONES.map((tone) =>
        tones?.[tone] ? (
          <span key={tone} className="crewlet-graph-canvas__key">
            <span className="crewlet-graph-canvas__key-notch" data-tone={tone} aria-hidden="true" />
            {tones[tone]}
          </span>
        ) : null,
      )}
      <span className="crewlet-graph-canvas__key">
        <span className="crewlet-graph-canvas__key-notch" aria-hidden="true" />
        {text.quiet}
      </span>
      <span className="crewlet-graph-canvas__key">
        <span className="crewlet-graph-canvas__key-notch" data-unconfirmed="" aria-hidden="true" />
        {text.unconfirmed}
      </span>
      <span className="crewlet-graph-canvas__legend-rule" aria-hidden="true" />
      {GRAPH_EDGE_FAMILIES.map((family) => (
        <FilterChip key={family} pressed={shown.has(family)} onPressedChange={() => toggleFamily(family)}>
          <span className="crewlet-graph-canvas__switch">
            <svg className="crewlet-graph-canvas__key-line" data-family={family} viewBox="0 0 22 8" aria-hidden="true">
              <path d="M1 4h20" />
            </svg>
            {text.families[family]}
          </span>
        </FilterChip>
      ))}
    </div>
  ) : null;
  const ownFullscreen = fullscreen === true;
  const fullscreenTarget = typeof fullscreen === 'object' ? fullscreen : root;
  const bar =
    chrome && fullscreen !== false ? (
      <>
        <FullscreenToggle
          target={fullscreenTarget}
          labels={{ enter: text.fullscreen, leave: text.leaveFullscreen }}
        />
        {controlsExtra}
      </>
    ) : (
      controlsExtra
    );
  const over = (
    <>
      {cardItem && card !== null ? (
        <div ref={cardEl} className="crewlet-graph-canvas__popup" role="tooltip">
          {renderCard?.(card)}
        </div>
      ) : null}
      {dock && !narrow ? (
        <div className="crewlet-graph-canvas__dock" data-graph-solid="">
          {dock}
        </div>
      ) : null}
      {overlay}
    </>
  );
  const end = narrow ? (
    overlayEnd
  ) : legend || overlayEnd ? (
    <>
      {legend}
      {overlayEnd}
    </>
  ) : undefined;
  const foot =
    narrow && (dock || legend) ? (
      <div className="crewlet-graph-canvas__foot" data-graph-solid="">
        {dock ? <div className="crewlet-graph-canvas__dock">{dock}</div> : null}
        {legend}
      </div>
    ) : null;

  const body = frame ? (
    <Canvas
      label={label}
      content={placed ? layout!.bounds : null}
      ref={canvas}
      overlay={over}
      controls={chrome}
      controlsPlacement={controlsPlacement}
      controlsExtra={bar}
      controlsBelow={controlsBelow}
      controlsStart={controlsStart}
      overlayEnd={end}
      hint={hint}
      ground={ground}
      largestItemWidth={metrics?.cardWidth}
      labels={text}
      minZoom={minZoom}
      initialView={opening}
      onViewChange={viewChanged}
    >
      <Probes measure={measure} />
      {emptyLanes.map((lane) => {
        const placedLane = layout?.laneById.get(lane.id);
        return (
          <div
            key={lane.id}
            ref={measure(emptyProbe(lane.id))}
            className="crewlet-graph-canvas__empty-probe"
            aria-hidden="true"
            inert
            style={placedLane ? { width: `${placedLane.head.width}px` } : undefined}
          >
            {lane.empty}
          </div>
        );
      })}
      {layout && placed ? (
        <div className="crewlet-graph-canvas__world" style={{ width: `${width}px`, height: `${height}px` }}>
          <svg className="crewlet-graph-canvas__ground" width={width} height={height} aria-hidden="true">
            {layout.lanes.map((lane) => (
              <rect
                key={lane.id}
                className="crewlet-graph-canvas__lane"
                x={lane.panel.x}
                y={lane.panel.y}
                width={lane.panel.width}
                height={lane.panel.height}
              />
            ))}
            {layout.groups.map((group) =>
              group.box ? (
                <rect
                  key={group.id}
                  className="crewlet-graph-canvas__group"
                  x={group.box.x}
                  y={group.box.y}
                  width={group.box.width}
                  height={group.box.height}
                />
              ) : null,
            )}
          </svg>
          {layout.bands.map((band) =>
            band.title ? (
              <div
                key={band.id}
                className="crewlet-graph-canvas__band-title"
                aria-hidden="true"
                style={placedStyle(band.title)}
              >
                {bands[band.index]!.label}
              </div>
            ) : null,
          )}
          {paths ? (
            <svg className="crewlet-graph-canvas__edges" width={width} height={height} aria-hidden="true">
              {trunks.length > 0 ? (
                <path className="crewlet-graph-canvas__trunk" d={trunks.map((trunk) => trunk.d).join('')} />
              ) : null}
              {EDGE_STATES.flatMap((state) =>
                DRAW_ORDER.map((family) => {
                  const layer = paths.get(`${family}:${state}`);
                  if (!layer || layer.d === '') return null;
                  return (
                    <g
                      key={`${family}:${state}`}
                      className="crewlet-graph-canvas__edge-layer"
                      data-family={family}
                      data-state={state}
                    >
                      <path className="crewlet-graph-canvas__edge" d={layer.d} />
                      <path className="crewlet-graph-canvas__arrow" d={layer.arrow} />
                      {family === 'flow' && state !== 'dim' ? (
                        <path className="crewlet-graph-canvas__flow" d={layer.d} />
                      ) : null}
                    </g>
                  );
                }),
              )}
            </svg>
          ) : null}
          {trunks.map((trunk) => (
            <span
              key={trunk.key}
              className="crewlet-graph-canvas__trunk-label"
              aria-hidden="true"
              style={{ transform: `translate(${trunk.label.x}px, ${trunk.label.y}px) translate(-50%, -50%)` }}
            >
              {text.trunk(trunk.count)}
            </span>
          ))}
          {layout.lanes.map((lane) => {
            const tally = tallies.get(lane.id);
            return (
              <div
                key={lane.id}
                className="crewlet-graph-canvas__lane-head"
                aria-hidden="true"
                style={placedStyle(lane.head)}
              >
                <span className="crewlet-graph-canvas__lane-title">
                  <span className="crewlet-graph-canvas__lane-label">{laneOf.get(lane.id)?.label}</span>
                  <span className="crewlet-graph-canvas__lane-count">{lane.count}</span>
                  {TONES.map((tone) =>
                    tally?.[tone] ? (
                      <span key={tone} className="crewlet-graph-canvas__lane-tone" data-tone={tone}>
                        {tally[tone]}
                      </span>
                    ) : null,
                  )}
                </span>
              </div>
            );
          })}
          {mounted && !mounted.detail ? (
            <Shapes
              layout={layout}
              nodeById={nodeById}
              dimmed={drawn?.itemDimmed}
              worstOf={worstOf}
              selectedKey={selectedKey}
            />
          ) : null}
          <div className="crewlet-graph-canvas__items">
            {bands.map((band, b) => {
              const lanes = layout.lanes.filter((lane) => lane.band === b);
              const inner = lanes.map((lane) => (
                <div key={lane.id} role="group" aria-label={laneName(lane.id, lane.count)}>
                  {(shownByLane.get(lane.id) ?? []).map(renderItem)}
                </div>
              ));
              return band.label ? (
                <div key={band.id} role="group" aria-label={band.label}>
                  {inner}
                </div>
              ) : (
                <div key={band.id} role="none">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Canvas>
  ) : null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- a press on the ground clears the selection, which Escape does from the keys
    <div
      ref={root}
      className={cx('crewlet-graph-canvas', className)}
      data-narrow={narrow ? '' : undefined}
      data-focus={focusState}
      data-still={still ? '' : undefined}
      onPointerDownCapture={onPointerDownCapture}
      onClick={onGroundClick}
    >
      {/* A fullscreen element paints only its own subtree, so what the map opens is hosted inside it. */}
      {ownFullscreen ? (
        <LayerHost>
          {body}
          {foot}
        </LayerHost>
      ) : (
        <>
          {body}
          {foot}
        </>
      )}
    </div>
  );
}

/** The probes the layout's sizes are read from: tokens, so density and the reader's font size reach them. */
function Probes({ measure }: { measure: (id: string) => (el: HTMLElement | null) => void }) {
  return (
    <>
      <div
        ref={measure(CARD_PROBE)}
        className="crewlet-graph-canvas__card crewlet-graph-canvas__probe"
        aria-hidden="true"
      />
      <div
        ref={measure(GAP_PROBE)}
        className="crewlet-graph-canvas__gap crewlet-graph-canvas__probe"
        aria-hidden="true"
      />
      <div
        ref={measure(PAD_PROBE)}
        className="crewlet-graph-canvas__pad crewlet-graph-canvas__probe"
        aria-hidden="true"
      />
      <div
        ref={measure(HEAD_PROBE)}
        className="crewlet-graph-canvas__lane-head crewlet-graph-canvas__probe"
        aria-hidden="true"
      >
        <span className="crewlet-graph-canvas__lane-label">M</span>
      </div>
      <div
        ref={measure(BAND_PROBE)}
        className="crewlet-graph-canvas__band-title crewlet-graph-canvas__probe"
        aria-hidden="true"
      >
        M
      </div>
    </>
  );
}

interface ItemProps {
  itemKey: string;
  item: GraphItem;
  tabIndex: number;
  refFor: (key: string) => (el: HTMLElement | null) => void;
  onPress: (key: string) => void;
  onFocusItem: (key: string) => void;
  onItemKey: (event: KeyboardEvent<HTMLElement>) => void;
}

/** The glyph a tone's badge draws when the entry names none. */
function toneGlyph(tone: GraphAttentionTone): ReactNode {
  if (tone === 'danger') return <TriangleAlertGlyph />;
  if (tone === 'warning') return <CircleAlertGlyph />;
  return <InfoGlyph />;
}

const GraphCard = memo(function GraphCard({
  itemKey,
  item,
  tabIndex,
  refFor,
  onPress,
  onFocusItem,
  onItemKey,
  node,
  selected,
  state,
  onPoint,
  description,
  descriptionId,
  unconfirmedLabel,
}: ItemProps & {
  node: GraphNode;
  selected: boolean;
  /** Lit by the selection or the pointer, pushed back by it, or neither. */
  state: 'lit' | 'dim' | 'rest';
  onPoint: (id: string | null, how: 'pointer' | 'focus') => void;
  description: string;
  descriptionId: string;
  unconfirmedLabel: string;
}) {
  const spoken = [
    node.title ?? node.name,
    node.kind,
    node.caption,
    node.attention?.label,
    node.unconfirmed ? unconfirmedLabel : undefined,
  ]
    .filter((part) => part !== undefined && part !== '')
    .join(', ');
  return (
    <div
      ref={refFor(itemKey)}
      role="button"
      tabIndex={tabIndex}
      title={node.title}
      aria-describedby={description ? descriptionId : undefined}
      aria-current={selected ? 'true' : undefined}
      data-graph-key={itemKey}
      data-attention={node.attention?.tone}
      data-unconfirmed={node.unconfirmed ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-state={state}
      className="crewlet-graph-canvas__card"
      style={{ transform: `translate(${item.x}px, ${item.y}px)` }}
      onClick={() => onPress(itemKey)}
      onFocus={() => {
        onFocusItem(itemKey);
        onPoint(node.id, 'focus');
      }}
      onBlur={() => onPoint(null, 'focus')}
      onPointerEnter={() => onPoint(node.id, 'pointer')}
      onPointerLeave={() => onPoint(null, 'pointer')}
      onKeyDown={onItemKey}
    >
      <span className="crewlet-graph-canvas__cell" aria-hidden="true">
        {node.glyph}
        {node.mark ? <span className="crewlet-graph-canvas__mark">{node.mark}</span> : null}
      </span>
      <Text variant="inherit" truncate className="crewlet-graph-canvas__name" aria-hidden="true">
        {node.name}
      </Text>
      {node.attention ? (
        <span className="crewlet-graph-canvas__badge" aria-hidden="true">
          {node.attention.glyph ?? toneGlyph(node.attention.tone)}
        </span>
      ) : null}
      <SpokenName spoken={spoken} description={description} descriptionId={descriptionId} />
    </div>
  );
});

const GraphGroupItem = memo(function GraphGroupItem({
  itemKey,
  item,
  tabIndex,
  refFor,
  onPress,
  onFocusItem,
  onItemKey,
  label,
  lead,
  count,
  attention,
  dimmed,
  selected,
  text,
}: ItemProps & {
  label: string;
  lead: ReactNode;
  count: number;
  attention: GraphAttention | undefined;
  dimmed: boolean;
  /** A closed group holding the selection is drawn selected. */
  selected: boolean;
  text: GraphCanvasLabels;
}) {
  const open = item.kind === 'head';
  const spoken = [open ? text.openGroup(label, count) : text.closedGroup(label, count), attention?.label]
    .filter(Boolean)
    .join(', ');
  return (
    <div
      ref={refFor(itemKey)}
      role="button"
      tabIndex={tabIndex}
      aria-expanded={open}
      data-graph-key={itemKey}
      aria-current={selected ? 'true' : undefined}
      data-attention={attention?.tone}
      data-state={dimmed ? 'dim' : 'rest'}
      data-selected={selected ? '' : undefined}
      className={open ? 'crewlet-graph-canvas__head' : 'crewlet-graph-canvas__card crewlet-graph-canvas__card--group'}
      style={{
        transform: `translate(${item.x}px, ${item.y}px)`,
        ...(open ? { width: `${item.width}px`, height: `${item.height}px` } : {}),
      }}
      onClick={() => onPress(itemKey)}
      onFocus={() => onFocusItem(itemKey)}
      onKeyDown={onItemKey}
    >
      {open ? (
        <>
          <ChevronDownGlyph size="xs" aria-hidden="true" className="crewlet-graph-canvas__chevron" />
          {lead ? (
            <span className="crewlet-graph-canvas__lead" aria-hidden="true">
              {lead}
            </span>
          ) : null}
          <Text variant="inherit" truncate className="crewlet-graph-canvas__group-label" aria-hidden="true">
            {label}
          </Text>
          <span className="crewlet-graph-canvas__group-count" aria-hidden="true">
            {count}
          </span>
          <SpokenName spoken={spoken} />
        </>
      ) : (
        <>
          <span className="crewlet-graph-canvas__cell" aria-hidden="true">
            {lead ?? <ChevronRightGlyph size="sm" />}
          </span>
          <Text variant="inherit" truncate className="crewlet-graph-canvas__name" aria-hidden="true">
            {label}
          </Text>
          <span className="crewlet-graph-canvas__group-count" aria-hidden="true">
            {count}
          </span>
          <ChevronRightGlyph size="xs" aria-hidden="true" className="crewlet-graph-canvas__chevron" />
          {attention ? (
            <span className="crewlet-graph-canvas__badge" aria-hidden="true">
              {attention.glyph ?? toneGlyph(attention.tone)}
            </span>
          ) : null}
          <SpokenName spoken={spoken} />
        </>
      )}
    </div>
  );
});

/**
 * AN ITEM'S NAME IS ITS CONTENT: one sentence, read in place of the visible
 * words it starts with, which are hidden so they are not read twice. The
 * relations are its description, in an element only that reference reads.
 */
function SpokenName({
  spoken,
  description,
  descriptionId,
}: {
  spoken: string;
  description?: string | undefined;
  descriptionId?: string | undefined;
}) {
  return (
    <>
      <VisuallyHidden>{spoken}</VisuallyHidden>
      {description ? (
        <span id={descriptionId} hidden>
          {description}
        </span>
      ) : null}
    </>
  );
}

function GraphEmptyLane({
  itemKey,
  item,
  tabIndex,
  refFor,
  onFocusItem,
  onItemKey,
  label,
  children,
}: ItemProps & { label: string; children: ReactNode }) {
  /* A STOP ON THE WALK, so the message saying what would fill the lane is read;
     a group rather than a control, because what it holds may itself be one. */
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <div
      ref={refFor(itemKey)}
      role="group"
      tabIndex={tabIndex}
      aria-label={label}
      data-graph-key={itemKey}
      className="crewlet-graph-canvas__empty"
      style={{ transform: `translate(${item.x}px, ${item.y}px)`, width: `${item.width}px`, height: `${item.height}px` }}
      onFocus={(event) => {
        if (event.target === event.currentTarget) onFocusItem(itemKey);
      }}
      onKeyDown={onItemKey}
    >
      {children}
    </div>
  );
}

/** A shape's corner and its notch's width, in world units: the card's own, which a stylesheet cannot hand a path. */
const SHAPE_CORNER = 2;
const SHAPE_NOTCH = 4;

/**
 * Every card as a shape on one layer, for a zoom too far out to read: a
 * rectangle per card, a dashed one per unconfirmed card, and a notch per tone.
 */
function Shapes({
  layout,
  nodeById,
  dimmed,
  worstOf,
  selectedKey,
}: {
  layout: GraphLayout;
  nodeById: ReadonlyMap<string, GraphNode>;
  dimmed: ((key: string) => boolean) | undefined;
  worstOf: (members: readonly string[]) => GraphAttention | undefined;
  selectedKey: string | null;
}) {
  const paths = useMemo(() => {
    const out = { card: '', faded: '', dashed: '', danger: '', warning: '', info: '', selected: '' };
    const radius = SHAPE_CORNER;
    for (const item of layout.items) {
      if (item.kind !== 'node' && item.kind !== 'summary') continue;
      const node = item.kind === 'node' ? nodeById.get(item.id) : undefined;
      const rect = roundRect(item, radius);
      if (item.key === selectedKey) out.selected += rect;
      else if (dimmed?.(item.key)) out.faded += rect;
      else if (node?.unconfirmed) out.dashed += rect;
      else out.card += rect;
      const attention = node ? node.attention : worstOf(layout.groupById.get(item.id)?.members ?? []);
      // The notch on the leading edge, as a card draws it.
      if (attention) out[attention.tone] += `M${item.x} ${item.y}h${SHAPE_NOTCH}v${item.height}h${-SHAPE_NOTCH}Z`;
    }
    return out;
  }, [layout, nodeById, dimmed, worstOf, selectedKey]);
  return (
    <svg
      className="crewlet-graph-canvas__shapes"
      width={layout.bounds.width}
      height={layout.bounds.height}
      aria-hidden="true"
    >
      <path data-shape="card" d={paths.card} />
      <path data-shape="faded" d={paths.faded} />
      <path data-shape="dashed" d={paths.dashed} />
      <path data-shape="selected" d={paths.selected} />
      <path data-shape="danger" d={paths.danger} />
      <path data-shape="warning" d={paths.warning} />
      <path data-shape="info" d={paths.info} />
    </svg>
  );
}

function roundRect(rect: CanvasRect, r: number): string {
  const { x, y, width: w, height: h } = rect;
  return `M${x + r} ${y}h${w - 2 * r}q${r} 0 ${r} ${r}v${h - 2 * r}q0 ${r} ${-r} ${r}h${-(w - 2 * r)}q${-r} 0 ${-r} ${-r}v${-(h - 2 * r)}q0 ${-r} ${r} ${-r}Z`;
}

function placedStyle(rect: CanvasRect) {
  return { transform: `translate(${rect.x}px, ${rect.y}px)`, width: `${rect.width}px`, height: `${rect.height}px` };
}

function intersects(a: CanvasRect, b: CanvasRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * THE WINDOW MOVES IN STEPS. What is mounted is the view with half a screen
 * of room on every side, and it is replaced only when the view leaves it or
 * shrinks far inside it, so a pan re-renders the map every half screen rather
 * than every frame.
 */
export function graphWindow(was: GraphWindow | null, view: CanvasView, viewport: CanvasSize): GraphWindow {
  const detail = view.k >= GRAPH_CANVAS_DETAIL_ZOOM;
  const visible: CanvasRect = {
    x: -view.x / view.k,
    y: -view.y / view.k,
    width: viewport.width / view.k,
    height: viewport.height / view.k,
  };
  const roomy: CanvasRect = {
    x: visible.x - visible.width / 2,
    y: visible.y - visible.height / 2,
    width: visible.width * 2,
    height: visible.height * 2,
  };
  if (was && was.detail === detail) {
    const inside =
      visible.x >= was.rect.x &&
      visible.y >= was.rect.y &&
      visible.x + visible.width <= was.rect.x + was.rect.width &&
      visible.y + visible.height <= was.rect.y + was.rect.height;
    const tooLarge = was.rect.width * was.rect.height > 4 * roomy.width * roomy.height;
    if (inside && !tooLarge) return was;
  }
  return { rect: roomy, detail };
}

/** The next item, in the walk's order across every lane, whose name starts with `text`. */
function typeAhead(
  layout: GraphLayout,
  from: string,
  text: string,
  nameOf: (item: GraphItem) => string,
): string | null {
  const order = layout.lanes.flatMap((lane) => lane.items);
  const lower = text.toLocaleLowerCase();
  const cycling = [...lower].every((character) => character === lower[0]);
  const needle = cycling ? lower[0]! : lower;
  const at = order.indexOf(from);
  const begin = at < 0 ? 0 : at + (cycling ? 1 : 0);
  for (let step = 0; step < order.length; step++) {
    const key = order[(begin + step) % order.length]!;
    if (nameOf(layout.itemByKey.get(key)!).toLocaleLowerCase().startsWith(needle)) return key;
  }
  return null;
}
