import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /**
   * The element the text is drawn in. A `label` by default; a `span` inside a
   * legend, where `for` names one element and the group has several.
   */
  as?: 'label' | 'span' | undefined;
  /**
   * Draws the asterisk. DECORATION ONLY: the control itself carries
   * `aria-required`, which is what a screen reader reads, so the mark is
   * `aria-hidden` and never the only statement of the rule.
   */
  required?: boolean | undefined;
  /** Says "(optional)" beside the label, for a field that may be left empty. */
  optional?: boolean | undefined;
  /**
   * Says "(required)" beside the label.
   *
   * ONLY WHERE REQUIREDNESS IS NEWS: a field that appeared because of an
   * answer above it. Required is the unmarked default on a form, so marking
   * every required field is noise that teaches a reader to skip the note.
   */
  requiredNews?: boolean | undefined;
  /** A control rendered beside the label text, such as an Add button. */
  action?: ReactNode;
  /** The word for a field that may be left empty. */
  optionalLabel?: string | undefined;
  /** The word for a field whose requiredness is news. */
  requiredLabel?: string | undefined;
}

export const Label = ({
  as: Tag = 'label',
  required,
  optional,
  requiredNews,
  action,
  optionalLabel = '(optional)',
  requiredLabel = '(required)',
  className = '',
  children,
  ...rest
}: LabelProps) => {
  const marks = (
    <>
      {children}
      {required ? (
        <span className="crewlet-label__required" aria-hidden="true">
          *
        </span>
      ) : null}
      {optional ? <span className="crewlet-label__note"> {optionalLabel}</span> : null}
      {requiredNews ? <span className="crewlet-label__note"> {requiredLabel}</span> : null}
    </>
  );

  if (action) {
    return (
      <div className={cx('crewlet-label', 'crewlet-label--with-action', className)}>
        <Tag {...rest} className="crewlet-label__text">
          {marks}
        </Tag>
        <span className="crewlet-label__action">{action}</span>
      </div>
    );
  }

  return (
    <Tag {...rest} className={cx('crewlet-label', className)}>
      {marks}
    </Tag>
  );
};
