/**
 * The rail's navigation: groups of rows, one of which says where the reader is.
 *
 * THE ROW THE READER IS ON IS RAISED, WITH A HAIRLINE ROUND IT, AND NO HUE: it
 * is found by its position, its lift and its line, by a reader who sees
 * colour and by one who does not. The accent is the primary action's fill, so
 * a violet row in the rail would read as a second primary on every screen.
 * `aria-current="page"` says the same thing to a screen reader, and the style
 * is drawn FROM that attribute, so the two cannot come apart. The stylesheet
 * carries why the hairline is an outline rather than a shadow.
 *
 * THE LINK ELEMENT BELONGS TO THE APPLICATION (`renderLink`). A router's own
 * link is what carries a client navigation and a leave guard; a plain anchor is
 * what carries a middle click into a new tab. Neither is right everywhere, so
 * neither is built in: the engine keeps plain anchors and the console passes
 * its router's NavLink.
 *
 * A FIGURE AT THE END OF A ROW IS ONE OF TWO THINGS, and the two are two props
 * rather than one prop with a tone. A `count` is how many of something the
 * destination holds (the open tasks in a project), a quiet figure in the
 * tertiary ink; a `badge` is how many things are waiting on the reader (the
 * unread in the inbox), the one filled pill in the chrome. Both are READ as
 * part of the row's name, with the words the caller gives them ("Inbox, 5
 * unread"), because a bare "5" after a name says nothing about what it counts,
 * and both carry those words as required props, so a figure without them does
 * not type-check.
 *
 * A LONG LIST READ IN PASSING IS THE SAME COMPONENT, DENSER (`dense`): a room
 * list beside a conversation, with rows at the target floor, names in the
 * regular weight, and two states a navigation does not need, `unread` (the
 * name a step heavier and brighter) and `muted` (the quiet ink). Its groups
 * can fold (`collapsible`), and a folded group still shows the row the reader
 * is on and the rows with news, so folding never hides what is calling.
 *
 * THE RAIL FOLDED TO ITS MARKS IS `CompactNav`, whose places take these rows'
 * own prop types, so one list of places feeds both shapes.
 */

import { createContext, useContext, useId, useState, type MouseEventHandler, type ReactNode } from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
import { KeyChip } from '../KeyChip/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { LockedLabel } from '../LockedLabel/index.js';
import type { CountTone } from '../Count/index.js';

