/**
 * The display and editor halves of every column type.
 *
 * `CellDisplay` draws a value; `CellEditor` edits one and hands the result
 * back with the way the editing ended (Enter moves down, Tab across). The grid
 * draws both inside its cells and keeps the keyboard; `SheetCell` and the
 * named cells below draw them alone, as a field in a form.
 *
 * Every rule about a value (how it is written, what it parses to, why it is
 * refused) is the sheet model's, so the grid, a form and the artifact kit
 * agree on every one of them.
 */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { CheckGlyph, CircleAlertGlyph, StarGlyph } from '@crewlethq/icons/glyphs';
import { isCrewletCharacter } from '@crewlethq/icons/characters';
import { Avatar } from '../Avatar/index.js';
import { Button } from '../Button/index.js';
import { isComposing } from '../Layer/index.js';
import {
  checkValue,
  displayText,
  editText,
  findOption,
  findPerson,
  isEmptyValue,
  isMod,
  liveOptions,
  normalizeValue,
  optionHue,
  parseText,
  ratingMax,
  sameValue,
  sheetLabels,
  spokenText,
  statusTone,
  textMax,
  type SheetColumn,
  type SheetColumnType,
  type SheetLabels,
  type SheetOption,
  type SheetPerson,
  type SheetValue,
  type SheetValueContext,
} from '../SheetModel/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { Tag } from '../Tag/index.js';
import { TagGroup } from '../TagGroup/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/* ------------------------------------------------------------------------ */
/* Display                                                                  */
/* ------------------------------------------------------------------------ */

function OptionChip({ column, id, labels }: { column: SheetColumn; id: string; labels: SheetLabels }) {
  const option = findOption(column, id);
  if (!option) return <Tag size="xs">{id}</Tag>;
  if (option.archived) {
    return (
      <Tag size="xs" appearance="outline">
        {labels.archived(option.label)}
      </Tag>
    );
  }
  const hue = optionHue(option.color);
  return (
    <Tag size="xs" hue={hue === 'neutral' ? undefined : hue}>
      {option.label}
    </Tag>
  );
}

function PersonBadge({ person, fallback }: { person: SheetPerson | undefined; fallback: string }) {
  if (!person) return <span className="crewlet-sheet-cell__muted">{fallback}</span>;
  return (
    <span className="crewlet-sheet-cell__person">
      <Avatar
        name={person.name}
        kind={person.kind === 'human' ? 'human' : 'agent'}
        src={person.src}
        character={person.character !== undefined && isCrewletCharacter(person.character) ? person.character : undefined}
        hue={person.kind === 'agent' ? person.hue : undefined}
        size="xs"
        decorative
      />
      <span className="crewlet-sheet-cell__text">{person.name}</span>
    </span>
  );
}

export interface CellDisplayProps {
  column: SheetColumn;
  value: SheetValue;
  context: SheetValueContext;
  /** Opens a URL cell's link; the anchor's own navigation when absent. */
  onOpenLink?: ((url: string) => void) | undefined;
}

/**
 * A value as a reader sees it. What the eye reads and what a screen reader
 * reads are the same words: a checkbox and a rating, which draw no words,
 * carry them hidden.
 */
