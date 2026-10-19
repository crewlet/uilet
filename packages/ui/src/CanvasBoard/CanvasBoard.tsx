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
 * A PAGE INSIDE A BOARD NEVER TAKES THE CANVAS'S POINTER BY SURPRISE. A live
 * board is covered by a shield that pans the canvas like the field around it;
 * a click (not a drag) on it activates that board, and only then does the page
 * receive the pointer. Escape gives the pointer back to the canvas.
 *
 * EDITING (`editable`). A board's title bar becomes its move handle and a
 * corner its resize handle, by pointer or by the arrow keys (Shift for a larger
 * step); a note gains the same handles, and its text is edited in place. Each
 * finished gesture is reported once, with whole canvas pixels, and the caller
 * decides what a change is (for a design, a new version of its canvas).
 *
 * THE CHROME STAYS ONE SIZE ON SCREEN. Titles and handles are counter-scaled
 * by the zoom, so a board's label is readable and its handle is a full pointer
 * target whatever the zoom, while the board itself scales with the canvas.
 */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { MaximizeGlyph, PencilGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';
import {
  Canvas,
  IDENTITY_VIEW,
  type CanvasHandle,
  type CanvasLabels,
  type CanvasRect,
  type CanvasSize,
  type CanvasView,
} from '../Canvas/index.js';
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
};

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
  /** The control that opens one board full size; absent, there is none. */
  onOpen?: ((id: string) => void) | undefined;
  /** The board that holds the pointer changed; null is the canvas itself. */
  onActivate?: ((id: string | null) => void) | undefined;
  /** Anything else in the canvas's control bar. */
  controlsExtra?: ReactNode | undefined;
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

/** A gesture in progress: which item, how, and where it began. */
interface Drag {
  id: string;
  mode: 'move' | 'resize';
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
    (d: Drag, dx: number, dy: number): CanvasBoardRect =>
      d.mode === 'move'
        ? { ...d.from, x: Math.round(d.from.x + dx), y: Math.round(d.from.y + dy) }
        : {
            ...d.from,
            w: clamp(Math.round(d.from.w + dx), minSide, maxSide),
            h: clamp(Math.round(d.from.h + dy), minSide, maxSide),
          },
    [minSide, maxSide],
  );

  const handle = (id: string, mode: Drag['mode'], item: CanvasBoardRect) => {
    const from: CanvasBoardRect = { x: item.x, y: item.y, w: item.w, h: item.h };
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
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
      onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        if (!d || d.pointer !== event.pointerId) return;
        d.moved = true;
        setPreview({
          id,
          rect: next(d, (event.clientX - d.startX) / zoom, (event.clientY - d.startY) / zoom),
        });
      },
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
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
      onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
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

  return { preview, handle };
}

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
  onOpen,
  onActivate,
  controlsExtra,
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

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && active !== null) {
      event.stopPropagation();
      activate(null);
    }
  };

  const zoomVar = { '--crewlet-canvas-board-zoom': String(view.k) } as CSSProperties;

  return (
    // The wrapper only hears Escape bubbling from inside the canvas; the
    // canvas's own viewport is the focusable, labelled control.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={cx('crewlet-canvas-board', className)}
      data-editable={editable || undefined}
      onKeyDown={onKeyDown}
    >
      <Canvas
        label={label}
        content={content}
        largestItemWidth={largest || undefined}
        ground="dotted"
        controlsExtra={controlsExtra}
        labels={canvasLabels}
        onViewChange={(nextView, size) => {
          setView(nextView);
          setViewport(size);
        }}
        ref={canvasRef}
      >
        <div className="crewlet-canvas-board__layer" style={zoomVar}>
          {drawnBoards.map((b) => {
            const isLive = live.has(b.id);
            const isActive = !editable && active === b.id && isLive;
            return (
              <section
                key={b.id}
                className="crewlet-canvas-board__board"
                data-live={isLive || undefined}
                data-active={isActive || undefined}
                aria-label={`${b.title}, ${text.size(b.w, b.h)}`}
                style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
              >
                <div className="crewlet-canvas-board__chrome">
                  {editable ? (
                    <button
                      type="button"
                      className="crewlet-canvas-board__title crewlet-canvas-board__handle"
                      aria-label={text.move(b.title)}
                      {...boardGestures.handle(b.id, 'move', b)}
                    >
                      {b.title}
                    </button>
                  ) : (
                    <span className="crewlet-canvas-board__title">{b.title}</span>
                  )}
                  {onOpen && (
                    <IconButton
                      size="sm"
                      variant="ghost"
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
                    <div className="crewlet-canvas-board__placeholder">
                      <span className="crewlet-canvas-board__placeholder-title">{b.title}</span>
                      <span>{text.size(b.w, b.h)}</span>
                      <span>{text.paused}</span>
                    </div>
                  )}
                  {isLive && !isActive && (
                    // A press here pans the canvas like the field around it;
                    // a click without a drag hands this board the pointer.
                    // The board's page stays reachable by keyboard through
                    // its own frame, so the shield is pointer only.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                    <div
                      className="crewlet-canvas-board__shield"
                      onClick={editable ? undefined : () => activate(b.id)}
                    />
                  )}
                </div>
                {isActive && <p className="crewlet-canvas-board__hint">{text.active}</p>}
                {editable && (
                  <button
                    type="button"
                    className="crewlet-canvas-board__resize"
                    aria-label={text.resize(b.title)}
                    {...boardGestures.handle(b.id, 'resize', b)}
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
              text={text}
              moveHandle={noteGestures.handle(n.id, 'move', n)}
              resizeHandle={noteGestures.handle(n.id, 'resize', n)}
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

type Handle = ReturnType<ReturnType<typeof useFrameGestures>['handle']>;

function NoteView({
  note,
  editable,
  editing,
  text,
  moveHandle,
  resizeHandle,
  onEdit,
  onDone,
  onCancel,
  onRemove,
}: {
  note: CanvasBoardNote;
  editable: boolean;
  editing: boolean;
  text: CanvasBoardLabels;
  moveHandle: Handle;
  resizeHandle: Handle;
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
        <p className="crewlet-canvas-board__note-text">{note.text}</p>
      )}
      {editable && !editing && (
        <div className="crewlet-canvas-board__note-tools">
          <button
            type="button"
            className="crewlet-canvas-board__handle crewlet-canvas-board__note-move"
            aria-label={text.move(noteName(note))}
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
        <button
          type="button"
          className="crewlet-canvas-board__resize"
          aria-label={text.resize(noteName(note))}
          {...resizeHandle}
        />
      )}
    </>
  );
  const frame = { left: note.x, top: note.y, width: note.w, height: note.h };
  if (note.kind === 'sticky') {
    return (
      <Note
        tone={NOTE_TONES[note.color ?? CANVAS_NOTE_COLORS[0]]}
        className="crewlet-canvas-board__note"
        data-kind="sticky"
        style={frame}
      >
        {body}
      </Note>
    );
  }
  return (
    <div className="crewlet-canvas-board__note" data-kind="title" style={frame}>
      {body}
    </div>
  );
}
