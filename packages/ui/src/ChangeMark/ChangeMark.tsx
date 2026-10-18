import { changeText, sheetLabels, type SheetChange, type SheetLabels } from '../SheetModel/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { cx } from '../utils/cx.js';

export interface ChangeMarkProps {
  /** Who changed it, by display name. */
  by: string;
  at: SheetChange['at'];
  /** The value before the change, already written for a reader ("6.8"), or null to say nothing of it. */
  previous?: string | null | undefined;
  /** A BCP 47 tag for the time; the reader's own locale when absent. */
  locale?: string | undefined;
  className?: string | undefined;
  labels?: Pick<Partial<SheetLabels>, 'changed'> | undefined;
}

/**
 * The corner mark on a cell or an element that changed since the reader last
 * looked, with a tooltip that says who changed it, when, and what it was:
 * "Changed by Maya Ortiz, 10:42. Was 6.8."
 *
 * A SHAPE AND WORDS, never colour alone: the mark is a corner notch in
 * `--color-change-mark`, and the tooltip is the meaning. The mark itself is
 * decorative to assistive technology, because the element it sits on carries
 * the same sentence in its description (SheetGrid writes it into every focused
 * cell's), and a mark read out on top of that would say it twice. A host
 * drawing the mark on an element of its own says the sentence the same way,
 * with `changeText` from the sheet model.
 */
export function ChangeMark({ by, at, previous = null, locale, className, labels }: ChangeMarkProps) {
  const text = changeText({ by, at }, sheetLabels(labels), previous, locale);
  return (
    <Tooltip content={text}>
      <span aria-hidden="true" className={cx('crewlet-change-mark', className)} />
    </Tooltip>
  );
}