export function CellDisplay({ column, value, context, onOpenLink }: CellDisplayProps) {
  const { labels } = context;
  if (column.type === 'checkbox') {
    const on = value === true;
    return (
      <span className="crewlet-sheet-cell__checkbox">
        <span className={cx('crewlet-sheet-cell__check', on && 'crewlet-sheet-cell__check--on')} aria-hidden="true">
          {on ? <CheckGlyph size="xs" /> : null}
        </span>
        <VisuallyHidden>{on ? labels.checked : labels.unchecked}</VisuallyHidden>
      </span>
    );
  }
  if (isEmptyValue(value)) return <VisuallyHidden>{labels.empty}</VisuallyHidden>;
  switch (column.type) {
    case 'select':
      return <OptionChip column={column} id={String(value)} labels={labels} />;
    case 'multiselect':
      // ONE LINE: the chips that do not fit are counted ("+1") rather than
      // cut mid-glyph by the cell's edge.
      return (
        <TagGroup label={column.label} overflow="fit" className="crewlet-sheet-cell__chips">
          {(value as readonly string[]).map((id) => (
            <OptionChip key={id} column={column} id={id} labels={labels} />
          ))}
        </TagGroup>
      );
    case 'status': {
      const option = findOption(column, String(value));
      const words = displayText(column, value, context);
      return <StatusDot tone={option && !option.archived ? statusTone(option) : 'neutral'}>{words}</StatusDot>;
    }
    case 'person':
      return <PersonBadge person={findPerson(context.people, String(value))} fallback={labels.unknownPerson} />;
    case 'rating': {
      const max = ratingMax(column);
      const stars = Number(value);
      return (
        <span className="crewlet-sheet-cell__rating">
          <span className="crewlet-sheet-cell__stars" aria-hidden="true">
            {Array.from({ length: max }, (_, index) => (
              <StarGlyph key={index} size="sm" filled={index < stars} className={cx('crewlet-sheet-cell__star', index < stars && 'crewlet-sheet-cell__star--on')} />
            ))}
          </span>
          <VisuallyHidden>{labels.rating(stars, max)}</VisuallyHidden>
        </span>
      );
    }
    case 'url': {
      const url = String(value);
      return (
        <a
          className="crewlet-sheet-cell__link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          onClick={
            onOpenLink
              ? (event) => {
                  event.preventDefault();
                  onOpenLink(url);
                }
              : undefined
          }
        >
          {url}
        </a>
      );
    }
    case 'number':
      return <span className="crewlet-sheet-cell__text crewlet-sheet-cell__number">{displayText(column, value, context)}</span>;
    default:
      return <span className="crewlet-sheet-cell__text">{displayText(column, value, context)}</span>;
  }
}

/* ------------------------------------------------------------------------ */
/* Editors                                                                  */
/* ------------------------------------------------------------------------ */

/** How an edit ended: where the active cell goes next, or nowhere. */
export type CellMove = 'down' | 'up' | 'right' | 'left' | null;

/** A remote write that landed on the cell being edited. */
export interface CellConflict {
  writer: string;
  /** The remote value, written for a reader. */
  value: string;
  onKeepMine: () => void;
  onUseTheirs: () => void;
}

export interface CellEditorProps {
  column: SheetColumn;
  value: SheetValue;
  context: SheetValueContext;
  /** The character that started the edit, which replaces the value (a text) or filters the list (an option). */
  seed?: string | undefined;
  /** The editor's accessible name: the column, and the row when there is one. */
  label: string;
  /** Hands back a value the model accepted, and where to go next. */
  onCommit: (value: SheetValue, move: CellMove) => void;
  onCancel: () => void;
  /** Which way the list or the long text panel opens from the cell. */
  side?: 'below' | 'above' | undefined;
  conflict?: CellConflict | null | undefined;
}

/** The types typed into a single line. */
const LINE_TYPES = new Set<SheetColumnType>(['text', 'number', 'url', 'date', 'rating']);
/** The types edited in the overlay text editor, which shows the whole value as it wraps. */
const TEXT_TYPES = new Set<SheetColumnType>(['text', 'longtext']);
/** Most lines the overlay text editor grows to before it scrolls. */
const TEXT_EDITOR_LINES = 6;
/** Above this many choices, a list editor offers a filter box. */
const LIST_FILTER_FROM = 8;
/** The types chosen from a list. */
const LIST_TYPES = new Set<SheetColumnType>(['select', 'multiselect', 'status', 'person']);

/** Whether a type is edited through `CellEditor` at all: a checkbox is toggled instead. */
export const hasEditor = (type: SheetColumnType): boolean => type !== 'checkbox';

/** Whether a typed character starts an edit of this type: a line or a list takes it, a checkbox ignores it. */
export const takesTyping = (type: SheetColumnType): boolean => LINE_TYPES.has(type) || LIST_TYPES.has(type) || type === 'longtext';

/** The move a key that ends an edit asks for, or undefined for a key that does not end one. */
function endingMove(event: ReactKeyboardEvent, multiline: boolean): CellMove | undefined {
  if (event.key === 'Tab') return event.shiftKey ? 'left' : 'right';
  if (event.key === 'Enter') {
    // Long text takes Shift+Enter as a new line; Enter, or Mod+Enter, saves.
    if (multiline) return event.shiftKey && !isMod(event) ? undefined : 'down';
    return event.shiftKey ? 'up' : 'down';
  }
  return undefined;
}

