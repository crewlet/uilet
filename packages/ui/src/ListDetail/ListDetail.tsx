import type { HTMLAttributes, MouseEventHandler, ReactNode } from 'react';
import { ChevronLeftGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { cx } from '../utils/cx.js';

export type ListDetailPane = 'list' | 'detail';

/** How wide the list column is beside a detail. */
export type ListDetailListWidth = 'column' | 'half';

export interface ListDetailProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The list column: a `DirectoryList`, an inbox. */
  list: ReactNode;
  /**
   * The chosen item's detail. Left out (or null), nothing is chosen: the list
   * takes the whole width and no detail pane is drawn, so a reader arriving
   * reads the list at full length rather than beside an empty pane.
   */
  children?: ReactNode;
  /**
   * Which pane shows where the two are one column (under 640px of the
   * component's own width): the list until something is chosen, then the
   * detail. Wider, both are always shown.
   */
  showing?: ListDetailPane | undefined;
  /**
   * `column` (the default): the list is `--crewlet-list-detail-list` wide
   * (17rem). `half`: the list and the detail share the width evenly, for a
   * list whose rows are worth reading at length beside what is open.
   */
  listWidth?: ListDetailListWidth | undefined;
  /**
   * The panes meet at the hairline with no gutter, and each insets its own
   * content: for a list whose rows draw their own full-bleed fills and a
   * detail with its own header, such as a conversation.
   */
  flush?: boolean | undefined;
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
 * an aside beside the screen has taken the room. The detail's way back to the
 * list is `ListDetail.Back`, drawn by the same question. On a phone the page
 * scrolls as any other, each pane as tall as its content.
 *
 * NOTHING CHOSEN, NO DETAIL: without children the list takes the whole width
 * and no hairline is drawn, and choosing an item splits the width again.
 */
export function ListDetail({
  list,
  children,
  showing = 'list',
  listWidth = 'column',
  flush = false,
  className,
  ...rest
}: ListDetailProps) {
  const alone = children === undefined || children === null || children === false;
  return (
    <div
      {...rest}
      className={cx(
        'crewlet-list-detail',
        `crewlet-list-detail--showing-${alone ? 'list' : showing}`,
        alone && 'crewlet-list-detail--alone',
        listWidth === 'half' && 'crewlet-list-detail--half',
        flush && 'crewlet-list-detail--flush',
        className,
      )}
    >
      <div className="crewlet-list-detail__panes">
        <div className="crewlet-list-detail__list">{list}</div>
        {alone ? null : <div className="crewlet-list-detail__detail">{children}</div>}
      </div>
    </div>
  );
}

export interface ListDetailBackProps {
  /** Where it goes, as its name and its hint: "Back to Activity". */
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  className?: string | undefined;
}

/**
 * The detail's way back to the list, drawn only while the ListDetail is one
 * pane (under 640px of its own width), where the list is out of sight. Place
 * it first in the detail's own header. Wider, the list stands beside the
 * detail and the control is not drawn at all, so it takes no room and no tab
 * stop. The same container query that folds the panes decides it, so the two
 * can never disagree.
 */
export function ListDetailBack({ label, onClick, className }: ListDetailBackProps) {
  return (
    <span className={cx('crewlet-list-detail__back', className)}>
      <Tooltip content={label}>
        <IconButton label={label} size="md" variant="ghost" icon={<ChevronLeftGlyph />} onClick={onClick} />
      </Tooltip>
    </span>
  );
}

ListDetail.Back = ListDetailBack;
