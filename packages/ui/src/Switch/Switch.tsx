import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** What the setting is, and the switch's NAME. */
  label: ReactNode;
  /** What turning it on does, when the label alone does not say. */
  description?: ReactNode;
  /** The bordered row a settings list uses for a decision that stands on its own. */
  framed?: boolean;
  /** The new state, for a caller that does not want to read it off an event. */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * A setting that is on or off, and takes effect as it is switched.
 *
 * NOT A CHECKBOX, and the difference is not decoration. A checkbox is an
 * answer to a question the form asks and is read when the form is saved; a
 * switch IS the change, applied the moment it moves. A screen reader says
 * "on" and "off" for one and "ticked" and "unticked" for the other, and a
 * reader told a webhook is "unticked" has to work out what that means for a
 * delivery. This is what the two vendor screens were drawing as an On and Off
 * select, which is a third spelling of the same thing.
 *
 * IT IS A REAL CHECKBOX INPUT wearing `role="switch"`, so Space toggles it,
 * a form submits it and a label points at it without any of that being
 * rebuilt. What the role changes is what it is called out loud.
 *
 * AND ITS STATE IS THE INPUT'S OWN, with no `aria-checked` attribute beside
 * it. The role maps the element's checkedness to `aria-checked` already, and
 * a second copy written as an attribute is one a browser does not update:
 * left uncontrolled, or toggled by a reader before the caller's state lands,
 * the attribute says one thing while the control shows another, and a screen
 * reader reads the attribute.
 *
 * THE TRACK CARRIES A 3:1 BOUNDARY IN BOTH STATES. Drawn as two fills alone,
 * off is a grey pill on a grey panel: the control most likely to be missed
 * entirely is the one that says whether a thing is running.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    label,
    description,
    framed = false,
    onCheckedChange,
    onChange,
    className = '',
    disabled,
    id,
    'aria-describedby': describedBy,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <label
      className={cx(
        'crewlet-switch',
        framed && 'crewlet-switch--framed',
        disabled && 'is-disabled',
        className,
      )}
    >
      <span className="crewlet-switch__track">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          role="switch"
          className="crewlet-switch__control"
          disabled={disabled}
          aria-labelledby={labelId}
          aria-describedby={cx(descriptionId, describedBy) || undefined}
          onChange={(event) => {
            onChange?.(event);
            onCheckedChange?.(event.target.checked);
          }}
          {...rest}
        />
        <span className="crewlet-switch__thumb" aria-hidden="true" />
      </span>
      <span className="crewlet-switch__text">
        <span className="crewlet-switch__label" id={labelId}>
          {label}
        </span>
        {description ? (
          <span className="crewlet-switch__description" id={descriptionId}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
});
