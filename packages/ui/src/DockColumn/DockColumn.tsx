/**
 * A column a host docks beside its content and takes away again: a list of
 * rooms pinned beside a conversation.
 *
 * THE COLUMN IS ALWAYS THERE, as wide as its panel while it is open and as
 * wide as nothing while it is not, and it eases between the two. It stands in
 * the host's own `auto` grid track (or as a flex item that does not grow), so
 * its width IS the track, and the content beside it narrows and widens with
 * it frame by frame rather than jumping by the panel's width in one.
 * Swapping the host's grid template between two track lists instead is what
 * made the content jump: a template is not a length, and it does not ease.
 *
 * THE PANEL KEEPS ITS OWN WIDTH, clipped by the column and held to the
 * column's edge that faces the content, so it slides in from the outer edge
 * and back out to it, the way a sheet does, and nothing in it reflows on the
 * way.
 *
 * AND IT LEAVES INERT. Closed, the panel stays drawn until the column has
 * closed over it (`usePresence`), and `inert` all the while, so nothing in a
 * panel on its way out takes focus or a press; opened again on the way out,
 * it is live again where it is. Under reduced motion it simply is or is not.
 *
 * FOCUS LEAVES WITH IT. A reader who closes the dock from inside it (an Unpin
 * in its own head) is handed to `focusOnClose`, the control that docks it
 * again, as the panel starts to leave, and never left in a panel that takes
 * nothing; with no such control focus is taken off the panel.
 *
 * A PLAIN COLUMN, NOT A LANDMARK: what it holds names itself (a navigation
 * named Rooms), and a column named the same as the region inside it is two
 * landmarks of one name a screen reader cannot tell apart.
 *
 * THE READER MAY SIZE IT (`resize`): the kit's `ResizeHandle` straddles the
 * edge that faces the content, the column follows a drag or a key at once
 * rather than easing, and the host keeps the width it is handed. The clip is
 * an element inside the column, so the handle can stand across the edge
 * without being cut by it.
 */

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { ResizeHandle } from '../AppShell/ResizeHandle.js';
import { releaseFocus, usePresence } from '../Presence/index.js';
import { cx } from '../utils/cx.js';

/** The edge of the content the column stands at, in the inline direction. */
export type DockColumnSide = 'start' | 'end';

/** How the reader sizes the column, and what the host does with the width. */
export interface DockColumnResize {
  /** Names the handle: "Resize the Rooms panel". */
  label: string;
  /** The narrowest the column may be, in px. */
  min: number;
  /**
   * The widest, in px. A host that keeps the content beside the column at a
   * floor passes the cap that leaves it, so a drag stops where it must.
   */
  max: number;
  /** Every step of a drag or a key: draw it by passing it back as `width`. */
  onValueChange: (px: number) => void;
  /** Where a gesture ends: the moment to keep the width. */
  onValueCommit?: ((px: number) => void) | undefined;
  /** The resting width Enter and a double press return to. */
  defaultValue?: number | undefined;
}

export interface DockColumnProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the panel is docked. The column eases open and shut on a change. */
  open: boolean;
  /**
   * The panel's width, and the column's while it is open: a number of px, or
   * any CSS length (`var(--rooms-dock)`), so a host keeps the one value its
   * own layout arithmetic reads.
   */
  width: number | string;
  /**
   * Which side of the content the column stands on. `start` (the default) is
   * before it, and its panel slides in from the start edge; `end` is after
   * it, and slides in from the end edge.
   */
  side?: DockColumnSide | undefined;
  /**
   * A hairline on the panel's edge that faces the content. On by default; a
   * panel whose content draws its own edge turns it off.
   */
  divider?: boolean | undefined;
  /**
   * Where focus goes when the dock closes while focus is inside it: the
   * control that docks it again. Asked as the panel starts to leave. Left
   * out, or answering nothing, focus is taken off the panel.
   */
  focusOnClose?: (() => HTMLElement | null | undefined) | undefined;
  /**
   * Lets the reader size the column from the edge that faces the content.
   * Its value is `width` where that is a number, and the column's own drawn
   * width where it is any other length.
   */
  resize?: DockColumnResize | undefined;
  /**
   * The panel. Its ground is the column's `--crewlet-dock-column-ground`,
   * which a host sets on its own class (`var(--color-surface-subtle)`), and
   * none by default.
   */
  children?: ReactNode;
}

