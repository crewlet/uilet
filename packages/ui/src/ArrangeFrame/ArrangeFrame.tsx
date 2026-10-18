import {
  forwardRef,
  useCallback,
  useRef,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { TrashGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import type { ReorderHandleProps } from '../Reorder/index.js';
import { cx } from '../utils/cx.js';
import { useGridResize, type GridSize } from './useGridResize.js';

export interface ArrangeFrameResize {
  minColumns?: number | undefined;
  maxColumns?: number | undefined;
  minRows?: number | undefined;
  maxRows?: number | undefined;
  /** False for a block whose height is always its content's: width only. */
  vertical?: boolean | undefined;
  onResize: (next: GridSize) => void;
}

export interface ArrangeFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What the block is called: every control's name. */
  name: string;
  /** Whether the page is being arranged. Off, the frame draws its child only. */
  editing: boolean;
  /** Columns of the page grid the block spans. */
  columns: number;
  /** Rows tall, or null for its content's height. */
  rows?: number | null | undefined;
  /** One row's height in pixels. */
  rowHeight?: number | undefined;
  /** The handle's props from `useReorder`, spread on the block itself; left out, it does not move. */
  handle?: ReorderHandleProps | undefined;
  /** Resize by the corner or the edge; left out, the block keeps its size. */
  resize?: ArrangeFrameResize | undefined;
  /** Controls of the block's own on its toolbar: settings, a menu. */
  actions?: ReactNode;
  /** Take the block off the page; left out, it cannot be removed. */
  onRemove?: (() => void) | undefined;
  /** Why the block cannot be removed, said on the button that would. */
  fixed?: string | undefined;
  /**
   * A block that holds other blocks (a group). Its content stays operable
   * while arranging, because the blocks inside are arranged in place and
   * each makes its own content inert; a press on its fields types rather
   * than moves it.
   */
  container?: boolean | undefined;
  /**
   * A block with no surface of its own (a heading, a divider): its ring is
   * drawn a step outside it, so the words are not pressed against it.
   */
  bare?: boolean | undefined;
  /** The block whose settings are open: ringed until they close. */
  selected?: boolean | undefined;
  /** Drawn once with the accent, for a block the reader just added. */
  fresh?: boolean | undefined;
  children: ReactNode;
}

/** What a press types into or picks from rather than moves. */
const FIELDS = 'input, textarea, select, [contenteditable="true"]';

function assign<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T }).current = value;
}

/**
 * One block of a page the reader is arranging: moved by its grip or its
 * surface, sized from its corner or its edge, taken off from its toolbar.
 *
 * ONE BOUNDARY, THE BLOCK'S OWN. A card already draws its edge, and a second
 * outline around it read as two borders. At rest a block being arranged looks
 * exactly as it does on the page. Hovered or focused, ONE accent ring is drawn
 * over its own edge (on the innermost block only, so a card inside a group
 * does not light the group as well), with its toolbar and its resize handle.
 *
 * THE CHROME NEVER COVERS THE BLOCK'S CONTROLS. The toolbar sits on the
 * block's top edge, half outside it, clear of a card's own header links; the
 * corner bracket follows the card's own radius.
 *
 * TWO HANDLES FOR TWO RESIZES. A block that may be sized both ways carries a
 * corner bracket; one whose height is always its content's (a heading, a
 * figure, a group) carries a grip on its right edge, the handle of a column
 * splitter, so the handle says which way it moves before it is touched.
 *
 * THE GRID SHOWS WHILE RESIZING, measured from the grid the block sits on
 * (the page's, or a group's), so the columns drawn are the ones it snaps to.
 *
 * THE BLOCK IS ITS OWN HANDLE. A block's content is inert while arranging,
 * so a press on it can mean nothing but "move this": the whole block is the
 * drag source, and focused it moves with the arrow keys, so the toolbar
 * carries no grip. A container (a group) is moved the same way, by its header
 * or its edge, except from a field, where a press types or selects.
 *
 * A FIXED HEIGHT SCROLLS ITS CONTENT rather than cutting it off.
 */
