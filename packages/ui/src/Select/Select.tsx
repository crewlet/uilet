import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEventHandler,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckGlyph, KeyboardArrowDownGlyph, SearchGlyph } from '@crewlethq/icons/glyphs';
import {
  LAYER_GAP,
  LAYER_REPOSITION_EVENT,
  outsideBounds,
  placePopup,
  useLayerContainer,
  viewportBounds,
  type PlacementRect,
} from '../Layer/index.js';
import { useListbox, useOptionKeys } from '../Listbox/index.js';
import { cx } from '../utils/cx.js';

export type SelectValue = string | number;
export type SelectSize = 'sm' | 'md';
export type SelectAlign = 'left' | 'right';

/**
 * How wide the control is.
 *
 * `full` is a field on a form, which takes the line it is given. `auto` is a
 * picker in a toolbar: it sizes to the answer it is showing, between a floor
 * that keeps a row of them even and a cap that stops one long value pushing
 * the rest of the bar off the screen. A filter row of full-width selects is
 * one question per line, which is not what a filter bar is.
 */
export type SelectWidth = 'full' | 'auto';

/**
 * Which control this is.
 *
 * `listbox` IS THE HOUSE STYLE, and it is the default. Every dropdown in the
 * product is this one: it takes the theme, the density, the tokens and the
 * layer stack, so a list opened in a dark dialog is drawn by the design system
 * rather than by the operating system, and the two do not sit beside each
 * other looking like two products. It is also the only one that can do what
 * several surfaces need at all: more than one choice, a search over dozens, a
 * group heading, a second line of identity under an option.
 *
 * What it had to earn back, and now does, is everything a reader got free from
 * the platform: type-ahead, Home and End, disabled rows stepped over, the
 * highlight announced through `aria-activedescendant`, Tab closing the list
 * and carrying on, and a stored value the options no longer offer kept rather
 * than silently swapped. Those live in `useOptionKeys` and `useListbox`, so
 * there is one keyboard for every list in the package.
 *
 * `native` is a real `<select>` in uilet's chrome, and it is drawn ONLY where
 * a caller asks for it by name. The one thing it still has that this cannot
 * is the phone's own full-screen picker and the platform's assistive
 * behaviour in a web view, so a surface that is mostly used on a handset can
 * opt into it deliberately. It takes one choice only.
 */
export type SelectMode = 'listbox' | 'native';

export interface SelectOption {
  value: SelectValue;
  label: ReactNode;
  /** A second line under the label: a handle, a path, what the choice means. */
  description?: ReactNode;
  disabled?: boolean;
  /** Options sharing a group are listed under its name, in first-seen order. */
  group?: string;
  /**
   * What type-ahead and the search match against, where the label is not a
   * string. Without it a node label is matched by its value, which is a
   * worse answer than no match at all when the two differ.
   */
  text?: string;
}

/**
 * The form-control properties that reach whichever element this draws.
 *
 * The focus handlers are typed on `HTMLElement` rather than on
 * `HTMLSelectElement`, because the element a caller's handler lands on depends
 * on the mode: the listbox's trigger is a button and the native mode's is a
 * `select`. A handler written for the wider type works in both.
 */
type NativePassthrough = Pick<SelectHTMLAttributes<HTMLSelectElement>, 'autoFocus' | 'name' | 'required' | 'aria-describedby'> & {
  onBlur?: FocusEventHandler<HTMLElement> | undefined;
  onFocus?: FocusEventHandler<HTMLElement> | undefined;
};