/**
 * Focus an editor's field WITHOUT scrolling the page: the grid brings the cell
 * into view inside its own scroller, and a focus that scrolled every ancestor
 * moved the whole page column a few pixels on every edit.
 */
function focusInPlace(el: HTMLInputElement | HTMLTextAreaElement | HTMLElement | null, caretAtEnd: boolean) {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (caretAtEnd && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    el.setSelectionRange(el.value.length, el.value.length);
  }
}

/**
 * Calls `end` once, when focus leaves the editor for somewhere outside it: a
 * press on another cell or anywhere else saves what was typed, as every
 * spreadsheet does. Focus moving between the editor's own parts (the field
 * and a conflict's two choices) is not leaving. The guard makes a commit by
 * key and the blur that follows it one ending, not two.
 */
function useLeave(end: () => void) {
  const done = useRef(false);
  return {
    finish: () => {
      done.current = true;
    },
    onBlur: (event: ReactFocusEvent<HTMLElement>) => {
      if (done.current) return;
      const next = event.relatedTarget as Node | null;
      if (next !== null && event.currentTarget.contains(next)) return;
      done.current = true;
      end();
    },
  };
}

/** The local wall-clock text a `datetime-local` input takes for an RFC 3339 instant. */
function localDateTime(value: string): string {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

function ConflictNote({ conflict, labels }: { conflict: CellConflict; labels: SheetLabels }) {
  return (
    <div className="crewlet-sheet-editor__conflict" role="alert">
      <p className="crewlet-sheet-editor__conflict-text">{labels.conflict(conflict.writer, conflict.value)}</p>
      <div className="crewlet-sheet-editor__conflict-actions">
        <Button size="small" variant="secondary" onClick={conflict.onKeepMine}>
          {labels.keepMine}
        </Button>
        <Button size="small" variant="ghost" onClick={conflict.onUseTheirs}>
          {labels.useTheirs(conflict.writer)}
        </Button>
      </div>
    </div>
  );
}

function ErrorNote({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="crewlet-sheet-editor__error">
      <CircleAlertGlyph size="xs" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/**
 * The editor for one cell. It owns its draft and its own keys (Enter, Tab,
 * Escape, the arrows inside a list) and nothing else: where the active cell
 * goes after an edit is the grid's.
 */
export function CellEditor(props: CellEditorProps) {
  const { column } = props;
  if (LIST_TYPES.has(column.type)) return <ListEditor {...props} />;
  if (TEXT_TYPES.has(column.type)) return <TextEditor {...props} />;
  return <LineEditor {...props} />;
}

function LineEditor({ column, value, context, seed, label, onCommit, onCancel, conflict }: CellEditorProps) {
  const { labels } = context;
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const isDate = column.type === 'date';
  const initial = useMemo(() => {
    if (isDate) {
      const text = typeof value === 'string' ? value : '';
      return column.time ? localDateTime(text) : text;
    }
    return seed ?? editText(column, value, context);
    // The draft is seeded once, when the editor opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    focusInPlace(input.current, !isDate);
  }, [isDate]);

  const commit = (move: CellMove): boolean => {
    const text = isDate && column.time && draft !== '' ? new Date(draft).toISOString() : draft;
    const parsed = parseText(column, text, context);
    if (!parsed.ok) {
      setError(parsed.error);
      return false;
    }
    leave.finish();
    onCommit(parsed.value, move);
    return true;
  };
  const leave = useLeave(() => {
    if (!commit(null)) onCancel();
  });

  return (
    <div className="crewlet-sheet-editor crewlet-sheet-editor--line" onBlur={leave.onBlur}>
      <input
        ref={input}
        className="crewlet-sheet-editor__input"
        type={isDate ? (column.time ? 'datetime-local' : 'date') : column.type === 'url' ? 'url' : 'text'}
        inputMode={column.type === 'number' ? 'decimal' : column.type === 'rating' ? 'numeric' : undefined}
        aria-label={label}
        aria-invalid={error !== null}
        aria-describedby={error !== null ? errorId : undefined}
        maxLength={column.type === 'text' ? textMax(column) : undefined}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (isComposing(event)) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            leave.finish();
            onCancel();
            return;
          }
          // With a conflict showing, Tab walks to its two choices instead of committing.
          if (event.key === 'Tab' && conflict) return;
          const move = endingMove(event, false);
          if (move === undefined) return;
          event.preventDefault();
          event.stopPropagation();
          commit(move);
        }}
      />
      {error !== null || conflict ? (
        <div className={cx('crewlet-sheet-editor__panel')}>
          {error !== null ? <ErrorNote id={errorId} message={error} /> : null}
          {conflict ? <ConflictNote conflict={conflict} labels={labels} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The text and long text editor: a field laid OVER the cell, at least the
 * column's width, that wraps and grows to six lines, so the whole value is in
 * view while it is edited rather than scrolled to its end in a one-line box.
 * Text saves on Enter; long text takes Shift+Enter as a new line.
 */
function TextEditor({ column, value, context, seed, label, onCommit, onCancel, side = 'below', conflict }: CellEditorProps) {
  const { labels } = context;
  const long = column.type === 'longtext';
  const errorId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(() => seed ?? editText(column, value, context));
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    focusInPlace(area.current, true);
  }, []);

  // GROWS WITH WHAT IT HOLDS, up to six lines, after which it scrolls.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el || el.scrollHeight === 0) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const commit = (move: CellMove): boolean => {
    const parsed = parseText(column, draft, context);
    if (!parsed.ok) {
      setError(parsed.error);
      return false;
    }
    leave.finish();
    onCommit(parsed.value, move);
    return true;
  };
  const leave = useLeave(() => {
    if (!commit(null)) onCancel();
  });

  return (
    <div
      className={cx('crewlet-sheet-editor', 'crewlet-sheet-editor--text', long && 'crewlet-sheet-editor--long', `crewlet-sheet-editor--${side}`)}
      onBlur={leave.onBlur}
    >
      <div className="crewlet-sheet-editor__overlay">
        <textarea
          ref={area}
          className="crewlet-sheet-editor__textarea"
          aria-label={label}
          aria-multiline={long}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? errorId : undefined}
          maxLength={textMax(column)}
          rows={1}
          style={{ '--crewlet-sheet-editor-lines': TEXT_EDITOR_LINES } as CSSProperties}
          value={draft}
          onChange={(event) => {
            // A text value is one line: a pasted line break is a space.
            setDraft(long ? event.target.value : event.target.value.replace(/\r?\n/g, ' '));
            setError(null);
          }}
          onKeyDown={(event) => {
            if (isComposing(event)) return;
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              leave.finish();
              onCancel();
              return;
            }
            if (event.key === 'Tab' && conflict) return;
            const move = endingMove(event, long);
            if (move === undefined) return;
            event.preventDefault();
            event.stopPropagation();
            commit(move);
          }}
        />
        {error !== null ? <ErrorNote id={errorId} message={error} /> : null}
        {conflict ? <ConflictNote conflict={conflict} labels={labels} /> : null}
      </div>
    </div>
  );
}

