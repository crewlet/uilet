import { useId, type MouseEventHandler, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel, type HeadingLevel } from '../utils/headingLevel.js';

export interface DirectoryItem {
  /** Unique within the list. */
  key: string;
  /** Where the line goes: the item's own page. */
  href: string;
  /** The item's mark: a vendor's, a product's. Decorative, since the label names it. */
  mark?: ReactNode;
  label: ReactNode;
  /** A quieter line under the label: the app a product belongs to. */
  hint?: ReactNode;
  /** The item's state where it has one: a status dot and word, or a pill. */
  status?: ReactNode;
  /** The item the page is showing. */
  selected?: boolean | undefined;
  /** For an application that routes in place of the browser. */
  onClick?: MouseEventHandler<HTMLAnchorElement> | undefined;
}

export interface DirectoryGroup {
  /** Unique within the list. */
  key: string;
  label: ReactNode;
  items: readonly DirectoryItem[];
}

export interface DirectoryListProps {
  /** What the list is, for a screen reader's landmark: "Integrations". */
  label: string;
  groups: readonly DirectoryGroup[];
  /**
   * One quiet fact that belongs to the whole list, held at its foot: it stays
   * at the bottom of the column while the groups scroll above it.
   */
  foot?: ReactNode;
  /** The level of each group's heading; the level the list stands at by default. */
  headingLevel?: HeadingLevel | undefined;
  className?: string | undefined;
}

/**
 * A directory: everything of one kind, in named groups, each line a link to
 * the item's own page, beside which a page shows the one chosen.
 *
 * A NAVIGATION LANDMARK of lists under headings, so a screen reader can jump
 * group to group and is told how many lines each holds. The chosen line is
 * `aria-current="page"` and drawn on the selected ground. A line carries its
 * mark, its label (and a quieter hint under it) and its state where it has
 * one; a line with no state says nothing rather than "none".
 *
 * IT FILLS THE HEIGHT IT IS GIVEN. The groups take the room and scroll on
 * their own when they outgrow it, and the foot holds the bottom, one small
 * step under them, so a fact about the whole list (an address, a count) is in
 * the same place however long the list is. Placed in a column of a page that
 * scrolls as a whole, it is as tall as its lines and the foot ends it.
 */
export function DirectoryList({ label, groups, foot, headingLevel, className }: DirectoryListProps) {
  const level = useHeadingLevel();
  const Heading = headingTag(headingLevel ?? level);
  const base = useId();
  return (
    <nav aria-label={label} className={cx('crewlet-directory', className)}>
      <div className="crewlet-directory__groups">
        {groups.map((group) => {
          const headingId = `${base}-${group.key}`;
          return (
            <section key={group.key} className="crewlet-directory__group" aria-labelledby={headingId}>
              <Heading id={headingId} className="crewlet-directory__heading">
                {group.label}
              </Heading>
              {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
              <ul role="list" className="crewlet-directory__items">
                {group.items.map((item) => (
                  <li key={item.key}>
                    <a
                      href={item.href}
                      onClick={item.onClick}
                      aria-current={item.selected ? 'page' : undefined}
                      className={cx('crewlet-directory__item', item.selected && 'crewlet-directory__item--selected')}
                    >
                      {item.mark === undefined ? null : (
                        <span className="crewlet-directory__mark" aria-hidden="true">
                          {item.mark}
                        </span>
                      )}
                      <span className="crewlet-directory__text">
                        <span className="crewlet-directory__label">{item.label}</span>
                        {item.hint === undefined ? null : <span className="crewlet-directory__hint">{item.hint}</span>}
                      </span>
                      {item.status === undefined || item.status === null ? null : (
                        <span className="crewlet-directory__status">{item.status}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {foot === undefined || foot === null ? null : <div className="crewlet-directory__foot">{foot}</div>}
    </nav>
  );
}
