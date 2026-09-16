import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { Label } from './Label.js';
import { cx } from '../utils/cx.js';

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
  /** Why the last value was refused. */
  error?: ReactNode;
  /** A control rendered beside the label, such as an Add button. */
  labelAction?: ReactNode;
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
  error,
  labelAction,
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
  const extra = describedBy === undefined ? [] : typeof describedBy === 'string' ? [describedBy] : [...describedBy];
  const described = [...extra, helperId, errorId].filter(Boolean).join(' ');
  const field: FormFieldRender = {
    id,
    describedBy: described || undefined,
    invalid: Boolean(error),
    required,
  };

  const body = (
    <>
      {typeof children === 'function' ? children(field) : children}
      {helper ? (
        <div id={helperId} className="crewlet-form-field__helper">
          {helper}
        </div>
      ) : null}
      {error ? (
        <div id={errorId} className="crewlet-form-field__error" role="alert">
          {error}
        </div>
      ) : null}
    </>
  );

  const classes = cx('crewlet-form-field', Boolean(error) && 'is-error', className);

  if (as === 'fieldset') {
    return (
      /*
       * THE GROUP CARRIES THE DESCRIPTION. There is no one control to hang it
       * on (that is why this is a fieldset), so the sentences are attached to
       * the group itself and read when a reader enters it.
       */
      <fieldset {...rest} aria-describedby={field.describedBy} className={classes}>
        {label !== undefined ? (
          <legend className="crewlet-form-field__legend">
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
        >
          {label}
        </Label>
      ) : null}
      {body}
    </div>
  );
};
