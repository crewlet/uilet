import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { CheckGlyph } from '@crewlethq/icons/glyphs';
import { Input, type InputProps } from '../Input/index.js';
import { useListbox, useOptionKeys } from '../Listbox/index.js';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
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

/** What every combobox takes, whether its list is a popup or always on screen. */
export interface ComboboxBaseProps
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

/** A field that offers completions in a list that opens under it. */
export interface ComboboxPopupProps extends ComboboxBaseProps {
  inline?: false | undefined;
  /** Whether the list is on screen. Controlled: only the caller knows when it has something to offer. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A field over a list that is always on screen: a picker whose list IS the
 * surface's body (a folder picker in a dialog), filtered by the field.
 */
export interface ComboboxInlineProps extends ComboboxBaseProps {
  /**
   * The list is part of the surface rather than a popup: always on screen,
   * in the flow under the field, at a stable height, filtered by what the
   * field holds. See the component's notes.
   */
  inline: true;
  /** How many rows the list shows before it scrolls, and so how tall it stands. Six by default. */
  rows?: number | undefined;
  /**
   * The value of the option chosen so far: drawn chosen, announced as
   * selected, and where the highlight starts.
   */
  chosen?: string | undefined;
  open?: undefined;
  onOpenChange?: undefined;
}

export type ComboboxProps = ComboboxPopupProps | ComboboxInlineProps;

/** Every mode's own props, read together inside the component. */
interface ModeProps {
  inline?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  rows?: number | undefined;
  chosen?: string | undefined;
}

/** How many rows an inline list shows when nobody says. */
const INLINE_ROWS = 6;

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
 * INLINE (`inline`), THE LIST IS THE SURFACE'S BODY. For a picker whose list
 * is the point of the dialog it sits in (Move to…), the list is always on
 * screen, in the flow under the field, filtered by it: no popup, no portal,
 * nothing that opens or closes. A list that closed when the field lost focus
 * made the dialog shrink under the pointer between the press on Cancel and
 * its release, so the click landed on the veil. Its box keeps one height
 * (`rows`) whatever the filter leaves in it, so nothing under it moves as
 * somebody types, and says so in its own row when nothing matches. The keys
 * are the popup's (the arrows step over a disabled row, Enter takes the
 * highlighted one, the letters filter), Home and End reach the first and the
 * last row while the field is empty and are the caret's once it holds text,
 * and Escape is never its own: there is nothing to dismiss, so it reaches the
 * dialog. `chosen` marks the option picked so far as selected.
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
    label,
    tabCommits = false,
    commitOn = 'mousedown',
    mono = false,
    emptyMessage,
    id,
    className,
    containerClassName,
    ...props
  },
  ref,
) {
  // The mode's own props, taken off before the rest reaches the field.
  const { inline = false, open: openProp, onOpenChange: onOpenChangeProp, rows: rowsProp, chosen, ...rest } =
    props as typeof props & ModeProps;
  // An inline list is always on screen and never asked to close.
  const open = inline ? true : Boolean(openProp);
  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!inline) onOpenChangeProp?.(next);
    },
    [inline, onOpenChangeProp],
  );
  const rows = Math.max(1, Math.round(rowsProp ?? INLINE_ROWS));
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
    // can see it, so dismissing it is what Escape means there too. An inline
    // list is not a popup: it has nothing to dismiss, and Escape reaches the
    // surface around it.
    open: showing,
    count: offered.length,
    onCommit: commit,
    onClose: () => onOpenChange(false),
    tabCommits,
    popup: !inline,
  });

  // THE OPTIONS' OWN KEYS, for the inline list: the arrows step over a
  // disabled row, and Home and End reach the ends while the field is empty
  // (once it holds text they are the caret's). No type-ahead: the letters
  // belong to the field, which filters.
  const isDisabled = useCallback((index: number) => Boolean(offered[index]?.disabled), [offered]);
  const optionKeys = useOptionKeys({ listbox, count: offered.length, disabled: isDisabled, ends: value === '' });
  const chosenIndex = chosen === undefined ? -1 : offered.findIndex((option) => option.value === chosen);

  // WHERE THE INLINE HIGHLIGHT STANDS: on the chosen row when the list first
  // draws, and on the first row that can be taken each time the filter
  // changes, so Enter after typing takes the best match rather than whatever
  // row the highlight was clamped onto.
  const { opening, step } = optionKeys;
  const setActive = listbox.setActive;
  const placed = useRef(false);
  useEffect(() => {
    if (!inline) return;
    if (!placed.current) {
      placed.current = true;
      setActive(opening(chosenIndex));
      return;
    }
    setActive(step(0, 1));
    // Placed by what the field holds; the options it filters follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline, value]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (inline && optionKeys.onKeyDown(event)) return;
    if (listbox.onKeyDown(event)) return;
    if (inline) return;
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

  const fieldRef = (el: HTMLInputElement | null) => {
    box.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  const row = (option: ComboboxOption, index: number, picked: boolean) => (
    <div
      key={option.value}
      id={listbox.optionId(index)}
      role="option"
      aria-selected={picked}
      aria-disabled={option.disabled || undefined}
      className={cx(
        'crewlet-listbox__option',
        HIT_AREA_CLASS,
        index === listbox.active && 'is-highlight',
        option.disabled && 'is-disabled',
      )}
      {...(option.disabled ? {} : handlers(index))}
    >
      <span className="crewlet-combobox__label">{option.label ?? option.value}</span>
      {option.hint ? <span className="crewlet-listbox__hint">{option.hint}</span> : null}
      {inline && picked ? (
        <span className="crewlet-combobox__check" aria-hidden="true">
          <CheckGlyph size="sm" />
        </span>
      ) : null}
    </div>
  );

  if (inline) {
    const listed = offered.length > 0 || renderList !== undefined;
    return (
      <div className={cx('crewlet-combobox', 'crewlet-combobox--inline', containerClassName)}>
        <Input
          {...rest}
          ref={fieldRef}
          id={fieldId}
          className={className}
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listed}
          aria-controls={listed ? listbox.listId : undefined}
          aria-activedescendant={offered.length > 0 && listbox.active >= 0 ? listbox.optionId(listbox.active) : undefined}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {/* ONE HEIGHT, whatever the filter leaves: nothing under it moves. */}
        <div className={cx('crewlet-combobox__list', mono && 'is-mono')} style={{ '--crewlet-combobox-rows': rows } as CSSProperties}>
          {listed ? (
            <div ref={listbox.listRef} className="crewlet-combobox__options" role="listbox" id={listbox.listId} aria-label={label}>
              {renderList
                ? renderList({
                    listId: listbox.listId,
                    active: listbox.active,
                    optionId: listbox.optionId,
                    optionHandlers: handlers,
                  })
                : offered.map((option, index) => row(option, index, index === chosenIndex))}
            </div>
          ) : null}
          {/* SAID AS IT HAPPENS: a filter that leaves nothing is news. */}
          <div className="crewlet-combobox__empty" role="status">
            {!listed && emptyMessage ? <div className="crewlet-listbox__empty">{emptyMessage}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  // A PASSWORD FIELD TAKES NO ROLE AT REST. HTML allows no ARIA role on
  // `type="password"`, so a masked field is a plain password field until it
  // has a list to offer, and a combobox only while that list is open: the
  // reader is told about the list exactly when there is one, and a closed
  // field stays what the platform says it is.
  const announcesRole = rest.type !== 'password' || lists;

  return (
    <div className={cx('crewlet-combobox', containerClassName)} ref={listbox.anchorRef}>
      <Input
        {...rest}
        ref={fieldRef}
        id={fieldId}
        className={className}
        value={value}
        role={announcesRole ? 'combobox' : undefined}
        aria-autocomplete={announcesRole ? 'list' : undefined}
        aria-expanded={announcesRole ? lists : undefined}
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
              ? // A completion list has no choice of its own: the row the
                // arrows are on is the one announced as selected.
                offered.map((option, index) => row(option, index, index === listbox.active))
              : <div className="crewlet-listbox__empty">{emptyMessage}</div>}
        </div>
      ) : null}
    </div>
  );
});
