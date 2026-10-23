import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel, type HeadingLevel } from '../utils/headingLevel.js';

export type CatalogTileElement = 'article' | 'li' | 'div';

export interface CatalogTileProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The element the tile is: an `li` in a `TileGrid as="ul"`. */
  as?: CatalogTileElement | undefined;
  /**
   * What the entry is told apart by before its name is read: a `VendorMark`,
   * a glyph. Drawn in the tile's mark well, at one size and on one ground for
   * every tile, and hidden from assistive technology: the name is what is read.
   */
  mark: ReactNode;
  /** The entry's name, as the tile's heading. */
  title: ReactNode;
  /** Overrides the level the name is rendered at. */
  headingLevel?: HeadingLevel | undefined;
  /**
   * The entry's state, as a `Tag`, ONLY when the state is worth reading: On,
   * Connected, Needs attention, Coming soon. An entry in its resting state
   * (available, not set up) carries none, and its name stands centred beside
   * its mark; a pill under every name is a column a reader learns to skip.
   */
  status?: ReactNode;
  /** One sentence: what the entry is for, or what is owed when something is. */
  description?: ReactNode;
  /** A quiet fact at the foot (`2 agents · 14 deliveries`). */
  meta?: ReactNode;
  /** The tile's one control, at the foot's end. */
  action?: ReactNode;
  /**
   * Available but not set up: the tile sits one rung lower, on the page's own
   * ground, rather than on the card's. Its text and its mark keep their
   * strength, because a tile not yet set up is the one a reader came to set up.
   */
  quiet?: boolean | undefined;
}

/**
 * One entry in a catalogue: its mark, its name, its state when it has one, a
 * sentence, and a foot with a quiet fact and one action.
 *
 * EVERY TILE IN A ROW IS ONE SHAPE. The sentence reserves two lines and takes
 * what is left of the tile's height, so tiles stretched to one row height in a
 * `TileGrid` keep their feet on one line; a tile with neither a fact nor an
 * action draws no foot at all, since a rule with nothing under it reads as a
 * missing control.
 */
export function CatalogTile({
  as: Element = 'article',
  mark,
  title,
  headingLevel,
  status,
  description,
  meta,
  action,
  quiet = false,
  className,
  ...rest
}: CatalogTileProps) {
  const level = useHeadingLevel();
  const Heading = headingTag(headingLevel ?? level);
  const titleId = useId();
  const foot = meta !== undefined || action !== undefined;
  return (
    <Element
      aria-labelledby={Element === 'article' ? titleId : undefined}
      {...rest}
      className={cx('crewlet-catalog-tile', quiet && 'crewlet-catalog-tile--quiet', className)}
    >
      <div className="crewlet-catalog-tile__head">
        <span className="crewlet-catalog-tile__mark" aria-hidden="true">
          {mark}
        </span>
        <span className="crewlet-catalog-tile__title">
          <Heading id={titleId} className="crewlet-catalog-tile__name">
            {title}
          </Heading>
          {status === undefined || status === null ? null : (
            <span className="crewlet-catalog-tile__status">{status}</span>
          )}
        </span>
      </div>
      {description === undefined ? null : <p className="crewlet-catalog-tile__description">{description}</p>}
      {foot ? (
        <div className="crewlet-catalog-tile__foot">
          <span className="crewlet-catalog-tile__meta">{meta}</span>
          {action === undefined ? null : <span className="crewlet-catalog-tile__action">{action}</span>}
        </div>
      ) : null}
    </Element>
  );
}
