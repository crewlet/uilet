import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { releaseFocus, usePresence } from '../Presence/index.js';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';
import { headingTag, useHeadingLevel, type HeadingLevel } from '../utils/headingLevel.js';
import { Eyebrow } from '../Eyebrow/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface InboxListProps extends HTMLAttributes<HTMLElement> {
  /** Names the list as a landmark: "Inbox". */
  label: string;
}

/**
 * The column of an inbox: what reached a person, grouped, one row each, read
 * in full in a pane beside it.
 *
 * A NAVIGATION, NOT A TABLE. Every row opens something, and a reader moves
 * between them to read one at a time. It promises no columns, so it draws
 * none, and its rows are as tall as their words rather than one fixed height.
 */
export function InboxList({ label, className, children, ...rest }: InboxListProps) {
  return (
    <nav {...rest} aria-label={label} className={cx('crewlet-inbox-list', className)}>
      {children}
    </nav>
  );
}

export interface InboxGroupProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The group's name: "Needs you", "Updates". */
  label: ReactNode;
  /**
   * Names the group for a screen reader only. For rows a control above them
   * already introduces, such as the snoozed ones under their own toggle.
   */
  hideLabel?: boolean | undefined;
  /** Overrides the level the label is rendered at. */
  headingLevel?: HeadingLevel | undefined;
  /**
   * How many rows the group holds, drawn after the label in the quiet ink and
   * read with it ("Answered, 4"). Most useful on a collapsible group, whose
   * rows are not on screen to be counted.
   */
  count?: number | undefined;
  /**
   * The label becomes a disclosure button that shows and hides the rows. For
   * a group a reader opens now and then, such as what they answered already,
   * kept in the list without taking its room. Ignored with `hideLabel`, which
   * leaves no button to open the rows with.
   */
  collapsible?: boolean | undefined;
  /** Whether a collapsible group's rows are shown, when the caller holds it. */
  open?: boolean | undefined;
  /** Whether a collapsible group starts open, when the group holds it. */
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /**
   * The latest row to arrive in the group, as a token (the row's key): each
   * new value plays a brief wash of the accent over the group's label and
   * count, so a row that lands in a closed group (Answered) is seen to land.
   * Pass it only for a row that has just arrived, never on a first draw.
   */
  arrived?: string | number | undefined;
}

/**
 * The motion a leaving row waits for: its height closing, a transition of the
 * row's own `grid-template-rows` (InboxList.css). A suite fakes exactly this.
 */
export const INBOX_ROW_LEAVE = { transitions: ['grid-template-rows'] } as const;

/** The order to draw after a change: `next`'s, with each row still leaving kept where it stood. */
function keepPlaces(previous: readonly string[], next: readonly string[], kept: (key: string) => boolean): string[] {
  const order = [...next];
  previous.forEach((key, index) => {
    if (order.includes(key) || !kept(key)) return;
    let at = 0;
    for (let back = index - 1; back >= 0; back -= 1) {
      const found = order.indexOf(previous[back]!);
      if (found >= 0) {
        at = found + 1;
        break;
      }
    }
    order.splice(at, 0, key);
  });
  return order;
}

function keyedRows(children: ReactNode): ReactElement<InboxRowProps>[] {
  return Children.toArray(children).filter((child): child is ReactElement<InboxRowProps> => isValidElement(child));
}

/**
 * A group's rows, and each keyed row that has just gone from them, kept in
 * its place and LEAVING until its height has closed.
 *
 * THE HOST ONLY REMOVES THE ROW. An answered row moves to another group in
 * the same commit, so the host has no row left to keep drawing; the group
 * keeps the row's last drawing instead, and drops it once it has closed.
 * A row that comes back while it leaves is live again where it stands.
 */
function useLeavingRows(children: ReactNode): ReactNode[] {
  const [rows, setRows] = useState(() => ({
    children,
    order: keyedRows(children).map((row) => String(row.key)),
    leaving: new Map<string, ReactElement<InboxRowProps>>(),
  }));
  let now = rows;
  if (rows.children !== children) {
    const next = keyedRows(children);
    const present = new Set(next.map((row) => String(row.key)));
    const leaving = new Map([...rows.leaving].filter(([key]) => !present.has(key)));
    for (const row of keyedRows(rows.children)) {
      const key = String(row.key);
      if (!present.has(key) && row.type === InboxRow) leaving.set(key, row);
    }
    now = {
      children,
      order: keepPlaces(
        rows.order,
        next.map((row) => String(row.key)),
        (key) => leaving.has(key),
      ),
      leaving,
    };
    setRows(now);
  }
  const drop = useCallback((key: string) => {
    setRows((was) => {
      if (!was.leaving.has(key)) return was;
      const leaving = new Map(was.leaving);
      leaving.delete(key);
      return { ...was, leaving, order: was.order.filter((each) => each !== key) };
    });
  }, []);
  const drawn = new Map(keyedRows(children).map((row) => [String(row.key), row] as const));
  return now.order.map((key) => {
    const row = drawn.get(key);
    if (row) return row;
    const last = now.leaving.get(key);
    return last ? cloneElement(last, { leaving: true, onLeft: () => drop(key) }) : null;
  });
}