interface ListChoice {
  id: string;
  label: string;
  option?: SheetOption | undefined;
  person?: SheetPerson | undefined;
}

function choicesOf(column: SheetColumn, context: SheetValueContext): ListChoice[] {
  if (column.type === 'person') return (context.people ?? []).map((person) => ({ id: person.id, label: person.name, person }));
  return liveOptions(column).map((option) => ({ id: option.id, label: option.label, option }));
}

function ChoiceFace({ column, choice, context }: { column: SheetColumn; choice: ListChoice; context: SheetValueContext }) {
  if (choice.person) return <PersonBadge person={choice.person} fallback={choice.label} />;
  if (column.type === 'status' && choice.option) return <StatusDot tone={statusTone(choice.option)}>{choice.label}</StatusDot>;
  return <OptionChip column={column} id={choice.id} labels={context.labels} />;
}

/** The Clear entry's id in a list: no option or person has an empty id. */
const CLEAR = '';

function ListEditor({ column, value, context, seed, label, onCommit, onCancel, side = 'below', conflict }: CellEditorProps) {
  const { labels } = context;
  const multiple = column.type === 'multiselect';
  const listId = useId();
  const errorId = useId();
  const filterRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const all = useMemo(() => choicesOf(column, context), [column, context]);
  // A FILTER ONLY WHERE THERE IS SOMETHING TO FILTER: four statuses are read
  // at a glance, and a box above them put typing between the reader and a pick.
  const filterable = all.length > LIST_FILTER_FROM;
  const [filter, setFilter] = useState(filterable ? (seed ?? '') : '');
  const [chosen, setChosen] = useState<string[]>(() =>
    multiple ? [...((value as readonly string[] | null) ?? [])] : typeof value === 'string' ? [value] : [],
  );
  const [error, setError] = useState<string | null>(null);
  const clearable = !multiple && !column.required;
  // Clear is LAST, after the choices, so the first thing under the reader's
  // hand is an option rather than the one entry that empties the cell.
  const shown = useMemo<ListChoice[]>(() => {
    const wanted = filter.trim().toLowerCase();
    const matching = wanted === '' ? all : all.filter((choice) => choice.label.toLowerCase().includes(wanted));
    return clearable && wanted === '' ? [...matching, { id: CLEAR, label: labels.clear }] : matching;
  }, [all, filter, clearable, labels.clear]);
  const [highlight, setHighlight] = useState(() => {
    // Typed onto a short list: the first choice the character starts, which
    // is what the reader asked for, ahead of what the cell already holds.
    const typed = !filterable && seed ? shown.findIndex((choice) => choice.id !== CLEAR && choice.label.toLowerCase().startsWith(seed.toLowerCase())) : -1;
    if (typed >= 0) return typed;
    const at = shown.findIndex((choice) => choice.id !== CLEAR && chosen.includes(choice.id));
    return at >= 0 ? at : 0;
  });

  useEffect(() => {
    setHighlight((at) => Math.min(at, Math.max(shown.length - 1, 0)));
  }, [shown.length]);

  useLayoutEffect(() => {
    focusInPlace(filterable ? filterRef.current : listRef.current, false);
  }, [filterable]);

  const finish = (next: SheetValue, move: CellMove): boolean => {
    const problem = checkValue(column, next, context);
    if (problem !== null) {
      setError(problem);
      return false;
    }
    leave.finish();
    onCommit(next, move);
    return true;
  };
  // Leaving a multi-select keeps the options ticked so far; leaving a single
  // select without choosing changes nothing.
  const leave = useLeave(() => {
    if (!multiple || !finish(chosen, null)) onCancel();
  });

  const pick = (choice: ListChoice | undefined, move: CellMove) => {
    if (!choice) return;
    if (!multiple) {
      finish(choice.id === CLEAR ? null : choice.id, move);
      return;
    }
    setError(null);
    setChosen((current) => (current.includes(choice.id) ? current.filter((id) => id !== choice.id) : [...current, choice.id]));
  };

  const optionId = (index: number) => `${listId}-${index}`;
  const active = shown.length > 0 ? optionId(highlight) : undefined;

  // THE LIST'S KEYS, on whichever holds focus: the filter box on a long list,
  // the list itself on a short one.
  const onListKeys = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (isComposing(event)) return;
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        leave.finish();
        onCancel();
        return;
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        setHighlight((at) => Math.min(at + 1, shown.length - 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        setHighlight((at) => Math.max(at - 1, 0));
        return;
      case 'Home':
      case 'End':
        if (filter !== '') return;
        event.preventDefault();
        event.stopPropagation();
        setHighlight(event.key === 'Home' ? 0 : shown.length - 1);
        return;
      case 'Enter':
        event.preventDefault();
        event.stopPropagation();
        if (multiple && isMod(event)) finish(chosen, 'down');
        else pick(shown[highlight], event.shiftKey ? 'up' : 'down');
        return;
      case ' ':
        if (filterable) return;
        event.preventDefault();
        event.stopPropagation();
        pick(shown[highlight], multiple ? null : 'down');
        return;
      case 'Tab':
        if (conflict) return;
        event.preventDefault();
        event.stopPropagation();
        if (multiple) finish(chosen, event.shiftKey ? 'left' : 'right');
        else finish(value, event.shiftKey ? 'left' : 'right');
        return;
      default:
        // Typeahead on a short list: a letter moves to the next choice it starts.
        if (!filterable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const key = event.key.toLowerCase();
          const from = highlight + 1;
          const order = [...shown.slice(from), ...shown.slice(0, from)];
          const hit = order.find((choice) => choice.id !== CLEAR && choice.label.toLowerCase().startsWith(key));
          if (hit) {
            event.preventDefault();
            event.stopPropagation();
            setHighlight(shown.indexOf(hit));
          }
        }
        return;
    }
  };

  return (
    <div className={cx('crewlet-sheet-editor', 'crewlet-sheet-editor--list', `crewlet-sheet-editor--${side}`)} onBlur={leave.onBlur}>
      <div className="crewlet-sheet-editor__panel crewlet-sheet-editor__panel--list">
        {filterable ? (
          <input
            ref={filterRef}
            className="crewlet-sheet-editor__filter"
            role="combobox"
            aria-label={label}
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? errorId : undefined}
            placeholder={labels.filter}
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setHighlight(0);
            }}
            onKeyDown={onListKeys}
          />
        ) : null}
        <ul
          ref={listRef}
          className="crewlet-sheet-editor__list"
          id={listId}
          role="listbox"
          aria-label={label}
          aria-multiselectable={multiple || undefined}
          // A short list holds focus itself, and says which option the keys are on.
          tabIndex={-1}
          aria-activedescendant={filterable ? undefined : active}
          aria-invalid={filterable ? undefined : error !== null}
          aria-describedby={!filterable && error !== null ? errorId : undefined}
          onKeyDown={filterable ? undefined : onListKeys}
        >
          {shown.length === 0 ? (
            <li className="crewlet-sheet-editor__empty" role="presentation">
              {labels.noOptions}
            </li>
          ) : (
            shown.map((choice, index) => {
              const selected = choice.id === CLEAR ? chosen.length === 0 : chosen.includes(choice.id);
              return (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- focus stays on the combobox or the list, whose keys move and pick through aria-activedescendant
                <li
                  key={choice.id === CLEAR ? '\u0000clear' : choice.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  className={cx(
                    'crewlet-sheet-editor__option',
                    choice.id === CLEAR && 'crewlet-sheet-editor__option--clear',
                    index === highlight && 'crewlet-sheet-editor__option--highlight',
                    selected && 'crewlet-sheet-editor__option--selected',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(choice, multiple ? null : 'down')}
                >
                  <span className="crewlet-sheet-editor__mark" aria-hidden="true">
                    {selected && choice.id !== CLEAR ? <CheckGlyph size="xs" /> : null}
                  </span>
                  {choice.id === CLEAR ? (
                    <span className="crewlet-sheet-cell__muted">{choice.label}</span>
                  ) : (
                    <ChoiceFace column={column} choice={choice} context={context} />
                  )}
                </li>
              );
            })
          )}
        </ul>
        {error !== null ? <ErrorNote id={errorId} message={error} /> : null}
        {conflict ? <ConflictNote conflict={conflict} labels={labels} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* A cell on its own                                                        */
/* ------------------------------------------------------------------------ */

export interface SheetCellProps {
  /** The column's name, and the cell's accessible name. */
  label: string;
  type: SheetColumnType;
  /** The value as the datastore holds it; normalised to the type. */
  value: unknown;
  /** Makes the cell editable. Called with each accepted value. */
  onChange?: ((value: SheetValue) => void) | undefined;
  readOnly?: boolean | undefined;
  /** Select, multi-select and status choices. */
  options?: readonly SheetOption[] | undefined;
  /** The people a person cell may name, and how a stored value is drawn. */
  people?: readonly SheetPerson[] | undefined;
  /** Every other column setting: precision, bounds, number style, time, length. */
  column?: Partial<Omit<SheetColumn, 'type' | 'label' | 'field' | 'options'>> | undefined;
  /** Drawn as Saving until the host confirms (D23). */
  pending?: boolean | undefined;
  /** Why the host refused the last edit, said on the cell. */
  refused?: string | undefined;
  locale?: string | undefined;
  className?: string | undefined;
  labels?: Partial<SheetLabels> | undefined;
}

/**
 * One cell outside a grid: a field in a form, a row opened as a card on a
 * phone. It draws the same display and the same editor a grid cell does.
 *
 * A checkbox is a real checkbox control, toggled by a press or Space. Every
 * other type is a button that names its column and says its value, and opens
 * the editor in place; Enter or Tab in the editor saves, Escape puts it back.
 */
export function SheetCell({
  label,
  type,
  value: raw,
  onChange,
  readOnly = false,
  options,
  people,
  column: settings,
  pending = false,
  refused,
  locale,
  className,
  labels: overrides,
}: SheetCellProps) {
  const labels = useMemo(() => sheetLabels(overrides), [overrides]);
  const column = useMemo<SheetColumn>(() => ({ ...settings, field: label, label, type, options }), [settings, label, type, options]);
  const context = useMemo<SheetValueContext>(() => ({ people, locale, labels }), [people, locale, labels]);
  const value = normalizeValue(column, raw);
  const editable = onChange !== undefined && !readOnly && !column.readOnly;
  const [editing, setEditing] = useState(false);
  const statusId = useId();
  const face = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      face.current?.focus();
    }
  }, [editing]);

  const status: ReactNode =
    refused !== undefined ? (
      <span className="crewlet-sheet-cell__refusal">
        <CircleAlertGlyph size="xs" aria-hidden="true" />
        <span>{refused}</span>
      </span>
    ) : pending ? (
      <VisuallyHidden>{labels.saving}</VisuallyHidden>
    ) : null;

  const classes = cx('crewlet-sheet-cell', pending && 'crewlet-sheet-cell--pending', refused !== undefined && 'crewlet-sheet-cell--refused', className);

  if (type === 'checkbox') {
    return (
      <span className={classes}>
        <button
          type="button"
          role="checkbox"
          aria-checked={value === true}
          aria-label={label}
          aria-readonly={!editable || undefined}
          aria-describedby={status !== null ? statusId : undefined}
          className="crewlet-sheet-cell__face"
          onClick={() => {
            if (editable) onChange?.(value !== true);
          }}
        >
          <CellDisplay column={column} value={value} context={context} />
        </button>
        {status !== null ? <span id={statusId}>{status}</span> : null}
      </span>
    );
  }

  if (editing) {
    return (
      <span className={cx(classes, 'crewlet-sheet-cell--editing')}>
        <CellEditor
          column={column}
          value={value}
          context={context}
          label={label}
          onCommit={(next, _move) => {
            returnFocus.current = true;
            setEditing(false);
            if (!sameValue(next, value)) onChange?.(next);
          }}
          onCancel={() => {
            returnFocus.current = true;
            setEditing(false);
          }}
        />
      </span>
    );
  }

  return (
    <span className={classes}>
      <button
        ref={face}
        type="button"
        className="crewlet-sheet-cell__face"
        aria-label={`${label}: ${spokenText(column, value, context)}`}
        aria-describedby={status !== null ? statusId : undefined}
        aria-disabled={!editable || undefined}
        onClick={() => {
          if (editable) setEditing(true);
        }}
      >
        <CellDisplay column={column} value={value} context={context} />
      </button>
      {status !== null ? <span id={statusId}>{status}</span> : null}
    </span>
  );
}

