import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';


// Unified custom dropdown, a themed replacement for the native
// <select>. Designed to:
//
//   - Render the trigger as a button sized to sit beside a text
//     input, so it lines up in toolbars and form rows.
//   - Open a floating panel below the trigger with a soft drop
//     shadow and an animated entry, instead of the OS-native
//     dropdown (which ignores theme tokens).
//   - Stay theme-agnostic: colours come from the @crewlethq/tokens
//     variables, including the brand accent tokens an app can rebind
//     (see the header of Select.css), so the same component follows
//     any palette without prop juggling.
//
// Public API:
//
//   <Select
//     id?                 string for an external <label htmlFor>
//     value               currently selected value (string | number)
//     onChange            (value, option) => void
//     options             Array<{ value, label, description?, disabled? }>
//     placeholder?        text shown when value is empty/unmatched
//     disabled?           bool
//     className?          extra class applied to the wrapper
//     menuClassName?      extra class applied to the menu panel
//     size?               'sm' | 'md'   default 'md'
//     align?              'left' | 'right'  controls panel alignment
//     renderTrigger?      (selectedOption, { open }) => ReactNode
//                         (defaults to: label OR placeholder)
//     renderOption?       (option, { active, selected }) => ReactNode
//   />
//
// Both onChange's first argument and the value prop are the
// option's primitive `value` field, so this is a near drop-in
// for native <select> / <option>.

export type SelectValue = string | number;

