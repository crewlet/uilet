/**
 * A canvas of artboards and notes: a design.
 *
 * WHAT IT DRAWS. Each artboard is a frame of its own size, placed on the
 * canvas at its position, with its title above it; the caller renders what is
 * inside (for a design, a sandboxed page). Notes are titles laid over groups of
 * boards and coloured stickies beside them, drawn here as plain text.
 *
 * THE VISIBILITY BUDGET (budget.ts). A board's content is rendered only while
 * the board is on screen and drawn wide enough to read, and at most
 * [CANVAS_BOARD_MAX_LIVE] at once; every other board draws as a placeholder of
 * its size, so a canvas of sixty boards runs a dozen pages, not sixty.
 *
 * TOOLS, AS A DESIGN TOOL HAS THEM (CanvasToolbar). Move (`V`) selects: a
 * click on a board or a note selects it, a click on the field clears it, and
 * the pointer is the arrow. Hand (`H`, or Space held) pans whatever is under
 * the pointer, boards included, with the open hand. An editable canvas that
 * can create boards adds Frame (`F`): a click on the field places a board
 * there, selected, and hands back the Move tool. One that can create notes
 * adds Text (`T`) and Sticky (`S`): a click on the field places one there,
 * opens it for typing, and hands back the Move tool. The pointer is always
 * the tool's (the operating system's own, through the Canvas), and a pan in
 * progress is always the closed hand.
 *
 * A PAGE INSIDE A BOARD NEVER TAKES THE CANVAS'S POINTER BY SURPRISE. A live
 * board is covered by a shield that pans the canvas like the field around it;
 * a click on it selects the board, a double-click activates it, and only then
 * does the page receive the pointer. Escape gives the pointer back to the
 * canvas, and a second Escape clears the selection.
 *
 * EDITING (`editable`). A board's name becomes its move handle and a selected
 * item's corners its resize handles, by pointer or, on the bottom right
 * corner, by the arrow keys (Shift for a larger step); a note is moved by its
 * own paper or its handle, retyped on a double-click, and deleted with Delete
 * while selected. Each finished gesture is reported once, with whole canvas
 * pixels, and the caller decides what a change is (for a design, a new
 * version of its canvas). Delete removes a selected note, and a selected
 * board where the caller removes boards (`onBoardRemove`).
 *
 * HOVER AND SELECTION ARE OUTLINES IN THE ACCENT, at one screen pixel and two,
 * over a board's own hairline edge; hovering a board's name outlines its board,
 * because the name is how a reader picks a board out of a crowded canvas. The
 * selection is the component's own unless the caller holds it (`selected`
 * with `onSelectedChange`), which is how a list of boards beside the canvas
 * marks the board picked on it and picks one there.
 *
 * THE CHROME STAYS ONE SIZE ON SCREEN. Titles, edges, outlines and handles
 * are counter-scaled by the zoom, so a board's label is readable, its edge is
 * a hairline and its handle is a full pointer target whatever the zoom, while
 * the board itself scales with the canvas. What a board says is held to the
 * room it is drawn in: a name with too little room is shortened to a few
 * letters, then to the board's number, and only then left out (`boardName`),
 * and a placeholder drops the lines it has no room for rather than spill them
 * over the boards beside it (`boardRoom`).
 */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  FrameGlyph,
  HandGlyph,
  MaximizeGlyph,
  MousePointer2Glyph,
  PencilGlyph,
  StickyNoteGlyph,
  TrashGlyph,
  TypeGlyph,
} from '@crewlethq/icons/glyphs';
import {
  Canvas,
  IDENTITY_VIEW,
  type CanvasCursor,
  type CanvasHandle,
  type CanvasLabels,
  type CanvasRect,
  type CanvasSize,
  type CanvasPoint,
  type CanvasView,
} from '../Canvas/index.js';
import { CanvasToolbar, toolForKey, type CanvasTool } from '../CanvasToolbar/index.js';
import { IconButton } from '../IconButton/index.js';
import { Note } from '../Note/index.js';
import type { SurfaceTone } from '../ArrangeGroup/index.js';
import { cx } from '../utils/cx.js';
import { CANVAS_BOARD_MAX_LIVE, CANVAS_BOARD_MIN_LIVE_WIDTH, liveBoards } from './budget.js';

/** An artboard: an id, its frame in canvas pixels and its title. */
export interface CanvasBoardItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
}

/** A sticky's colour, a name drawn from the theme's own palette. */
export type CanvasNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

/** Every sticky colour, the first being a sticky's default. */
export const CANVAS_NOTE_COLORS = [
  'yellow',
  'pink',
  'blue',
  'green',
  'purple',
] as const satisfies readonly CanvasNoteColor[];

/** The paper each sticky colour is drawn on: the palette's own hues. */
const NOTE_TONES: Record<CanvasNoteColor, SurfaceTone> = {
  yellow: 'amber',
  pink: 'rose',
  blue: 'blue',
  green: 'green',
  purple: 'purple',
};

