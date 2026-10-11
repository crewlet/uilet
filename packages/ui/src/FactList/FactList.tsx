import type { ReactNode } from 'react';
import { LockGlyph } from '@crewlethq/icons/glyphs';
import { Tooltip } from '../Tooltip/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/** One read-only fact: what it is, its value, and why it cannot be changed here. */
export interface FactListItem {
  /** Stable identity within the list. */
  key: string;
  /** What the fact is: "Handle", "Placement". */
  label: ReactNode;
  /** Its value, as text or a short node (a link, a tag). */
  value: ReactNode;
  /**
   * Why it cannot be changed here, in one sentence. Shown as a tooltip when
   * the pointer rests on the row, and read by a screen reader after the value;
   * with one, the row is drawn with a lock.
   */
  reason?: string | undefined;
}

export interface FactListProps {
  items: readonly FactListItem[];
  /** Names the list for a screen reader, where nothing above it does. */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * Facts a form shows and does not edit, as rows in one bordered box: the label
 * on the left, the value on the right, 32px a row.
 *
 * ONE LINE A FACT. A read-only value used to be drawn as a label, the value
 * and a sentence under it, three lines each, so a form's locked facts
 * outweighed its fields. The sentence is the row's tooltip now, and the lock
 * says there is one. It is a description list, so a screen reader reads each
 * label with its value.
 */
export function FactList({ items, label, className }: FactListProps) {
  return (
    <dl className={cx('crewlet-fact-list', className)} aria-label={label}>
      {items.map((item) => (
        <FactRow key={item.key} item={item} />
      ))}
    </dl>
  );
}

function FactRow({ item }: { item: FactListItem }) {
  const row = (
    <div className={cx('crewlet-fact-list__row', item.reason ? 'is-locked' : null)}>
      <dt className="crewlet-fact-list__label">
        {item.reason ? <LockGlyph size="xs" className="crewlet-fact-list__lock" aria-hidden="true" /> : null}
        {item.label}
      </dt>
      <dd className="crewlet-fact-list__value">
        {item.value}
        {/* Inside the dd: a description list's group holds only terms and details. */}
        {item.reason ? <VisuallyHidden>{`, ${item.reason}`}</VisuallyHidden> : null}
      </dd>
    </div>
  );
  return item.reason ? <Tooltip content={item.reason}>{row}</Tooltip> : row;
}