/** The dock's own motion: its width, on the column itself. */
const DOCK_MOTION = { transitions: ['width'] } as const;

export function DockColumn({
  open,
  width,
  side = 'start',
  divider = true,
  focusOnClose,
  resize,
  className,
  style,
  children,
  ...rest
}: DockColumnProps) {
  const column = useRef<HTMLDivElement | null>(null);
  const drawn = useDrawnWidth(column, resize !== undefined && typeof width !== 'number');
  // The column's own width transition is the motion the panel waits out, and
  // nothing the panel's content runs.
  const { present, leaving } = usePresence(open, column, DOCK_MOTION);
  // WHETHER THE HOST CLOSED IT, as of the last render, for the panel to read
  // as it goes: a panel unmounted with its dock still open went with a route,
  // or with StrictMode rehearsing an unmount, and neither is a close.
  const closed = useRef(!open);
  closed.current = !open;
  const isClosed = useCallback(() => closed.current, []);
  return (
    <div
      {...rest}
      ref={column}
      className={cx('crewlet-dock-column', divider && 'crewlet-dock-column--divider', className)}
      data-side={side}
      data-open={open ? '' : undefined}
      style={{ ...style, '--crewlet-dock-column-width': typeof width === 'number' ? `${width}px` : width } as CSSProperties}
    >
      <div className="crewlet-dock-column__clip">
        {present ? (
          <DockPanel leaving={leaving} isClosed={isClosed} focusOnClose={focusOnClose}>
            {children}
          </DockPanel>
        ) : null}
      </div>
      {resize && open && !leaving ? (
        <ResizeHandle
          className="crewlet-dock-column__handle"
          label={resize.label}
          edge={side === 'start' ? 'right' : 'left'}
          value={typeof width === 'number' ? width : drawn}
          min={resize.min}
          max={resize.max}
          onValueChange={resize.onValueChange}
          onValueCommit={resize.onValueCommit}
          defaultValue={resize.defaultValue}
        />
      ) : null}
    </div>
  );
}

/**
 * The column's drawn width, for a handle whose host gave the width as a
 * length rather than a number (`var(--rooms-dock)`); 0 until measured, and
 * not measured at all where it is not needed.
 */
function useDrawnWidth(column: { current: HTMLDivElement | null }, needed: boolean): number {
  const [drawn, setDrawn] = useState(0);
  useLayoutEffect(() => {
    const element = column.current;
    if (!needed || !element || typeof ResizeObserver === 'undefined') return;
    const measure = () => setDrawn(Math.round(element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [column, needed]);
  return drawn;
}

/**
 * The panel, and the focus it gives up. Its own component so that the hand
 * off on a close with no motion runs in a LAYOUT CLEANUP, while the panel is
 * still in the document and can still tell whether focus was inside it.
 */
function DockPanel({
  leaving,
  isClosed,
  focusOnClose,
  children,
}: {
  leaving: boolean;
  isClosed: () => boolean;
  focusOnClose: DockColumnProps['focusOnClose'];
  children?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement | null>(null);
  const target = useRef(focusOnClose);
  target.current = focusOnClose;
  // As it starts to leave, before the browser fixes up a focus inert holds.
  useLayoutEffect(() => {
    if (leaving) releaseFocus(panel.current, target.current?.());
  }, [leaving]);
  // And as it goes where nothing moved, so it never left: only on a close.
  useLayoutEffect(() => {
    const element = panel.current;
    return () => {
      if (isClosed()) releaseFocus(element, target.current?.());
    };
  }, [isClosed]);
  return (
    <div ref={panel} className="crewlet-dock-column__panel" inert={leaving || undefined}>
      {children}
    </div>
  );
}
