import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export type ListDetailPane = 'list' | 'detail';

export interface ListDetailProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The list column: a `DirectoryList`, an inbox. */
  list: ReactNode;
  /** The chosen item's detail. */
  children: ReactNode;
  /**
   * Which pane shows where the two are one column (under 640px of the
   * component's own width): the list until something is chosen, then the
   * detail. Wider, both are always shown.
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
 * THE DETAIL'S SCROLLBAR IS ON THE SHEET'S EDGE. Placed directly in a fill
 * screen's column, it reaches past the column's end pad, and the detail
 * keeps the screen's side inset inside itself, with its scrollbar's gutter
 * always reserved: its content ends under the bar's last control, and a
 * trailing control never touches the scrollbar.
 *
 * BELOW 640px OF ITS OWN WIDTH IT IS ONE PANE, the one `showing` names: the
 * list and a reading detail do not both fit, whether the window is a phone or
 * an aside beside the screen has taken the room. The application gives its
 * detail a way back to the list, and asks the same question to decide when to
 * draw it (`useScreenBelow(640)` for a ListDetail that spans the screen, or a
 * container query on it). On a phone the page scrolls as any other, each pane
 * as tall as its content.
 */
export function ListDetail({ list, children, showing = 'list', className, ...rest }: ListDetailProps) {
  return (
    <div {...rest} className={cx('crewlet-list-detail', `crewlet-list-detail--showing-${showing}`, className)}>
      <div className="crewlet-list-detail__panes">
        <div className="crewlet-list-detail__list">{list}</div>
        <div className="crewlet-list-detail__detail">{children}</div>
      </div>
    </div>
  );
}