/**
 * The type size a title is set in, in canvas pixels: as large as its box's
 * height allows (three fifths of it), and no larger than lets its text run
 * the box's width on one line, measured at an average glyph of
 * [TITLE_GLYPH_EM] of the size. A long title is set smaller rather than run
 * past its box over the boards beside it; the box clips whatever an unusually
 * wide face still overruns.
 */
export function titleSize(note: Pick<CanvasBoardNote, 'w' | 'h' | 'text'>): number {
  const chars = Math.max(1, Array.from(note.text.trim()).length);
  return Math.max(1, Math.min(note.h * 0.6, note.w / (chars * TITLE_GLYPH_EM)));
}

/** The average advance of a title's glyph, as a share of its size. */
export const TITLE_GLYPH_EM = 0.58;

/** A note's name for its handles: its first words. */
function noteName(note: CanvasBoardNote): string {
  const words = note.text.trim().replace(/\s+/g, ' ');
  return words.length > 40 ? `${words.slice(0, 39)}…` : words;
}

/** A note: a title over a group of boards, or a sticky beside them. */
export interface CanvasBoardNote {
  id: string;
  kind: 'title' | 'sticky';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color?: CanvasNoteColor | undefined;
}

/** What is selected on a board canvas: one board or one note. */
export interface CanvasBoardSelection {
  kind: 'board' | 'note';
  id: string;
}

/** A frame as an edit reports it. */
export interface CanvasBoardRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Every string the board renders itself. */
export interface CanvasBoardLabels {
  /** A board's size, read after its title: "1440 by 900". */
  size: (w: number, h: number) => string;
  /** The control that opens one board full size. */
  open: (title: string) => string;
  /** The move handle of a board or note, in edit mode. */
  move: (title: string) => string;
  /** The resize handle of a board or note, in edit mode. */
  resize: (title: string) => string;
  /** The control that edits a note's text. */
  editNote: string;
  /** The control that deletes a note. */
  removeNote: string;
  /** The field a note's text is typed into. */
  noteText: string;
  /** Said by a board whose page is not running because it is off screen or too small. */
  paused: string;
  /** Said by an active board, so a reader knows how to give the pointer back. */
  active: string;
  /** Said by a selected live board, so a reader knows how to use its page. */
  interact: string;
  /** The tool palette's name. */
  tools: string;
  /** Each tool's name. */
  moveTool: string;
  handTool: string;
  frameTool: string;
  textTool: string;
  stickyTool: string;
}

const LABELS: CanvasBoardLabels = {
  size: (w, h) => `${w} by ${h}`,
  open: (title) => `Open ${title} full size`,
  move: (title) => `Move ${title}`,
  resize: (title) => `Resize ${title}`,
  editNote: 'Edit note',
  removeNote: 'Delete note',
  noteText: 'Note text',
  paused: 'Zoom in to run this board',
  active: 'Press Escape to return to the canvas',
  interact: 'Double-click to use this board',
  tools: 'Tools',
  moveTool: 'Move',
  handTool: 'Hand',
  frameTool: 'Frame',
  textTool: 'Text',
  stickyTool: 'Sticky note',
};

/**
 * The tools a board canvas offers. Move and Hand always; Frame only where a
 * person may edit and the caller places boards (`onBoardCreate`), and Text and
 * Sticky only where the caller places notes (`onNoteCreate`).
 *
 * FRAME IS FOR SHAPING A CANVAS BEFORE IT IS DRAWN: a design's create page,
 * where a person lays out the boards an agent then fills. A published design's
 * board is a page with a file behind it, so its viewer offers no Frame. NO
 * COMMENT TOOL until a canvas has comments to anchor.
 */
export type CanvasBoardTool = 'move' | 'hand' | 'frame' | 'text' | 'sticky';

/** The pointer each tool shows over the field. */
const TOOL_CURSOR: Record<CanvasBoardTool, CanvasCursor> = {
  move: 'pointer',
  hand: 'hand',
  frame: 'crosshair',
  text: 'text',
  sticky: 'crosshair',
};

/**
 * The smallest zoom a board canvas fits at. A design laid out across many
 * full-size pages is many screens wide, and every board has to be on screen
 * at the fit, so the floor is far below a chart's; the visibility budget is
 * what keeps a canvas this far out cheap.
 */
export const CANVAS_BOARD_MIN_ZOOM = 0.02;

/** The step an arrow key moves or resizes by, and with Shift. */
const KEY_STEP = 8;
const KEY_STEP_LARGE = 64;

/** How far past the content the canvas may be panned, in world units. */
const CONTENT_MARGIN = 160;

