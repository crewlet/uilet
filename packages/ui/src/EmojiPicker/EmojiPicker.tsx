import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ClockGlyph, FaceSlightlySmilingGlyph, HashGlyph, LaptopGlyph, SearchGlyph } from '@crewlethq/icons/glyphs';
import { Input } from '../Input/index.js';
import { isComposing } from '../Layer/index.js';
import { Popover, type PopoverAlign, type PopoverSide } from '../Popover/index.js';
import { Toolbar } from '../Toolbar/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { cx } from '../utils/cx.js';
import { EMOJI_GROUPS, searchEmoji, type EmojiEntry, type EmojiGroup } from './emoji.js';

/** How many emoji stand in a row of the grid; the arrow keys walk the same rows. */
export const EMOJI_PICKER_COLUMNS = 9;

/** The glyph each of `EMOJI_GROUPS`' tabs draws, by the group's label. */
export const EMOJI_GROUP_GLYPHS: Readonly<Record<string, ReactNode>> = {
  'Frequently used': <ClockGlyph size="lg" />,
  Smileys: <FaceSlightlySmilingGlyph size="lg" />,
  Work: <LaptopGlyph size="lg" />,
};

export interface EmojiPickerLabels {
  /** Names the search field. */
  search: string;
  /** The group a search's matches are listed under. */
  results: string;
  /** Said when nothing matches. */
  none: (query: string) => string;
  /** The preview line while no emoji is pointed at or chosen. */
  idle: string;
  /** Names the row of category tabs. */
  categories: string;
}

