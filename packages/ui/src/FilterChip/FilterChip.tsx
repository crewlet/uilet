import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/**
 * How a row of chips behaves: several on at once, or exactly one.
 *
 * The two are different CONTROLS, not two looks. A toggle group is a set of
 * independent switches, each a button with a pressed state that Tab reaches;
 * a radio group is one choice, where the arrows move inside it and Tab steps
 * past the whole thing. A screen reader is told which of the two it is looking
 * at, so this is a prop rather than a styling flag.
 */
export type FilterChipSemantics = 'toggle' | 'radio';

/**
 * Whether an arrow key APPLIES the filter it lands on, or only moves to it.
 *
 * `automatic` is the platform's own radio group and the default: the choice
 * changes as focus moves, which costs nothing where the choice costs nothing.
 *
 * `manual` moves focus alone, and Enter or Space applies — which a real
 * button already turns into its own click. A filter row is the one place that
 * is routinely wrong: a chip row that drives a URL parameter re-runs the
 * screen's query on every change, so arrowing across five chips under
 * `automatic` fires five queries nobody asked for and redraws the list under
 * the reader four times on the way past.
 *
 * It says nothing about a `toggle` row, which has no arrow keys to qualify:
 * every chip there is its own tab stop and its own switch.
 */
export type FilterChipActivation = 'automatic' | 'manual';

interface FilterChipGroupContext {
  semantics: FilterChipSemantics;
  /** The chosen value, or null for a deliberate none. */
  value: string | null | undefined;
  choose: (value: string | null) => void;
  allowNone: boolean;
}

const GroupContext = createContext<FilterChipGroupContext | null>(null);

/** The attribute the group finds its own chips by, without a registry to keep. */
export const FILTER_CHIP_ATTRIBUTE = 'data-crewlet-filter-chip';

export interface FilterChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'value' | 'onChange'> {
  /** Whether this filter is on. Inside a radio group it comes from the group. */
  pressed?: boolean | undefined;
  /** Called with what the state would become. */
  onPressedChange?: ((pressed: boolean) => void) | undefined;
  /** How many rows this filter leaves. Drawn after the label, in the chip's ink. */
  count?: number | string | undefined;
  /** What this chip stands for inside a radio group. */
  value?: string | undefined;
  children: ReactNode;
}

/**
 * A filter that is off, or on.
 *
 * NEUTRAL UNTIL IT IS ON, and then it takes the accent. The accent is the one
 * colour that means "where the reader is", and the thing currently narrowing
 * the list is exactly that: the reader's own position in the data. A row of
 * chips accented at rest would spend the colour on controls none of which is
 * doing anything.
 *
 * It is a real `<button type="button">`. The chip this replaces declared no
 * type, so every one of them inside a form submitted it.
 */
export function FilterChip({
  pressed,
  onPressedChange,
  count,
  value,
  className,
  onClick,
  children,
  ...rest
}: FilterChipProps) {
  const group = useContext(GroupContext);
  const radio = group?.semantics === 'radio';
  const on = radio ? value !== undefined && group.value === value : pressed === true;

  const activate = () => {
    if (radio) {
      /*
       * A second press on the chosen chip clears the choice where the group
       * allows it. A filter row with no "All" chip needs a way back to
       * unfiltered, and the chip that is on is where a reader looks for one.
       */
      const next = on && group.allowNone ? null : (value ?? null);
      group.choose(next);
      onPressedChange?.(next !== null);
      return;
    }
    onPressedChange?.(!on);
  };

  const state = radio ? { role: 'radio', 'aria-checked': on } : { 'aria-pressed': on };

  return (
    <button
      {...rest}
      {...state}
      type="button"
      {...{ [FILTER_CHIP_ATTRIBUTE]: '' }}
      /*
       * In a radio group the whole row is ONE tab stop and the arrows move
       * inside it. Which chip holds that stop is the GROUP's to decide (it is
       * the chosen one, or the first where nothing is chosen), and it is
       * written to the DOM there rather than rendered here, so exactly one
       * place owns it.
       */
      {...(radio ? {} : { tabIndex: rest.tabIndex })}
      className={cx('crewlet-filter-chip', className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) activate();
      }}
    >
      <span className="crewlet-filter-chip__label">{children}</span>
      {count === undefined ? null : <span className="crewlet-filter-chip__count">{count}</span>}
    </button>
  );
}