export interface CanvasBoardProps {
  /** The accessible name of the canvas, such as "Launch landing page". */
  label: string;
  boards: readonly CanvasBoardItem[];
  notes?: readonly CanvasBoardNote[] | undefined;
  /** What a live board draws inside its frame. Called only for live boards. */
  renderBoard: (board: CanvasBoardItem) => ReactNode;
  /** The most boards live at once. */
  maxLive?: number | undefined;
  /** The narrowest a board may be drawn on screen and still be live, in pixels. */
  minLiveWidth?: number | undefined;
  /** Whether a person may move and resize boards and edit notes. */
  editable?: boolean | undefined;
  /** The smallest and largest side a board or note may be given, in canvas pixels. */
  minSide?: number | undefined;
  maxSide?: number | undefined;
  /** A board was moved or resized, reported once when the gesture ends. */
  onBoardChange?: ((id: string, rect: CanvasBoardRect) => void) | undefined;
  /** A note was moved, resized or retyped. */
  onNoteChange?: ((note: CanvasBoardNote) => void) | undefined;
  /** A note was deleted. */
  onNoteRemove?: ((id: string) => void) | undefined;
  /**
   * The Frame tool placed a board at a canvas point (its top left, in canvas
   * pixels). The caller adds the board, with whatever size and name it gives
   * new boards, and returns its id, which the canvas then selects. Absent, or
   * on a canvas that is not editable, the tool is not offered.
   */
  onBoardCreate?: ((at: CanvasPoint) => string | undefined) | undefined;
  /**
   * Delete pressed on a selected board. Absent, a board is not deleted from
   * the canvas.
   */
  onBoardRemove?: ((id: string) => void) | undefined;
  /**
   * The Text or Sticky tool placed a note at a canvas point (its top left, in
   * canvas pixels). The caller adds the note, with whatever size and starting
   * text it gives new notes, and returns its id, which the canvas then opens
   * for typing. Absent, or on a canvas that is not editable, neither tool is
   * offered.
   */
  onNoteCreate?: ((kind: CanvasBoardNote['kind'], at: CanvasPoint) => string | undefined) | undefined;
  /** The control that opens one board full size; absent, there is none. */
  onOpen?: ((id: string) => void) | undefined;
  /** The board that holds the pointer changed; null is the canvas itself. */
  onActivate?: ((id: string | null) => void) | undefined;
  /**
   * The selected board or note, for a caller that holds it (a list of boards
   * that marks the one picked on the canvas). Left out, the canvas keeps its
   * own; null is nothing selected.
   */
  selected?: CanvasBoardSelection | null | undefined;
  /** The selection changed, by a press on the canvas or by Escape. */
  onSelectedChange?: ((selection: CanvasBoardSelection | null) => void) | undefined;
  /** Anything else in the canvas's control bar. */
  controlsExtra?: ReactNode | undefined;
  /** The floating tool palette. On by default; the keys work either way. */
  toolbar?: boolean | undefined;
  labels?: Partial<CanvasBoardLabels> | undefined;
  canvasLabels?: Partial<CanvasLabels> | undefined;
  /** The canvas underneath, for a caller that reveals or fits a board. */
  canvasRef?: Ref<CanvasHandle> | undefined;
  className?: string | undefined;
}

