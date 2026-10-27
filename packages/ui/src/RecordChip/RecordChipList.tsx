import { Children, isValidElement, useId, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface RecordChipListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The line's lead, which also names the list: "Also read". */
  label: string;
  /** The records, each a `RecordChip`. */
  children: ReactNode;
}

/**
 * Records named on one quiet line under what they support, as chips: what an
 * answer read but never named in its words ("Also read GOP-2 QA").
 *
 * A LIST NAMED BY ITS LEAD, so a screen reader hears "Also read, list, 3
 * items" and then each chip, and the lead is drawn once rather than said
 * again by every chip. The chips wrap onto further lines at a narrow width;
 * the line is in the caption register, a step quieter than the text above it.
 */
export function RecordChipList({ label, children, className, ...rest }: RecordChipListProps) {
  const id = useId();
  const items = Children.toArray(children).filter(isValidElement);
  if (items.length === 0) return null;
  return (
    <div {...rest} className={cx('crewlet-record-chip-list', className)}>
      <span id={id} className="crewlet-record-chip-list__label">
        {label}
      </span>
      {/* The role is restated for WebKit, which drops it from a list with no markers. */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul role="list" aria-labelledby={id} className="crewlet-record-chip-list__items">
        {items.map((item, i) => (
          <li key={item.key ?? i} className="crewlet-record-chip-list__item">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
