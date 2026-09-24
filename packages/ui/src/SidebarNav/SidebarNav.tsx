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
 */

import { useId, useState, type MouseEventHandler, type ReactNode } from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface SidebarNavProps {
  /**
   * Names the navigation region. A page with two of them ("Sections" and
   * "This company") needs both named, or a screen reader offers a reader two
   * landmarks both called "navigation".
   */
  label: string;
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
  className?: string | undefined;
  children?: ReactNode;
}

/** What a caller is handed when it draws the row's element itself. */
export interface NavLinkProps {
  className: string;
  children: ReactNode;
  href?: string | undefined;
  'aria-current'?: 'page' | undefined;
  onClick?: MouseEventHandler<HTMLElement> | undefined;
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
   * cannot separate the hue. Anything else is a `count`.
   */
  badge?: NavFigure | undefined;
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
export function SidebarNav({ label, className, children }: SidebarNavProps) {
  return (
    <nav className={cx('crewlet-sidebar-nav', className)} aria-label={label}>
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
export function NavGroup({ label, action, className, children }: NavGroupProps) {
  const id = useId();
  const named = label !== undefined && label !== null && label !== false && label !== '';
  return (
    <div
      className={cx('crewlet-nav-group', className)}
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
          {named ? (
            <span className="crewlet-nav-group__label" id={id}>
              {label}
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
      {children}
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
  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const open = expanded ?? ownExpanded;
  const nested = children !== undefined && children !== null && children !== false;
  const inert = disabledReason !== undefined;

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
      {lead ? <span className="crewlet-nav-item__lead">{lead}</span> : null}
      {/* A space the layout ignores and a name reads: a flex container draws
          no whitespace between its items, and without it the chip and the
          label run together into "ENGCore platform". */}
      {lead ? ' ' : null}
      <span className="crewlet-nav-item__label">
        {label}
        {count || badge ? <VisuallyHidden>{spoken([count, badge])}</VisuallyHidden> : null}
      </span>
      {count ? <Figure figure={count} mark={count.mark} className="crewlet-nav-item__count" /> : null}
      {badge ? <Figure figure={badge} className="crewlet-nav-item__badge" /> : null}
    </>
  );

  const rowClass = 'crewlet-nav-item__row';
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
    });
  } else if (href !== undefined) {
    row = (
      <a className={rowClass} href={href} aria-current={current ? 'page' : undefined} onClick={onClick}>
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
    <div className={cx('crewlet-nav-item', className)}>
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
          {children}
        </div>
      ) : null}
    </div>
  );
}

SidebarNav.Group = NavGroup;
SidebarNav.Item = NavItem;