/** The rectangle every board and note fits in, with room to pan past it. */
function contentOf(
  boards: readonly CanvasBoardRect[],
  notes: readonly CanvasBoardRect[],
): CanvasRect | null {
  const all = [...boards, ...notes];
  if (all.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of all) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return {
    x: minX - CONTENT_MARGIN,
    y: minY - CONTENT_MARGIN,
    width: maxX - minX + 2 * CONTENT_MARGIN,
    height: maxY - minY + 2 * CONTENT_MARGIN,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A press on these is a control's own: it presses the control rather than
 * dragging the item it sits on, and Space presses it rather than holding the
 * hand.
 */
const CONTROL = "button, a[href], input, select, textarea, [contenteditable='true']";

/**
 * What a gesture does to a frame: move it, or resize it from one corner, the
 * opposite corner staying where it is.
 */
type DragMode = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';

/** The three corners a pointer resizes from; the fourth also takes keys. */
const POINTER_CORNERS = ['resize-nw', 'resize-ne', 'resize-sw'] as const;

/** A gesture in progress: which item, how, and where it began. */
interface Drag {
  id: string;
  mode: DragMode;
  pointer: number;
  startX: number;
  startY: number;
  from: CanvasBoardRect;
  moved: boolean;
}

/**
 * The move and resize gestures one item answers: a pointer drag on a handle,
 * or the arrow keys while the handle has focus. `preview` is the frame being
 * dragged, drawn until the gesture ends and `commit` reports it.
 */
function useFrameGestures(
  zoom: number,
  minSide: number,
  maxSide: number,
  commit: (id: string, rect: CanvasBoardRect) => void,
) {
  const [preview, setPreview] = useState<{ id: string; rect: CanvasBoardRect } | null>(null);
  const drag = useRef<Drag | null>(null);

  const next = useCallback(
    (d: Drag, dx: number, dy: number): CanvasBoardRect => {
      const { from } = d;
      if (d.mode === 'move') return { ...from, x: Math.round(from.x + dx), y: Math.round(from.y + dy) };
      // A west or north corner moves its own edge, so the frame grows the
      // other way and the opposite edge stays put, through the clamp too.
      const west = d.mode === 'resize-nw' || d.mode === 'resize-sw';
      const north = d.mode === 'resize-nw' || d.mode === 'resize-ne';
      const w = clamp(Math.round(from.w + (west ? -dx : dx)), minSide, maxSide);
      const h = clamp(Math.round(from.h + (north ? -dy : dy)), minSide, maxSide);
      return {
        x: west ? from.x + from.w - w : from.x,
        y: north ? from.y + from.h - h : from.y,
        w,
        h,
      };
    },
    [minSide, maxSide],
  );

  /*
   * THE POINTER HALF AND THE KEY HALF, apart: a corner only a pointer can use
   * is drawn without a tab stop, and an element that takes no focus takes no
   * key handler either.
   */
  const pointer = (id: string, mode: DragMode, item: CanvasBoardRect) => {
    const from: CanvasBoardRect = { x: item.x, y: item.y, w: item.w, h: item.h };
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        // A control inside the item (a note's edit button, its text field)
        // takes its own press; the item is dragged from anywhere else.
        const control = event.target instanceof Element ? event.target.closest(CONTROL) : null;
        if (control !== null && control !== event.currentTarget) return;
        event.preventDefault();
        // The canvas beneath must not start a pan from the same press.
        event.stopPropagation();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // A pointer the browser already released cannot be captured.
        }
        drag.current = {
          id,
          mode,
          pointer: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          from,
          moved: false,
        };
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        const d = drag.current;
        if (!d || d.pointer !== event.pointerId) return;
        d.moved = true;
        setPreview({
          id,
          rect: next(d, (event.clientX - d.startX) / zoom, (event.clientY - d.startY) / zoom),
        });
      },
      onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
        const d = drag.current;
        if (!d || d.pointer !== event.pointerId) return;
        drag.current = null;
        setPreview(null);
        if (!d.moved) return;
        // AGAINST THE FRAME THE DRAG BEGAN ON, never this render's: while a
        // drag runs the item is drawn at its preview, so the frame handed to
        // this handle is where the pointer already is.
        const rect = next(d, (event.clientX - d.startX) / zoom, (event.clientY - d.startY) / zoom);
        const start = d.from;
        if (rect.x !== start.x || rect.y !== start.y || rect.w !== start.w || rect.h !== start.h) {
          commit(id, rect);
        }
      },
      onPointerCancel: () => {
        drag.current = null;
        setPreview(null);
      },
    };
  };

  const keys = (id: string, mode: DragMode, item: CanvasBoardRect) => {
    const from: CanvasBoardRect = { x: item.x, y: item.y, w: item.w, h: item.h };
    return {
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
        const delta: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        };
        const d = delta[event.key];
        if (!d) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = next(
          { id, mode, pointer: -1, startX: 0, startY: 0, from, moved: true },
          d[0],
          d[1],
        );
        if (rect.x !== from.x || rect.y !== from.y || rect.w !== from.w || rect.h !== from.h) {
          commit(id, rect);
        }
      },
    };
  };

  const handle = (id: string, mode: DragMode, item: CanvasBoardRect) => ({
    ...pointer(id, mode, item),
    ...keys(id, mode, item),
  });

  return { preview, handle, pointer };
}

type Selection = CanvasBoardSelection;

const sameSelection = (a: Selection | null, b: Selection | null) =>
  a === b || (a !== null && b !== null && a.kind === b.kind && a.id === b.id);

/**
 * WHAT A BOARD'S PLACEHOLDER HAS ROOM TO SAY, from its size on screen: how
 * many of its two lines (its size, then why it is not running) fit inside it
 * at the chrome's own type, so the lines it has no room for are left out
 * rather than clipped at both ends.
 */
export function boardRoom(width: number, height: number): { lines: 0 | 1 | 2 } {
  if (width >= PLACEHOLDER_FULL.width && height >= PLACEHOLDER_FULL.height) return { lines: 2 };
  if (width >= PLACEHOLDER_SIZE.width && height >= PLACEHOLDER_SIZE.height) return { lines: 1 };
  return { lines: 0 };
}

/**
 * WHAT A BOARD IS CALLED ABOVE IT, from the room its name row has on screen
 * (`room`, in screen pixels: the board's width, less what the row's other
 * controls take).
 *
 * Its name, while at least [BOARD_NAME_MIN_CHARS] letters and an ellipsis
 * fit, so a shortened name still says which board it is ("Hom..." rather than
 * "H..." or a lone ellipsis); `whole` is false once the name may be shortened,
 * so the full name can be offered as a tooltip. Narrower than that, its place
 * in the design ("3"), which a reader can count to and which stays legible
 * down to a single digit's width. Narrower still, nothing: a mark that narrow
 * reads as a stray scratch. The name row is counter-scaled, so the type is the
 * same size at every zoom and only the room changes.
 */
