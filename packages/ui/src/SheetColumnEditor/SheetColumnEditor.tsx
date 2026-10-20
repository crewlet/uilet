/**
 * A sheet column's settings, as a compact panel: its name, its type, the
 * choices a select, multi-select or status column offers (each with its
 * colour, or its category for a status), whether a value is required, and
 * moving or deleting the column. What a SheetGrid header's popover holds
 * (`renderColumnEditor`), and what any schema surface that edits one column
 * at a time draws.
 *
 * LIVE, NOT A FORM TO SUBMIT. Every change is handed to the host at once as
 * the next `SheetColumn`, so the grid beside it redraws as the reader types
 * and picks; Done only closes. A name cleared to nothing is held here and
 * not handed on, since a column with no name is one nobody can find, and the
 * name it had comes back if the reader leaves it empty.
 *
 * A CHOICE'S ID IS MADE ONCE, from its label when it is added, and never
 * changes after, so renaming a choice never rewrites a value that chose it.
 * A host whose store has its own id rule passes `optionId`.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  CalendarGlyph,
  CheckGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  CircleCheckGlyph,
  HashGlyph,
  LinkGlyph,
  ListChecksGlyph,
  ListGlyph,
  StarGlyph,
  TextAlignStartGlyph,
  TrashGlyph,
  TypeGlyph,
  UserGlyph,
  XGlyph,
} from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Checkbox } from '../Checkbox/index.js';
import { HueSwatch } from '../HuePicker/index.js';
import { IconButton } from '../IconButton/index.js';
import { Kbd } from '../Kbd/index.js';
import { FormField, Input } from '../Input/index.js';
import { Menu } from '../Menu/index.js';
import { Select } from '../Select/index.js';
import { SHEET_COLUMN_TYPES, SHEET_LABELS, optionHue, type SheetColumn, type SheetColumnType, type SheetOption, type SheetStatusCategory } from '../SheetModel/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { NODE_HUES, NODE_HUE_NAMES, type NodeHue } from '../utils/nodeHue.js';

/** The glyph each column type is drawn with, in a type menu and beside a column's name. */
export function SheetColumnTypeGlyph({ type, size = 'sm' }: { type: SheetColumnType; size?: 'xs' | 'sm' | 'md' | undefined }) {
  const Glyph = TYPE_GLYPHS[type];
  return <Glyph size={size} />;
}

const TYPE_GLYPHS = {
  text: TypeGlyph,
  longtext: TextAlignStartGlyph,
  number: HashGlyph,
  checkbox: CheckGlyph,
  select: ListGlyph,
  multiselect: ListChecksGlyph,
  status: CircleCheckGlyph,
  person: UserGlyph,
  date: CalendarGlyph,
  url: LinkGlyph,
  rating: StarGlyph,
} as const satisfies Record<SheetColumnType, unknown>;

const CATEGORIES: readonly SheetStatusCategory[] = ['todo', 'in_progress', 'done', 'blocked'];

export interface SheetColumnEditorLabels {
  name: string;
  /** Said when the name field is left empty. */
  nameMissing: string;
  type: string;
  /** Each type's name. */
  types: Record<SheetColumnType, string>;
  /** What each type holds, under its name in the type list. */
  typeDetails: Record<SheetColumnType, string>;
  /** The suggestion beside the type: "Looks like dates". */
  suggestion: (type: string) => string;
  /** The button that takes the suggestion: "Use Date". */
  useType: (type: string) => string;
  choices: string;
  addChoice: string;
  choiceName: (index: number) => string;
  choiceColor: (choice: string) => string;
  noColor: string;
  choiceCategory: (choice: string) => string;
  categories: Record<SheetStatusCategory, string>;
  removeChoice: (choice: string) => string;
  noChoices: string;
  duplicateChoice: (choice: string) => string;
  /** The choices a new status column starts with, one per category it names. */
  statusStarters: readonly { label: string; category: SheetStatusCategory }[];
  required: string;
  requiredDetail: string;
  stars: string;
  moveBefore: string;
  moveAfter: string;
  deleteColumn: string;
  done: string;
}

