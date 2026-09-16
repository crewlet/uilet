import {
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Input, type InputProps } from '../Input/index.js';
import { useListbox } from '../Listbox/index.js';
import { cx } from '../utils/cx.js';

export interface ComboboxOption {
  /** What taking the option puts in the field. */
  value: string;
  /** What is drawn. The value itself when it is left out. */
  label?: ReactNode;
  /** A short second line of identity: a handle, a path, a kind. */
  hint?: ReactNode;
  disabled?: boolean;
}

/** What a caller drawing its own rows is handed. */
export interface ComboboxListRender {
  /** The id the field's `aria-controls` points at. Put it on the list. */
  listId: string;
  /** The highlighted row's index, or -1 when nothing is offered. */
  active: number;
  /** The id of the row at `index`. */
  optionId: (index: number) => string;
  /** Mouse wiring for the row at `index`. */
  optionHandlers: (index: number) => Record<string, unknown>;
}

export interface ComboboxProps
  extends Omit<InputProps, 'value' | 'onChange' | 'role' | 'onKeyDown' | 'list'> {
  /** What the field holds. The caller owns it: a completion is an edit to it. */
  value: string;
  onValueChange: (next: string) => void;
  /**
   * What is offered RIGHT NOW. The caller filters, because what a query
   * matches is the caller's question: a secret reference matches on a prefix
   * of the name under the caret, not on the whole field.
   */
  options?: readonly ComboboxOption[];
  /**
   * Draws the rows itself, for a list whose rows are not plain options.
   *
   * `options` STILL SAYS WHAT IS OFFERED. This decides what a row looks like,
   * not what there is: the highlight is an index into `options`, and so is
   * what Enter takes, so a list drawn this way with no `options` is one the
   * arrows cannot move through and Enter cannot commit from.
   */
  renderList?: ((list: ComboboxListRender) => ReactNode) | undefined;
  /**
   * Taking an option. By default it writes the option's value into the field,
   * which is what a completion means; a caller with a caret to place (a
   * `${NAME}` inside a longer value) does it itself.
   */
  onCommit?: ((option: ComboboxOption, index: number) => void) | undefined;
  /** Whether the list is on screen. Controlled: only the caller knows when it has something to offer. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the list. A listbox with no name is announced as "list box" and nothing else. */
  label: string;
  /**
   * Tab takes the highlighted option, which is what it means in a completion
   * list. Left off, Tab moves focus, as it does on every form control.
   */
  tabCommits?: boolean | undefined;
  /**
   * Which press takes a row. `mousedown` is the default and the right answer
   * for a list that closes on blur: the field blurs first, so a list waiting
   * for the click takes the row out from under the press that chose it.
   * `click` is for a list inside a surface that is not going anywhere.
   */
  commitOn?: 'mousedown' | 'click' | undefined;
  /** Draws the rows in the mono face, for names read exactly rather than for sense. */
  mono?: boolean | undefined;
  /** The line shown while the list is open with nothing to offer. Nothing is drawn without one. */
  emptyMessage?: ReactNode;
}

/**
 * A text field that offers completions.
 *
 * WHY THE LIST IS ANCHORED RATHER THAN PORTALLED. It is positioned absolutely
 * under the field, inside the field's own box, so opening it moves nothing: a
 * list that took part in the layout pushed every field under it down the form
 * as somebody typed. It is bounded and scrolled rather than as long as the
 * matches, and it sits on an OPAQUE surface, because a translucent one over a
 * form leaves two sets of words in the same place.
 *
 * ESCAPE IS CONSUMED HERE. The list closes and the dialog or sheet around the
 * field stays open; a second Escape reaches it. Without that, somebody
 * dismissing a completion they did not want lost the whole editor with it.
 *
 * WHAT IT DOES NOT DECIDE is what matches. The caller filters and hands over
 * what is offered, because a completion's question belongs to the value: the
 * engine's secret references complete on the name under the caret, not on the
 * whole field.
 */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  {
    value,
    onValueChange,
    options,
    renderList,
    onCommit,
    open,
    onOpenChange,
    label,
    tabCommits = false,
    commitOn = 'mousedown',
    mono = false,
    emptyMessage,
    id,
    className,
    containerClassName,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  // Memoised so the commit callback is not rebuilt on every keystroke by a
  // caller that passes its filtered array inline, which every caller does.
  const offered = useMemo(() => options ?? [], [options]);
  const showing = open && (offered.length > 0 || renderList !== undefined || emptyMessage !== undefined);
  const lists = open && (offered.length > 0 || renderList !== undefined);
  const box = useRef<HTMLInputElement | null>(null);

  const commit = useCallback(
    (index: number) => {
      const option = offered[index];
      if (!option || option.disabled) return;
      if (onCommit) onCommit(option, index);
      else onValueChange(option.value);
      onOpenChange(false);
    },
    [offered, onCommit, onOpenChange, onValueChange],
  );

  const listbox = useListbox({
    id: fieldId,
    // A list that is showing with nothing in it still owns Escape: the reader
    // can see it, so dismissing it is what Escape means there too.
    open: showing,
    count: offered.length,
    onCommit: commit,
    onClose: () => onOpenChange(false),
    tabCommits,
  });

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (listbox.onKeyDown(event)) return;
    if (!showing && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      onOpenChange(true);
    }
  }

  const handlers = (index: number): Record<string, unknown> => {
    const { onMouseDown, onMouseEnter } = listbox.optionHandlers(index);
    if (commitOn === 'click') {
      return {
        onMouseEnter,
        // The press is still swallowed, so the field keeps focus and the value
        // being completed keeps its caret; only what TAKES the row moves.
        onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
        onClick: () => commit(index),
      };
    }
    return { onMouseDown, onMouseEnter };
  };

  return (
    <div className={cx('crewlet-combobox', containerClassName)} ref={listbox.anchorRef}>
      <Input
        {...rest}
        ref={(el) => {
          box.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        id={fieldId}
        className={className}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={lists}
        aria-controls={lists ? listbox.listId : undefined}
        aria-activedescendant={lists && offered.length > 0 ? listbox.optionId(listbox.active) : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {showing ? (
        <div
          ref={listbox.listRef}
          className={cx('crewlet-combobox__panel', mono && 'is-mono')}
          role={lists ? 'listbox' : undefined}
          id={lists ? listbox.listId : undefined}
          aria-label={lists ? label : undefined}
        >
          {renderList
            ? renderList({
                listId: listbox.listId,
                active: listbox.active,
                optionId: listbox.optionId,
                optionHandlers: handlers,
              })
            : offered.length > 0
              ? offered.map((option, index) => (
                  <div
                    key={option.value}
                    id={listbox.optionId(index)}
                    role="option"
                    aria-selected={index === listbox.active}
                    aria-disabled={option.disabled || undefined}
                    className={cx(
                      'crewlet-listbox__option',
                      index === listbox.active && 'is-highlight',
                      option.disabled && 'is-disabled',
                    )}
                    {...(option.disabled ? {} : handlers(index))}
                  >
                    <span className="crewlet-combobox__label">{option.label ?? option.value}</span>
                    {option.hint ? <span className="crewlet-listbox__hint">{option.hint}</span> : null}
                  </div>
                ))
              : <div className="crewlet-listbox__empty">{emptyMessage}</div>}
        </div>
      ) : null}
    </div>
  );
});
