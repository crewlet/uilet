import { useEffect, useId, useRef, type ReactNode } from 'react';
import { PlusGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';
import { announce } from '../Announcer/index.js';
import { Button } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import { FormField, Input, Label } from '../Input/index.js';
import { cx } from '../utils/cx.js';

/** One key and its value: a header and what it carries, a variable and what it is set to. */
export interface KeyValueRow {
  /**
   * Stable across edits, and unique in the list: the row's identity while its
   * key is typed, emptied or repeated. Two rows may share a key; never an id.
   */
  id: string;
  key: string;
  value: string;
}

/** Every word the rows say, beyond the names of their two columns. */
export interface KeyValueRowsLabels {
  /** Names a row's key field: "Header 2". */
  key: (position: number) => string;
  /** Names a row's value field by its key: "Value for Authorization", or "Value for header 2" before one is typed. */
  value: (key: string, position: number) => string;
  /** Names a row's remove button: "Remove Authorization". */
  remove: (key: string, position: number) => string;
  /** The add action's words: "Add header". */
  add: string;
  /** Said once a row is removed, since the row's going is otherwise silent: "Removed Authorization". */
  removed: (key: string, position: number) => string;
}

/**
 * The rows' words in English, made from the two column names: `Header` and
 * `Value` give "Header 2", "Value for Authorization", "Remove Authorization"
 * and "Add header". A caller whose key column is an acronym (`URL`) or not in
 * English passes its own `labels`.
 */
export function keyValueRowsLabels(keyLabel: string, valueLabel = 'Value'): KeyValueRowsLabels {
  const item = keyLabel.toLocaleLowerCase();
  return {
    key: (position) => `${keyLabel} ${position}`,
    value: (key, position) => (key ? `${valueLabel} for ${key}` : `${valueLabel} for ${item} ${position}`),
    remove: (key, position) => (key ? `Remove ${key}` : `Remove ${item} ${position}`),
    add: `Add ${item}`,
    removed: (key, position) => (key ? `Removed ${key}` : `Removed ${item} ${position}`),
  };
}

interface KeyValueRowsBaseProps<T extends KeyValueRow> {
  /**
   * What the list is: "Headers", "Environment variables". The group's legend,
   * read on entering it.
   */
  label: string;
  /**
   * The legend is kept for assistive technology and drawn for nobody, where
   * the column head or a heading right above already names the list.
   */
  hideLabel?: boolean | undefined;
  /** The key column's head, and the name each key field is called by: "Header", "Variable". */
  keyLabel: string;
  /** The value column's head. "Value" by default. */
  valueLabel?: string | undefined;
  value: readonly T[];
  onChange: (next: T[]) => void;
  keyPlaceholder?: string | undefined;
  /** The value field's placeholder, the same for every row or per row (a stored secret says so). */
  valuePlaceholder?: string | ((row: T) => string | undefined) | undefined;
  /**
   * The values are secrets (a token, a password): each value field hides what
   * is typed, and no browser offers a saved password for it.
   */
  secret?: boolean | undefined;
  /**
   * A row whose key may not change, such as one already saved: its key field
   * is read only, and its value and its remove button still work.
   */
  keyReadOnly?: ((row: T) => boolean) | undefined;
  /** Why a row's key was refused, said under that key and linked to it. */
  keyError?: ((row: T, index: number) => ReactNode) | undefined;
  /** Why a row's value was refused, said under that value and linked to it. */
  valueError?: ((row: T, index: number) => ReactNode) | undefined;
  /**
   * What the list says while it holds no row, in place of the rows. Left out,
   * an empty list is its legend and its add action.
   */
  empty?: ReactNode;
  /** Where the keys come from, or what shape they take, under the add action. */
  helper?: ReactNode;
  /** Why the list as a whole was refused. */
  error?: ReactNode;
  disabled?: boolean | undefined;
  /** Words in place of the ones `keyValueRowsLabels` makes from `keyLabel` and `valueLabel`. */
  labels?: Partial<KeyValueRowsLabels> | undefined;
  className?: string | undefined;
}

/**
 * A blank row for the add action. Optional while a row is nothing but its id,
 * key and value, when the list makes `{ id, key: '', value: '' }` itself;
 * required once the caller's rows carry a field of their own that a blank row
 * must set.
 *
 * AN EMPTY LIST NAMES NO ROW TYPE. `value={[]}` infers `never`, which no row
 * is assignable to, so a test of assignability alone asked an empty list for
 * a `createRow` it has no use for. A list whose row type was never inferred
 * makes its own blank rows too.
 */
type RowMaker<T extends KeyValueRow> = [T] extends [never]
  ? { createRow?: (() => T) | undefined }
  : KeyValueRow extends T
    ? { createRow?: (() => T) | undefined }
    : { createRow: () => T };

export type KeyValueRowsProps<T extends KeyValueRow = KeyValueRow> = KeyValueRowsBaseProps<T> & RowMaker<T>;

type FocusTarget = { id: string } | 'add';

/**
 * Keys and their values, edited as rows under one column head: request
 * headers, environment variables, any list of names and what each is set to.
 *
 * ONE HEAD OVER THE COLUMNS, SO EVERY ROW IS THE SAME ROW. The key and value
 * columns are named once, above the first row, and each field's own name is
 * read rather than drawn ("Header 2", "Value for Authorization"). A label
 * drawn on the first row only stood that row taller than the rest, and the
 * value and the remove button beside it lost the line they shared.
 *
 * AN ERROR MOVES NOTHING BESIDE IT. Every row stands on its fields' top edge,
 * so a refused key grows its own cell downward and the value and the remove
 * button stay level with the key's field.
 *
 * THE REMOVE BUTTON IS THE FIELDS' HEIGHT, a square at the control step, so a
 * row is one line of three controls. Add is a flush quiet action under the
 * rows, its words on the fields' own edge.
 *
 * FOCUS NEVER FALLS TO THE PAGE. Add puts it in the new row's key; Remove
 * moves it to the row that took that row's place, else the one before, else
 * Add, and says what went.
 *
 * Controlled: the rows are the caller's, and every edit hands back a new
 * list with each untouched row as it was.
 */
export function KeyValueRows<T extends KeyValueRow = KeyValueRow>(props: KeyValueRowsProps<T>) {
  const {
    label,
    hideLabel = false,
    keyLabel,
    valueLabel = 'Value',
    value: rows,
    onChange,
    keyPlaceholder,
    valuePlaceholder,
    secret = false,
    keyReadOnly,
    keyError,
    valueError,
    empty,
    helper,
    error,
    disabled = false,
    labels: overrides,
    className,
    createRow,
  } = props;
  const words: KeyValueRowsLabels = { ...keyValueRowsLabels(keyLabel, valueLabel), ...overrides };
  const base = useId();
  const minted = useRef(0);
  const keyFields = useRef(new Map<string, HTMLInputElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<FocusTarget | null>(null);

  // Applied once the caller has taken the change: a list that refused it
  // leaves the focus where it was.
  useEffect(() => {
    const want = focusNext.current;
    if (want === null) return;
    focusNext.current = null;
    if (want === 'add') addButton.current?.focus();
    else keyFields.current.get(want.id)?.focus();
  });

  const blank = (): T =>
    createRow ? createRow() : ({ id: `${base}-${(minted.current += 1)}`, key: '', value: '' } as T);

  const edit = (id: string, change: Partial<KeyValueRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const add = () => {
    const row = blank();
    focusNext.current = { id: row.id };
    onChange([...rows, row]);
  };

  const remove = (index: number) => {
    const gone = rows[index]!;
    const next = rows.filter((_, i) => i !== index);
    const neighbour = next[index] ?? next[index - 1];
    focusNext.current = neighbour ? { id: neighbour.id } : 'add';
    onChange(next);
    announce(words.removed(gone.key.trim(), index + 1));
  };

  const placeholderFor = (row: T) => (typeof valuePlaceholder === 'function' ? valuePlaceholder(row) : valuePlaceholder);

  return (
    <FormField
      as="fieldset"
      label={label}
      hideLabel={hideLabel}
      helper={helper}
      error={error}
      className={cx('crewlet-key-value-rows', className)}
    >
      <div className="crewlet-key-value-rows__body">
        {rows.length > 0 ? (
          <div className="crewlet-key-value-rows__table">
            {/* The columns' names, drawn once. Each field reads its own, so the head is not read again. */}
            <div className="crewlet-key-value-rows__head" aria-hidden="true">
              <Label as="span">{keyLabel}</Label>
              <Label as="span">{valueLabel}</Label>
            </div>
            {rows.map((row, index) => {
              const position = index + 1;
              const key = row.key.trim();
              return (
                <div key={row.id} className="crewlet-key-value-rows__row">
                  <FormField label={words.key(position)} hideLabel error={keyError?.(row, index)}>
                    {(field) => (
                      <Input
                        ref={(element: HTMLInputElement | null) => {
                          if (element) keyFields.current.set(row.id, element);
                          else keyFields.current.delete(row.id);
                        }}
                        id={field.id}
                        aria-describedby={field.describedBy}
                        aria-invalid={field.invalid || undefined}
                        error={field.invalid}
                        appearance="reference"
                        value={row.key}
                        placeholder={keyPlaceholder}
                        readOnly={keyReadOnly?.(row) ?? false}
                        disabled={disabled}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => edit(row.id, { key: event.target.value })}
                      />
                    )}
                  </FormField>
                  <FormField label={words.value(key, position)} hideLabel error={valueError?.(row, index)}>
                    {(field) => (
                      <Input
                        id={field.id}
                        aria-describedby={field.describedBy}
                        aria-invalid={field.invalid || undefined}
                        error={field.invalid}
                        type={secret ? 'password' : 'text'}
                        // A saved password offered into a header's value is a
                        // credential sent to a third party; "new-password" is
                        // the one value every browser reads as "never fill".
                        autoComplete={secret ? 'new-password' : 'off'}
                        spellCheck={false}
                        value={row.value}
                        placeholder={placeholderFor(row)}
                        disabled={disabled}
                        onChange={(event) => edit(row.id, { value: event.target.value })}
                      />
                    )}
                  </FormField>
                  <IconButton
                    variant="ghost-danger"
                    label={words.remove(key, position)}
                    icon={<TrashGlyph size="sm" />}
                    disabled={disabled}
                    onClick={() => remove(index)}
                  />
                </div>
              );
            })}
          </div>
        ) : empty !== undefined && empty !== null && empty !== false ? (
          <p className="crewlet-key-value-rows__empty">{empty}</p>
        ) : null}
        <div className="crewlet-key-value-rows__add">
          <Button
            ref={addButton}
            variant="ghost"
            size="small"
            flush
            leadingIcon={<PlusGlyph size="sm" />}
            disabled={disabled}
            onClick={add}
          >
            {words.add}
          </Button>
        </div>
      </div>
    </FormField>
  );
}
