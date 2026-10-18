import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { GripVerticalGlyph, PinGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import type { ReorderHandleProps } from '../Reorder/index.js';
import { cx } from '../utils/cx.js';

export interface PinTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** What was pinned, and the link's name. */
  title: string;
  /** Where it opens. */
  href: string;
  /** What kind of thing it is, before the facts: "Agent", "Project". */
  kind?: string | undefined;
  /** One line of what is true of it now: "Working on FAIR-1". */
  meta?: ReactNode;
  /** An avatar or glyph before the title. */
  leading?: ReactNode;
  /** A state mark (a dot, a tag) beside the title. */
  status?: ReactNode;
  /** One figure at the end: "14%", "3 open". */
  figure?: ReactNode;
  /** Unpin it; left out, the tile cannot be unpinned from here. */
  onUnpin?: (() => void) | undefined;
  /** The handle's props from `useReorder`; left out, the tile does not move. */
  handle?: ReorderHandleProps | undefined;
}

/**
 * Something a reader pinned, kept where they land: an agent, a project, a
 * board, a page. A link with the one or two facts that make opening it
 * unnecessary on most mornings.
 *
 * THE WHOLE TILE IS THE LINK'S TARGET, and the link is the title only. The
 * tile's area is one stretched pseudo-element over the title's anchor, so a
 * press anywhere opens it, a screen reader hears one link named by the title,
 * and the unpin button and the handle are siblings of the anchor rather than
 * buttons nested inside a link, which no browser can make operable.
 *
 * UNPIN IS ALWAYS THERE, quiet until the tile is hovered or focused. A
 * control that appears only on hover is one a touch screen never shows.
 */
export const PinTile = forwardRef<HTMLDivElement, PinTileProps>(function PinTile(
  { title, href, kind, meta, leading, status, figure, onUnpin, handle, className, ...rest },
  ref,
) {
  const { 'aria-label': handleName, ...handleRest } = handle ?? { 'aria-label': '' };
  return (
    <div ref={ref} className={cx('crewlet-pin-tile', className)} {...rest}>
      {handle ? (
        <IconButton
          size="sm"
          variant="ghost"
          className="crewlet-pin-tile__handle"
          label={handleName}
          icon={<GripVerticalGlyph size="sm" />}
          {...handleRest}
        />
      ) : null}
      {leading ? (
        <span className="crewlet-pin-tile__leading" aria-hidden="true">
          {leading}
        </span>
      ) : null}
      <span className="crewlet-pin-tile__body">
        <span className="crewlet-pin-tile__head">
          <a className="crewlet-pin-tile__link" href={href}>
            {title}
          </a>
          {status ? <span className="crewlet-pin-tile__status">{status}</span> : null}
        </span>
        {kind || meta ? (
          <span className="crewlet-pin-tile__meta">
            {kind ? <span className="crewlet-pin-tile__kind">{kind}</span> : null}
            {kind && meta ? <span aria-hidden="true"> · </span> : null}
            {meta}
          </span>
        ) : null}
      </span>
      {figure !== undefined && figure !== null ? <span className="crewlet-pin-tile__figure">{figure}</span> : null}
      {onUnpin ? (
        <IconButton
          size="sm"
          variant="ghost"
          className="crewlet-pin-tile__unpin"
          label={`Unpin ${title}`}
          icon={<PinGlyph size="sm" />}
          onClick={onUnpin}
        />
      ) : null}
    </div>
  );
});