export const SHEET_COLUMN_EDITOR_LABELS: SheetColumnEditorLabels = {
  name: 'Name',
  nameMissing: 'Give the column a name.',
  type: 'Type',
  types: SHEET_LABELS.types,
  typeDetails: {
    text: 'One line of text',
    longtext: 'Paragraphs and notes',
    number: 'A figure, a count or an amount',
    checkbox: 'Yes or no',
    select: 'One choice from a list',
    multiselect: 'Any choices from a list',
    status: 'Where a row stands',
    person: 'A person or an agent',
    date: 'A calendar date',
    url: 'A web address',
    rating: 'A score in stars',
  },
  suggestion: (type) => `Looks like ${type.toLowerCase()}`,
  useType: (type) => `Use ${type}`,
  choices: 'Choices',
  addChoice: 'Add a choice',
  choiceName: (index) => `Choice ${index}`,
  choiceColor: (choice) => `Color of ${choice}`,
  noColor: 'Plain',
  choiceCategory: (choice) => `Category of ${choice}`,
  categories: { todo: 'To do', in_progress: 'In progress', done: 'Done', blocked: 'Blocked' },
  removeChoice: (choice) => `Remove ${choice}`,
  noChoices: 'Add at least one choice.',
  duplicateChoice: (choice) => `There is already a choice called “${choice}”.`,
  statusStarters: [
    { label: 'Not started', category: 'todo' },
    { label: 'In progress', category: 'in_progress' },
    { label: 'Done', category: 'done' },
  ],
  required: 'Required',
  requiredDetail: 'A row is not saved with this left empty.',
  stars: 'Stars',
  moveBefore: 'Move left',
  moveAfter: 'Move right',
  deleteColumn: 'Delete column',
  done: 'Done',
};

export interface SheetColumnEditorProps {
  column: SheetColumn;
  /** Every change, at once, as the next column. */
  onChange: (next: SheetColumn) => void;
  /** Done: the host closes the panel. Enter in the name field does the same. */
  onDone?: (() => void) | undefined;
  /** Shows Delete column. */
  onDelete?: (() => void) | undefined;
  /** Why Delete column cannot be pressed, said on it: the one column a sheet needs, say. */
  deleteDisabledReason?: string | undefined;
  /** Shows Move left and Move right. */
  onMove?: ((step: -1 | 1) => void) | undefined;
  canMoveBefore?: boolean | undefined;
  canMoveAfter?: boolean | undefined;
  /** The types offered, in their order. Every type by default. */
  types?: readonly SheetColumnType[] | undefined;
  /** Why the type cannot change, said under it: the column every row is named by, say. */
  typeLockedReason?: string | undefined;
  /** A type the host proposes from the column's name or its values, offered as one press. */
  suggestedType?: SheetColumnType | undefined;
  /** Why the host refuses the name (another column has it, say). */
  nameError?: string | undefined;
  /** Makes a new choice's id from its label, unique among `taken`. */
  optionId?: ((label: string, taken: readonly string[]) => string) | undefined;
  /**
   * Starts on the name, selected, so typing replaces it: a panel opened on a
   * header, or on a column just added with a placeholder name.
   */
  selectName?: boolean | undefined;
  labels?: Partial<SheetColumnEditorLabels> | undefined;
  className?: string | undefined;
}

/** An id from a label, as a store's option ids are spelled, unique among `taken`. */
function defaultOptionId(label: string, taken: readonly string[]): string {
  const base =
    label
      .normalize('NFKD')
      .replace(/\p{M}+/gu, '')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .slice(0, 56) || 'option';
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n += 1) {
    const id = `${base}_${n}`;
    if (!taken.includes(id)) return id;
  }
}

const hasChoices = (type: SheetColumnType) => type === 'select' || type === 'multiselect' || type === 'status';

/** The next hue a new choice takes: the first the column does not use yet, then round again. */
function nextHue(options: readonly SheetOption[]): NodeHue {
  const used = new Set(options.map((option) => optionHue(option.color)));
  return NODE_HUES.find((hue) => !used.has(hue)) ?? NODE_HUES[options.length % NODE_HUES.length]!;
}

