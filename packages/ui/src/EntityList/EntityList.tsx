import type { HTMLAttributes, ReactNode } from 'react';
import { StatusCard, type StatusCardFoldProps } from '../StatusCard/index.js';
import { cx } from '../utils/cx.js';

/** One person, seat or record in the list. */
export interface EntityListItem {
  /** What tells two rows apart. */
  id: string;
  /** Its name: "Agent SWE", "Jane Founder", "ENG-156". */
  name: string;
  /** One fact under the name: "Core · 2.96M tokens this week". */
  fact?: ReactNode;
  /** Its avatar or glyph, before the name. Decoration: the name is what is read. */
  avatar?: ReactNode;
  /**
   * Its action at the row's end, the host's own link ("Profile", "Open"),
   * drawn as a ghost small `ButtonLink` or the router's equivalent. A row is
   * given only for something the person may open.
   */
  action?: ReactNode;
}

/**
 * A titled list folds as the card it is drawn in (`StatusCard`'s fold); a
 * list with no title has no head to fold to, and the props do nothing.
 */
export interface EntityListProps extends Omit<HTMLAttributes<HTMLElement>, 'title'>, StatusCardFoldProps {
  items: readonly EntityListItem[];
  /** Names the list for a screen reader, when no title names it. */
  label?: string | undefined;
  /**
   * Draws the list as a card under this title ("Agents in Core"), as an
   * answer shows it; without one it is the divided rows alone.
   */
  title?: string | undefined;
}

/**
 * People, seats or records an answer names, one row each: the avatar, the
 * name over one fact, and the row's own link at its end.
 *
 * A LIST OF ROWS, divided by hairlines, each on the card's 16px inset so the
 * names line up with the title above them. Inside a card (`title`) the card
 * is the only edge.
 */
export function EntityList({
  items,
  label,
  title,
  collapsible,
  summary,
  open,
  defaultOpen,
  onOpenChange,
  className,
  ...rest
}: EntityListProps) {
  const list = (
    // The role is restated for WebKit, which drops it from a list with no markers.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul role="list" aria-label={title === undefined ? label : undefined} className="crewlet-entity-list__rows">
      {items.map((item) => (
        <li key={item.id} className="crewlet-entity-list__row">
          {item.avatar === undefined ? null : (
            <span className="crewlet-entity-list__avatar" aria-hidden="true">
              {item.avatar}
            </span>
          )}
          <span className="crewlet-entity-list__words">
            <span className="crewlet-entity-list__name">{item.name}</span>
            {item.fact === undefined || item.fact === null ? null : (
              <span className="crewlet-entity-list__fact">{item.fact}</span>
            )}
          </span>
          {item.action === undefined || item.action === null ? null : (
            <span className="crewlet-entity-list__action">{item.action}</span>
          )}
        </li>
      ))}
    </ul>
  );
  if (title === undefined) {
    return (
      <div {...rest} className={cx('crewlet-entity-list', className)}>
        {list}
      </div>
    );
  }
  return (
    <StatusCard
      {...rest}
      title={title}
      collapsible={collapsible}
      summary={summary}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      bodyPadding="none"
      className={cx('crewlet-entity-list', 'crewlet-entity-list--card', className)}>
      {list}
    </StatusCard>
  );
}