export interface FilterChipGroupProps {
  /**
   * What the row filters, read before the chips themselves: "Event kind",
   * "Seat". REQUIRED, because a row of chips with no name is a row of words a
   * screen reader reads with nothing to hang them on.
   */
  label: string;
  semantics?: FilterChipSemantics | undefined;
  /** Whether the arrows apply the filter they land on. Radio rows only. */
  activate?: FilterChipActivation | undefined;
  /**
   * The sentence a manual row is described by, or `null` for none where the
   * screen already says it elsewhere. Defaults to naming the key that
   * applies, because a radio group that does not select as it moves is the
   * unusual one and nothing else on the row says so.
   */
  activateHint?: string | null | undefined;
  /** The chosen value in radio mode. `null` is a deliberate none. */
  value?: string | null | undefined;
  onValueChange?: ((value: string | null) => void) | undefined;
  /**
   * Whether a second press on the chosen chip clears it. Off by default: a
   * choice that can empty itself leaves a reader in a state with no answer,
   * and most rows carry an explicit "All" chip instead.
   */
  allowNone?: boolean | undefined;
  /** Hide the label visually. It stays in the accessibility tree. */
  hideLabel?: boolean | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * What a manual row says about itself, because nothing else does.
 *
 * On the GROUP, so it is read once on the way in, after the row's name. On
 * each chip it would be read again after every chip a reader passes, which is
 * the sentence said five times on the way to the filter they wanted.
 */
const ACTIVATE_HINT = 'Press Enter or Space to apply the filter you land on.';

/**
 * Whether a chip can take focus at all.
 *
 * A DISABLED CHIP IS NOT PART OF THE KEYBOARD MODEL. It cannot be focused, so
 * a roving stop parked on one leaves the whole row unreachable by Tab, and an
 * arrow aimed at one moves nothing and leaves the reader where they were with
 * no way past it.
 */
const reachable = (chip: HTMLButtonElement) =>
  !chip.disabled && chip.getAttribute('aria-disabled') !== 'true';

/** Which chip an arrow key moves to, or null for a key that is not a move. */
function moveTo(key: string, from: number, total: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (from + 1) % total;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (from - 1 + total) % total;
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  return null;
}

/**
 * A named row of filters.
 *
 * In radio mode the arrows move AND choose by default, which is what the
 * platform's own radio group does: a reader arrowing through a set of choices
 * is choosing, and a group where focus and selection come apart makes them
 * press Space after every move for a reason they could not name.
 *
 * `activate="manual"` is where the reason CAN be named: a row driving a URL
 * parameter runs the screen's query again on every change, and there the
 * moves a reader makes on the way to the chip they want are queries nobody
 * asked for. Then the row says which key applies, because a radio group that
 * does not select as it moves is the unusual one.
 */
export function FilterChipGroup({
  label,
  semantics = 'toggle',
  activate = 'automatic',
  activateHint,
  value,
  onValueChange,
  allowNone = false,
  hideLabel = false,
  className,
  children,
}: FilterChipGroupProps) {
  const row = useRef<HTMLDivElement | null>(null);
  const labelId = useId();
  const hintId = useId();
  const manual = semantics === 'radio' && activate === 'manual';
  const hint = manual ? (activateHint === undefined ? ACTIVATE_HINT : activateHint) : null;
  /*
   * The chip focus last LANDED on, kept after focus leaves the row: under
   * manual activation that is where the one tab stop belongs, so a reader who
   * arrows along without applying, Tabs away and Tabs back comes back to the
   * chip they left rather than to the one that is on.
   *
   * The ELEMENT rather than an index, because the chips are found in the DOM
   * rather than registered: a row whose chips changed under a remembered
   * index would move the stop to whatever took that position, and an element
   * that is no longer in the row is simply not found.
   */
  const landed = useRef<HTMLButtonElement | null>(null);

  const chips = useCallback(
    (): HTMLButtonElement[] =>
      row.current === null ? [] : [...row.current.querySelectorAll<HTMLButtonElement>(`[${FILTER_CHIP_ATTRIBUTE}]`)],
    [],
  );

  /*
   * The roving tab stop, owned here. It is written to the DOM rather than
   * rendered, because a move between two chips is not a render: an arrow key
   * calls this straight after focusing, and the effect below runs it again
   * after every render, since the chips themselves can appear, vanish and
   * change their checked state, and a row where no chip is reachable by Tab
   * is a control the keyboard cannot enter at all.
   */
  const placeStop = useCallback(() => {
    if (semantics !== 'radio') return;
    const all = chips();
    // Under manual activation the stop follows FOCUS rather than the choice,
    // because the two have come apart: the chip a reader moved to is not the
    // chip that is on, and dropping them back on the latter loses the moves
    // they made with nothing said about it.
    const held = manual && landed.current !== null ? all.indexOf(landed.current) : -1;
    const chosen = all.findIndex((chip) => chip.getAttribute('aria-checked') === 'true' && reachable(chip));
    // The chosen chip holds the stop, or the first one that can take it. A row
    // whose first chip is disabled would otherwise park the stop on an element
    // Tab skips, and the keyboard could not enter the group at all.
    const stop = held >= 0 && reachable(all[held]!) ? held : chosen < 0 ? all.findIndex(reachable) : chosen;
    all.forEach((chip, index) => {
      chip.tabIndex = index === stop ? 0 : -1;
    });
  }, [chips, manual, semantics]);

  useLayoutEffect(placeStop);

  const choose = useCallback(
    (next: string | null) => {
      onValueChange?.(next);
    },
    [onValueChange],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (semantics !== 'radio') return;
    // Over the chips a reader can actually land on: a disabled one in the
    // middle of a row would otherwise be a dead end, since focusing it does
    // nothing and the next arrow starts from wherever focus stayed.
    const open = chips().filter(reachable);
    const from = open.indexOf(document.activeElement as HTMLButtonElement);
    if (from < 0 || open.length === 0) return;
    const to = moveTo(event.key, from, open.length);
    if (to === null) return;
    const next = open[to];
    if (next === undefined) return;
    event.preventDefault();
    // Focus first, then activate: the activation is what tells the caller, and
    // a caller that re-renders on it must not take the focus back with it.
    next.focus();
    if (manual) {
      // Nothing is applied until Enter or Space, which a real button turns
      // into its own click. The stop moves here and not on a render, because
      // a move that changes nothing the caller holds causes none.
      landed.current = next;
      placeStop();
      return;
    }
    next.click();
  };

  /**
   * Focus arriving by something OTHER than an arrow key: a pointer press, a
   * Tab into the row, a caller focusing a chip itself. The stop follows that
   * too, or clicking one chip and arrowing to another would leave the row
   * disagreeing with itself about where the reader is.
   */
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!manual) return;
    // The row's handler, so the event is typed as the row's; what focus
    // actually landed on is the chip it bubbled from, which the attribute is
    // what identifies rather than the type.
    const target: HTMLElement = event.target;
    if (!target.hasAttribute(FILTER_CHIP_ATTRIBUTE)) return;
    landed.current = target as HTMLButtonElement;
    placeStop();
  };

  return (
    <div
      ref={row}
      role={semantics === 'radio' ? 'radiogroup' : 'group'}
      aria-labelledby={labelId}
      aria-describedby={hint ? hintId : undefined}
      className={cx('crewlet-filter-chip-group', className)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
    >
      {hideLabel ? (
        <VisuallyHidden id={labelId}>{label}</VisuallyHidden>
      ) : (
        <span id={labelId} className="crewlet-filter-chip-group__label">
          {label}
        </span>
      )}
      <GroupContext.Provider value={{ semantics, value, choose, allowNone }}>{children}</GroupContext.Provider>
      {hint ? <VisuallyHidden id={hintId}>{hint}</VisuallyHidden> : null}
    </div>
  );
}
