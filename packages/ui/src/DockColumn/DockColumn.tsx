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
 */

import { useLayoutEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { releaseFocus, usePresence } from '../Presence/index.js';
import { cx } from '../utils/cx.js';

/** The edge of the content the column stands at, in the inline direction. */
export type DockColumnSide = 'start' | 'end';

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
   * The panel. Its ground is the column's `--crewlet-dock-column-ground`,
   * which a host sets on its own class (`var(--color-surface-subtle)`), and
   * none by default.
   */
  children?: ReactNode;
}

export function DockColumn({
  open,
  width,
  side = 'start',
  divider = true,
  focusOnClose,
  className,
  style,
  children,
  ...rest
}: DockColumnProps) {
  const column = useRef<HTMLDivElement | null>(null);
  // The column's own width transition is the motion the panel waits out.
  const { present, leaving } = usePresence(open, column);
  return (
    <div
      {...rest}
      ref={column}
      className={cx('crewlet-dock-column', divider && 'crewlet-dock-column--divider', className)}
      data-side={side}
      data-open={open ? '' : undefined}
      style={{ ...style, '--crewlet-dock-column-width': typeof width === 'number' ? `${width}px` : width } as CSSProperties}
    >
      {present ? (
        <DockPanel leaving={leaving} focusOnClose={focusOnClose}>
          {children}
        </DockPanel>
      ) : null}
    </div>
  );
}

/**
 * The panel, and the focus it gives up. Its own component so that the hand
 * off on a close with no motion runs in a LAYOUT CLEANUP, while the panel is
 * still in the document and can still tell whether focus was inside it.
 */
function DockPanel({
  leaving,
  focusOnClose,
  children,
}: {
  leaving: boolean;
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
  // And as it goes where nothing moved, so it never left.
  useLayoutEffect(() => {
    const element = panel.current;
    return () => releaseFocus(element, target.current?.());
  }, []);
  return (
    <div ref={panel} className="crewlet-dock-column__panel" inert={leaving || undefined}>
      {children}
    </div>
  );
}
