/**
 * The row of filters a reader has put on a list, one chip each.
 *
 * NOT [FilterChip], AND THE DIFFERENCE IS THE CONTROL RATHER THAN THE LOOK. A
 * FilterChip is a switch: one fact about the list, on or off, or one answer of
 * a small set. A filter AXIS is a whole dimension the reader added on purpose,
 * so the chip carries three things a switch does not: which axis it is, what
 * it is currently set to, and a way to take it off the list again. Pressing it
 * opens that axis's own editor.
 *
 * THE CHIP FOR AN AXIS WITH NO VALUE YET IS THE POINT. A reader picks Role
 * from the Filter menu and the chip appears reading "Role: any", with its
 * editor already open. Rendered only once a value existed, picking a
 * multiple-choice filter from the menu did nothing visible at all, and "click
 * Filter, choose Role, nothing happens" was exactly the bug.
 *
 * THE EDITOR IS THE OPTION LIST ITSELF, with no picker nested inside the
 * popover: a control that opens a control that opens a list is two presses and
 * two overlays for one answer. The list is a real listbox with the package's
 * own keyboard (the arrows, Home and End, type-ahead, disabled rows stepped
 * over), so it is one tab stop however many answers it holds.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CheckGlyph, CloseGlyph, KeyboardArrowDownGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { DateTimePicker } from '../DateTimePicker/index.js';
import { IconButton } from '../IconButton/index.js';
import { Input } from '../Input/index.js';
import { Kbd } from '../Kbd/index.js';
import { useListbox, useOptionKeys } from '../Listbox/index.js';
import { Popover } from '../Popover/index.js';
import { cx } from '../utils/cx.js';
import {
  defaultOperator,
  operatorOf,
  type FilterDef,
  type FilterOperator,
  type FilterOptionValue,
  type FilterValue,
  type FilterValues,
} from './filters.js';

export interface FilterAxisLabels {
  /** The affordance at the end of the row that takes every filter off at once. */
  clearAll: string;
  /** The remove control on one chip. */
  remove: (label: string) => string;
  /** The editor popover's own name. */
  editor: (label: string) => string;
  /** The option list's name inside that popover. */
  options: (label: string) => string;
  /** What a chip reads when its axis is on but set to nothing. */
  any: string;
  /** What a multiple-choice chip reads past one answer. */
  selected: (howMany: number) => string;
  /** The multiple-choice editor's own two controls. */
  clear: string;
  done: string;
  /** The keycap in a text editor, saying what commits it. */
  enter: string;
  /**
   * The word a chip puts before its value when the axis does not compare the
   * way its kind normally does, so "Created: on or before 1 March" cannot be
   * read as "Created: since 1 March".
   */
  operator: Record<FilterOperator, string>;
}

export const FILTER_AXIS_LABELS: FilterAxisLabels = {
  clearAll: 'Clear filters',
  remove: (label) => `Remove the ${label} filter`,
  editor: (label) => `${label} filter`,
  options: (label) => `${label} options`,
  any: 'any',
  selected: (howMany) => `${howMany} selected`,
  clear: 'Clear',
  done: 'Done',
  enter: 'Enter',
  operator: {
    contains: 'contains',
    is: 'is',
    'is-any-of': 'is any of',
    equals: 'equals',
    'on-or-after': 'on or after',
    'on-or-before': 'on or before',
  },
};

const isMultiple = <TRow,>(def: FilterDef<TRow>): boolean => def.kind === 'select' && def.multiple === true;

const chosenValues = (value: FilterValue): FilterOptionValue[] => (Array.isArray(value) ? [...value] : []);

const sameValue = (a: FilterOptionValue, b: FilterOptionValue): boolean => String(a) === String(b);

/**
 * What a chip says it is set to.
 *
 * The operator word appears only when it is NOT the kind's usual one, because
 * a row of chips each reading "Email contains ..." spends its width restating
 * the obvious, and the one chip that compares differently then reads exactly
 * like the rest.
 */
