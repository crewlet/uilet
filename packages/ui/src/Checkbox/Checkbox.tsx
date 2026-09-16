import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx.js';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /**
   * The label beside the box, and the box's NAME. Always present: a checkbox
   * without one is only meaningful to somebody who can see what it sits next
   * to.
   */
  label: ReactNode;
  /** What ticking it does, when the label alone does not say. */
  description?: ReactNode;
  /** Marks the choice as one that destroys something. */
  tone?: 'default' | 'danger';
  /** The bordered row a dialog uses for a decision that stands on its own. */
  framed?: boolean;
  /**
   * Neither on nor off: some of what this box stands for is ticked. It is a
   * DOM property rather than an attribute, so it can only be set from script,
   * which is why it is a prop here rather than something a caller can spell.
   */
  indeterminate?: boolean;
  /** The new state, for a caller that does not want to read it off an event. */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * A checkbox with its sentence.
 *
 * THE NAME IS THE LABEL; THE DESCRIPTION DESCRIBES. Wrapping both in one
 * `label` element makes the accessible name the whole paragraph, so a screen
 * reader announced "Also remove the accounts Crewlet created Each agent's
 * account at the vendor is deleted., checkbox" as one run-on name, with the
 * consequence buried inside the thing it is a consequence of. The label span
 * names the box through `aria-labelledby` and the description is pointed at
 * with `aria-describedby`, which is read after the name and on request.
 *
 * THE WHOLE ROW IS ONE TARGET. The root is the `label`, so a press anywhere
 * on the box, the words or the sentence beneath them ticks it: a 16px square
 * is under every pointer-target floor there is, and the row is what makes it
 * pass.
 *
 * A CALLER'S OWN `aria-describedby` IS MERGED, not replaced. A checkbox
 * inside a FormField is described by that field's help line as well as by its
 * own consequence, and a component that overwrites the attribute silently
 * drops whichever sentence it did not write.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    tone = 'default',
    framed = false,
    indeterminate = false,
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
  const box = useRef<HTMLInputElement | null>(null);

  /*
   * `indeterminate` is a DOM PROPERTY with no attribute, so React cannot
   * write it and it has to be set on the element itself. On attach as well as
   * on a change of the prop: a box that re-mounts (a row that moved, a list
   * that reordered) comes back in the state it was in rather than plain.
   */
  const attach = useCallback(
    (el: HTMLInputElement | null) => {
      box.current = el;
      if (el) el.indeterminate = indeterminate;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref, indeterminate],
  );

  useEffect(() => {
    if (box.current) box.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={cx(
        'crewlet-checkbox',
        tone === 'danger' && 'crewlet-checkbox--danger',
        framed && 'crewlet-checkbox--framed',
        disabled && 'is-disabled',
        className,
      )}
    >
      <input
        ref={attach}
        id={inputId}
        type="checkbox"
        className="crewlet-checkbox__control"
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={cx(descriptionId, describedBy) || undefined}
        onChange={(event) => {
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
        }}
        {...rest}
      />
      <span className="crewlet-checkbox__text">
        <span className="crewlet-checkbox__label" id={labelId}>
          {label}
        </span>
        {description ? (
          <span className="crewlet-checkbox__description" id={descriptionId}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
});
