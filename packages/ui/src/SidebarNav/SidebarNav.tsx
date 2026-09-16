/**
 * The rail's navigation: groups of rows, one of which says where the reader is.
 *
 * THE ROW THE READER IS ON IS THE ONE PLACE THE ACCENT APPEARS IN THE CHROME,
 * and it takes the accent twice over: the accent's soft tint as its ground,
 * and the accent ink for its label and its glyph. Position AND hue, so the row
 * is found at a glance by a reader who sees the hue and by one who does not.
 * `aria-current="page"` says the same thing to a screen reader, and the style
 * is drawn FROM that attribute, so the two cannot come apart. The stylesheet
 * carries why this replaced a one-pixel accent bar outside the row's edge.
 *
 * THE LINK ELEMENT BELONGS TO THE APPLICATION (`renderLink`). A router's own
 * link is what carries a client navigation and a leave guard; a plain anchor is
 * what carries a middle click into a new tab. Neither is right everywhere, so
 * neither is built in: the engine keeps plain anchors and the console passes
 * its router's NavLink.
 */

import { useId, useState, type MouseEventHandler, type ReactNode } from 'react';
import { KeyboardArrowDownGlyph } from '@crewlethq/icons/glyphs';
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

export interface NavGroupProps {
  /**
   * The group's heading. Without one the rows are simply a run of rows, and an
   * EMPTY one is without one: a rail whose first run has no name spells that
   * as `""`, and a heading box with no word in it is sixteen pixels of the
   * rail spent on nothing.
   */
  label?: ReactNode;
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
 * How loudly a row's badge is drawn.
 *
 * `neutral` is a quiet figure at the end of the row, in the row's own ink.
 * `attention` is the one badge in the chrome allowed a status hue: a count of
 * what is waiting on a person is the one thing that should pull the eye out of
 * whatever screen the reader is on. It is a tint behind a word rather than a
 * word in a hue, so it still reads to somebody who cannot separate the hue.
 *
 * A TONE RATHER THAN A COMPONENT THE CALLER PASSES IN, because the tint has to
 * clear its floor on the ground the ROW has, which is the accent tint on the
 * reader's own row. That is a fact about the rail, measured in the rail's own
 * stylesheet, and not something a call site can be asked to know.
 */
export type NavBadgeTone = 'neutral' | 'attention';

export interface NavItemProps {
  /** What the row is called. */
  label: ReactNode;
  /** The row's glyph. Decoration: the label beside it carries the meaning. */
  icon?: ReactNode;
  /**
   * A count or a state at the end of the row. The slot draws it: whatever is
   * passed contributes its text and the name a screen reader reads after the
   * row's own, so a `<Count>` here is a figure rather than a second pill.
   */
  badge?: ReactNode;
  /** How loudly. Neutral unless this row is what needs a person. */
  badgeTone?: NavBadgeTone | undefined;
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
export function NavGroup({ label, className, children }: NavGroupProps) {
  const id = useId();
  const named = label !== undefined && label !== null && label !== false && label !== '';
  return (
    <div
      className={cx('crewlet-nav-group', className)}
      // A group is only a group to a screen reader when it has a name; an
      // unnamed one would add a level to walk through that says nothing.
      role={named ? 'group' : undefined}
      aria-labelledby={named ? id : undefined}
    >
      {named ? (
        <div className="crewlet-nav-group__label" id={id}>
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** One row: a glyph, a label, an optional badge, and optionally rows beneath. */
export function NavItem({
  label,
  icon,
  badge,
  badgeTone = 'neutral',
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
      <span className="crewlet-nav-item__label">{label}</span>
      {badge ? (
        <span className={cx('crewlet-nav-item__badge', badgeTone === 'attention' && 'crewlet-nav-item__badge--attention')}>
          {badge}
        </span>
      ) : null}
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
            <KeyboardArrowDownGlyph size="sm" />
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
              <KeyboardArrowDownGlyph size="sm" />
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
