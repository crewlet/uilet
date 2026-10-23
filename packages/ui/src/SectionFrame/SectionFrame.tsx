import {
  useId,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { SidebarNav } from '../SidebarNav/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

export interface SectionFrameProps {
  /**
   * The column's width, as a CSS length: `236px`, the rail's own. Handed in
   * rather than fixed, so the number an application counts for its own
   * layout (a peek's threshold) and the column drawn are one value.
   */
  columnWidth: string;
  /**
   * The column folds to a one-row picker over the body, which takes the
   * whole width. The APPLICATION decides when, because the width at which a
   * section beside the column becomes too narrow is its own arithmetic (its
   * rail, its sheet, the floor its sections need), and the same answer
   * usually decides something else too; a second measurement here would be a
   * second answer to one question.
   */
  folded?: boolean | undefined;
  /** A `SectionFrame.Nav` and a `SectionFrame.Body`. */
  children?: ReactNode;
  className?: string | undefined;
}

/**
 * A workspace's sections as a column beside the screen: a list of grouped
 * sections that stays put while the section beside it scrolls, and that
 * folds, where the window is too narrow for both, to one row naming the
 * section the reader is on.
 *
 * FLUSH WITH THE SHEET. In an `AppShell` the frame takes back the content
 * column's padding and gives it to the body, so the column runs the full
 * height of the view with its hairline, and the section keeps the screen's
 * own inset. The column is the view's height (`100cqb`, the shell's
 * scroller is a size container), never the section's, so it sticks for the
 * whole scroll and a long list scrolls inside itself.
 */
export function SectionFrame({ columnWidth, folded = false, className, children }: SectionFrameProps) {
  return (
    <div
      className={cx('crewlet-section-frame', className)}
      data-folded={folded || undefined}
      style={{ '--crewlet-section-frame-column': columnWidth } as CSSProperties}
    >
      {children}
    </div>
  );
}

export interface SectionFrameNavProps {
  /**
   * The workspace the sections belong to, by its name: "Settings". The list
   * is "Settings sections", and the folded picker reads "Settings Section:
   * People" to a screen reader.
   */
  scope: string;
  /** The section the reader is on, for the folded picker's row. */
  current?: { label: string; icon?: ReactNode } | undefined;
  /**
   * The address the reader is on, as the rows' own `href`s write it. A
   * change of it is an arrival: the picker folds again where the reader
   * picked a row of this list, and opens where `openOnArrival` asks.
   */
  location: string;
  /**
   * Arriving here opens the folded picker rather than folding it: the
   * workspace's own address on a phone, which names no section anybody
   * picked, where a folded row naming the first section hid every group
   * under it. A deep link to a section arrives folded, so the section it
   * named starts right under the picker.
   */
  openOnArrival?: boolean | undefined;
  /** The groups of rows: `SidebarNav.Group`s of `SidebarNav.Item`s. */
  children?: ReactNode;
}

/** The frame's column: the sections list, and the picker it folds to. */
export function SectionFrameNav({ scope, current, location, openOnArrival = false, children }: SectionFrameNavProps) {
  const [open, setOpen] = useState(openOnArrival);
  const [openedAt, setOpenedAt] = useState(location);
  // THE ADDRESS A PICK IN THIS LIST IS ON ITS WAY TO, so the arrival it
  // causes is told from one the reader did not make here (another way in,
  // Back): every pick folds the picker, the row the reader is already on
  // included, which moves no address.
  const [picked, setPicked] = useState<string | null>(null);
  if (openedAt !== location) {
    setOpenedAt(location);
    setOpen(picked !== location && openOnArrival);
    setPicked(null);
  }
  const listId = useId();
  function pick(event: MouseEvent<HTMLDivElement>): void {
    const link = (event.target as Element).closest('a[href]');
    if (!link) return;
    setOpen(false);
    const to = link.getAttribute('href');
    if (to !== null && to !== location) setPicked(to);
  }
  return (
    <div className="crewlet-section-frame__nav" data-open={open || undefined}>
      <button
        type="button"
        className="crewlet-section-frame__toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((was) => !was)}
      >
        {current?.icon ? (
          <span className="crewlet-section-frame__toggle-icon" aria-hidden="true">
            {current.icon}
          </span>
        ) : null}
        <span className="crewlet-section-frame__toggle-name">
          {current ? (
            <>
              {/* SAID, NOT ONLY SPOKEN: the row read "General" and nothing
                  else, which a reader takes for the section's title rather
                  than for a list of the others. */}
              {/* THE SPACES ARE TEXT OUTSIDE THE HIDDEN SPANS: a name is joined
                  from its parts, and a space inside one was dropped, which
                  read "SettingsSection:People". The dot is drawn, not read. */}
              <span className="crewlet-section-frame__toggle-prefix">
                <VisuallyHidden>{scope}</VisuallyHidden> Section
                <span aria-hidden="true"> ·</span>
                <VisuallyHidden>:</VisuallyHidden>
              </span>{' '}
              {current.label}
            </>
          ) : (
            `${scope} sections`
          )}
        </span>
        <ChevronDownGlyph size="xs" aria-hidden="true" className="crewlet-section-frame__chevron" />
      </button>
      {/* A PICK IS A PRESS ON ANY ROW'S LINK, read where it bubbles to, so the
          rows are the caller's own `SidebarNav.Item`s with nothing threaded
          through them. Not a control of its own: the links inside are. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div id={listId} className="crewlet-section-frame__list" onClick={pick}>
        <SidebarNav label={`${scope} sections`}>{children}</SidebarNav>
      </div>
    </div>
  );
}

export interface SectionFrameBodyProps {
  children?: ReactNode;
  className?: string | undefined;
}

/** The section beside the column, on the screen's own inset. */
export function SectionFrameBody({ children, className }: SectionFrameBodyProps) {
  return <div className={cx('crewlet-section-frame__body', className)}>{children}</div>;
}

SectionFrame.Nav = SectionFrameNav;
SectionFrame.Body = SectionFrameBody;