export interface SelectProps extends NativePassthrough {
  id?: string;
  /**
   * Which control to draw. `listbox` by default, which is the house style; ask
   * for `native` only with a reason, and say it at the call site. See
   * [SelectMode].
   */
  mode?: SelectMode | undefined;
  /**
   * The chosen value. In `multiple` mode an array; a value the options do not
   * offer is kept rather than dropped, because a reference to something since
   * renamed has to stay visible until somebody removes it on purpose.
   */
  value: SelectValue | SelectValue[] | undefined;
  onChange?: (value: SelectValue | SelectValue[], option: SelectOption) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  size?: SelectSize;
  /** How wide the control is. See [SelectWidth]. */
  width?: SelectWidth;
  align?: SelectAlign;
  /**
   * A filter that is ON. It takes the accent border and the accent INK, which
   * is what "here, this is narrowing the list" means everywhere else; the fill
   * it used to take put a value on a coloured ground at 3.58:1.
   */
  active?: boolean;
  /** Marks the value as refused. Sets `aria-invalid`. */
  error?: boolean;
  ariaLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Listbox mode only. A native select cannot hold several choices usefully. */
  multiple?: boolean;
  renderTrigger?: (option: SelectOption | null, ctx: { open: boolean }) => ReactNode;
  renderOption?: (option: SelectOption, ctx: { active: boolean; selected: boolean }) => ReactNode;
  renderMultiLabel?: (selected: SelectOption[]) => ReactNode;
  /** The line shown when a search matches nothing. */
  emptyMessage?: string;
}

const same = (a: SelectValue, b: SelectValue): boolean => String(a) === String(b);

const optionText = (option: SelectOption): string =>
  option.text ?? (typeof option.label === 'string' ? option.label : String(option.value));

/**
 * A picker over a known set of values.
 *
 * WHAT CHANGED. The listbox mode used to add its own `mousedown` listener to
 * the document and swallow every press inside its panel so the popover around
 * it would not close, which is the shape a component takes when it is not on
 * a shared stack. It is a popup on the layer stack now, so a press on a
 * dialog's veil closes the list and leaves the dialog, and Escape reaches the
 * list first and stops there.
 *
 * The keyboard is the shared listbox model, so the arrows wrap, the highlight
 * is clamped rather than reset as a search narrows, and nothing is taken
 * while an input method is composing a word. What this adds on top is what
 * the model cannot know: which options are DISABLED, so the arrows, Home and
 * End step over them rather than parking the highlight on a row Enter will
 * refuse.
 *
 * THE HIGHLIGHT IS ANNOUNCED. The list points at its active row with
 * `aria-activedescendant` and every row carries an id, which is what a screen
 * reader reads as the arrows move. Without it the reader heard the list open
 * and then silence.
 */
export const Select = forwardRef<HTMLElement, SelectProps>(function Select(
  {
    id,
    mode = 'listbox',
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    disabled = false,
    className = '',
    menuClassName = '',
    size = 'md',
    width = 'full',
    align = 'left',
    active = false,
    error = false,
    ariaLabel,
    searchable = false,
    searchPlaceholder = 'Search',
    multiple = false,
    renderTrigger,
    renderOption,
    renderMultiLabel,
    emptyMessage = 'No matches',
    ...native
  },
  ref,
) {
  const generatedId = useId();
  const rootId = id ?? generatedId;
  /*
   * The width is a class on the root of whichever control is drawn, so it is
   * decided once here rather than threaded through both branches.
   */
  const classes = cx(className, width === 'auto' && 'crewlet-select--auto');

  /*
   * WHAT IS CHOSEN, and the one case that is not obvious: the EMPTY STRING.
   *
   * Empty usually means nothing has been chosen, so the placeholder shows. But
   * a filter row offers "Any" as a real answer whose value IS empty, and on
   * that list the placeholder would be a second, unlabelled spelling of the
   * answer already selected, drawn over it. So empty counts as a choice
   * exactly when the options offer it. The native control has always had this
   * rule; the listbox did not, and every filter that opened on "Any" came up
   * reading "Select an option" instead.
   */
  const chosen: SelectValue[] = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : [];
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    if (value === '' && !options.some((option) => String(option.value) === '')) return [];
    return [value];
  }, [value, multiple, options]);

  if (mode === 'native') {
    return (
      <NativeSelect
        ref={ref as React.Ref<HTMLSelectElement>}
        id={rootId}
        value={chosen[0]}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        className={classes}
        size={size}
        active={active}
        error={error}
        ariaLabel={ariaLabel}
        {...native}
      />
    );
  }

  return (
    <ListboxSelect
      ref={ref as React.Ref<HTMLButtonElement>}
      id={rootId}
      chosen={chosen}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      className={classes}
      menuClassName={menuClassName}
      size={size}
      align={align}
      active={active}
      error={error}
      ariaLabel={ariaLabel}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
      multiple={multiple}
      renderTrigger={renderTrigger}
      renderOption={renderOption}
      renderMultiLabel={renderMultiLabel}
      emptyMessage={emptyMessage}
      describedBy={native['aria-describedby']}
      required={native.required}
      focusOnMount={native.autoFocus}
      name={native.name}
      /*
       * A FORM'S OWN HANDLERS REACH THE TRIGGER. They used to be spread into
       * the native branch alone, so a field that validated on blur simply
       * never fired in the mode every screen now draws.
       */
      onBlur={native.onBlur}
      onFocus={native.onFocus}
    />
  );
});

