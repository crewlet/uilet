import { useRef, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
import { announce } from '../Announcer/index.js';
import { isComposing } from '../Layer/index.js';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';
import { useFocusModality } from '../utils/focusModality.js';

/** One chosen item, drawn as a chip in the field. */
export interface ChipFieldItem {
  id: string;
  /** Its name on the chip, and in the chip's Remove control. */
  label: string;
  /** A small face or glyph before the name (an `xs` `Avatar`). Decorative. */
  leading?: ReactNode;
}

/**
 * How the field is drawn. `boxed` is a field like any other, a box with the
 * field's ring. `bare` is a full-width row with a rule under it, for the
 * address line at the top of a view ("To:"), whose focus is a bar along
 * that rule.
 */
export type ChipFieldVariant = 'boxed' | 'bare';

/** The words the field says, for a host that sets its own. */
export interface ChipFieldLabels {
  /** Names a chip's Remove control. */
  remove: (label: string) => string;
  /** Said when a chip is removed. */
  removed: (label: string) => string;
  /** Names the list of chips. */
  chosen: string;
}

export const CHIP_FIELD_LABELS: ChipFieldLabels = {
  remove: (label) => `Remove ${label}`,
  removed: (label) => `Removed ${label}`,
  chosen: 'Chosen',
};

export interface ChipFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix' | 'children' | 'aria-label' | 'type'> {
  /** What is chosen, in the order it was chosen. */
  items: readonly ChipFieldItem[];
  /** A chip's Remove control, and Backspace in an empty query, which removes the last chip. */
  onRemove: (id: string) => void;
  /** The words being typed. */
  query: string;
  onQueryChange: (query: string) => void;
  /**
   * Enter with words typed: the host takes its first match. Enter is taken
   * from the form round the field only when this is given and there are
   * words to commit.
   */
  onCommit?: (() => void) | undefined;
  /** The text box's name: "Find people and agents", "Who the message is to". */
  label: string;
  /** A leading word inside the row, before the chips: "To:". */
  prefix?: ReactNode;
  variant?: ChipFieldVariant | undefined;
  /** The text box, for a host that moves focus to it. */
  inputRef?: Ref<HTMLInputElement> | undefined;
  labels?: Partial<ChipFieldLabels> | undefined;
  /** Classes on the field's outer box. */
  className?: string | undefined;
}

/**
 * The chosen items of a picker as chips INSIDE the field, before a bare text
 * box: the recipients of a new message, the people being added to a room.
 * The host owns what is offered (a list of `PersonRow`s under the field, or
 * a listbox the field points at) and what typing finds; the field owns the
 * chips, the box and the keys.
 *
 * NOT `TagsInput`. That field is a form value, its chips above the box so the
 * box keeps its width and an ordered chain has room for its Move controls.
 * Here the chips ARE the line being addressed, read left to right with the
 * caret after the last one, and each carries a face.
 *
 * THE RULES IT KEEPS.
 *
 * - BACKSPACE IN AN EMPTY BOX REMOVES THE LAST CHIP, and says so through the
 *   shared `Announcer`.
 * - ENTER WITH WORDS TYPED IS THE HOST'S (`onCommit`): it takes the first
 *   match. Enter with nothing typed is left to the form round the field.
 * - FOCUS STAYS IN THE BOX when a chip is removed, by its control or by
 *   Backspace, so the next name can be typed at once.
 * - THE HOST'S KEYS COME FIRST. `onKeyDown` runs before the field's own, and
 *   a key it handles (its default prevented) is left alone: a host that makes
 *   the box a combobox over `useListbox` takes Enter, the arrows and Escape.
 *   Every other attribute (`role`, `aria-controls`, `aria-expanded`,
 *   `aria-activedescendant`) is passed to the box.
 * - NOTHING IS TAKEN MID-COMPOSITION. While an input method is composing a
 *   word, Enter and Backspace are its own.
 * - A PRESS ON THE FIELD'S EMPTY SPACE PUTS THE CARET IN THE BOX, as a press
 *   anywhere in a text field does.
 */
export function ChipField({
  items,
  onRemove,
  query,
  onQueryChange,
  onCommit,
  label,
  prefix,
  variant = 'boxed',
  inputRef,
  labels: overrides,
  className,
  disabled = false,
  onKeyDown,
  ...input
}: ChipFieldProps) {
  useFocusModality();
  const labels = overrides ? { ...CHIP_FIELD_LABELS, ...overrides } : CHIP_FIELD_LABELS;
  const box = useRef<HTMLInputElement | null>(null);
  const setBox = (el: HTMLInputElement | null) => {
    box.current = el;
    if (typeof inputRef === 'function') inputRef(el);
    else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = el;
  };

  const remove = (item: ChipFieldItem) => {
    onRemove(item.id);
    announce(labels.removed(item.label));
    box.current?.focus();
  };

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || isComposing(event)) return;
    if (event.key === 'Backspace' && query === '') {
      const last = items.at(-1);
      if (!last) return;
      event.preventDefault();
      remove(last);
      return;
    }
    if (event.key === 'Enter' && onCommit && query.trim() !== '' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      onCommit();
    }
  };

  // A press on the row's own space, not on a chip or the box, puts the caret
  // in the box. Prevented, so the press does not take focus away first.
  const pressRow = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || event.target !== event.currentTarget) return;
    event.preventDefault();
    box.current?.focus();
  };

  return (
    // The row is not a control: its press only forwards the caret to the
    // box, which is the field's one keyboard stop besides the chips' Remove.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={cx('crewlet-chip-field', `crewlet-chip-field--${variant}`, disabled && 'is-disabled', className)}
      onMouseDown={pressRow}
    >
      {prefix ? <span className="crewlet-chip-field__prefix">{prefix}</span> : null}
      {items.length > 0 ? (
        // THE ROLE IS SPELLED OUT. The list is `display: contents`, so its
        // chips wrap in one line with the box, and a browser that drops a
        // contents box from the accessibility tree drops its list role too.
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul role="list" className="crewlet-chip-field__chips" aria-label={labels.chosen}>
          {items.map((item) => (
            <li key={item.id} className="crewlet-chip-field__chip">
              <Tag
                size="sm"
                leadingIcon={item.leading}
                onRemove={disabled ? undefined : () => remove(item)}
                removeAriaLabel={labels.remove(item.label)}
              >
                {item.label}
              </Tag>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        autoComplete="off"
        spellCheck={false}
        {...input}
        ref={setBox}
        type="text"
        aria-label={label}
        className="crewlet-chip-field__input"
        value={query}
        disabled={disabled}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={keys}
      />
    </div>
  );
}
