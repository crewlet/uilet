import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** The label beside the box. Always present: a checkbox without one
   *  is only meaningful to somebody who can see what it sits next to. */
  label: ReactNode;
  /** A second line under the label, for the consequence of ticking it. */
  description?: ReactNode;
  /** Marks the choice as one that destroys something. */
  tone?: 'default' | 'danger';
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    tone = 'default',
    className = '',
    disabled,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = description ? `${inputId}-description` : undefined;

  const classes = [
    'crewlet-checkbox',
    tone === 'danger' ? 'crewlet-checkbox--danger' : '',
    disabled ? 'is-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="crewlet-checkbox__control"
        disabled={disabled}
        aria-describedby={describedBy}
        {...rest}
      />

      <label className="crewlet-checkbox__text" htmlFor={inputId}>
        <span className="crewlet-checkbox__label">{label}</span>

        {description && (
          <span className="crewlet-checkbox__description" id={describedBy}>
            {description}
          </span>
        )}
      </label>
    </div>
  );
});