export function formatFilterValue<TRow>(def: FilterDef<TRow>, value: FilterValue, labels: FilterAxisLabels): string {
  const operator = operatorOf(def);
  const unusual = def.operator !== undefined && def.operator !== defaultOperator(def);
  const prefix = unusual ? `${labels.operator[operator]} ` : '';

  if (isMultiple(def)) {
    const held = chosenValues(value);
    if (held.length === 0) return labels.any;
    if (held.length === 1) {
      const option = def.options?.find((candidate) => sameValue(candidate.value, held[0] as FilterOptionValue));
      return `${prefix}${option ? option.label : String(held[0])}`;
    }
    return labels.selected(held.length);
  }
  if (value === undefined || value === null || value === '') {
    // An empty single-choice axis still has an answer when the list offers one
    // for empty ("Any status"), and reads as that answer rather than as a gap.
    const option = def.options?.find((candidate) => String(candidate.value) === '');
    return option ? option.label : labels.any;
  }
  if (def.kind === 'select') {
    const option = def.options?.find((candidate) => sameValue(candidate.value, value as FilterOptionValue));
    return `${prefix}${option ? option.label : String(value)}`;
  }
  if (def.kind === 'datetime') {
    const at = new Date(String(value));
    if (!Number.isNaN(at.getTime())) return `${prefix}${at.toLocaleString()}`;
  }
  return `${prefix}${String(value)}`;
}

interface EditorProps<TRow> {
  def: FilterDef<TRow>;
  value: FilterValue;
  labels: FilterAxisLabels;
  /** Takes a value. `close` asks the chip's popover to shut. */
  onCommit: (value: FilterValue, options?: { close?: boolean }) => void;
}

/**
 * The option list an axis is edited through: one tab stop, the arrows, Home
 * and End, type-ahead, and a tick beside what is chosen.
 *
 * FOCUS IS ON THE LIST, not on the rows, which is what lets a reader arrow
 * through forty answers without forty tab stops. The row under the highlight
 * is named to a screen reader through `aria-activedescendant`, the same way
 * the package's Select announces its own.
 */