export interface SelectOption {
  value: SelectValue;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export type SelectSize = 'sm' | 'md';
export type SelectAlign = 'left' | 'right';

export interface SelectProps {
  id?: string;
  /**
   * Currently selected value(s). In single-select mode this is the
   * option's primitive value; in multi-select mode (multiple={true})
   * it is an array of selected values.
   */
  value: SelectValue | SelectValue[] | undefined;
  /**
   * Fired when the user picks (single-select) or toggles (multi-
   * select) an option. The first argument carries the new resolved
   * value: a scalar in single-select, an array in multi-select. The
   * second argument is the option the user clicked, useful when the
   * caller wants to log which one toggled.
   */
  onChange?: (value: SelectValue | SelectValue[], option: SelectOption) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  size?: SelectSize;
  align?: SelectAlign;
  renderTrigger?: (option: SelectOption | null, ctx: { open: boolean }) => ReactNode;
  renderOption?: (option: SelectOption, ctx: { active: boolean; selected: boolean }) => ReactNode;
  ariaLabel?: string;
  name?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * When true, the Select renders as a multi-select. The menu does
   * not close on pick; the trigger shows the selected count (or the
   * single label when only one is picked); the option list paints
   * checked boxes on selected rows. value MUST be an array in this
   * mode and onChange always receives an array.
   */
  multiple?: boolean;
  /**
   * Trigger-label override for multi-select. Receives the array of
   * selected options. Defaults to the count rule below:
   *   - 0 selected: placeholder
   *   - 1 selected: the option's label
   *   - N selected: "N selected"
   */
  renderMultiLabel?: (selected: SelectOption[]) => ReactNode;
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  menuClassName = '',
  size = 'md',
  align = 'left',
  renderTrigger,
  renderOption,
  ariaLabel,
  name,
  searchable = false,
  searchPlaceholder = 'Search…',
  multiple = false,
  renderMultiLabel,
}: SelectProps) {
  /*
   * Normalise the controlled value to an array of strings (the
   * internal source of truth for both modes). Comparisons happen
   * after String() coercion so a number value never silently
   * misses an option declared with the matching numeric value.
   */
  const selectedValues: SelectValue[] = useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : [];
    }
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
  }, [value, multiple]);
  const isValueSelected = useCallback(
    (v: SelectValue) => selectedValues.some((sv) => String(sv) === String(v)),
    [selectedValues],
  );
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number; side: 'top' | 'bottom' }>(
    { top: 0, left: 0, width: 0, side: 'bottom' },
  );
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Recompute the portaled menu's coordinates from the trigger
  // rect. Runs on open and whenever the page shifts under it (a
  // parent popover, for instance, can scroll the body).
  const reposition = useCallback(() => {
    const trig = triggerRef.current;
    if (!trig) return;
    const rect = trig.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 240;
    const viewportH = window.innerHeight;

    // Flip above the trigger when there is no room below.
    let chosenSide: 'top' | 'bottom' = 'bottom';
    if (rect.bottom + panelHeight + 12 > viewportH && rect.top > panelHeight + 12) {
      chosenSide = 'top';
    }

    setMenuRect({
      top: chosenSide === 'bottom'
        ? rect.bottom + window.scrollY + 6
        : rect.top + window.scrollY - panelHeight - 6,
      left: rect.left + window.scrollX,
      width: rect.width,
      side: chosenSide,
    });
  }, []);

  /*
   * In single-select mode the selectedIndex points the keyboard-nav
   * highlight at the currently picked option when the menu opens.
   * Multi-select has no single "selected index"; the highlight
   * falls back to the first non-disabled option.
   */
  const selectedIndex = useMemo(() => {
    if (multiple) return -1;
    if (selectedValues.length === 0) return -1;
    return options.findIndex((o) => String(o.value) === String(selectedValues[0]));
  }, [options, selectedValues, multiple]);
  const selectedOption: SelectOption | null = selectedIndex >= 0 ? options[selectedIndex] ?? null : null;
  const selectedOptions: SelectOption[] = useMemo(
    () => options.filter((o) => isValueSelected(o.value)),
    [options, isValueSelected],
  );

  // Filtered view of the options list. When `searchable` is off
  // or the search field is empty, this is a stable reference to
  // `options` (no copy / no work). Otherwise we run a case-
  // insensitive `includes` over label + description.
  const visibleOptions = useMemo(() => {
    if (!searchable) return options;
    const needle = search.trim().toLowerCase();
    if (needle === '') return options;
    return options.filter((opt) => {
      const label = String(opt.label ?? '').toLowerCase();
      if (label.includes(needle)) return true;
      const desc = String(opt.description ?? '').toLowerCase();
      return desc.length > 0 && desc.includes(needle);
    });
  }, [options, searchable, search]);

  // Keyboard nav operates against the filtered list when search is
  // on; the selectedIndex into `options` is translated to the
  // filtered slice so the highlight starts on the right row.
  useEffect(() => {
    if (!open) return;
    if (searchable && search.trim() !== '') {
      // Keep the highlight at the top while the operator is typing
      // so Enter on the first match is intuitive.
      setHighlight(0);
      return;
    }
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex, searchable, search]);

  // Reset search and focus the typeahead when the menu opens, so
  // the operator can start typing immediately. Closing clears it
  // so the next open doesn't show stale results.
  useEffect(() => {
    if (!searchable) return;
    if (open) {
      setSearch('');
      // Focus on the next tick so the input exists in the DOM.
      requestAnimationFrame(() => {
        searchRef.current?.focus();
      });
    }
  }, [open, searchable]);

  // Close on outside mousedown. mousedown (not click) so a click on
  // the trigger to close does not race with a click that would
  // re-open the panel. Outside = neither inside the trigger
  // wrapper NOR inside the portaled menu.
  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && wrapRef.current?.contains(target)) return;
      if (target && panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  // Reposition while the menu is open so it follows the trigger
  // when ancestors scroll (a Select inside an already scrolled
  // popover) or the viewport resizes.
  useLayoutEffect(() => {
    if (!open) return undefined;
    reposition();
    const onLayout = () => reposition();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, reposition]);

  const choose = useCallback(
    (option: SelectOption) => {
      if (option?.disabled) return;
      if (multiple) {
        /*
         * Toggle the option in / out of the selected set and keep
         * the menu open so the operator can chain picks. Selection
         * order is preserved: a freshly-picked value lands at the
         * end of the array, a removed value drops out in place.
         */
        const next = isValueSelected(option.value)
          ? selectedValues.filter((v) => String(v) !== String(option.value))
          : [...selectedValues, option.value];
        onChange?.(next, option);
        return;
      }
      onChange?.(option.value, option);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange, multiple, isValueSelected, selectedValues],
  );

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  // Keyboard nav operates against the visible (filtered) list so
  // ArrowDown / Enter follow what the operator sees, not the
  // pre-search universe of options.
  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const list = visibleOptions;

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (list.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => {
        const next = h < 0 ? 0 : (h + 1) % list.length;
        // Skip disabled options. If every option is disabled the
        // loop terminates after one full cycle.
        let probe = next;
        for (let i = 0; i < list.length; i += 1) {
          if (!list[probe]?.disabled) return probe;
          probe = (probe + 1) % list.length;
        }
        return h;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => {
        const len = list.length;
        const next = h < 0 ? len - 1 : (h - 1 + len) % len;
        let probe = next;
        for (let i = 0; i < len; i += 1) {
          if (!list[probe]?.disabled) return probe;
          probe = (probe - 1 + len) % len;
        }
        return h;
      });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = list[highlight];
      if (target && !target.disabled) choose(target);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setHighlight(list.length - 1);
    }
  };

  /*
   * Default trigger content. Single-select shows the picked option's
   * label (or the placeholder). Multi-select collapses to a count
   * once more than one is picked so the trigger keeps a stable width.
   */
  let defaultMultiLabel: ReactNode = placeholder;
  if (multiple && selectedOptions.length === 1) {
    defaultMultiLabel = selectedOptions[0]!.label;
  } else if (multiple && selectedOptions.length > 1) {
    defaultMultiLabel = `${selectedOptions.length} selected`;
  }
  const hasMultiSelection = multiple && selectedOptions.length > 0;

  const triggerContent = renderTrigger
    ? renderTrigger(selectedOption, { open })
    : multiple
      ? (
        <span className={`crewlet-select__label${hasMultiSelection ? '' : ' is-placeholder'}`}>
          {renderMultiLabel ? renderMultiLabel(selectedOptions) : defaultMultiLabel}
        </span>
      )
      : (
        <span className={`crewlet-select__label${selectedOption ? '' : ' is-placeholder'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      );

  const wrapClass = [
    'crewlet-select',
    `crewlet-select--${size}`,
    open ? 'is-open' : '',
    disabled ? 'is-disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  const menuClass = [
    'crewlet-select__menu',
    `crewlet-select__menu--${align}`,
    // Propagate the size onto the menu too. The wrapper class lives
    // outside the portaled menu, so without this the sm trigger
    // would still open a default-padded menu.
    `crewlet-select__menu--${size}`,
    menuClassName,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapClass} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        className="crewlet-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        {triggerContent}
        <span className="material-symbols-outlined crewlet-select__chevron" aria-hidden>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && createPortal(
        <div
          ref={(el) => {
            panelRef.current = el;
            // Only auto-focus the panel itself when there is no
            // search input; otherwise the search box gets focus
            // (handled in the open effect) so the operator can type
            // immediately.
            if (!searchable) el?.focus();
          }}
          className={`${menuClass} crewlet-select__menu--${menuRect.side}`}
          // Portaled to <body> so the menu is never clipped by an
          // ancestor with overflow:hidden / auto. Position is
          // computed from the trigger's bounding rect; width
          // matches the trigger by default so the menu lines up
          // edge-to-edge with the control.
          style={{
            position: 'absolute',
            top: menuRect.top,
            left: menuRect.left,
            width: menuRect.width,
          }}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
          onMouseLeave={() => setHighlight(-1)}
          /*
           * Stop mousedown from bubbling to document. The menu is
           * portaled to <body>, so a click on an option would
           * otherwise reach the document-level outside-click
           * handler of any parent Popover and close it, exactly
           * what happens when a Select sits inside another popover
           * (e.g. the time-zone Select inside the TimeWindowPicker).
           * Our own outside-click handler still fires for clicks
           * outside the menu, so the Select still closes correctly
           * when the operator clicks away.
           */
          onMouseDown={(e) => e.stopPropagation()}
        >
          {searchable && (
            <div className="crewlet-select__search">
              <span className="material-symbols-outlined" aria-hidden>search</span>
              <input
                ref={searchRef}
                type="text"
                className="crewlet-select__search-input"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onPanelKeyDown}
                aria-label="Search options"
              />
            </div>
          )}
          <ul
            id={id ? `${id}-listbox` : undefined}
            className="crewlet-select__list"
            role="listbox"
          >
            {visibleOptions.length === 0 && (
              <li className="crewlet-select__empty" aria-hidden>
                No matches
              </li>
            )}
            {visibleOptions.map((opt, i) => {
              const isSelected = isValueSelected(opt.value);
              const isHighlight = i === highlight;
              const itemClass = [
                'crewlet-select__option',
                multiple ? 'crewlet-select__option--multi' : '',
                isSelected ? 'is-selected' : '',
                isHighlight ? 'is-highlight' : '',
                opt.disabled ? 'is-disabled' : '',
              ].filter(Boolean).join(' ');

              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  className={itemClass}
                  onMouseEnter={() => !opt.disabled && setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(opt);
                  }}
                >
                  {renderOption
                    ? renderOption(opt, { active: isHighlight, selected: isSelected })
                    : (
                      <>
                        <div className="crewlet-select__option-row">
                          {multiple && (
                            <span
                              className={`crewlet-select__option-checkbox${isSelected ? ' is-checked' : ''}`}
                              aria-hidden
                            >
                              {isSelected && (
                                <span className="material-symbols-outlined" aria-hidden>check</span>
                              )}
                            </span>
                          )}
                          <span className="crewlet-select__option-label">{opt.label}</span>
                          {!multiple && isSelected && (
                            <span className="material-symbols-outlined crewlet-select__option-check" aria-hidden>
                              check
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <div className="crewlet-select__option-desc">{opt.description}</div>
                        )}
                      </>
                    )}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
