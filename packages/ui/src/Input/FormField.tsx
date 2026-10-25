import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { Label } from './Label.js';
import { CharacterCount, characterCountState, type CharacterCountLabels } from '../CharacterCount/index.js';
import { cx } from '../utils/cx.js';

/** A field's length limit, and how much of it the value uses. */
export interface FormFieldLimit {
  /** How many characters the value holds. `countCharacters` counts them as a reader would. */
  length: number;
  /** The most it may hold. */
  max: number;
  labels?: Partial<CharacterCountLabels> | undefined;
}

/** What a field's control needs to know about the row it sits in. */
export interface FormFieldRender {
  /** The id the label points at. Put it on the control. */
  id: string;
  /** Every sentence about this field, joined. Put it on the control's `aria-describedby`. */
  describedBy: string | undefined;
  /** Whether the last value was refused. Put it on the control's `aria-invalid`. */
  invalid: boolean;
  /** Whether an answer is required. Put it on the control's `aria-required`. */
  required: boolean;
}

export interface FormFieldProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  label?: ReactNode;
  required?: boolean | undefined;
  /** Says "(optional)" beside the label. */
  optional?: boolean | undefined;
  /** Says "(required)" beside the label, where requiredness is news. See [Label]. */
  requiredNews?: boolean | undefined;
  /** Where the value comes from, or what shape it takes. */
  helper?: ReactNode;
  /**
   * Show the helper only while the field has focus. For a dense form whose
   * every field carries a sentence: at rest the form is labels and values,
   * and the sentence appears under the field the reader is in. It stays in
   * `aria-describedby` either way, so a screen reader hears it on entry.
   */
  helperOnFocus?: boolean | undefined;
  /** Why the last value was refused. */
  error?: ReactNode;
  /**
   * A length limit: the count is drawn at the end of the help line ("120 /
   * 500"), joined into the description after the help and before the error,
   * and a value past it marks the field invalid. A SOFT limit, never a
   * `maxLength`: what was typed or pasted stays, and the count says by how
   * much it is over. See `CharacterCount`.
   */
  limit?: FormFieldLimit | undefined;
  /**
   * A count that is not a length, drawn where a length count would be (at the
   * end of the help line) and joined into the description the same way: how
   * many items a list holds of the most it may, "3 of 5".
   */
  tally?: ReactNode;
  /** A control rendered beside the label, such as an Add button. */
  labelAction?: ReactNode;
  /**
   * The label (or the legend) is kept for assistive technology and takes no
   * room on the page, for a field whose name is already the heading right
   * above it. Hidden as the WHOLE element, not as the text inside it: a
   * label holding hidden text still stands a line tall, which is the gap a
   * reader sees between a card's title and its field. A `labelAction` goes
   * with it, so a field with a hidden label puts its control elsewhere.
   */
  hideLabel?: boolean | undefined;
  /**
   * A fieldset with a legend rather than a div with a label, for a field
   * whose control is SEVERAL controls: a list of items, a row of radios. A
   * `for` attribute names one element, and a group is not one.
   *
   * In this mode the GROUP carries `aria-describedby`, so a caller taking the
   * render function does NOT put `describedBy` on a control inside it: the
   * help and the error would then be read once on entering the group and
   * again on every control in it.
   */
  as?: 'div' | 'fieldset' | undefined;
  /**
   * Ids of sentences the caller renders itself, joined ahead of the help and
   * the error. The affix sentence inside a url field is the one this exists
   * for: it is part of the value, and the reader has to hear it.
   */
  describedBy?: string | readonly string[] | undefined;
  /**
   * The control. As a function it is handed the ids and the state to wire,
   * which is what stops each form hand-pairing a label with an input and
   * getting one of the two wrong.
   */
  children: ((field: FormFieldRender) => ReactNode) | ReactNode;
  htmlFor?: string | undefined;
}

/**
 * A labelled control, with the help line and the error line beside it.
 *
 * HELP AND ERROR BOTH RENDER, and this is the change worth naming. The help
 * line used to be replaced by the error, so a field that said "The workspace
 * subdomain, not the whole address" lost that sentence at the exact moment
 * the value was refused: the reader was told they were wrong and, in the same
 * instant, the only line that said what right looks like disappeared. Both
 * lines are joined into `aria-describedby` in reading order, help first.
 */
export const FormField = ({
  label,
  required = false,
  optional,
  requiredNews,
  helper,
  helperOnFocus = false,
  error,
  limit,
  tally,
  labelAction,
  hideLabel = false,
  as = 'div',
  describedBy,
  htmlFor,
  className = '',
  children,
  ...rest
}: FormFieldProps) => {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const countId = limit ? `${id}-count` : undefined;
  const hasTally = tally !== undefined && tally !== null && tally !== false;
  const tallyId = hasTally ? `${id}-tally` : undefined;
  const over = limit !== undefined && characterCountState(limit.length, limit.max) === 'over';
  const extra = describedBy === undefined ? [] : typeof describedBy === 'string' ? [describedBy] : [...describedBy];
  const described = [...extra, helperId, tallyId, countId, errorId].filter(Boolean).join(' ');
  const invalid = Boolean(error) || over;
  const field: FormFieldRender = {
    id,
    describedBy: described || undefined,
    invalid,
    required,
  };

  const help = helper ? (
    <div id={helperId} className="crewlet-form-field__helper">
      {helper}
    </div>
  ) : null;

  const body = (
    <>
      {typeof children === 'function' ? children(field) : children}
      {/*
        * THE COUNT SHARES THE HELP LINE, at its end, rather than taking a line
        * of its own under it: the two are both about what the value may be,
        * and a field with a sentence, a count and an error on three lines is
        * a field whose control is the smallest thing in it. Without a limit
        * the help line is exactly what it always was.
        */}
      {limit || hasTally ? (
        <div className="crewlet-form-field__meta">
          {help ?? <span className="crewlet-form-field__meta-spacer" />}
          {hasTally ? (
            <span id={tallyId} className="crewlet-form-field__tally">
              {tally}
            </span>
          ) : null}
          {limit ? <CharacterCount id={countId} length={limit.length} max={limit.max} labels={limit.labels} /> : null}
        </div>
      ) : (
        help
      )}
      {error ? (
        <div id={errorId} className="crewlet-form-field__error" role="alert">
          {error}
        </div>
      ) : null}
    </>
  );

  const classes = cx(
    'crewlet-form-field',
    invalid && 'is-error',
    helperOnFocus && helper ? 'crewlet-form-field--helper-on-focus' : null,
    className,
  );

  if (as === 'fieldset') {
    return (
      /*
       * THE GROUP CARRIES THE DESCRIPTION. There is no one control to hang it
       * on (that is why this is a fieldset), so the sentences are attached to
       * the group itself and read when a reader enters it.
       */
      <fieldset {...rest} aria-describedby={field.describedBy} className={classes}>
        {label !== undefined ? (
          <legend className={cx('crewlet-form-field__legend', hideLabel && 'crewlet-visually-hidden')}>
            <Label
              as="span"
              required={required}
              optional={optional}
              requiredNews={requiredNews}
              action={labelAction}
            >
              {label}
            </Label>
          </legend>
        ) : null}
        {body}
      </fieldset>
    );
  }

  return (
    <div {...rest} className={classes}>
      {label !== undefined ? (
        <Label
          htmlFor={id}
          required={required}
          optional={optional}
          requiredNews={requiredNews}
          action={labelAction}
          className={hideLabel ? 'crewlet-visually-hidden' : undefined}
        >
          {label}
        </Label>
      ) : null}
      {body}
    </div>
  );
};