function OptionListEditor<TRow>({ def, value, labels, onCommit }: EditorProps<TRow>) {
  const id = useId();
  const multiple = isMultiple(def);
  const options = useMemo(() => def.options ?? [], [def.options]);
  // Memoised because the keyboard model closes over both: a fresh array every
  // render would rebuild the commit callback on every keystroke, and with it
  // the highlight's own effect.
  const held = useMemo(
    () => (multiple ? chosenValues(value) : value === undefined || value === null ? [] : [value as FilterOptionValue]),
    [multiple, value],
  );
  const list = useRef<HTMLDivElement | null>(null);

  const isHeld = useCallback((candidate: FilterOptionValue) => held.some((entry) => sameValue(entry, candidate)), [held]);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      if (!multiple) {
        onCommit(option.value, { close: true });
        return;
      }
      // Multiple stays open: a reader ticking three answers should not have to
      // reopen the list twice, and Done is what says they are finished.
      const next = isHeld(option.value)
        ? held.filter((entry) => !sameValue(entry, option.value))
        : [...held, option.value];
      onCommit(next);
    },
    [held, isHeld, multiple, onCommit, options],
  );

  const listbox = useListbox({
    id,
    open: true,
    count: options.length,
    onCommit: commit,
    // The popover around this owns Escape and the press outside, so the list
    // must not register as a second popup: both would dismiss on one Escape.
    popup: false,
    onClose: () => {},
  });

  const keys = useOptionKeys({
    listbox,
    count: options.length,
    disabled: (index) => options[index]?.disabled === true,
    textOf: (index) => options[index]?.label ?? '',
  });

  // Opens on what is chosen, or on the first answer that can be taken.
  useEffect(() => {
    listbox.setActive(keys.opening(options.findIndex((option) => isHeld(option.value))));
    // Once per opening. Following the chosen value would drag the highlight
    // back to it every time a multiple-choice tick changed the list's state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The highlighted row stays in view by scrolling THE LIST, never by
     scrollIntoView, which scrolls every ancestor and does not exist in jsdom. */
  useEffect(() => {
    const box = list.current;
    const row = box?.querySelector<HTMLElement>('[data-active="true"]');
    if (!box || !row) return;
    const bounds = box.getBoundingClientRect();
    const spot = row.getBoundingClientRect();
    if (spot.top < bounds.top) box.scrollTop -= bounds.top - spot.top;
    else if (spot.bottom > bounds.bottom) box.scrollTop += spot.bottom - bounds.bottom;
  }, [listbox.active]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (keys.onKeyDown(event)) return;
    listbox.onKeyDown(event);
  }

  return (
    <div className="crewlet-filter-axis__editor">
      <div
        ref={(el) => {
          list.current = el;
          listbox.listRef(el);
        }}
        id={listbox.listId}
        role="listbox"
        aria-label={labels.options(def.label)}
        aria-multiselectable={multiple || undefined}
        aria-activedescendant={options.length > 0 ? listbox.optionId(listbox.active) : undefined}
        tabIndex={0}
        className="crewlet-filter-axis__options"
        onKeyDown={onKeyDown}
      >
        {options.map((option, index) => {
          const selected = isHeld(option.value);
          const highlighted = index === listbox.active;
          return (
            <div
              key={String(option.value)}
              id={listbox.optionId(index)}
              role="option"
              aria-selected={selected}
              aria-disabled={option.disabled || undefined}
              data-active={highlighted || undefined}
              className={cx(
                'crewlet-filter-axis__option',
                selected && 'is-selected',
                highlighted && 'is-highlight',
                option.disabled && 'is-disabled',
              )}
              {...(option.disabled ? {} : listbox.optionHandlers(index))}
            >
              <span className={cx('crewlet-filter-axis__tick', selected && 'is-checked')} aria-hidden="true">
                {selected ? <CheckGlyph size="xs" /> : null}
              </span>
              <span className="crewlet-filter-axis__option-label">{option.label}</span>
            </div>
          );
        })}
      </div>
      {multiple && held.length > 0 ? (
        <div className="crewlet-filter-axis__editor-footer">
          <Button variant="tertiary" size="small" onClick={() => onCommit([])}>
            {labels.clear}
          </Button>
          <Button variant="primary" size="small" onClick={() => onCommit(held, { close: true })}>
            {labels.done}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A moment, edited with the package's own calendar rather than the platform's.
 *
 * THE CALENDAR IS THE EDITOR, the same way the option list is. Drawn as the
 * picker's own trigger it was a control inside a popover that opened a second
 * popover, so a reader pressed the chip, pressed again, and had two stacked
 * panels on screen for one date.
 */
function MomentEditor<TRow>({ def, value, labels, onCommit }: EditorProps<TRow>) {
  return (
    <div className="crewlet-filter-axis__editor crewlet-filter-axis__editor--moment">
      <DateTimePicker
        inline
        value={typeof value === 'string' ? value : ''}
        onChange={(next) => onCommit(next)}
        onDone={() => onCommit(value, { close: true })}
        showTime
        ariaLabel={labels.editor(def.label)}
        {...(def.placeholder === undefined ? {} : { placeholder: def.placeholder })}
      />
    </div>
  );
}

/** Words or a number, committed by Enter or by leaving the box. */
function TextEditor<TRow>({ def, value, labels, onCommit }: EditorProps<TRow>) {
  const box = useRef<HTMLInputElement | null>(null);
  /*
   * FOCUS FROM AN EFFECT, not the `autoFocus` attribute. The attribute is
   * honoured on a document's first render and ignored afterwards, so a chip
   * editor opened a second time came up with focus on the page body; and a
   * caret placed at the end means the next keystroke extends the value rather
   * than replacing it.
   */
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(node.value.length, node.value.length);
  }, []);

  return (
    <div className="crewlet-filter-axis__editor crewlet-filter-axis__editor--text">
      <Input
        ref={box}
        type={def.kind === 'number' ? 'number' : 'text'}
        inputSize="sm"
        aria-label={labels.editor(def.label)}
        trailing={<Kbd>{labels.enter}</Kbd>}
        placeholder={def.placeholder ?? ''}
        defaultValue={value === undefined || value === null ? '' : String(value)}
        onBlur={(event) => onCommit(event.target.value, { close: true })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onCommit((event.target as HTMLInputElement).value, { close: true });
          }
        }}
      />
    </div>
  );
}

export interface FilterAxisChipProps<TRow = unknown> {
  def: FilterDef<TRow>;
  value: FilterValue;
  onValueChange: (value: FilterValue) => void;
  /** Takes the axis off the list entirely. Left out, the chip has no remove control. */
  onRemove?: (() => void) | undefined;
  /**
   * Opens the editor as the chip appears, for the chip a reader just added
   * from the Filter menu: picking an axis and then having to press it again to
   * say what it filters by is two presses for one intention.
   */
  autoOpen?: boolean | undefined;
  onAutoOpenConsumed?: (() => void) | undefined;
  labels?: FilterAxisLabels | undefined;
  className?: string | undefined;
}

/** One axis, as a chip that opens its own editor. */
export function FilterAxisChip<TRow = unknown>({
  def,
  value,
  onValueChange,
  onRemove,
  autoOpen = false,
  onAutoOpenConsumed,
  labels = FILTER_AXIS_LABELS,
  className,
}: FilterAxisChipProps<TRow>) {
  const [consumed, setConsumed] = useState(false);
  useEffect(() => {
    if (autoOpen && !consumed) {
      setConsumed(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpen, consumed, onAutoOpenConsumed]);

  const editor = (close: () => void) => {
    const onCommit = (next: FilterValue, options?: { close?: boolean }) => {
      onValueChange(next);
      if (options?.close) close();
    };
    const props = { def, value, labels, onCommit };
    if (def.kind === 'select') return <OptionListEditor {...props} />;
    if (def.kind === 'datetime') return <MomentEditor {...props} />;
    return <TextEditor {...props} />;
  };

  return (
    <div className={cx('crewlet-filter-axis-chip', className)}>
      <Popover
        align="start"
        role="dialog"
        label={labels.editor(def.label)}
        defaultOpen={autoOpen}
        className="crewlet-filter-axis__popover"
        trigger={(open, toggle) => (
          <button type="button" className={cx('crewlet-filter-axis-chip__trigger', open && 'is-open')} onClick={toggle}>
            <span className="crewlet-filter-axis-chip__label">{def.label}:</span>
            <span className="crewlet-filter-axis-chip__value">{formatFilterValue(def, value, labels)}</span>
            <KeyboardArrowDownGlyph className="crewlet-filter-axis-chip__chevron" size="xs" />
          </button>
        )}
      >
        {editor}
      </Popover>
      {onRemove ? (
        <IconButton
          className="crewlet-filter-axis-chip__remove"
          size="sm"
          variant="ghost"
          label={labels.remove(def.label)}
          icon={<CloseGlyph size="xs" />}
          onClick={onRemove}
        />
      ) : null}
    </div>
  );
}

export interface FilterAxisBarProps<TRow = unknown> {
  /** Every axis the screen knows about, including the ones not on the list. */
  filters: readonly FilterDef<TRow>[];
  values: FilterValues;
  /** Which axes are on the list right now, in the order they are drawn. */
  names: readonly string[];
  onValuesChange: (next: FilterValues) => void;
  /**
   * Committed, for a screen that fetches rather than filters in the browser.
   * Called after every change, including a removal.
   */
  onSubmit?: (() => void) | undefined;
  onRemove?: ((def: FilterDef<TRow>) => void) | undefined;
  onClearAll?: (() => void) | undefined;
  /** The axis whose editor opens by itself, having just been added. */
  autoOpenName?: string | null | undefined;
  onAutoOpenConsumed?: (() => void) | undefined;
  labels?: Partial<FilterAxisLabels> | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * The chips under a toolbar. It draws nothing at all while no axis is on, so
 * an unfiltered screen carries no empty band where its data should be.
 */
export function FilterAxisBar<TRow = unknown>({
  filters,
  values,
  names,
  onValuesChange,
  onSubmit,
  onRemove,
  onClearAll,
  autoOpenName,
  onAutoOpenConsumed,
  labels: overrides,
  className,
  children,
}: FilterAxisBarProps<TRow>) {
  const labels: FilterAxisLabels = overrides
    ? { ...FILTER_AXIS_LABELS, ...overrides, operator: { ...FILTER_AXIS_LABELS.operator, ...overrides.operator } }
    : FILTER_AXIS_LABELS;

  if (names.length === 0) return null;

  const set = (def: FilterDef<TRow>, next: FilterValue) => {
    onValuesChange({ ...values, [def.name]: next });
    onSubmit?.();
  };

  return (
    <div className={cx('crewlet-filter-axis-bar', className)}>
      {names.map((name) => {
        const def = filters.find((candidate) => candidate.name === name);
        if (!def) return null;
        return (
          <FilterAxisChip
            key={name}
            def={def}
            value={values[name]}
            onValueChange={(next) => set(def, next)}
            {...(onRemove ? { onRemove: () => onRemove(def) } : {})}
            autoOpen={autoOpenName === name}
            {...(onAutoOpenConsumed ? { onAutoOpenConsumed } : {})}
            labels={labels}
          />
        );
      })}
      {children}
      {onClearAll ? (
        <Button
          className="crewlet-filter-axis-bar__clear"
          variant="tertiary"
          size="small"
          leadingIcon={<CloseGlyph size="xs" />}
          onClick={onClearAll}
        >
          {labels.clearAll}
        </Button>
      ) : null}
    </div>
  );
}