export function boardName(
  title: string,
  position: number,
  room: number,
): { text: string; whole: boolean } | null {
  const letters = Array.from(title).length;
  if (room >= (Math.min(letters, BOARD_NAME_MIN_CHARS) + 1) * NAME_GLYPH_PX) {
    return { text: title, whole: room >= letters * NAME_GLYPH_PX };
  }
  const number = String(position);
  if (room >= number.length * NAME_GLYPH_PX) return { text: number, whole: false };
  return null;
}

/** The fewest letters a shortened board name keeps before its ellipsis. */
export const BOARD_NAME_MIN_CHARS = 3;

/**
 * A board name's glyph at its extra small type (12px), in screen pixels, on
 * the generous side of the face's average so a wide letter ("m", "W") still
 * fits the room it is counted in.
 */
const NAME_GLYPH_PX = 9;

/**
 * What the name row gives its other parts, in screen pixels: a move handle's
 * end padding and edge (its start is taken back by a margin), and the open
 * control with the gap before it, which a touch screen always draws.
 */
const HANDLE_END = 9;
const OPEN_CONTROL = 30;

/**
 * The least a placeholder needs, in screen pixels, for its size line alone,
 * and for both of its lines: each line's width at the extra small type with
 * its padding, and the lines' height with their gap.
 */
const PLACEHOLDER_SIZE = { width: 96, height: 32 };
const PLACEHOLDER_FULL = { width: 200, height: 64 };

/** Where a key is a character being typed rather than an instruction to the canvas. */
const TYPING = "input, textarea, select, [contenteditable='true']";