export const ArrangeFrame = forwardRef<HTMLDivElement, ArrangeFrameProps>(function ArrangeFrame(
  {
    name,
    editing,
    columns,
    rows = null,
    rowHeight = 24,
    handle,
    resize,
    actions,
    onRemove,
    fixed,
    container = false,
    bare = false,
    selected = false,
    fresh,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const node = useRef<HTMLDivElement | null>(null);
  const setNode = useCallback(
    (el: HTMLDivElement | null) => {
      node.current = el;
      assign(ref, el);
    },
    [ref],
  );
  const vertical = resize?.vertical !== false;
  const { live, guides, handleProps: resizeProps } = useGridResize(node, {
    name,
    size: { columns, rows },
    rowHeight,
    minColumns: resize?.minColumns,
    maxColumns: resize?.maxColumns,
    minRows: resize?.minRows,
    maxRows: resize?.maxRows,
    vertical,
    onResize: (next) => resize?.onResize(next),
  });
  const shown = live ?? { columns, rows };
  const placed: CSSProperties = {
    ...style,
    gridColumn: `span ${shown.columns}`,
    ...(shown.rows !== null ? { height: `${shown.rows * rowHeight}px` } : {}),
  };
  // Whether the press a drag starts from fell on a field, which it must not carry off.
  const onField = useRef(false);
  const surface =
    editing && handle
      ? {
          draggable: true as const,
          tabIndex: 0,
          role: 'group',
          'aria-label': name,
          'aria-describedby': handle['aria-describedby'],
          onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
            onField.current = (event.target as Element).closest(FIELDS) !== null;
          },
          onDragStart: (event: DragEvent<HTMLDivElement>) => {
            if (onField.current) event.preventDefault();
            else handle.onDragStart(event);
          },
          onDragEnd: handle.onDragEnd,
          // The block's own keys only: arrows typed in a group's name move the caret.
          onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) handle.onKeyDown(event);
          },
        }
      : {};
  const resizeName = vertical ? `Resize ${name}` : `Change the width of ${name}`;
  return (
    <div
      ref={setNode}
      className={cx(
        'crewlet-arrange-frame',
        editing && 'is-editing',
        container && 'is-container',
        bare && 'is-bare',
        editing && selected && 'is-selected',
        live && 'is-resizing',
        shown.rows !== null && 'is-fixed-height',
        fresh && 'is-fresh',
        className,
      )}
      style={placed}
      data-columns={shown.columns}
      {...surface}
      {...rest}
    >
      <div className="crewlet-arrange-frame__content" inert={(editing && !container) || undefined}>
        {children}
      </div>
      {editing ? (
        <>
          <div className="crewlet-arrange-frame__bar" role="group" aria-label={`Tools for ${name}`}>
            {actions}
            {onRemove || fixed ? (
              <>
                <span className="crewlet-arrange-frame__sep" aria-hidden="true" />
                <IconButton
                  size="sm"
                  variant="ghost-danger"
                  label={`Remove ${name}`}
                  icon={<TrashGlyph size="sm" />}
                  {...(fixed ? { disabledReason: fixed } : {})}
                  onClick={() => onRemove?.()}
                />
              </>
            ) : null}
          </div>
          {resize ? (
            <button
              type="button"
              className={cx('crewlet-arrange-frame__resize', vertical ? 'is-corner' : 'is-edge')}
              title={vertical ? `${resizeName}. Double click to fit the height to its content.` : resizeName}
              draggable={false}
              {...resizeProps}
              aria-label={resizeName}
            >
              <span className="crewlet-arrange-frame__grip" aria-hidden="true" />
            </button>
          ) : null}
          {guides ? (
            <span
              className="crewlet-arrange-frame__guides"
              aria-hidden="true"
              style={{
                left: `${guides.left}px`,
                width: `${guides.width}px`,
                gridTemplateColumns: `repeat(${guides.columns}, minmax(0, 1fr))`,
                columnGap: `${guides.gap}px`,
              }}
            >
              {Array.from({ length: guides.columns }, (_, i) => (
                <span key={i} />
              ))}
            </span>
          ) : null}
          {live ? (
            <span className="crewlet-arrange-frame__size" aria-hidden="true">
              {`${live.columns} ${live.columns === 1 ? 'column' : 'columns'}`}
              {vertical ? ` · ${live.rows === null ? 'Height fits content' : `${live.rows * rowHeight} px tall`}` : ''}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
});