/* ── Native ──────────────────────────────────────────────────────────── */

interface NativeSelectProps extends NativePassthrough {
  id: string;
  value: SelectValue | undefined;
  onChange: ((value: SelectValue, option: SelectOption) => void) | undefined;
  options: SelectOption[];
  placeholder: string;
  disabled: boolean;
  className: string;
  size: SelectSize;
  active: boolean;
  error: boolean;
  ariaLabel: string | undefined;
}

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
  { id, value, onChange, options, placeholder, disabled, className, size, active, error, ariaLabel, ...rest },
  ref,
) {
  const current = value ?? '';
  const offersEmpty = options.some((option) => String(option.value) === '');
  const known = options.some((option) => same(option.value, current));

  return (
    <div
      className={cx(
        'crewlet-select',
        'crewlet-select--native',
        `crewlet-select--${size}`,
        active && 'is-active',
        error && 'is-error',
        disabled && 'is-disabled',
        className,
      )}
    >
      <select
        ref={ref}
        id={id}
        className="crewlet-select__native"
        value={current}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        onChange={(event) => {
          const next = event.target.value;
          const option = options.find((candidate) => String(candidate.value) === next);
          onChange?.(next, option ?? { value: next, label: next });
        }}
        {...rest}
      >
        {/*
          NO PLACEHOLDER OVER AN ANSWER THAT EXISTS. Rendered unconditionally,
          every dropdown opened with a question mark above the value it was
          already showing. It is honest in exactly one case, nothing chosen at
          all, and not even then when "nothing" is itself an option: a unit's
          lead offers "No lead (inherits the parent's)" as the empty value, and
          a placeholder above that is a second, unlabelled spelling of the same
          answer, selected in its place.
        */}
        {current === '' && !offersEmpty ? <option value="">{placeholder}</option> : null}
        {/*
          AND A STORED ANSWER THIS LIST DOES NOT OFFER keeps its own option
          rather than vanishing into a selection it is not. A form may narrow
          its choices, and a company already holding the dropped one must not
          open the dialog to find a different answer selected, then save it.
        */}
        {current !== '' && !known ? <option value={current}>{String(current)}</option> : null}
        {options.map((option) => (
          <option key={String(option.value)} value={option.value} disabled={option.disabled}>
            {optionText(option)}
          </option>
        ))}
      </select>
      <KeyboardArrowDownGlyph className="crewlet-select__chevron" size="sm" />
    </div>
  );
});

/* ── Listbox ─────────────────────────────────────────────────────────── */

interface ListboxSelectProps {
  id: string;
  chosen: SelectValue[];
  onChange: ((value: SelectValue | SelectValue[], option: SelectOption) => void) | undefined;
  options: SelectOption[];
  placeholder: string;
  disabled: boolean;
  className: string;
  menuClassName: string;
  size: SelectSize;
  align: SelectAlign;
  active: boolean;
  error: boolean;
  ariaLabel: string | undefined;
  searchable: boolean;
  searchPlaceholder: string;
  multiple: boolean;
  renderTrigger: SelectProps['renderTrigger'];
  renderOption: SelectProps['renderOption'];
  renderMultiLabel: SelectProps['renderMultiLabel'];
  emptyMessage: string;
  describedBy: string | undefined;
  required: boolean | undefined;
  focusOnMount: boolean | undefined;
  name: string | undefined;
  onBlur: NativePassthrough['onBlur'];
  onFocus: NativePassthrough['onFocus'];
}

