import { useId, type ReactNode } from 'react';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
import { cx } from '../utils/cx.js';

/** One choice in a [ChoiceList]. */
export interface ChoiceListOption {
  /** Stable identity, and what `onChange` is called with. */
  value: string;
  /** What the choice is, in a few words. */
  label: ReactNode;
  /**
   * A picture of the choice, drawn between the radio and the words: an
   * agent's character, a kind's glyph. Decorative; the label names it.
   */
  media?: ReactNode;
  /** One line under the label saying what choosing it means. */
  detail?: ReactNode;
  /** A short word at the row's end, such as "Recommended". */
  tag?: ReactNode;
  /**
   * Draws a rule above this choice, setting it apart from the ones before it:
   * the "Something else" a list of set answers ends with.
   */
  separated?: boolean | undefined;
  /**
   * Drawn under the choice while it is selected, such as the field a
   * "Something else" choice opens.
   */
  panel?: ReactNode;
}

export interface ChoiceListProps {
  options: readonly ChoiceListOption[];
  /** The selected choice's `value`, or null when none is. */
  value: string | null;
  onChange: (value: string) => void;
  /** Names the group for a screen reader. */
  label: string;
  /** Drawn at the foot of the box, after every choice: its Cancel and Submit. */
  footer?: ReactNode;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/**
 * One answer from a short list, each choice a row with its label, a line of
 * detail, an optional picture (`media`) and an optional tag, in one bordered
 * box.
 *
 * NATIVE RADIOS, so the arrow keys move the choice and Tab leaves the group as
 * the platform does, and every row is its radio's label, so the whole row
 * takes the pointer. A choice's `panel` is drawn under it only while it is
 * selected, which is how a list ends in "Something else" with a field of its
 * own without a second control beside the list.
 */
export function ChoiceList({ options, value, onChange, label, footer, disabled, className }: ChoiceListProps) {
  const name = useId();
  return (
    <div className={cx('crewlet-choice-list', disabled && 'is-disabled', className)}>
      <div role="radiogroup" aria-label={label} className="crewlet-choice-list__group">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const checked = option.value === value;
          return (
            <div key={option.value} className={cx('crewlet-choice-list__item', option.separated && 'is-separated')}>
              <label className={cx('crewlet-choice-list__row', HIT_AREA_CLASS, option.media != null && 'has-media', checked && 'is-checked')} htmlFor={id}>
                <input
                  id={id}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(option.value)}
                  className="crewlet-choice-list__radio"
                />
                {option.media != null ? (
                  <span className="crewlet-choice-list__media" aria-hidden>
                    {option.media}
                  </span>
                ) : null}
                <span className="crewlet-choice-list__text">
                  <span className="crewlet-choice-list__label">{option.label}</span>
                  {option.detail ? <span className="crewlet-choice-list__detail">{option.detail}</span> : null}
                </span>
                {option.tag ? <span className="crewlet-choice-list__tag">{option.tag}</span> : null}
              </label>
              {checked && option.panel ? <div className="crewlet-choice-list__panel">{option.panel}</div> : null}
            </div>
          );
        })}
      </div>
      {footer ? <div className="crewlet-choice-list__footer">{footer}</div> : null}
    </div>
  );
}
