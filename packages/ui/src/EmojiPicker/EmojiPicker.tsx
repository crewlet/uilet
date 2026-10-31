import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { SearchGlyph } from '@crewlethq/icons/glyphs';
import { Input } from '../Input/index.js';
import { isComposing } from '../Layer/index.js';
import { Popover, type PopoverAlign, type PopoverSide } from '../Popover/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { EMOJI_GROUPS, searchEmoji, type EmojiEntry, type EmojiGroup } from './emoji.js';

/** How many emoji stand in a row of the grid; the arrow keys walk the same rows. */
export const EMOJI_PICKER_COLUMNS = 8;

export interface EmojiPickerLabels {
  /** Names the search field. */
  search: string;
  /** The group a search's matches are listed under. */
  results: string;
  /** Said when nothing matches. */
  none: (query: string) => string;
}

export const EMOJI_PICKER_LABELS: EmojiPickerLabels = {
  search: 'Search emoji',
  results: 'Results',
  none: (query) => `No emoji match “${query}”.`,
};

export interface EmojiPickerProps {
  /** Names the panel, which is what a screen reader announces when it opens: "Add a reaction". */
  label: string;
  /**
   * The trigger's hint on hover and keyboard focus. Pass it here rather than
   * wrapping the trigger in a `Tooltip`: the hint steps aside while the panel
   * is open, since the panel already says what it is.
   */
  tooltip?: string | undefined;
  /** Called with the emoji picked; the panel closes. */
  onPick: (emoji: string) => void;
  /** The control that opens the panel, given whether it is open and the toggle to call. */
  trigger: (open: boolean, toggle: () => void) => ReactElement;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Which edge of the trigger the panel lines up with, `end` by default. */
  align?: PopoverAlign | undefined;
  /** The preferred side, `bottom` by default; it flips where there is no room. */
  side?: PopoverSide | undefined;
  /** The emoji offered, `EMOJI_GROUPS` by default. */
  groups?: readonly EmojiGroup[] | undefined;
  labels?: Partial<EmojiPickerLabels> | undefined;
}

/** One cell's place: its index in the flat list, and its row in the grid. */
interface Cell {
  entry: EmojiEntry;
  index: number;
  row: number;
  column: number;
}

/** The groups as drawn, each emoji with its flat index and its row across every group. */
function layout(groups: readonly EmojiGroup[]) {
  let index = 0;
  let row = 0;
  const drawn = groups.map((group) => {
    const cells: Cell[] = group.items.map((entry, at) => ({
      entry,
      index: index + at,
      row: row + Math.floor(at / EMOJI_PICKER_COLUMNS),
      column: at % EMOJI_PICKER_COLUMNS,
    }));
    index += group.items.length;
    row += Math.ceil(group.items.length / EMOJI_PICKER_COLUMNS);
    return { label: group.label, cells };
  });
  return { drawn, cells: drawn.flatMap((group) => group.cells) };
}

/**
 * A searchable grid of emoji in a popover, for starting a reaction or
 * putting an emoji in a message.
 *
 * THE KEYS. The search field has focus when the panel opens: typing filters
 * by name, Enter picks the first match, and ArrowDown goes into the grid. The
 * grid is one tab stop; the arrows walk it by its rows, across groups, Home
 * and End go to its first and last emoji, ArrowUp from the top row returns to
 * the field, and Enter or Space picks. Escape closes the panel and returns
 * focus to the trigger.
 *
 * Each emoji is a button named by its name ("eyes"), and each group is named
 * by its visible heading.
 */