const ListboxSelect = forwardRef<HTMLButtonElement, ListboxSelectProps>(function ListboxSelect(
  {
    id,
    chosen,
    onChange,
    options,
    placeholder,
    disabled,
    className,
    menuClassName,
    size,
    align,
    active,
    error,
    ariaLabel,
    searchable,
    searchPlaceholder,
    multiple,
    renderTrigger,
    renderOption,
    renderMultiLabel,
    emptyMessage,
    describedBy,
    required,
    focusOnMount,
    name,
    onBlur,
    onFocus,
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState<{ left: number; top: number; width: number } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLElement | null>(null);
  const search = useRef<HTMLInputElement | null>(null);
  const container = useLayerContainer();

  const isChosen = useCallback(
    (candidate: SelectValue) => chosen.some((held) => same(held, candidate)),
    [chosen],
  );

  const needle = query.trim().toLowerCase();
  const offered = useMemo(() => {
    if (!searchable || needle === '') return options;
    return options.filter((option) => {
      if (optionText(option).toLowerCase().includes(needle)) return true;
      const description = typeof option.description === 'string' ? option.description : '';
      return description.toLowerCase().includes(needle);
    });
  }, [options, searchable, needle]);

  /*
   * Grouped for the eye, flat for the keys. The flat order IS the order the
   * groups are drawn in, so Down never jumps backwards across a heading.
   */
  const groups = useMemo(() => {
    const out: { name: string | undefined; items: SelectOption[] }[] = [];
    for (const option of offered) {
      const group = out.find((candidate) => candidate.name === option.group);
      if (group) group.items.push(option);
      else out.push({ name: option.group, items: [option] });
    }
    return out;
  }, [offered]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (returnFocus) trigger.current?.focus();
  }, []);

  const commit = useCallback(
    (index: number) => {
      const option = flat[index];
      if (!option || option.disabled) return;
      if (multiple) {
        const next = isChosen(option.value)
          ? chosen.filter((held) => !same(held, option.value))
          : [...chosen, option.value];
        onChange?.(next, option);
        return;
      }
      onChange?.(option.value, option);
      close(true);
    },
    [chosen, close, flat, isChosen, multiple, onChange],
  );

  const listbox = useListbox({
    id,
    open,
    count: flat.length,
    onCommit: commit,
    onClose: () => close(true),
    // Tab is a form control's own key here: it leaves the field. The list
    // closes with it rather than taking the highlighted row on the way out.
    tabCommits: false,
  });

  /*
   * The keys the OPTIONS decide: the arrows and the ends stepping over a
   * disabled row, and type-ahead. Shared with every other listbox in the
   * package, because they are what a reader would otherwise have had from the
   * native control and there must not be two answers to any of them.
   *
   * No type-ahead where there is a search box: the letters belong to it.
   */
  const keys = useOptionKeys({
    listbox,
    count: flat.length,
    disabled: (index) => flat[index]?.disabled === true,
    ...(searchable
      ? {}
      : {
          textOf: (index: number) => {
            const option = flat[index];
            return option ? optionText(option) : '';
          },
        }),
  });

  // The highlight opens on the chosen row, or on the first row that can be
  // taken: a list that opens on a disabled row is one where Enter does
  // nothing and nobody is told why.
  useEffect(() => {
    if (!open) return;
    listbox.setActive(keys.opening(flat.findIndex((option) => isChosen(option.value))));
    // The highlight is seeded once per opening. Following `flat` would drag it
    // back to the chosen row on every keystroke of a search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && searchable) search.current?.focus();
  }, [open, searchable]);

  /*
   * FOCUS ON MOUNT, from an effect rather than the `autoFocus` attribute. A
   * form opened AT this field starts on it, which the attribute does on the
   * first render of a page and never again: a drawer that mounts its body a
   * second time comes up with focus on the page body instead.
   */
  useEffect(() => {
    if (focusOnMount) trigger.current?.focus();
  }, [focusOnMount]);

  /*
   * THE HIGHLIGHTED ROW STAYS IN VIEW, by scrolling the list element and
   * nothing else. The shared model reveals `[aria-selected="true"]`, which in
   * this list is the CHOSEN row rather than the highlighted one, so it would
   * drag the view back to the choice on every arrow press. Declared after the
   * hook so it is the effect that runs last and therefore the one that wins.
   */
  useEffect(() => {
    const box = list.current;
    const row = box?.querySelector<HTMLElement>('[data-active="true"]');
    if (!box || !row) return;
    const bounds = box.getBoundingClientRect();
    const spot = row.getBoundingClientRect();
    if (spot.top < bounds.top) box.scrollTop -= bounds.top - spot.top;
    else if (spot.bottom > bounds.bottom) box.scrollTop += spot.bottom - bounds.bottom;
  }, [listbox.active, flat.length, open]);

  const position = useCallback(() => {
    const at = trigger.current;
    const box = panel.current;
    if (!at || !box || !container) return;
    const inHost = container !== document.body;
    const host = inHost ? container.getBoundingClientRect() : viewportBounds();
    const rect = at.getBoundingClientRect();
    const width = rect.width;
    const local: PlacementRect = {
      x: (align === 'right' ? rect.right - width : rect.left) - (inHost ? host.x : 0),
      y: rect.top - (inHost ? host.y : 0),
      width: rect.width,
      height: rect.height,
    };
    const whole: PlacementRect = { x: 0, y: 0, width: host.width, height: host.height };
    if (outsideBounds(local, whole)) {
      close(false);
      return;
    }
    const spot = placePopup(
      local,
      { width, height: box.getBoundingClientRect().height },
      { x: LAYER_GAP, y: LAYER_GAP, width: host.width - 2 * LAYER_GAP, height: host.height - 2 * LAYER_GAP },
    );
    setPlace((was) =>
      was && was.left === spot.left && was.top === spot.top && was.width === width
        ? was
        : { left: spot.left, top: spot.top, width },
    );
  }, [align, close, container]);

  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return;
    }
    position();
    const onLayout = () => position();
    container?.addEventListener(LAYER_REPOSITION_EVENT, onLayout);
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      container?.removeEventListener(LAYER_REPOSITION_EVENT, onLayout);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, container, position]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (disabled) return;
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'Tab') {
      /*
       * Tab leaves the field, as it does on every other form control, and the
       * list goes with it. WHERE IT LEAVES FROM is the whole of this: with no
       * search box focus is on the trigger and the browser carries on from
       * there, but a search box lives in the PORTALLED PANEL, which this press
       * is about to remove. The browser performs Tab's default after the
       * handler returns, by which time the element it was on has gone and
       * focus has fallen to the page body, so the press lands nowhere and the
       * next one starts the document again. Handing focus back to the trigger
       * first is what lets Tab move on to the control after the field.
       */
      close(searchable);
      return;
    }
    // The options' own keys first (the arrows and the ends step over a
    // disabled row, and a letter is type-ahead), then the shared model's
    // Enter and Escape.
    if (keys.onKeyDown(event)) return;
    listbox.onKeyDown(event);
  }

  /*
   * WHAT IS HELD, IN THE ORDER IT WAS CHOSEN, and a value the options do not
   * offer stands for itself rather than disappearing. Read off the options
   * list instead, a stored reference to something since renamed is silently
   * dropped from the count and from the label while still being saved: the
   * reader sees "1 selected" over two values and removes neither.
   */
  const byValue = new Map(options.map((option) => [String(option.value), option]));
  const selectedOptions: SelectOption[] = chosen.map(
    (held) => byValue.get(String(held)) ?? { value: held, label: String(held) },
  );
  const single = selectedOptions[0] ?? null;

  let label: ReactNode = placeholder;
  let hasValue = selectedOptions.length > 0;
  if (multiple && renderMultiLabel) {
    label = renderMultiLabel(selectedOptions);
  } else if (multiple && selectedOptions.length > 1) {
    label = `${selectedOptions.length} selected`;
  } else if (single) {
    label = single.label;
  } else {
    hasValue = false;
  }

  const listId = listbox.listId;
  const activeId = open && flat.length > 0 ? listbox.optionId(listbox.active) : undefined;
  // WHICHEVER ELEMENT HOLDS FOCUS IS THE COMBOBOX. With no search box focus
  // never leaves the trigger, so the trigger carries the role and the
  // highlight; with one, focus moves into it and it does.
  const comboOnTrigger = !searchable;

  let index = -1;
  const rows = groups.map((group, position) => {
    const items = group.items.map((option) => {
      index += 1;
      const at = index;
      const selected = isChosen(option.value);
      const highlighted = at === listbox.active;
      return (
        <div
          key={String(option.value)}
          id={listbox.optionId(at)}
          role="option"
          /*
           * `aria-selected` IS THE CHOICE, not the highlight. Selection does
           * not follow focus here (Enter takes a row, Escape leaves it), so
           * moving the attribute with the arrows would tell a reader they had
           * chosen every row they passed over. The highlight is what
           * `aria-activedescendant` points at.
           */
          aria-selected={selected}
          aria-disabled={option.disabled || undefined}
          data-active={highlighted || undefined}
          className={cx(
            'crewlet-listbox__option',
            'crewlet-select__option',
            selected && 'is-selected',
            highlighted && 'is-highlight',
            option.disabled && 'is-disabled',
          )}
          {...(option.disabled ? {} : listbox.optionHandlers(at))}
        >
          {renderOption ? (
            renderOption(option, { active: highlighted, selected })
          ) : (
            <>
              <span className="crewlet-select__option-tick" aria-hidden="true">
                {selected ? <CheckGlyph size="sm" /> : null}
              </span>
              <span className="crewlet-select__option-body">
                <span className="crewlet-select__option-label">{option.label}</span>
                {option.description ? (
                  <span className="crewlet-select__option-desc">{option.description}</span>
                ) : null}
              </span>
            </>
          )}
        </div>
      );
    });
    if (group.name === undefined) return items;
    // By POSITION, not by name: an id is one token, and a group called "Go to
    // Market" would be three to aria-labelledby.
    const headingId = `${id}-group-${position}`;
    return (
      <div key={group.name} role="group" aria-labelledby={headingId} className="crewlet-select__group">
        <div className="crewlet-listbox__heading" id={headingId} role="presentation">
          {group.name}
        </div>
        {items}
      </div>
    );
  });

  const panelNode = open ? (
    <div
      ref={(el) => {
        panel.current = el;
      }}
      className={cx(
        'crewlet-select__menu',
        `crewlet-select__menu--${size}`,
        container !== null && container !== document.body ? 'crewlet-select__menu--in-host' : 'crewlet-select__menu--fixed',
        menuClassName,
      )}
      style={
        place
          ? { left: place.left, top: place.top, width: place.width }
          : // Laid out but not painted, so its own height can be measured
            // before it is placed and no reader sees it in a corner first.
            { visibility: 'hidden' }
      }
      role="presentation"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {searchable ? (
        <div className="crewlet-select__search">
          <SearchGlyph size="sm" />
          {/*
            Requiredness belongs on whichever element IS the combobox, and with
            a search box open that is this one rather than the trigger.
          */}
          <input
            ref={search}
            type="text"
            className="crewlet-select__search-input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-label={searchPlaceholder}
            aria-required={required}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      ) : null}
      <div
        ref={(el) => {
          list.current = el;
          listbox.listRef(el);
        }}
        id={listId}
        className={cx('crewlet-listbox', 'crewlet-select__list')}
        role="listbox"
        aria-label={ariaLabel ?? placeholder}
        aria-multiselectable={multiple || undefined}
      >
        {flat.length === 0 ? <div className="crewlet-listbox__empty">{emptyMessage}</div> : rows}
      </div>
    </div>
  ) : null;

  return (
    <div
      className={cx(
        'crewlet-select',
        `crewlet-select--${size}`,
        open && 'is-open',
        active && 'is-active',
        error && 'is-error',
        disabled && 'is-disabled',
        className,
      )}
      ref={listbox.anchorRef}
    >
      <button
        ref={(el) => {
          trigger.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        type="button"
        id={id}
        name={name}
        className="crewlet-select__trigger"
        role={comboOnTrigger ? 'combobox' : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={comboOnTrigger ? activeId : undefined}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={error || undefined}
        aria-required={comboOnTrigger ? required : undefined}
        disabled={disabled}
        onBlur={onBlur}
        onFocus={onFocus}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={onKeyDown}
      >
        {renderTrigger ? (
          renderTrigger(single, { open })
        ) : (
          <span className={cx('crewlet-select__label', !hasValue && 'is-placeholder')}>{label}</span>
        )}
        <KeyboardArrowDownGlyph className="crewlet-select__chevron" size="sm" />
      </button>
      {panelNode && container ? createPortal(panelNode, container) : null}
    </div>
  );
});
