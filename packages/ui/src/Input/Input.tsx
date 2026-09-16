import { forwardRef, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { CloseGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

export type InputSize = 'sm' | 'md';

/**
 * How wide the field is.
 *
 * A filter box is not a form field and a form field is not a page, and every
 * screen that needed a narrow one wrote its own `style={{ maxWidth: 180 }}`:
 * five call sites, five numbers, none of them the same. The steps are named
 * for what they hold rather than for a number, so a search box and a filter
 * box beside each other are the same width without either one saying so.
 */
export type InputWidth = 'full' | 'xs' | 'sm' | 'md' | 'lg';

/**
 * How the field is drawn, which is a different question from what it holds.
 *
 * `default` is a field on a form. `reference` is a field holding a name
 * something else resolves (a secret reference, a key, a path): monospace, in
 * the secondary ink, because it is a value to be read exactly rather than
 * prose. `command` is the search field of a command palette: borderless and
 * large, because the surface around it IS the field and a boundary inside a
 * dialog whose whole body is one input is a boundary around nothing.
 */
export type InputAppearance = 'default' | 'reference' | 'command';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'width'> {
  inputSize?: InputSize | undefined;
  appearance?: InputAppearance | undefined;
  width?: InputWidth | undefined;
  /** Marks the value as refused. Sets `aria-invalid`, which is what a screen reader reads. */
  error?: boolean | undefined;
  containerClassName?: string | undefined;
  /**
   * Content drawn inside the field at its leading edge: a search glyph, or an
   * [InputAffix] standing in for a scheme the value is refused without.
   *
   * It does not take the pointer, so a press on it still lands in the field.
   * A control belongs beside the field rather than inside it: a target inside
   * a text box is one a pointer reaches by missing the box.
   */
  leading?: ReactNode;
  /**
   * Content drawn inside the field at its trailing edge, such as a keycap
   * hinting that Enter adds the value. It does not take the pointer either.
   */
  trailing?: ReactNode;
  /**
   * Draws a real clear control at the trailing edge, and empties the field.
   *
   * THE ONE CONTROL THAT BELONGS INSIDE A TEXT BOX, and only in a search box,
   * where a reader looks for it inside the field because that is where every
   * search box has ever put it. What it replaces is the platform's own:
   * `::-webkit-search-cancel-button` exists in one browser family, is drawn by
   * nobody else, and is reachable by no keyboard anywhere, so a styled version
   * of it was a control half the readers did not have. This one is a button,
   * with a name, in the tab order, and it hands focus back to the field it
   * emptied so the next keystroke lands where the reader is looking.
   *
   * It is drawn only while the field holds something. A controlled field is
   * read from `value`; an uncontrolled one is emptied here as well as
   * reported, since nobody else holds its value.
   */
  onClear?: (() => void) | undefined;
  /** What the clear control is called. */
  clearLabel?: string | undefined;
}

/**
 * A text field.
 *
 * THE PLACEHOLDER IS NOT A LABEL and is not decoration either. It sits on the
 * tertiary ink, which is measured to 4.5:1, because a reader has to make out
 * the example it gives; the decoration step it used to take measured 2.22:1.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    inputSize = 'md',
    appearance = 'default',
    width = 'full',
    error = false,
    className = '',
    containerClassName = '',
    leading,
    trailing,
    onClear,
    clearLabel = 'Clear',
    disabled,
    ...rest
  },
  ref,
) {
  const field = useRef<HTMLInputElement | null>(null);
  /*
   * Whether an UNCONTROLLED field holds anything. A controlled one is read
   * from `value` instead, so the two never disagree about whether the clear
   * control should be there.
   */
  const [typed, setTyped] = useState(() => String(rest.defaultValue ?? '') !== '');
  const controlled = rest.value !== undefined;
  const filled = controlled ? String(rest.value ?? '') !== '' : typed;

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setTyped(event.target.value !== '');
    rest.onChange?.(event);
  };

  const clear = () => {
    const node = field.current;
    if (node && !controlled) {
      node.value = '';
      setTyped(false);
    }
    onClear?.();
    // Back to the field: the control that was just pressed is about to be
    // removed, and focus left on it falls to the page body.
    node?.focus();
  };

  return (
    <div
      className={cx(
        'crewlet-input',
        `crewlet-input--${inputSize}`,
        `crewlet-input--${appearance}`,
        `crewlet-input--w-${width}`,
        error && 'is-error',
        disabled && 'is-disabled',
        containerClassName,
      )}
    >
      {leading ? <span className="crewlet-input__leading">{leading}</span> : null}
      <input
        ref={(el) => {
          field.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        className={cx('crewlet-input__control', className)}
        disabled={disabled}
        aria-invalid={error || undefined}
        {...rest}
        {...(onClear ? { onChange } : {})}
      />
      {trailing ? <span className="crewlet-input__trailing">{trailing}</span> : null}
      {onClear && filled ? (
        <span className="crewlet-input__clear">
          <IconButton size="sm" variant="ghost" label={clearLabel} icon={<CloseGlyph size="xs" />} onClick={clear} disabled={disabled} />
        </span>
      ) : null}
    </div>
  );
});

export interface InputAffixProps {
  /** The text drawn inside the field, such as `https://`. */
  text: string;
  /**
   * The id the field's own `aria-describedby` points at. Pass the same id to
   * [FormField]'s `describedBy`, which joins it to the help and error lines.
   */
  id: string;
  /**
   * What a screen reader hears instead of the characters. Read once as a
   * sentence rather than spelled out as punctuation before the value.
   */
  sentence?: string | undefined;
}

/**
 * A text affix inside a field's leading slot.
 *
 * WHY IT IS A COMPONENT. A url field is refused without a scheme, so a person
 * typing their site the way they say it out loud had a form that took the
 * value and a Save that failed validation. The affix makes the requirement
 * visible and satisfies it, and it is two things at once: a picture for a
 * sighted reader and part of the value for everybody else. Drawn as text
 * alone it is read as punctuation before the box; hidden entirely, the reader
 * is told nothing about a requirement the form enforces.
 */
export function InputAffix({ text, id, sentence }: InputAffixProps) {
  return (
    <>
      <span className="crewlet-input__affix" aria-hidden="true">
        {text}
      </span>
      <VisuallyHidden id={id}>{sentence ?? `Begins with ${text}`}</VisuallyHidden>
    </>
  );
}