export function EmojiPicker({
  label,
  tooltip,
  onPick,
  trigger,
  onOpenChange,
  align = 'end',
  side = 'bottom',
  groups = EMOJI_GROUPS,
  labels: overrides,
}: EmojiPickerProps) {
  const labels = overrides ? { ...EMOJI_PICKER_LABELS, ...overrides } : EMOJI_PICKER_LABELS;
  const id = useId();
  const [query, setQuery] = useState('');
  // The grid's one tab stop, as a flat index.
  const [at, setAt] = useState(0);
  const field = useRef<HTMLInputElement | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);

  const found = useMemo(() => searchEmoji(query, groups), [query, groups]);
  const { drawn, cells } = useMemo(
    () => layout(found ? [{ label: labels.results, items: found }] : groups),
    [found, groups, labels.results],
  );
  const stop = Math.min(at, Math.max(0, cells.length - 1));

  const focusCell = (index: number) => {
    setAt(index);
    grid.current?.querySelector<HTMLButtonElement>(`[data-emoji-index="${index}"]`)?.focus();
  };

  function onFieldKeys(event: KeyboardEvent<HTMLInputElement>, close: () => void) {
    if (isComposing(event)) return;
    if (event.key === 'ArrowDown' && cells.length > 0) {
      event.preventDefault();
      focusCell(0);
    } else if (event.key === 'Enter' && found && found[0]) {
      event.preventDefault();
      onPick(found[0].emoji);
      close();
    }
  }

  function onCellKeys(event: KeyboardEvent<HTMLButtonElement>, cell: Cell) {
    let next: Cell | undefined;
    if (event.key === 'ArrowRight') next = cells[cell.index + 1];
    else if (event.key === 'ArrowLeft') next = cells[cell.index - 1];
    else if (event.key === 'Home') next = cells[0];
    else if (event.key === 'End') next = cells[cells.length - 1];
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const row = cell.row + (event.key === 'ArrowDown' ? 1 : -1);
      const inRow = cells.filter((candidate) => candidate.row === row);
      if (inRow.length === 0) {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          field.current?.focus();
        }
        return;
      }
      // The same column, or the row's last emoji where the row is shorter.
      next = inRow.find((candidate) => candidate.column === cell.column) ?? inRow[inRow.length - 1];
    } else return;
    event.preventDefault();
    if (next) focusCell(next.index);
  }

  return (
    <Popover
      label={label}
      align={align}
      side={side}
      className="crewlet-emoji-picker"
      initialFocus={() => field.current}
      trigger={(open, toggle) =>
        tooltip ? (
          <Tooltip content={tooltip} disabled={open}>
            {trigger(open, toggle)}
          </Tooltip>
        ) : (
          trigger(open, toggle)
        )
      }
      onOpenChange={(open) => {
        if (!open) {
          setQuery('');
          setAt(0);
        }
        onOpenChange?.(open);
      }}
    >
      {(close) => (
        <div className="crewlet-emoji-picker__body">
          <Input
            ref={field}
            inputSize="sm"
            placeholder={labels.search}
            aria-label={labels.search}
            leading={<SearchGlyph size="sm" />}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setAt(0);
            }}
            onKeyDown={(event) => onFieldKeys(event, close)}
          />
          <div
            ref={grid}
            className="crewlet-emoji-picker__scroll"
            style={{ '--crewlet-emoji-picker-columns': EMOJI_PICKER_COLUMNS } as CSSProperties}
          >
            {drawn.map((group, number) =>
              group.cells.length === 0 ? null : (
                <div key={group.label} role="group" aria-labelledby={`${id}-group-${number}`}>
                  <div id={`${id}-group-${number}`} className="crewlet-emoji-picker__group">
                    {group.label}
                  </div>
                  <div className="crewlet-emoji-picker__grid">
                    {group.cells.map((cell) => (
                      <button
                        key={cell.entry.emoji}
                        type="button"
                        className="crewlet-emoji-picker__cell"
                        aria-label={cell.entry.name}
                        title={cell.entry.name}
                        data-emoji-index={cell.index}
                        tabIndex={cell.index === stop ? 0 : -1}
                        onFocus={() => setAt(cell.index)}
                        onKeyDown={(event) => onCellKeys(event, cell)}
                        onClick={() => {
                          onPick(cell.entry.emoji);
                          close();
                        }}
                      >
                        {cell.entry.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ),
            )}
            {found && found.length === 0 ? (
              <p className="crewlet-emoji-picker__none" role="status">
                {labels.none(query.trim())}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </Popover>
  );
}