export function SheetColumnEditor({
  column,
  onChange,
  onDone,
  onDelete,
  deleteDisabledReason,
  onMove,
  canMoveBefore = true,
  canMoveAfter = true,
  types = SHEET_COLUMN_TYPES,
  typeLockedReason,
  suggestedType,
  nameError,
  optionId = defaultOptionId,
  selectName = false,
  labels: overrides,
  className,
}: SheetColumnEditorProps) {
  const labels: SheetColumnEditorLabels = {
    ...SHEET_COLUMN_EDITOR_LABELS,
    ...overrides,
    types: { ...SHEET_COLUMN_EDITOR_LABELS.types, ...overrides?.types },
    typeDetails: { ...SHEET_COLUMN_EDITOR_LABELS.typeDetails, ...overrides?.typeDetails },
    categories: { ...SHEET_COLUMN_EDITOR_LABELS.categories, ...overrides?.categories },
  };
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(column.label);
  const [draft, setDraft] = useState('');
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const options = column.options ?? [];

  // The host's label wins when it changes from outside (an undo, a template).
  useEffect(() => {
    setName((now) => (now.trim() === column.label ? now : column.label));
  }, [column.label]);

  useEffect(() => {
    if (!selectName) return;
    nameRef.current?.focus({ preventScroll: true });
    nameRef.current?.select();
  }, [selectName]);

  const change = (patch: Partial<SheetColumn>) => onChange({ ...column, ...patch });

  const setType = (type: SheetColumnType) => {
    if (type === column.type) return;
    const { options: _options, min: _min, max: _max, maxItems: _maxItems, precision: _precision, numberStyle: _style, currency: _currency, ...rest } = column;
    const next: SheetColumn = { ...rest, type };
    if (hasChoices(type)) {
      const kept = hasChoices(column.type) ? options : [];
      next.options =
        type === 'status'
          ? kept.length > 0
            ? kept.map((option) => ({ ...option, category: option.category ?? 'todo' }))
            : starters(labels.statusStarters, optionId)
          : kept.map(({ category: _category, ...option }) => ({ ...option, color: option.color ?? nextHue(kept) }));
    }
    if (type === 'rating') next.max = 5;
    if (type === 'checkbox') delete next.required;
    onChange(next);
    if (hasChoices(type) && type !== 'status') window.requestAnimationFrame(() => addRef.current?.focus({ preventScroll: true }));
  };

  const setOption = (index: number, patch: Partial<SheetOption>) =>
    change({ options: options.map((option, at) => (at === index ? { ...option, ...patch } : option)) });

  const addChoice = () => {
    const label = draft.trim();
    if (label === '') return;
    if (options.some((option) => option.label.trim().toLowerCase() === label.toLowerCase())) {
      setChoiceError(labels.duplicateChoice(label));
      return;
    }
    const added: SheetOption =
      column.type === 'status'
        ? { id: optionId(label, options.map((option) => option.id)), label, category: 'todo' }
        : { id: optionId(label, options.map((option) => option.id)), label, color: nextHue(options) };
    change({ options: [...options, added] });
    setDraft('');
    setChoiceError(null);
  };

  const onNameKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onDone?.();
    }
  };

  const typeName = (type: SheetColumnType) => labels.types[type];
  const offered = types.includes(column.type) ? types : [column.type, ...types];
  const suggestion = suggestedType && suggestedType !== column.type && !typeLockedReason && types.includes(suggestedType) ? suggestedType : undefined;
  const nameMissing = name.trim() === '';

  return (
    <div className={cx('crewlet-sheet-column-editor', className)}>
      <FormField label={labels.name} error={nameMissing ? labels.nameMissing : nameError}>
        {(field) => (
          <Input
            ref={nameRef}
            id={field.id}
            aria-describedby={field.describedBy}
            error={field.invalid}
            inputSize="sm"
            width="full"
            value={name}
            maxLength={120}
            onChange={(event) => {
              setName(event.target.value);
              if (event.target.value.trim() !== '') change({ label: event.target.value.trim() });
            }}
            onBlur={() => {
              if (nameMissing) setName(column.label);
            }}
            onKeyDown={onNameKey}
          />
        )}
      </FormField>

      <FormField label={labels.type} helper={typeLockedReason}>
        {(field) => (
          <Select
            id={field.id}
            aria-describedby={field.describedBy}
            size="sm"
            width="full"
            disabled={typeLockedReason !== undefined}
            value={column.type}
            onChange={(value) => {
              if (typeof value === 'string' && (SHEET_COLUMN_TYPES as readonly string[]).includes(value)) setType(value as SheetColumnType);
            }}
            options={offered.map((type) => ({
              value: type,
              label: typeName(type),
              description: labels.typeDetails[type],
              leading: <SheetColumnTypeGlyph type={type} />,
              text: typeName(type),
            }))}
          />
        )}
      </FormField>

      {suggestion ? (
        <div className="crewlet-sheet-column-editor__suggestion">
          <span className="crewlet-sheet-column-editor__suggestion-text">
            <SheetColumnTypeGlyph type={suggestion} size="xs" />
            {labels.suggestion(typeName(suggestion))}
          </span>
          <Button size="small" variant="ghost" onClick={() => setType(suggestion)}>
            {labels.useType(typeName(suggestion))}
          </Button>
        </div>
      ) : null}

      {hasChoices(column.type) ? (
        <FormField as="fieldset" label={labels.choices} error={options.length === 0 ? labels.noChoices : (choiceError ?? undefined)}>
          <ul className="crewlet-sheet-column-editor__choices" aria-label={labels.choices}>
            {options.map((option, index) => (
              <li key={option.id} className="crewlet-sheet-column-editor__choice">
                {column.type === 'status' ? null : (
                  <Menu
                    label={labels.choiceColor(option.label)}
                    renderTrigger={(trigger) => (
                      <IconButton
                        {...trigger}
                        label={labels.choiceColor(option.label)}
                        icon={<HueSwatch hue={optionHue(option.color) === 'neutral' ? 'none' : (optionHue(option.color) as NodeHue)} />}
                        size="sm"
                      />
                    )}
                    items={[
                      { key: 'none', label: labels.noColor, icon: <HueSwatch hue="none" />, checked: optionHue(option.color) === 'neutral', onSelect: () => setOption(index, { color: 'neutral' }) },
                      ...NODE_HUES.map((hue) => ({
                        key: hue,
                        label: NODE_HUE_NAMES[hue],
                        icon: <HueSwatch hue={hue} />,
                        checked: optionHue(option.color) === hue,
                        onSelect: () => setOption(index, { color: hue }),
                      })),
                    ]}
                  />
                )}
                <Input
                  aria-label={labels.choiceName(index + 1)}
                  inputSize="sm"
                  width="full"
                  value={option.label}
                  maxLength={120}
                  onChange={(event) => setOption(index, { label: event.target.value })}
                  onBlur={(event) => {
                    if (event.target.value.trim() === '') setOption(index, { label: option.id });
                  }}
                />
                {column.type === 'status' ? (
                  <>
                    <VisuallyHidden>
                      <label htmlFor={`${id}-category-${index}`}>{labels.choiceCategory(option.label)}</label>
                    </VisuallyHidden>
                    <Select
                      id={`${id}-category-${index}`}
                      size="sm"
                      width="auto"
                      value={option.category ?? 'todo'}
                      onChange={(value) => setOption(index, { category: value as SheetStatusCategory })}
                      options={CATEGORIES.map((category) => ({ value: category, label: labels.categories[category] }))}
                    />
                  </>
                ) : null}
                <IconButton
                  label={labels.removeChoice(option.label)}
                  icon={<XGlyph size="sm" />}
                  size="sm"
                  variant="ghost-danger"
                  onClick={() => change({ options: options.filter((_, at) => at !== index) })}
                />
              </li>
            ))}
          </ul>
          <Input
            ref={addRef}
            aria-label={labels.addChoice}
            placeholder={labels.addChoice}
            inputSize="sm"
            width="full"
            value={draft}
            maxLength={120}
            trailing={draft.trim() ? <Kbd subtle>Enter</Kbd> : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setChoiceError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                addChoice();
              }
            }}
          />
        </FormField>
      ) : null}

      {column.type === 'rating' ? (
        <FormField label={labels.stars}>
          {(field) => (
            <Select
              id={field.id}
              size="sm"
              width="auto"
              value={String(column.max ?? 5)}
              onChange={(value) => change({ max: Number(value) })}
              options={[3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) }))}
            />
          )}
        </FormField>
      ) : null}

      {column.type === 'checkbox' ? null : (
        <Checkbox size="sm" label={labels.required} description={labels.requiredDetail} checked={column.required ?? false} onChange={(event) => change({ required: event.target.checked || undefined })} />
      )}

      <div className="crewlet-sheet-column-editor__foot">
        <div className="crewlet-sheet-column-editor__foot-start">
          {onMove ? (
            <>
              <IconButton label={labels.moveBefore} icon={<ChevronLeftGlyph size="sm" />} size="sm" disabledReason={canMoveBefore ? undefined : labels.moveBefore} onClick={() => onMove(-1)} />
              <IconButton label={labels.moveAfter} icon={<ChevronRightGlyph size="sm" />} size="sm" disabledReason={canMoveAfter ? undefined : labels.moveAfter} onClick={() => onMove(1)} />
            </>
          ) : null}
          {onDelete ? (
            <IconButton label={labels.deleteColumn} icon={<TrashGlyph size="sm" />} size="sm" variant="ghost-danger" disabledReason={deleteDisabledReason} onClick={onDelete} />
          ) : null}
        </div>
        {onDone ? (
          <Button size="small" variant="primary" onClick={onDone}>
            {labels.done}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** A new status column's first choices. */
function starters(list: SheetColumnEditorLabels['statusStarters'], optionId: (label: string, taken: readonly string[]) => string): SheetOption[] {
  const taken: string[] = [];
  return list.map(({ label, category }) => {
    const id = optionId(label, taken);
    taken.push(id);
    return { id, label, category };
  });
}

