import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export type ListDetailPane = 'list' | 'detail';

export interface ListDetailProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The list column: a `DirectoryList`, an inbox. */
  list: ReactNode;
  /** The chosen item's detail. */
  children: ReactNode;
  /**
   * Which pane a phone shows, where the two are one column: the list until
   * something is chosen, then the detail. Wider, both are always shown.
   */
  showing?: ListDetailPane | undefined;
}

/**
 * A list beside the detail of what is chosen in it, each scrolling on its own.
 *
 * IT FILLS THE HEIGHT IT IS GIVEN, so place it in a box of the window's
 * height (an application shell's `fill`): the list column holds its place
 * while the detail scrolls, and a list that grows scrolls inside its own
 * column. The list column is `--crewlet-list-detail-list` wide (17rem by
 * default), with a hairline between the two.
 *
 * BELOW 640px IT IS ONE PANE, the one `showing` names, as tall as its content
 * on a page that scrolls as any other: a phone has no room for two columns,
 * and the application gives its detail a way back to the list.
 */
export function ListDetail({ list, children, showing = 'list', className, ...rest }: ListDetailProps) {
  return (
    <div {...rest} className={cx('crewlet-list-detail', `crewlet-list-detail--showing-${showing}`, className)}>
      <div className="crewlet-list-detail__list">{list}</div>
      <div className="crewlet-list-detail__detail">{children}</div>
    </div>
  );
}