export interface SidebarNavProps {
  /**
   * Names the navigation region. A page with two of them ("Sections" and
   * "This company") needs both named, or a screen reader offers a reader two
   * landmarks both called "navigation".
   */
  label: string;
  /**
   * A list read in passing that runs long (a room list, a directory), drawn a
   * step denser than the application's navigation: rows at the target floor
   * (24px), the gutter halved so a row's highlight runs nearly from edge to
   * edge, the row's pad grown by the same step so every glyph and name keeps
   * the line it was on, a glyph slot as wide as a small face so faces and
   * glyphs share one column, and names in the regular weight, which is what
   * lets an `unread` row stand out by weight alone.
   */
  dense?: boolean | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * The one control a group's heading can carry at its end: the add beside
 * "Projects".
 *
 * A DESCRIPTION RATHER THAN AN ELEMENT, because the rail is what draws it: a
 * square at the pointer-target floor, which is exactly the heading's height,
 * named by `label`, with its ring inside its own box like every row in a
 * clipping scroller. A control handed in whole would bring its own step, and
 * the smallest one in the kit is two pixels taller than the heading it sits
 * in.
 */
export interface NavGroupAction {
  /** What pressing it does, in words: "New project". It is the control's name. */
  label: string;
  /** The glyph. Decoration: the label is the name. */
  icon: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export interface NavGroupProps {
  /**
   * The group's heading. Without one the rows are simply a run of rows, and an
   * EMPTY one is without one: a rail whose first run has no name spells that
   * as `""`, and a heading box with no word in it is sixteen pixels of the
   * rail spent on nothing.
   */
  label?: ReactNode;
  /**
   * A control at the end of the heading. It is a sibling of the heading's
   * words rather than part of them, so the group is still named by its label
   * alone, and it takes its own place in the tab order before the group's
   * first row.
   */
  action?: NavGroupAction | undefined;
  /**
   * Every row in the group is closed to this reader, for this reason
   * ("Needs Admin access"). The key is drawn ONCE, after the group's label,
   * which names the reason for a screen reader and as its title; the rows
   * stay links, in the quiet ink, without a key each, so a reader who holds
   * none of a column's access meets one mark per group rather than a wall of
   * keys. A row still says its own reason (its `locked`) as its title and
   * after its name. Only for a NAMED group: a run with no label has no
   * heading to carry the key, so its rows keep theirs.
   */
  locked?: string | undefined;
  /**
   * The heading folds the group: it becomes a button, its chevron in the glyph
   * column and its words on the label line, and a folded group still draws
   * the rows a reader must not lose sight of, the one they are on and the
   * ones marked `unread` (and not `muted`). Only for a NAMED group: the words
   * are the button's name.
   */
  collapsible?: boolean | undefined;
  /** Whether a collapsible group is folded, for a caller that keeps the state. */
  collapsed?: boolean | undefined;
  /** Whether a collapsible group starts folded, for one that leaves the state to the group. */
  defaultCollapsed?: boolean | undefined;
  /** Every fold and unfold of a collapsible group. */
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/** Whether the group a row stands in carries the lock for all of its rows. */
const GroupLocked = createContext(false);

/**
 * Whether the group a row stands in is folded, which keeps only its current
 * and unread rows. A row hands its own nested rows `false`: the fold is the
 * group's, and a row's children are the row's.
 */
const GroupFolded = createContext(false);

/** What a caller is handed when it draws the row's element itself. */
export interface NavLinkProps {
  className: string;
  children: ReactNode;
  href?: string | undefined;
  'aria-current'?: 'page' | undefined;
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  /** The row's hint, as the pointer's title. */
  title?: string | undefined;
  /** The row's `onPrefetch`, on the pointer reaching it and on focus. */
  onPointerEnter?: (() => void) | undefined;
  onFocus?: (() => void) | undefined;
}

/**
 * A figure at the end of a row, and what it counts.
 *
 * VALUES RATHER THAN AN ELEMENT, because the rail is what paints them: the
 * pair has to clear its floor on every ground a ROW can have, the reader's
 * own raised row included, and that is a fact about the rail, measured in the
 * rail's own stylesheet, not something a call site can be asked to know.
 */
export interface NavFigure {
  /** The figure, drawn as given, so the caller decides its formatting. */
  value: number | string;
  /**
   * What is counted, read after the figure as part of the row's name:
   * `unread` makes the inbox row "Inbox, 5 unread". Required, because a
   * figure read with no word after it is a number nobody can place.
   */
  label: string;
}

/**
 * A figure of what waits on the reader, and how loudly it asks.
 *
 * `attention` (the default) is the accent's filled pill, the one hue in the
 * chrome: what the reader is asked to act on, the unread in an inbox.
 * `quiet` keeps the pill's round shape and its place at the row's end, in
 * the quiet count's grey: work that is the reader's own and is waiting, but
 * not calling (the open tasks assigned to them). The vocabulary is `Count`'s
 * own (`CountTone`), so a figure is quiet or calling in the same words
 * wherever it stands.
 */
export interface NavBadge extends NavFigure {
  tone?: CountTone | undefined;
}

/** A quiet figure: how many of something the destination holds. */
export interface NavCount extends NavFigure {
  /**
   * A mark before the figure: the working dot beside a count of agents at
   * work. Decoration, because the label says the same thing in words.
   */
  mark?: ReactNode;
}

export interface NavItemProps {
  /** What the row is called. */
  label: ReactNode;
  /** The row's glyph. Decoration: the label beside it carries the meaning. */
  icon?: ReactNode;
  /**
   * A short key drawn as a chip before the label, in place of a glyph: a
   * project's `ENG`. It is text, and READ as the start of the row's name
   * ("ENG Core platform"), because it is the prefix every item in that project
   * is filed under and a reader who hears it can find them. A string rather
   * than an element, because the rail paints the chip and measures it.
   */
  lead?: string | undefined;
  /**
   * How many of something the destination holds, as a quiet figure at the end
   * of the row in the tertiary ink: the open tasks in a project.
   */
  count?: NavCount | undefined;
  /**
   * How many things at this destination are waiting on the reader, as the one
   * filled pill in the chrome, in the accent: the unread in the inbox. A count
   * of what is waiting on the reader is the one thing in the rail that asks
   * them to act, which is what the accent means; it is a FILL carrying a
   * figure rather than a figure in a hue, so it still reads to somebody who
   * cannot separate the hue. Anything else is a `count`. `tone: 'quiet'`
   * keeps the pill and draws it in the quiet count's grey (`NavBadge`).
   */
  badge?: NavBadge | undefined;
  href?: string | undefined;
  /** Whether this row is the screen the reader is on. */
  current?: boolean | undefined;
  /**
   * Unavailable, and why.
   *
   * NOT `disabled`: a row taken out of the tab order teaches a keyboard reader
   * that the destination does not exist, when what is true is that it is not
   * reachable yet. It stays focusable, says `aria-disabled`, and the reason is
   * read after its name.
   */
  disabledReason?: string | undefined;
  /**
   * Closed to this reader, and why, as a sentence: "Needs Admin access". The
   * row stays and stays a link (a place that vanished is one the reader
   * cannot ask for); its words carry the key after them, the pointer's title
   * says why, and a screen reader hears the reason after the name. See
   * `LockedLabel`. Unlike `disabledReason`, the destination is reachable: it
   * is the page that says the reader may not read it.
   */
  locked?: string | undefined;
  /**
   * Something here is new to the reader: a room with messages they have not
   * read. The row's name steps up to the primary ink and the medium weight,
   * which reads in a `dense` list whose names are regular. A screen reader
   * hears ", unread" after the name unless the row's figure already says
   * what is waiting, and a folded group keeps the row in view.
   */
  unread?: boolean | undefined;
  /**
   * The reader asked to hear less from here: the row rests in the quiet ink,
   * and lifts as every row does under the pointer and while current. It
   * outranks `unread`, since a muted place's news is not asking for them, and
   * a screen reader hears ", muted" after the name.
   */
  muted?: boolean | undefined;
  /** The row's hint, as the pointer's title: what the destination answers. */
  title?: string | undefined;
  /**
   * Called when the pointer reaches the row and when it takes focus: the
   * reader deciding, which is the moment to start fetching where it leads,
   * so the destination is usually in by the time the press lands.
   */
  onPrefetch?: (() => void) | undefined;
  /** Draws the row's element, for a router that owns navigation. */
  renderLink?: ((props: NavLinkProps) => ReactNode) | undefined;
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  /** Nested rows. They expand and collapse under this one. */
  children?: ReactNode;
  expanded?: boolean | undefined;
  defaultExpanded?: boolean | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
  /** Names the control that expands the nested rows. */
  expandLabel?: string | undefined;
  className?: string | undefined;
}

/** The navigation region in the rail. */
export function SidebarNav({ label, dense = false, className, children }: SidebarNavProps) {
  return (
    <nav className={cx('crewlet-sidebar-nav', dense && 'crewlet-sidebar-nav--dense', className)} aria-label={label}>
      {children}
    </nav>
  );
}

/**
 * A labelled run of rows: "Company", "Work", "Operations".
 *
 * A HEADING WITH NO WORD IN IT IS NOT A HEADING. `""`, `null` and `false` are
 * all how a caller spells a run that has no name (the engine's first run,
 * above "Company", is one), and each has to reach the same place: an empty
 * `<div>` here still carries the label's own padding, which put sixteen blank
 * pixels at the top of the rail and named a group nothing could read.
 */
export function NavGroup({
  label,
  action,
  locked,
  collapsible = false,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  className,
  children,
}: NavGroupProps) {
  const id = useId();
  const [ownCollapsed, setOwnCollapsed] = useState(defaultCollapsed);
  const named = label !== undefined && label !== null && label !== false && label !== '';
  const groupLocked = named && locked !== undefined && locked !== '';
  const folds = named && collapsible;
  const folded = folds && (collapsed ?? ownCollapsed);

  function toggle(): void {
    const next = !folded;
    if (collapsed === undefined) setOwnCollapsed(next);
    onCollapsedChange?.(next);
  }

  const words = <LockedLabel reason={groupLocked ? locked : undefined}>{label}</LockedLabel>;
  return (
    <div
      className={cx(
        'crewlet-nav-group',
        groupLocked && 'crewlet-nav-group--locked',
        folded && 'crewlet-nav-group--collapsed',
        className,
      )}
      // A group is only a group to a screen reader when it has a name; an
      // unnamed one would add a level to walk through that says nothing.
      role={named ? 'group' : undefined}
      // The WORDS alone, never the head: the action inside the head is a
      // control with a name of its own, and "Projects New project" is not the
      // name of a group.
      aria-labelledby={named ? id : undefined}
    >
      {named || action ? (
        <div className="crewlet-nav-group__head">
          {folds ? (
            /*
             * THE HEADING IS THE FOLD. Its chevron stands in the glyph column
             * and its words on the label line, so a folded list's headings
             * and rows still read as one grid, and the button is named by the
             * words alone (the chevron is decoration; `aria-expanded` says
             * which way it points).
             */
            <button
              type="button"
              className="crewlet-nav-group__toggle"
              id={id}
              aria-expanded={!folded}
              onClick={toggle}
            >
              <span className="crewlet-nav-group__chevron" aria-hidden>
                <ChevronDownGlyph size="xs" />
              </span>
              <span className="crewlet-nav-group__label">{words}</span>
            </button>
          ) : named ? (
            <span className="crewlet-nav-group__label" id={id}>
              {words}
            </span>
          ) : null}
          {action ? (
            <button type="button" className="crewlet-nav-group__action" aria-label={action.label} onClick={action.onClick}>
              <span className="crewlet-nav-group__action-icon" aria-hidden>
                {action.icon}
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
      <GroupLocked.Provider value={groupLocked}>
        <GroupFolded.Provider value={folded}>{children}</GroupFolded.Provider>
      </GroupLocked.Provider>
    </div>
  );
}

/**
 * A figure at the end of a row, drawn for the eye and hidden from assistive
 * technology: what it says is read in words at the end of the row's label
 * (`spoken`), so each reader is told it once.
 */
function Figure({ figure, className, mark }: { figure: NavFigure; className: string; mark?: ReactNode }) {
  return (
    <span className={className} aria-hidden>
      <span className="crewlet-nav-item__figure">
        {mark ? <span className="crewlet-nav-item__mark">{mark}</span> : null}
        {figure.value}
      </span>
    </span>
  );
}

/**
 * What a row's figures say, as the end of its name: ", 12 open, 2 unread".
 *
 * ONE STRING, INSIDE THE LABEL, rather than a sentence beside each figure. A
 * name is assembled from the row's parts, and a part laid out as a box (every
 * figure is an inline flex box) is joined to its neighbour with a space: a
 * comma written at the head of the figure's own sentence was read "Inbox , 5
 * unread". Written after the label's last word, in the same box, the comma
 * lands where it belongs and the pause it buys falls between the destination
 * and its figures.
 */
function spoken(figures: (NavFigure | undefined)[]): string {
  return figures
    .filter((figure): figure is NavFigure => figure !== undefined)
    .map((figure) => `, ${String(figure.value)} ${figure.label}`)
    .join('');
}

/** One row: a glyph, a label, an optional badge, and optionally rows beneath. */
export function NavItem({
  label,
  icon,
  lead,
  count,
  badge,
  href,
  current = false,
  disabledReason,
  locked,
  unread = false,
  muted = false,
  title,
  onPrefetch,
  renderLink,
  onClick,
  children,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  expandLabel,
  className,
}: NavItemProps) {
  const id = useId();
  const inLockedGroup = useContext(GroupLocked);
  const inFoldedGroup = useContext(GroupFolded);
  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const open = expanded ?? ownExpanded;
  const nested = children !== undefined && children !== null && children !== false;
  const inert = disabledReason !== undefined;
  const calling = unread && !muted;

  // A FOLDED GROUP KEEPS WHAT THE READER MUST NOT LOSE: the row they are on,
  // and the rows with news they have not muted. Every other row is not drawn
  // at all, so it is out of the tab order and the tree as well as the picture.
  if (inFoldedGroup && !current && !calling) return null;

  // The row's state in words, after its figures: ", unread" only where no
  // figure already says what is waiting.
  const state = muted ? ', muted' : calling && !count && !badge ? ', unread' : '';

  function toggle(): void {
    const next = !open;
    if (expanded === undefined) setOwnExpanded(next);
    onExpandedChange?.(next);
  }

  const inside = (
    <>
      {icon ? (
        <span className="crewlet-nav-item__icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      {lead ? <KeyChip className="crewlet-nav-item__lead">{lead}</KeyChip> : null}
      {/* A space the layout ignores and a name reads: a flex container draws
          no whitespace between its items, and without it the chip and the
          label run together into "ENGCore platform". */}
      {lead ? ' ' : null}
      <span className="crewlet-nav-item__label">
        <LockedLabel reason={locked} mark={!inLockedGroup}>
          {label}
        </LockedLabel>
        {count || badge || state ? <VisuallyHidden>{`${spoken([count, badge])}${state}`}</VisuallyHidden> : null}
      </span>
      {count ? <Figure figure={count} mark={count.mark} className="crewlet-nav-item__count" /> : null}
      {badge ? (
        <Figure
          figure={badge}
          className={cx('crewlet-nav-item__badge', badge.tone === 'quiet' && 'crewlet-nav-item__badge--quiet')}
        />
      ) : null}
    </>
  );

  const rowClass = cx('crewlet-nav-item__row', HIT_AREA_CLASS);
  let row: ReactNode;
  if (inert) {
    /*
     * A span carrying the link ROLE rather than an anchor, because an anchor
     * with no href is announced as plain text and is not keyboard reachable at
     * all. The role stays `link` rather than becoming a button: what the row
     * is, is a destination, and one that cannot be reached yet is still a
     * destination. `title` as well as the described reason, because a pointer
     * reader has no other way to learn why the row does nothing.
     */
    row = (
      <span
        className={rowClass}
        role="link"
        aria-disabled="true"
        aria-describedby={`${id}-reason`}
        tabIndex={0}
        title={disabledReason}
      >
        {inside}
      </span>
    );
  } else if (renderLink) {
    row = renderLink({
      className: rowClass,
      children: inside,
      ...(href === undefined ? {} : { href }),
      ...(current ? { 'aria-current': 'page' as const } : {}),
      ...(onClick === undefined ? {} : { onClick }),
      ...(title === undefined ? {} : { title }),
      ...(onPrefetch === undefined ? {} : { onPointerEnter: onPrefetch, onFocus: onPrefetch }),
    });
  } else if (href !== undefined) {
    row = (
      <a
        className={rowClass}
        href={href}
        aria-current={current ? 'page' : undefined}
        onClick={onClick}
        title={title}
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
      >
        {inside}
      </a>
    );
  } else {
    /*
     * No destination: the row IS the control. With nested rows it is the one
     * that expands them, so a group header needs no second control beside it.
     */
    row = (
      <button
        type="button"
        className={rowClass}
        aria-current={current ? 'page' : undefined}
        aria-expanded={nested ? open : undefined}
        aria-controls={nested ? `${id}-children` : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (nested) toggle();
        }}
      >
        {inside}
        {nested ? (
          <span className={cx('crewlet-nav-item__chevron', open && 'crewlet-nav-item__chevron--open')} aria-hidden>
            <ChevronDownGlyph size="sm" />
          </span>
        ) : null}
      </button>
    );
  }

  // A row that navigates AND expands needs two controls: one destination, one
  // disclosure. Nesting the second inside the first is the defect this avoids,
  // because a button inside a link is reachable by neither cleanly.
  const separateToggle = nested && (renderLink !== undefined || href !== undefined) && !inert;

  return (
    // NO SECOND MARK OF THE CURRENT ROW HERE. The style is drawn from
    // `aria-current` on the row itself, which is what keeps the picture and
    // what a screen reader is told from coming apart; a `data-current` beside
    // it would be a second answer to one question, and the first stylesheet to
    // read the wrong one is the one that disagrees.
    <div
      className={cx(
        'crewlet-nav-item',
        calling && 'crewlet-nav-item--unread',
        muted && 'crewlet-nav-item--muted',
        className,
      )}
    >
      <div className="crewlet-nav-item__head">
        {row}
        {separateToggle ? (
          <button
            type="button"
            className="crewlet-nav-item__toggle"
            aria-expanded={open}
            aria-controls={`${id}-children`}
            // Named from the row's own label where it is a word, so a rail with
            // three expandable rows does not offer three controls with one name.
            aria-label={expandLabel ?? (typeof label === 'string' ? `${label} sections` : 'Sections')}
            onClick={toggle}
          >
            <span className={cx('crewlet-nav-item__chevron', open && 'crewlet-nav-item__chevron--open')} aria-hidden>
              <ChevronDownGlyph size="sm" />
            </span>
          </button>
        ) : null}
      </div>
      {inert ? <VisuallyHidden id={`${id}-reason`}>{disabledReason}</VisuallyHidden> : null}
      {nested ? (
        <div className="crewlet-nav-item__children" id={`${id}-children`} hidden={!open}>
          <GroupFolded.Provider value={false}>{children}</GroupFolded.Provider>
        </div>
      ) : null}
    </div>
  );
}

SidebarNav.Group = NavGroup;
SidebarNav.Item = NavItem;