export function CanvasBoard({
  label,
  boards,
  notes = [],
  renderBoard,
  maxLive = CANVAS_BOARD_MAX_LIVE,
  minLiveWidth = CANVAS_BOARD_MIN_LIVE_WIDTH,
  editable = false,
  minSide = 40,
  maxSide = 8000,
  onBoardChange,
  onNoteChange,
  onNoteRemove,
  onNoteCreate,
  onBoardCreate,
  onBoardRemove,
  onOpen,
  onActivate,
  selected: heldSelection,
  onSelectedChange,
  controlsExtra,
  toolbar = true,
  labels,
  canvasLabels,
  canvasRef,
  className,
}: CanvasBoardProps) {
  const text = { ...LABELS, ...labels };
  const [view, setView] = useState<CanvasView>(IDENTITY_VIEW);
  const [viewport, setViewport] = useState<CanvasSize>({ width: 0, height: 0 });
  const [active, setActive] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [ownSelection, setOwnSelection] = useState<Selection | null>(null);
  const selected = heldSelection !== undefined ? heldSelection : ownSelection;
  const setSelected = (next: Selection | null) => {
    if (sameSelection(next, selected)) return;
    if (heldSelection === undefined) setOwnSelection(next);
    onSelectedChange?.(next);
  };
  const [chosenTool, setTool] = useState<CanvasBoardTool>('move');
  const [spaceHeld, setSpaceHeld] = useState(false);

  // The canvas is the caller's to reach too: one handle, handed to both.
  const canvas = useRef<CanvasHandle>(null);
  useImperativeHandle(canvasRef, () => canvas.current as CanvasHandle, []);

  const creates = editable && onNoteCreate !== undefined;
  const frames = editable && onBoardCreate !== undefined;
  const tools: CanvasTool<CanvasBoardTool>[] = [
    { id: 'move', label: text.moveTool, icon: <MousePointer2Glyph />, shortcut: 'V' },
    { id: 'hand', label: text.handTool, icon: <HandGlyph />, shortcut: 'H' },
    ...(frames ? ([{ id: 'frame', label: text.frameTool, icon: <FrameGlyph />, shortcut: 'F' }] as const) : []),
    ...(creates
      ? ([
          { id: 'text', label: text.textTool, icon: <TypeGlyph />, shortcut: 'T' },
          { id: 'sticky', label: text.stickyTool, icon: <StickyNoteGlyph />, shortcut: 'S' },
        ] as const)
      : []),
  ];
  // A tool the canvas no longer offers (editing ended) is put down.
  const tool: CanvasBoardTool = tools.some((t) => t.id === chosenTool) ? chosenTool : 'move';
  // Space held is the Hand for as long as it is held, whatever is in hand.
  const acting: CanvasBoardTool = spaceHeld ? 'hand' : tool;

  const activate = (id: string | null) => {
    setActive(id);
    onActivate?.(id);
  };

  const commitBoard = useCallback(
    (id: string, rect: CanvasBoardRect) => onBoardChange?.(id, rect),
    [onBoardChange],
  );
  const commitNote = useCallback(
    (id: string, rect: CanvasBoardRect) => {
      const note = notes.find((n) => n.id === id);
      if (note) onNoteChange?.({ ...note, ...rect });
    },
    [notes, onNoteChange],
  );
  const boardGestures = useFrameGestures(view.k, minSide, maxSide, commitBoard);
  const noteGestures = useFrameGestures(view.k, minSide, maxSide, commitNote);

  const frameOf = <T extends CanvasBoardRect & { id: string }>(
    item: T,
    preview: { id: string; rect: CanvasBoardRect } | null,
  ): T => (preview?.id === item.id ? { ...item, ...preview.rect } : item);

  const drawnBoards = boards.map((b) => frameOf(b, boardGestures.preview));
  const drawnNotes = notes.map((n) => frameOf(n, noteGestures.preview));
  const content = useMemo(
    () => contentOf(boards, notes),
    // The content's bounds follow the committed frames, never a drag in
    // progress: a bound that moved under the pointer would pan the canvas.
    [boards, notes],
  );
  const largest = boards.reduce((w, b) => Math.max(w, b.w), 0);
  const live = new Set(liveBoards(drawnBoards, view, viewport, maxLive, minLiveWidth));

  // A selection whose item has gone (deleted, or a new version without it)
  // is no selection.
  const shownSelection =
    selected !== null &&
    (selected.kind === 'board' ? boards : notes).some((item) => item.id === selected.id)
      ? selected
      : null;
  const isSelected = (kind: Selection['kind'], id: string) =>
    shownSelection?.kind === kind && shownSelection.id === id;

  // ---- Space held: the Hand, until it is let go or the window loses focus --
  useEffect(() => {
    if (!spaceHeld) return;
    const release = (event: KeyboardEvent | FocusEvent) => {
      if (event instanceof KeyboardEvent && event.key !== ' ') return;
      setSpaceHeld(false);
    };
    window.addEventListener('keyup', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keyup', release);
      window.removeEventListener('blur', release);
    };
  }, [spaceHeld]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (event.key === 'Escape') {
      if (active !== null) {
        event.stopPropagation();
        activate(null);
      } else if (shownSelection !== null) {
        event.stopPropagation();
        setSelected(null);
      }
      return;
    }
    if (event.defaultPrevented || target?.closest(TYPING)) return;
    if (event.key === ' ') {
      // A focused control keeps its own Space: it is how a button is pressed.
      if (target?.closest(CONTROL)) return;
      event.preventDefault();
      if (!event.repeat) setSpaceHeld(true);
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && editable && shownSelection !== null) {
      const remove = shownSelection.kind === 'note' ? onNoteRemove : onBoardRemove;
      if (remove) {
        event.preventDefault();
        remove(shownSelection.id);
        setSelected(null);
        return;
      }
    }
    const picked = toolForKey(tools, event);
    if (picked !== undefined) {
      event.preventDefault();
      setTool(picked);
    }
  };

  /*
   * A CLICK ON THE FIELD. Under Move it clears the selection; under Text or
   * Sticky it places a note there. A click that ended a pan never arrives:
   * the canvas swallows it.
   */
  const onClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.crewlet-canvas__viewport')) return;
    if (target.closest('.crewlet-canvas-board__board, .crewlet-canvas-board__note')) return;
    if (acting === 'frame' && onBoardCreate && canvas.current) {
      const at = canvas.current.worldAt({ x: event.clientX, y: event.clientY });
      const id = onBoardCreate({ x: Math.round(at.x), y: Math.round(at.y) });
      setTool('move');
      if (id !== undefined) setSelected({ kind: 'board', id });
      return;
    }
    if ((acting === 'text' || acting === 'sticky') && onNoteCreate && canvas.current) {
      const at = canvas.current.worldAt({ x: event.clientX, y: event.clientY });
      const id = onNoteCreate(acting === 'text' ? 'title' : 'sticky', {
        x: Math.round(at.x),
        y: Math.round(at.y),
      });
      setTool('move');
      if (id !== undefined) {
        setSelected({ kind: 'note', id });
        setEditing(id);
      }
      return;
    }
    if (acting === 'move') setSelected(null);
  };

  const zoomVar = { '--crewlet-canvas-board-zoom': String(view.k) } as CSSProperties;

  /*
   * WHAT A PRESS WILL DO NEXT, in the canvas's status note beside its zoom bar
   * rather than under the board: drawn on the canvas it sat over whatever lay
   * below the board, the palette included, and a status region says it to a
   * reader who cannot see it too. Empty rather than absent, so the region is
   * in place before its message arrives.
   */
  const activeBoard = boards.find((b) => b.id === active && live.has(b.id));
  const chosenBoard = shownSelection?.kind === 'board' ? shownSelection.id : null;
  const hint =
    !editable && activeBoard
      ? text.active
      : !editable && chosenBoard !== null && live.has(chosenBoard)
        ? text.interact
        : '';

  return (
    // The wrapper hears keys and clicks bubbling from inside the canvas; the
    // canvas's own viewport is the focusable, labelled control.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={cx('crewlet-canvas-board', className)}
      data-editable={editable || undefined}
      data-tool={acting}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      <Canvas
        label={label}
        content={content}
        largestItemWidth={largest || undefined}
        ground="grid"
        cursor={TOOL_CURSOR[acting]}
        minZoom={CANVAS_BOARD_MIN_ZOOM}
        refitOnResize
        controlsActualSize
        controlsExtra={controlsExtra}
        hint={hint}
        labels={canvasLabels}
        overlay={
          toolbar ? (
            <div className="crewlet-canvas-board__tools">
              <CanvasToolbar label={text.tools} tools={tools} value={tool} onChange={setTool} />
            </div>
          ) : undefined
        }
        onViewChange={(nextView, size) => {
          setView(nextView);
          setViewport(size);
        }}
        ref={canvas}
      >
        <div className="crewlet-canvas-board__layer" style={zoomVar}>
          {drawnBoards.map((b, index) => {
            const isLive = live.has(b.id);
            const isActive = !editable && active === b.id && isLive;
            const chosen = isSelected('board', b.id);
            const room = boardRoom(b.w * view.k, b.h * view.k);
            const name = boardName(
              b.title,
              index + 1,
              b.w * view.k - (editable ? HANDLE_END : 0) - (onOpen ? OPEN_CONTROL : 0),
            );
            return (
              <section
                key={b.id}
                className="crewlet-canvas-board__board"
                data-untitled={!name || undefined}
                data-live={isLive || undefined}
                data-active={isActive || undefined}
                data-selected={chosen || undefined}
                aria-label={`${b.title}, ${text.size(b.w, b.h)}`}
                style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
              >
                <div className="crewlet-canvas-board__chrome">
                  {editable ? (
                    <button
                      type="button"
                      className="crewlet-canvas-board__title crewlet-canvas-board__handle"
                      aria-label={text.move(b.title)}
                      aria-pressed={chosen}
                      title={name?.whole === false ? b.title : undefined}
                      onFocus={() => setSelected({ kind: 'board', id: b.id })}
                      {...boardGestures.handle(b.id, 'move', b)}
                    >
                      {name?.text ?? b.title}
                    </button>
                  ) : (
                    // The name selects its board, as a press on the board
                    // does; the board's keyboard route is its own page and
                    // its open control, so the name is pointer only.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                    <span
                      className="crewlet-canvas-board__title"
                      title={name?.whole === false ? b.title : undefined}
                      onClick={() => setSelected({ kind: 'board', id: b.id })}
                    >
                      {name?.text ?? b.title}
                    </span>
                  )}
                  {onOpen && (
                    <IconButton
                      size="sm"
                      variant="ghost"
                      className="crewlet-canvas-board__open"
                      label={text.open(b.title)}
                      icon={<MaximizeGlyph />}
                      onClick={() => onOpen(b.id)}
                    />
                  )}
                </div>
                <div className="crewlet-canvas-board__body">
                  {isLive ? (
                    renderBoard(b)
                  ) : (
                    // NAMED BY ITS TITLE ABOVE IT, as a live board is, so it
                    // says only what a running board does not: its size and
                    // why it is not running, as much of that as fits.
                    <div className="crewlet-canvas-board__placeholder">
                      {room.lines > 0 && (
                        <span className="crewlet-canvas-board__placeholder-text">
                          <span className="crewlet-canvas-board__placeholder-size">
                            {text.size(b.w, b.h)}
                          </span>
                          {room.lines > 1 && <span>{text.paused}</span>}
                        </span>
                      )}
                    </div>
                  )}
                  {!isActive && (
                    // A press here pans the canvas like the field around it;
                    // a click selects the board and a double-click hands a
                    // live board the pointer. The board's page stays
                    // reachable by keyboard through its own frame, so the
                    // shield is pointer only.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                    <div
                      className="crewlet-canvas-board__shield"
                      onClick={() => setSelected({ kind: 'board', id: b.id })}
                      onDoubleClick={editable || !isLive ? undefined : () => activate(b.id)}
                    />
                  )}
                </div>
                {editable && (
                  <Corners
                    title={b.title}
                    selected={chosen}
                    text={text}
                    keyed={boardGestures.handle(b.id, 'resize-se', b)}
                    pointer={(mode) => boardGestures.pointer(b.id, mode, b)}
                  />
                )}
              </section>
            );
          })}
          {drawnNotes.map((n) => (
            <NoteView
              key={n.id}
              note={n}
              editable={editable}
              editing={editing === n.id}
              selected={isSelected('note', n.id)}
              text={text}
              moveHandle={noteGestures.handle(n.id, 'move', n)}
              dragPaper={noteGestures.pointer(n.id, 'move', n)}
              resizeHandle={noteGestures.handle(n.id, 'resize-se', n)}
              resizePointer={(mode) => noteGestures.pointer(n.id, mode, n)}
              onSelect={() => setSelected({ kind: 'note', id: n.id })}
              onEdit={() => setEditing(n.id)}
              onDone={(value) => {
                setEditing(null);
                const trimmed = value.trim();
                if (trimmed !== '' && value !== n.text) {
                  const original = notes.find((o) => o.id === n.id);
                  if (original) onNoteChange?.({ ...original, text: value });
                }
              }}
              onCancel={() => setEditing(null)}
              onRemove={() => onNoteRemove?.(n.id)}
            />
          ))}
        </div>
      </Canvas>
    </div>
  );
}

