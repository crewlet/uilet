import type { ReactNode } from 'react';
import { FormField } from '../Input/index.js';
import { cx } from '../utils/cx.js';

export interface CheckboxGroupProps {
  /** What the boxes choose between, read as the group's name: "Access". */
  legend: ReactNode;
  /** A sentence about the whole group, read when a reader enters it. */
  helper?: ReactNode;
  /** Why the last choice was refused. */
  error?: ReactNode;
  /**
   * What the group says when it has no box to offer, in place of an empty
   * fieldset that reads as a missing control.
   */
  emptyMessage?: ReactNode;
  /** The boxes: `Checkbox` elements, one per choice. */
  children?: ReactNode;
  className?: string | undefined;
}

function hasChildren(children: ReactNode): boolean {
  if (children === null || children === undefined || children === false) return false;
  if (Array.isArray(children)) return children.some(hasChildren);
  return true;
}

/**
 * Several checkboxes that answer one question, named by a legend.
 *
 * A FIELDSET, because a `for` attribute names one element and a group is not
 * one: a screen reader entering the group hears the legend once, and then each
 * box by its own label. The legend wears the field label's register, so the
 * group reads as one field among the others on the form, and the boxes stand
 * one step apart, the rhythm a field's own parts keep.
 *
 * The group's help line and error are attached to the fieldset itself rather
 * than to each box, so neither is read again on every box in it.
 */
export function CheckboxGroup({ legend, helper, error, emptyMessage, children, className }: CheckboxGroupProps) {
  const empty = !hasChildren(children);
  return (
    <FormField as="fieldset" label={legend} helper={helper} error={error} className={cx('crewlet-checkbox-group', className)}>
      {empty ? (
        emptyMessage ? <p className="crewlet-checkbox-group__empty">{emptyMessage}</p> : null
      ) : (
        <div className="crewlet-checkbox-group__options">{children}</div>
      )}
    </FormField>
  );
}