export const EMOJI_PICKER_LABELS: EmojiPickerLabels = {
  search: 'Search emoji',
  results: 'Results',
  none: (query) => `No emoji match “${query}”.`,
  idle: 'Pick an emoji',
  categories: 'Emoji categories',
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
  /**
   * The glyph each group's tab draws, by the group's label,
   * `EMOJI_GROUP_GLYPHS` by default. A group not named here draws a hash.
   */
  groupGlyphs?: Readonly<Record<string, ReactNode>> | undefined;
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
 * A FIXED INSTRUMENT. The panel keeps one size whatever it shows, a search's
 * few matches or every group, so nothing under the pointer moves while the
 * reader types. A row of category tabs over the field jumps the grid to a
 * group, and the tab of the group at the grid's top is marked.
 *
 * WHAT ENTER WILL PICK IS SHOWN. While a search has matches, the one Enter
 * picks is marked in the grid, and the line under the grid previews whatever
 * is pointed at or chosen, large and by name, so the cells need no hints.
 *
 * THE KEYS. The search field has focus when the panel opens: typing filters
 * by name, Enter picks the marked match, and ArrowDown goes into the grid. The
 * grid is one tab stop; the arrows walk it by its rows, across groups, Home
 * and End go to its first and last emoji, ArrowUp from the top row returns to
 * the field, and Enter or Space picks. The tabs are one tab stop the arrows
 * walk, before the field. Escape closes the panel and returns focus to the
 * trigger.
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
  groupGlyphs = EMOJI_GROUP_GLYPHS,
  labels: overrides,
}: EmojiPickerProps) {
  const labels = overrides ? { ...EMOJI_PICKER_LABELS, ...overrides } : EMOJI_PICKER_LABELS;
  const id = useId();
  const [query, setQuery] = useState('');
  // The grid's one tab stop, as a flat index.
  const [at, setAt] = useState(0);
  // The emoji under the pointer, which the preview shows over the chosen one.
  const [pointed, setPointed] = useState<EmojiEntry | null>(null);
  const field = useRef<HTMLInputElement | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);
  // The group at the grid's top, whose tab is marked; none while searching.
  const [current, setCurrent] = useState(0);
  // A tab pressed during a search: the group to bring up once the groups are back.
  const pending = useRef<number | null>(null);

  const found = useMemo(() => searchEmoji(query, groups), [query, groups]);
  const { drawn, cells } = useMemo(
    () => layout(found ? [{ label: labels.results, items: found }] : groups),
    [found, groups, labels.results],
  );
  const stop = Math.min(at, Math.max(0, cells.length - 1));
  // The match Enter in the field picks: marked only while searching.
  const chosen = found && found.length > 0 ? cells[stop] : undefined;
  const shown = pointed ?? chosen?.entry ?? null;

  /** Brings a group's heading to the grid's top, at once. */
  const showGroup = (index: number) => {
    const scroller = grid.current;
    const head = scroller?.querySelector<HTMLElement>(`[data-group-index="${index}"]`);
    if (!scroller || !head) return;
    scroller.scrollTop = head.offsetTop;
    setCurrent(index);
  };

  const jumpTo = (index: number) => {
    if (found) {
      pending.current = index;
      setQuery('');
      setAt(0);
      return;
    }
    showGroup(index);
  };

  useLayoutEffect(() => {
    if (found || pending.current === null) return;
    const index = pending.current;
    pending.current = null;
    showGroup(index);
  });

  // The last group whose heading has reached the grid's top, or the last
  // group once the grid is scrolled to its end.
  const track = () => {
    const scroller = grid.current;
    if (!scroller || found) return;
    const heads = [...scroller.querySelectorAll<HTMLElement>('[data-group-index]')];
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    let next = Number(heads[0]?.dataset['groupIndex'] ?? 0);
    for (const head of heads) if (atEnd || head.offsetTop <= scroller.scrollTop + 1) next = Number(head.dataset['groupIndex']);
    setCurrent(next);
  };

  const focusCell = (index: number) => {
    setAt(index);
    grid.current?.querySelector<HTMLButtonElement>(`[data-emoji-index="${index}"]`)?.focus();
  };

  function onFieldKeys(event: KeyboardEvent<HTMLInputElement>, close: () => void) {
    if (isComposing(event)) return;
    if (event.key === 'ArrowDown' && cells.length > 0) {
      event.preventDefault();
      focusCell(0);
    } else if (event.key === 'Enter' && chosen) {
      event.preventDefault();
      onPick(chosen.entry.emoji);
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
          setPointed(null);
          setCurrent(0);
        }
        onOpenChange?.(open);
      }}
    >
      {(close) => (
        <div
          className="crewlet-emoji-picker__body"
          style={{ '--crewlet-emoji-picker-columns': EMOJI_PICKER_COLUMNS } as CSSProperties}
        >
          <Toolbar label={labels.categories} className="crewlet-emoji-picker__tabs">
            {groups.map((group, number) =>
              group.items.length === 0 ? null : (
                <Tooltip key={group.label} content={group.label}>
                  <button
                    type="button"
                    className={cx('crewlet-emoji-picker__tab', !found && number === current && 'is-current')}
                    aria-label={group.label}
                    aria-current={!found && number === current ? 'true' : undefined}
                    onClick={() => jumpTo(number)}
                  >
                    {groupGlyphs[group.label] ?? <HashGlyph size="lg" />}
                  </button>
                </Tooltip>
              ),
            )}
          </Toolbar>
          <Input
            ref={field}
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
          <div ref={grid} className="crewlet-emoji-picker__scroll" onScroll={track}>
            {drawn.map((group, number) =>
              group.cells.length === 0 ? null : (
                <div key={group.label} role="group" aria-labelledby={`${id}-group-${number}`}>
                  <div
                    id={`${id}-group-${number}`}
                    className="crewlet-emoji-picker__group"
                    data-group-index={found ? undefined : number}
                  >
                    {group.label}
                  </div>
                  <div className="crewlet-emoji-picker__grid">
                    {group.cells.map((cell) => (
                      <button
                        key={cell.entry.emoji}
                        type="button"
                        className={cx('crewlet-emoji-picker__cell', cell === chosen && 'is-chosen')}
                        aria-label={cell.entry.name}
                        data-emoji-index={cell.index}
                        tabIndex={cell.index === stop ? 0 : -1}
                        onFocus={() => setAt(cell.index)}
                        onPointerEnter={() => setPointed(cell.entry)}
                        onPointerLeave={() => setPointed((now) => (now === cell.entry ? null : now))}
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
          {/* Seen, not read: every cell is already named for a screen reader. */}
          <div className="crewlet-emoji-picker__preview" aria-hidden="true">
            {shown ? (
              <>
                <span className="crewlet-emoji-picker__preview-emoji">{shown.emoji}</span>
                <span className="crewlet-emoji-picker__preview-words">
                  <span className="crewlet-emoji-picker__preview-name">{shown.name}</span>
                  {shown.shortcode ? (
                    <span className="crewlet-emoji-picker__preview-code">{shown.shortcode}</span>
                  ) : null}
                </span>
              </>
            ) : (
              <span className="crewlet-emoji-picker__preview-idle">{labels.idle}</span>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}