type Gestures = ReturnType<typeof useFrameGestures>;
type Handle = ReturnType<Gestures['handle']>;
type PointerHandle = ReturnType<Gestures['pointer']>;

/**
 * A selected item's resize corners.
 *
 * THE BOTTOM RIGHT IS THE ONE WITH A TAB STOP, always present and drawn while
 * it is selected or focused, so every item can be resized from the keyboard
 * with the arrows. The other three are a pointer's extra reach, drawn only on
 * a selected item and hidden from assistive technology, because a fourth tab
 * stop per item would say nothing the first does not.
 */
function Corners({
  title,
  selected,
  text,
  keyed,
  pointer,
}: {
  title: string;
  selected: boolean;
  text: CanvasBoardLabels;
  keyed: Handle;
  pointer: (mode: DragMode) => PointerHandle;
}) {
  return (
    <>
      {selected &&
        POINTER_CORNERS.map((mode) => (
          <span
            key={mode}
            aria-hidden
            className="crewlet-canvas-board__resize"
            data-corner={mode}
            {...pointer(mode)}
          />
        ))}
      <button
        type="button"
        className="crewlet-canvas-board__resize"
        data-corner="resize-se"
        aria-label={text.resize(title)}
        {...keyed}
      />
    </>
  );
}

function NoteView({
  note,
  editable,
  editing,
  selected,
  text,
  moveHandle,
  dragPaper,
  resizeHandle,
  resizePointer,
  onSelect,
  onEdit,
  onDone,
  onCancel,
  onRemove,
}: {
  note: CanvasBoardNote;
  editable: boolean;
  editing: boolean;
  selected: boolean;
  text: CanvasBoardLabels;
  moveHandle: Handle;
  dragPaper: PointerHandle;
  resizeHandle: Handle;
  resizePointer: (mode: DragMode) => PointerHandle;
  onSelect: () => void;
  onEdit: () => void;
  onDone: (value: string) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const body = (
    <>
      {editing ? (
        <textarea
          className="crewlet-canvas-board__note-field"
          aria-label={text.noteText}
          defaultValue={note.text}
          // Focus moves into the field the reader just asked to type in.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          // A new note opens on its starting words, selected, so typing
          // replaces them rather than adding to them.
          onFocus={(event) => event.currentTarget.select()}
          onBlur={(event) => onDone(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onDone(event.currentTarget.value);
            }
          }}
        />
      ) : (
        <p
          className="crewlet-canvas-board__note-text"
          style={note.kind === 'title' ? { fontSize: titleSize(note) } : undefined}
        >
          {note.text}
        </p>
      )}
      {editable && !editing && (
        <div className="crewlet-canvas-board__note-tools">
          <button
            type="button"
            className="crewlet-canvas-board__handle crewlet-canvas-board__note-move"
            aria-label={text.move(noteName(note))}
            onFocus={onSelect}
            {...moveHandle}
          />
          <IconButton
            size="sm"
            variant="ghost"
            label={text.editNote}
            icon={<PencilGlyph />}
            onClick={onEdit}
          />
          <IconButton
            size="sm"
            variant="ghost"
            label={text.removeNote}
            icon={<TrashGlyph />}
            onClick={onRemove}
          />
        </div>
      )}
      {editable && !editing && (
        <Corners
          title={noteName(note)}
          selected={selected}
          text={text}
          keyed={resizeHandle}
          pointer={resizePointer}
        />
      )}
    </>
  );
  const frame = { left: note.x, top: note.y, width: note.w, height: note.h };
  /*
   * THE PAPER ITSELF selects the note, moves it when the canvas is editable,
   * and opens it for typing on a double-click, as a design tool's note does.
   * Its keyboard route is the move handle and the edit control above it, so
   * the paper's own handlers are pointer only.
   */
  const paper = {
    'data-selected': selected || undefined,
    onClick: onSelect,
    ...(editable && !editing ? { ...dragPaper, onDoubleClick: onEdit } : {}),
  };
  if (note.kind === 'sticky') {
    return (
      <Note
        tone={NOTE_TONES[note.color ?? CANVAS_NOTE_COLORS[0]]}
        className="crewlet-canvas-board__note"
        data-kind="sticky"
        style={frame}
        {...paper}
      >
        {body}
      </Note>
    );
  }
  return (
    <div className="crewlet-canvas-board__note" data-kind="title" style={frame} {...paper}>
      {body}
    </div>
  );
}