type NamedCellProps = Omit<SheetCellProps, 'type'>;

/** A checkbox cell on its own. */
export const CheckboxCell = (props: NamedCellProps) => <SheetCell {...props} type="checkbox" />;
/** A single-line text cell on its own. */
export const TextCell = (props: NamedCellProps) => <SheetCell {...props} type="text" />;
/** A long text cell on its own: its editor is a panel with a text area. */
export const LongTextCell = (props: NamedCellProps) => <SheetCell {...props} type="longtext" />;
/** A number cell on its own. */
export const NumberCell = (props: NamedCellProps) => <SheetCell {...props} type="number" />;
/** A select cell on its own: one option, drawn as a chip. */
export const SelectCell = (props: NamedCellProps) => <SheetCell {...props} type="select" />;
/** A multi-select cell on its own: options drawn as chips. */
export const MultiSelectCell = (props: NamedCellProps) => <SheetCell {...props} type="multiselect" />;
/** A person cell on its own: a person or an agent, drawn with their badge. */
export const PersonCell = (props: NamedCellProps) => <SheetCell {...props} type="person" />;
/** A status cell on its own: an option drawn as a state word with its dot. */
export const StatusCell = (props: NamedCellProps) => <SheetCell {...props} type="status" />;
/** A date cell on its own. */
export const DateCell = (props: NamedCellProps) => <SheetCell {...props} type="date" />;
/** A URL cell on its own. */
export const UrlCell = (props: NamedCellProps) => <SheetCell {...props} type="url" />;
/** A rating cell on its own: stars from one to the column's maximum. */
export const RatingCell = (props: NamedCellProps) => <SheetCell {...props} type="rating" />;
