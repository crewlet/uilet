import { useId, type ReactNode, type HTMLAttributes } from 'react';
import { Label } from './Label.js';

export interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label?: ReactNode;
  required?: boolean;
  helper?: ReactNode;
  error?: ReactNode;
  /** Optional element rendered next to the label (e.g. an "Add" button). */
  labelAction?: ReactNode;
  /**
   * Provide the rendered control as a function so FormField can pipe the
   * generated id down to the control's `id` (and label's `htmlFor`) without
   * the caller hand-wiring them.
   */
  children: ((ctx: { id: string; describedBy: string | undefined }) => ReactNode) | ReactNode;
  htmlFor?: string;
}

export const FormField = ({
  label,
  required,
  helper,
  error,
  labelAction,
  htmlFor,
  className = '',
  children,
  ...rest
}: FormFieldProps) => {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = errorId ?? helperId;

  const classes = ['crewlet-form-field', error ? 'is-error' : '', className].filter(Boolean).join(' ');

  return (
    <div {...rest} className={classes}>
      {label !== undefined ? (
        <Label htmlFor={id} required={required} action={labelAction}>
          {label}
        </Label>
      ) : null}
      {typeof children === 'function' ? children({ id, describedBy }) : children}
      {error ? (
        <div id={errorId} className="crewlet-form-field__error" role="alert">
          {error}
        </div>
      ) : helper ? (
        <div id={helperId} className="crewlet-form-field__helper">
          {helper}
        </div>
      ) : null}
    </div>
  );
};