/**
 * A labelled run of rows. The label is a heading set in the micro-label
 * register, so a reader navigating by heading lands on each group and a
 * reader scanning sees where one ends.
 */
export function InboxGroup({
  label,
  hideLabel = false,
  headingLevel,
  count,
  collapsible = false,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  arrived,
  className,
  children,
  ...rest
}: InboxGroupProps) {
  const rows = useLeavingRows(children);
  const level = useHeadingLevel();
  const Heading = headingTag(headingLevel ?? level);
  const labelId = useId();
  const rowsId = useId();
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  // A HIDDEN LABEL HAS NO BUTTON to open the rows with, so a group whose
  // label is hidden is never collapsed.
  const collapses = collapsible && !hideLabel;
  const open = !collapses || (controlledOpen ?? ownOpen);
  const toggle = () => {
    const next = !open;
    if (controlledOpen === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  // THE COUNT IS PART OF THE NAME, set apart by a comma a screen reader
  // pauses on, so "Answered, 4" is read rather than "Answered4".
  const counted =
    count === undefined ? null : (
      <>
        <VisuallyHidden>,</VisuallyHidden> <span className="crewlet-inbox-list__count">{count}</span>
      </>
    );
  // A WASH PER ARRIVAL, keyed by it: each new token draws the wash afresh, so
  // it plays again, and nothing the reader can focus is drawn anew.
  const arrival =
    arrived === undefined ? null : <span key={arrived} aria-hidden="true" className="crewlet-inbox-list__arrival" />;
  return (
    <section
      {...rest}
      aria-labelledby={labelId}
      className={cx('crewlet-inbox-list__group', collapses && 'crewlet-inbox-list__group--collapsible', className)}
    >
      {hideLabel ? (
        <VisuallyHidden as={Heading} id={labelId}>
          {label}
          {counted}
        </VisuallyHidden>
      ) : collapses ? (
        // A DISCLOSURE INSIDE THE HEADING, never a heading inside a button: a
        // reader moving by heading still lands on the group, and the button
        // in it says whether the rows are shown.
        <Heading className="crewlet-inbox-list__label">
          <button
            type="button"
            id={labelId}
            className="crewlet-inbox-list__disclosure"
            aria-expanded={open}
            aria-controls={rowsId}
            onClick={toggle}
          >
            <ChevronDownGlyph aria-hidden size="sm" className="crewlet-inbox-list__chevron" />
            <Eyebrow>{label}</Eyebrow>
            {counted}
          </button>
          {arrival}
        </Heading>
      ) : (
        <Heading id={labelId} className="crewlet-inbox-list__label">
          <Eyebrow>{label}</Eyebrow>
          {counted}
          {arrival}
        </Heading>
      )}
      <ul id={rowsId} className="crewlet-inbox-list__rows" hidden={!open}>
        {rows}
      </ul>
    </section>
  );
}

export type InboxRowTone = 'default' | 'danger';

export interface InboxRowProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'onClick' | 'title'> {
  /** Who the row is from: a seat's or a person's name. */
  title: ReactNode;
  /** A word after the name where the row is not a plain question or update: "coding run", "stopped". */
  qualifier?: ReactNode;
  /** `danger` sets the qualifier in the danger ink, for a seat that has stopped. */
  qualifierTone?: InboxRowTone | undefined;
  /** At the end of the first line: when it arrived. */
  meta?: ReactNode;
  /** Before the words: an avatar, drawn at the target size. */
  leading?: ReactNode;
  /** What the row says, in up to three lines. */
  children?: ReactNode;
  /** Drawn after the words in the quiet ink, inside the same three lines: a comment's own text. */
  excerpt?: ReactNode;
  /**
   * Under the row and OUTSIDE its control, so it can be a control of its own:
   * the task the row is about, as a link.
   */
  aside?: ReactNode;
  /** This row is the one open beside the list. */
  selected?: boolean | undefined;
  /** Not read yet: the name is heavier, the words take the primary ink, and the state is read out. */
  unread?: boolean | undefined;
  /** Read after the row's words when `unread`. */
  unreadLabel?: string | undefined;
  /** It waits on the reader: the words take the primary ink. */
  actionable?: boolean | undefined;
  /**
   * Settled: the name and the words step down to the secondary ink, and the
   * state is read out. Never struck through: a settled row is still read, and
   * a line through its words says "cancelled" where it means "done".
   */
  done?: boolean | undefined;
  /** Read after the row's words when `done`: "Answered", "Resolved". */
  doneLabel?: string | undefined;
  /**
   * In the head, before the time: a short state of the row's own, such as a
   * Tag reading "Answered". Drawn as given, so it carries its own words.
   */
  status?: ReactNode;
  /**
   * A line under the words, inside the control: what came of the row. "You
   * chose One JSON file per group", "Crewlet-PM is acting on it".
   */
  outcome?: ReactNode;
  /** A glyph before the outcome, drawn in the tone's ink and hidden from a screen reader. */
  outcomeIcon?: ReactNode;
  /** The ink of the outcome's glyph. The words stay in the secondary ink, so the line is read the same in every tone. */
  outcomeTone?: Tone | undefined;
  /** Opens the row as a link. */
  href?: string | undefined;
  /**
   * Opens the row as a button, or, beside `href`, takes the press first: a
   * router calls `preventDefault` on a plain click and lets a modified one
   * open the link in a tab.
   */
  onClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  /**
   * On its way out: the row stays drawn, inert, while its height closes, so
   * the rows under it slide up rather than jump, and is drawn no more once it
   * has closed. An `InboxGroup` does this itself for a keyed row that leaves
   * its children; pass it for a list of your own, with `onLeft`.
   */
  leaving?: boolean | undefined;
  /** Runs once a leaving row has closed and is drawn no more. */
  onLeft?: (() => void) | undefined;
  /** Just arrived: a brief wash of the accent that fades back to the row's own ground. */
  arrived?: boolean | undefined;
}

/**
 * One row: WHO, then WHAT in up to three lines, then the task it is about.
 *
 * THE ROW IS ONE CONTROL and the task is another. A link nested inside a
 * button is invalid and unreachable by keyboard, so the task sits under the
 * control, in the same item, and lines up with the words above it. The item
 * takes the hover and the selected fill as a whole, so the two read as one row.
 *
 * THE SELECTED FILL IS NEUTRAL. An inbox is read one row after another, and an
 * accent tint on the open row made the column read as a column of alerts; the
 * pressed fill says "here" without saying "look". The control carries
 * `aria-current`, so the row is announced as the open one where focus is.
 *
 * WHAT CAME OF IT IS SAID, NOT STRUCK. A settled row steps its ink down and
 * says its outcome on a line of its own (`outcome`), with any state the
 * caller names in the head (`status`): every word stays legible, and the
 * state is never carried by a decoration alone.
 *
 * NOTHING IS CUT AT THE EDGE. The name ellipsizes, the time never wraps, and
 * the words take up to three lines before they stop, so a row says what it is
 * rather than its first few words.
 */
export function InboxRow({
  title,
  qualifier,
  qualifierTone = 'default',
  meta,
  leading,
  excerpt,
  aside,
  selected = false,
  unread = false,
  unreadLabel = 'Unread',
  actionable = false,
  done = false,
  doneLabel = 'Done',
  status,
  outcome,
  outcomeIcon,
  outcomeTone = 'neutral',
  href,
  onClick,
  leaving = false,
  onLeft,
  arrived = false,
  className,
  children,
  ...rest
}: InboxRowProps) {
  /*
   * A ROW THAT LEAVES CLOSES ITS HEIGHT. It stays drawn, inert, while its
   * height eases to nothing (grid-template-rows, InboxList.css), so the rows
   * under it slide up into its place, and is drawn no more once it has
   * closed. Focus inside it is let go as it starts, never left in a row that
   * takes nothing. Under reduced motion it simply goes.
   */
  const self = useRef<HTMLLIElement | null>(null);
  const presence = usePresence(!leaving, self, INBOX_ROW_LEAVE);
  const gone = !presence.present;
  useLayoutEffect(() => {
    if (presence.leaving) releaseFocus(self.current);
  }, [presence.leaving]);
  useEffect(() => {
    if (gone) onLeft?.();
  }, [gone, onLeft]);
  // Every part is set apart by a space, so the control is announced as
  // "Crewlet-PM coding run 2h Which ledger" rather than as one run-on word: an
  // accessible name is the concatenation of an element's parts with nothing
  // inserted between them.
  const contents = (
    <>
      {leading === undefined ? null : (
        <>
          <span className="crewlet-inbox-row__leading">{leading}</span>{' '}
        </>
      )}
      <span className="crewlet-inbox-row__main">
        <span className="crewlet-inbox-row__head">
          <span className="crewlet-inbox-row__title">{title}</span>
          {qualifier === undefined ? null : (
            <>
              {' '}
              <span className={cx('crewlet-inbox-row__qualifier', qualifierTone === 'danger' && 'crewlet-inbox-row__qualifier--danger')}>
                {qualifier}
              </span>
            </>
          )}
          {status === undefined || status === null ? null : (
            <>
              {' '}
              <span className="crewlet-inbox-row__status">{status}</span>
            </>
          )}
          {meta === undefined ? null : (
            <>
              {' '}
              <span className="crewlet-inbox-row__meta">{meta}</span>
            </>
          )}
        </span>{' '}
        <span className="crewlet-inbox-row__text">
          {children}
          {excerpt === undefined ? null : (
            <>
              {' '}
              <span className="crewlet-inbox-row__excerpt">{excerpt}</span>
            </>
          )}
        </span>
        {outcome === undefined || outcome === null ? null : (
          <>
            {' '}
            <span className={cx('crewlet-inbox-row__outcome', `crewlet-inbox-row__outcome--${outcomeTone}`)}>
              {outcomeIcon === undefined ? null : (
                <span aria-hidden className="crewlet-inbox-row__outcome-icon">
                  {outcomeIcon}
                </span>
              )}
              <span className="crewlet-inbox-row__outcome-text">{outcome}</span>
            </span>
          </>
        )}
        {unread ? (
          <>
            {' '}
            <VisuallyHidden>{unreadLabel}</VisuallyHidden>
          </>
        ) : null}
        {done ? (
          <>
            {' '}
            <VisuallyHidden>{doneLabel}</VisuallyHidden>
          </>
        ) : null}
      </span>
    </>
  );

  const controlClass = cx(
    'crewlet-inbox-row__control',
    unread && 'crewlet-inbox-row__control--unread',
    actionable && 'crewlet-inbox-row__control--actionable',
    done && 'crewlet-inbox-row__control--done',
  );
  const current = selected ? 'true' : undefined;

  const control =
    href !== undefined ? (
      <a className={controlClass} href={href} aria-current={current} onClick={onClick}>
        {contents}
      </a>
    ) : (
      <button type="button" className={controlClass} aria-current={current} onClick={onClick}>
        {contents}
      </button>
    );

  if (gone) return null;
  return (
    <li
      {...rest}
      ref={self}
      inert={presence.leaving}
      className={cx(
        'crewlet-inbox-row',
        selected && 'crewlet-inbox-row--selected',
        arrived && 'crewlet-inbox-row--arrived',
        presence.leaving && 'crewlet-inbox-row--leaving',
        className,
      )}
    >
      {/* One box in the row's one track, so the track can close over it. */}
      <div className="crewlet-inbox-row__body">
        {control}
        {aside === undefined || aside === null || aside === false ? null : (
          <div className="crewlet-inbox-row__aside">{aside}</div>
        )}
      </div>
    </li>
  );
}

export type InboxMoreProps = HTMLAttributes<HTMLDivElement>;

/**
 * The end of the list: the quiet toggles that open what is not in it by
 * default, the snoozed rows and the earlier ones. Two words at the bottom
 * rather than a filter bar at the top, because a reader opens them rarely
 * and a filter bar is read every time.
 */
export function InboxMore({ className, children, ...rest }: InboxMoreProps) {
  return (
    <div {...rest} className={cx('crewlet-inbox-list__more', className)}>
      {children}
    </div>
  );
}

export interface InboxToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Whether the rows it opens are shown. */
  expanded: boolean;
}

/**
 * One of those toggles: a word in the quiet ink that opens rows under it.
 * Its own `aria-expanded` says whether they are open, and the ink steps up to
 * the primary while they are.
 */
export function InboxToggle({ expanded, className, children, ...rest }: InboxToggleProps) {
  return (
    <button {...rest} type="button" aria-expanded={expanded} className={cx('crewlet-inbox-list__toggle', className)}>
      {children}
    </button>
  );
}

InboxList.Group = InboxGroup;
InboxList.Row = InboxRow;
InboxList.More = InboxMore;
InboxList.Toggle = InboxToggle;
