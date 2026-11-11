/**
 * A layered map on a canvas: entries in lanes read left to right, bands of
 * lanes under each other, groups that open and close, and orthogonal edges
 * from each entry to what it relies on.
 *
 * PURE PRESENTATION. Entries, edges, the selection and the trace come in as
 * props and every decision goes out through a callback; nothing is fetched.
 * The layout is `layout.ts` (pure, tested without a DOM), the walk `walk.ts`
 * and the reach `reach.ts`; this component measures, draws and listens.
 *
 * IT STAYS LIGHT AT THOUSANDS OF ENTRIES. Every card is one size, so nothing
 * is measured per card; only the cards near the view are mounted; edges are a
 * few paths rather than one element each; and zoomed out past legibility the
 * cards are drawn as shapes on one layer rather than as elements at all.
 */

import {
  memo,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { ChevronDownGlyph, ChevronRightGlyph } from '@crewlethq/icons/glyphs';
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
import { IconTile } from '../IconTile/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { Text } from '../Text/index.js';
import { isTypeAheadKey, typeAheadBuffer, useMeasuredSizes, type TypeAheadState } from '../Tree/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import {
  graphItemKey,
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
  /** Its name, drawn over it: "Runtime". */
  label: string;
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

/** What needs attention on an entry, as one dot: never colour alone, so the word is read with it. */
export type GraphAttentionTone = 'danger' | 'warning' | 'info';

export interface GraphAttention {
  tone: GraphAttentionTone;
  /** The word a screen reader hears, such as "Alerting". */
  label: string;
}

export interface GraphNode {
  id: string;
  lane: string;
  group?: string | undefined;
  /** The first line: "orders-db". */
  name: string;
  /** The second line, in the quiet ink: "postgres 16 · eu-west-1". */
  caption?: string | undefined;
  /** What it is, read after the name: "Database". */
  kind?: string | undefined;
  /** The kind's glyph, drawn on a tile at the card's start. */
  glyph?: ReactNode;
  /** A dot on the card's corner, only when something needs a person. */
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
  /** Drawn while nothing is selected. Off for a relation that would cross the whole map (an owning account). */
  atRest?: boolean | undefined;
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
};

/**
 * THE ZOOM BELOW WHICH CARDS ARE SHAPES. At half size a 13px name draws at
 * about 6.5px, the least that still reads as words; below it a card's text is
 * texture, so the map draws every card as a shape on one layer instead.
 */
export const GRAPH_CANVAS_DETAIL_ZOOM = 0.5;

/**
 * THE LOWEST ZOOM A FIT TAKES, so the whole map is one press away however
 * large: two thousand entries in five lanes fit at about a twentieth.
 */
export const GRAPH_CANVAS_FIT_FLOOR = 0.02;

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
  /** A press or Enter on a card selects it; Escape clears with `null`. */
  onSelect?: ((id: string | null) => void) | undefined;
  /** Lights what the selection reaches; unset, the selection lights its neighbours. */
  trace?: GraphTrace | null | undefined;
  /** A card pushed back, such as one a legend filter leaves out. */
  cardDimmed?: ((id: string) => boolean) | undefined;
  /** Drawn over the canvas without the transform. */
  overlay?: ReactNode;
  controlsPlacement?: 'top-right' | 'bottom-right' | undefined;
  controlsExtra?: ReactNode;
  controlsBelow?: ReactNode;
  /** A bar in the corner opposite the zoom bar, such as the trace switch. */
  controlsStart?: ReactNode;
  /** A bar across from the zoom bar, such as a status legend. */
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
  const restEdges = useMemo(() => edges.filter((edge) => edge.atRest !== false), [edges]);
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
  const layout = useMemo<GraphLayout | null>(() => {
    if (!metrics) return null;
    return layoutGraph(
      { bands: layoutBands, nodes, groups, open: (id) => openSet.has(id), edges: restEdges, emptyHeights },
      metrics,
    );
  }, [metrics, layoutBands, nodes, groups, openSet, restEdges, emptyHeights]);
  // The first placement waits for every empty lane's message; a lane emptied later is measured in place.
  const everPlaced = useRef(false);
  const placed = layout !== null && (everPlaced.current || measured(emptyLanes.map((lane) => emptyProbe(lane.id))));
  if (placed) everPlaced.current = true;
  const laneOf = useMemo(() => new Map(bands.flatMap((band) => band.lanes.map((lane) => [lane.id, lane]))), [bands]);

  // ---- selection, trace and what is pushed back ---------------------------------
  const reach = useMemo<GraphReach | null>(() => {
    if (selectedId === null || !nodeById.has(selectedId)) return null;
    return trace ? graphReach(edges, selectedId, trace.direction, trace.depth) : graphNeighbourhood(edges, selectedId);
  }, [selectedId, nodeById, trace, edges]);
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

  // ---- the edges, as three layers -------------------------------------------------
  const drawn = useMemo(() => {
    if (!layout) return null;
    const lit = new Set<string>();
    const extra: GraphLayoutEdge[] = [];
    const known = new Set(layout.routes.map((route) => route.key));
    if (reach) {
      for (const edge of edges) {
        if (!reach.edges.has(edge.id)) continue;
        const route = layout.routeOfEdge.get(edge.id);
        if (route !== undefined) {
          lit.add(route);
          continue;
        }
        const from = layout.itemOfNode.get(edge.from);
        const to = layout.itemOfNode.get(edge.to);
        if (from === undefined || to === undefined || from === to) continue;
        if (known.has(`${from}>${to}`)) lit.add(`${from}>${to}`);
        else extra.push(edge);
      }
    }
    const itemDimmed = (key: string) => {
      const item = layout.itemByKey.get(key)!;
      if (item.kind === 'node') return nodeDimmed(item.id);
      return layout.groupById.get(item.id)?.members.every(nodeDimmed) ?? false;
    };
    const quiet: GraphRoute[] = [];
    const faint: GraphRoute[] = [];
    const strong: GraphRoute[] = [];
    for (const route of layout.routes) {
      if (lit.has(route.key)) strong.push(route);
      else if (reach || itemDimmed(route.from) || itemDimmed(route.to)) faint.push(route);
      else quiet.push(route);
    }
    strong.push(...routeGraphEdges(layout, extra));
    const join = (list: GraphRoute[], part: 'd' | 'arrow') => list.map((route) => route[part]).join('');
    return {
      quiet: { d: join(quiet, 'd'), arrow: join(quiet, 'arrow') },
      faint: { d: join(faint, 'd'), arrow: join(faint, 'arrow') },
      strong: { d: join(strong, 'd'), arrow: join(strong, 'arrow') },
      itemDimmed,
    };
  }, [layout, reach, edges, nodeDimmed]);

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
  const viewChanged = useCallback(
    (view: CanvasView, viewport: CanvasSize) => {
      onViewChange?.(view, viewport);
      const next = graphWindow(mountedNow.current, view, viewport);
      if (next !== mountedNow.current) setMounted(next);
    },
    [onViewChange],
  );

  // ---- the opening view: whole when it reads, else the map's start at a size that does ----
  const root = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<CanvasSize | null>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (box && box.width > 0 && box.height > 0) setFrame((was) => was ?? { width: box.width, height: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const opening = useMemo<CanvasView | undefined>(() => {
    if (initialView) return initialView;
    if (!layout || !frame) return undefined;
    const fit = fitView(layout.bounds, frame, CANVAS_FIT_PADDING, minZoom);
    if (fit.k >= GRAPH_CANVAS_DETAIL_ZOOM) return undefined;
    const k = GRAPH_CANVAS_DETAIL_ZOOM;
    return { k, x: CANVAS_FIT_PADDING - layout.bounds.x * k, y: CANVAS_FIT_PADDING - layout.bounds.y * k };
  }, [initialView, layout, frame, minZoom]);

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
        onSelect?.(item.id);
        setActive(item.key);
        if (focus) pendingFocus.current = item.key;
      } else if (item.kind === 'head' || item.kind === 'summary') {
        toggleGroup(item.id, focus);
      }
    },
    [onSelect, toggleGroup],
  );

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!layout) return;
    if (event.key === 'Escape') {
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
      key: item.key,
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
          {...common}
          node={node}
          selected={item.id === selectedId}
          dimmed={nodeDimmed(item.id)}
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
      <GraphEmptyLane {...common} label={text.emptyLane(lane?.label ?? item.id)}>
        {lane?.empty}
      </GraphEmptyLane>
    );
  };

  const width = layout?.bounds.width ?? 0;
  const height = layout?.bounds.height ?? 0;

  return (
    <div ref={root} className={cx('crewlet-graph-canvas', className)}>
      {frame ? (
        <Canvas
          label={label}
          content={placed ? layout!.bounds : null}
          ref={canvas}
          overlay={overlay}
          controlsPlacement={controlsPlacement}
          controlsExtra={controlsExtra}
          controlsBelow={controlsBelow}
          controlsStart={controlsStart}
          overlayEnd={overlayEnd}
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
            <>
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
              {layout.lanes.map((lane) => (
                <div
                  key={lane.id}
                  className="crewlet-graph-canvas__lane-head"
                  aria-hidden="true"
                  style={placedStyle(lane.head)}
                >
                  <span className="crewlet-graph-canvas__lane-label">{laneOf.get(lane.id)?.label}</span>
                  <span className="crewlet-graph-canvas__lane-count">{lane.count}</span>
                </div>
              ))}
              {drawn ? (
                <svg className="crewlet-graph-canvas__edges" width={width} height={height} aria-hidden="true">
                  <path className="crewlet-graph-canvas__edge" data-state="faint" d={drawn.faint.d} />
                  <path className="crewlet-graph-canvas__arrow" data-state="faint" d={drawn.faint.arrow} />
                  <path className="crewlet-graph-canvas__edge" data-state="quiet" d={drawn.quiet.d} />
                  <path className="crewlet-graph-canvas__arrow" data-state="quiet" d={drawn.quiet.arrow} />
                  <path className="crewlet-graph-canvas__edge" data-state="strong" d={drawn.strong.d} />
                  <path className="crewlet-graph-canvas__arrow" data-state="strong" d={drawn.strong.arrow} />
                </svg>
              ) : null}
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
                  const body = lanes.map((lane) => (
                    <div
                      key={lane.id}
                      role="group"
                      aria-label={text.lane(laneOf.get(lane.id)?.label ?? lane.id, lane.count)}
                    >
                      {(shownByLane.get(lane.id) ?? []).map(renderItem)}
                    </div>
                  ));
                  return band.label ? (
                    <div key={band.id} role="group" aria-label={band.label}>
                      {body}
                    </div>
                  ) : (
                    <div key={band.id} role="none">
                      {body}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </Canvas>
      ) : null}
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
  dimmed,
  description,
  descriptionId,
  unconfirmedLabel,
}: ItemProps & {
  node: GraphNode;
  selected: boolean;
  dimmed: boolean;
  description: string;
  descriptionId: string;
  unconfirmedLabel: string;
}) {
  const spoken = [
    node.name,
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
      aria-label={spoken}
      aria-describedby={description ? descriptionId : undefined}
      aria-current={selected ? 'true' : undefined}
      data-graph-key={itemKey}
      data-attention={node.attention?.tone}
      data-unconfirmed={node.unconfirmed ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-dimmed={dimmed ? '' : undefined}
      className="crewlet-graph-canvas__card"
      style={{ transform: `translate(${item.x}px, ${item.y}px)` }}
      onClick={() => onPress(itemKey)}
      onFocus={() => onFocusItem(itemKey)}
      onKeyDown={onItemKey}
    >
      <IconTile size="sm" tone="neutral" className="crewlet-graph-canvas__tile">
        {node.glyph}
      </IconTile>
      <span className="crewlet-graph-canvas__text">
        <Text variant="inherit" truncate className="crewlet-graph-canvas__name">
          {node.name}
        </Text>
        {node.caption ? (
          <Text variant="inherit" truncate className="crewlet-graph-canvas__caption">
            {node.caption}
          </Text>
        ) : null}
      </span>
      {node.attention ? <StatusDot tone={node.attention.tone} className="crewlet-graph-canvas__dot" /> : null}
      {description ? <VisuallyHidden id={descriptionId}>{description}</VisuallyHidden> : null}
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
      aria-label={spoken}
      aria-expanded={open}
      data-graph-key={itemKey}
      aria-current={selected ? 'true' : undefined}
      data-attention={attention?.tone}
      data-dimmed={dimmed ? '' : undefined}
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
          {lead ? <span className="crewlet-graph-canvas__lead">{lead}</span> : null}
          <Text variant="inherit" truncate className="crewlet-graph-canvas__group-label">
            {label}
          </Text>
          <span className="crewlet-graph-canvas__group-count">{count}</span>
        </>
      ) : (
        <>
          <IconTile size="sm" tone="neutral" className="crewlet-graph-canvas__tile">
            {lead ?? <ChevronRightGlyph size="sm" />}
          </IconTile>
          <span className="crewlet-graph-canvas__text">
            <Text variant="inherit" truncate className="crewlet-graph-canvas__name">
              {label}
            </Text>
            <Text variant="inherit" truncate className="crewlet-graph-canvas__caption">
              {text.entries(count)}
            </Text>
          </span>
          <ChevronRightGlyph size="xs" aria-hidden="true" className="crewlet-graph-canvas__chevron" />
          {attention ? <StatusDot tone={attention.tone} className="crewlet-graph-canvas__dot" /> : null}
        </>
      )}
    </div>
  );
});

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

/**
 * Every card as a shape on one layer, for a zoom too far out to read: a
 * rectangle per card, a dashed one per unconfirmed card, and a dot per tone.
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
    const radius = Math.min(6, layout.metrics.cardHeight / 6);
    for (const item of layout.items) {
      if (item.kind !== 'node' && item.kind !== 'summary') continue;
      const node = item.kind === 'node' ? nodeById.get(item.id) : undefined;
      const rect = roundRect(item, radius);
      if (item.key === selectedKey) out.selected += rect;
      else if (dimmed?.(item.key)) out.faded += rect;
      else if (node?.unconfirmed) out.dashed += rect;
      else out.card += rect;
      const attention = node ? node.attention : worstOf(layout.groupById.get(item.id)?.members ?? []);
      if (attention) {
        const r = layout.metrics.cardHeight / 8;
        const cx = item.x + item.width - r * 2;
        const cy = item.y + r * 2;
        out[attention.tone] += `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
      }
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
