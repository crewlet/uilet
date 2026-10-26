/**
 * Moving a page to another subject of the same kind: one project for another,
 * or for all of them.
 *
 * # One panel, three places
 *
 * ANCHORED under its button where the page names its subject, which is a
 * breadcrumb's heading (`Breadcrumb`'s `current`): the reader changes the
 * subject where the subject is named. CENTRED over the page when it is opened
 * by a key from a page with no such button, and nothing behind it moves until
 * a row is chosen. A SHEET from the bottom edge below the phone breakpoint,
 * whichever of the two it would otherwise be, because a thumb reaches the
 * bottom of a phone and a panel hung from a heading at the top of one leaves
 * no room for the keyboard.
 *
 * # It is a combobox in a dialog
 *
 * Focus stays in the search field and the arrows move a highlight through the
 * rows, which the field names with `aria-activedescendant`, so a screen reader
 * hears each row as it is reached. The rows are options in ONE listbox: the
 * pinned row, the rows a message offers, the groups, and the footer's actions,
 * which sit in their own band below the scrolling list and are owned by the
 * listbox (`aria-owns`) so the arrows walk into them without a second list.
 *
 * # Every row that goes somewhere is a link
 *
 * A row with an `href` is an anchor, so a middle click and a Command or Control
 * click open it in a new tab as every link does, and Command or Control with
 * Enter does the same from the keyboard. The panel stays open for all three:
 * the reader asked for another tab, not to leave this one.
 *
 * # A held row stays, with its reason
 *
 * A row the reader cannot take right now (New project, for a viewer without
 * the credential) is drawn with the reason at its end and passed over by the
 * arrows. A row that vanished would be one the reader could not know exists.
 *
 * # Leaving it
 *
 * Escape closes it and puts focus back on its button. Tab from the anchored
 * panel closes it and carries on to whatever follows the button, which is
 * what Tab from the button would have reached; a centred panel or a sheet is a
 * modal surface and keeps Tab inside. Taking a row puts focus back on the
 * button, which is the page's heading, so the reader stays on the name of the
 * place they just moved to.
 *
 * IT KNOWS NOTHING ABOUT PROJECTS. The caller searches, ranks and groups, and
 * hands over rows and the words around them; this owns the surface, the keys,
 * and how a screen reader hears it.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronDownGlyph, SearchGlyph } from '@crewlethq/icons/glyphs';
import { breakpoint } from '@crewlethq/tokens';
import { announce } from '../Announcer/index.js';
import { Input } from '../Input/index.js';
import { KeyChip } from '../KeyChip/index.js';
import { focusables, isComposing } from '../Layer/index.js';
import { useListbox, useOptionKeys } from '../Listbox/index.js';
import { Modal } from '../Modal/index.js';
import { Popover } from '../Popover/index.js';
import { Skeleton } from '../Skeleton/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import { highlightMatch } from '../utils/highlight.js';
import { returnFocus } from '../utils/focusModality.js';
import { useMediaMatch } from '../MediaMatch/index.js';

/** Where the panel opens. Derived, never asked for: see the component doc. */
export type SwitcherPlacement = 'anchored' | 'centered' | 'sheet';

export interface SwitcherOption {
  /** Stable across a re-query: it keys the row and names its option element. */
  id: string;
  /** The row's words. Plain text, so a search's letters can be drawn bold in it. */
  label: string;
  /** A project's key, drawn as a `KeyChip` in the lead column. */
  keyChip?: string | undefined;
  /** A glyph in the lead column, for a row that is not a project. Decorative. */
  icon?: ReactNode;
  /** A short figure at the row's end, in the quiet ink: a project's open count. */
  meta?: ReactNode;
  /**
   * What a screen reader calls the row where its words alone do not say it:
   * "Product and Engineering, FAIR, 4 open" rather than a name followed by a
   * bare figure.
   */
  accessibleLabel?: string | undefined;
  /**
   * Where the row goes. A row with one is a link: a middle click, a Command or
   * Control click, and Command or Control with Enter open it in a new tab.
   */
  href?: string | undefined;
  /** The subject the page is on now: outlined in the accent, and `aria-current="page"`. */
  current?: boolean | undefined;
  /** Why the row cannot be taken right now. Drawn at its end; the arrows pass over it. */
  held?: string | undefined;
  /** Taking the row. Without one, a row with an `href` follows it. */
  onSelect?: (() => void) | undefined;
  /**
   * Taking the row leaves the panel open: an action on the list itself, such
   * as asking for it again after it did not load, where closing would take
   * the answer away from the reader who asked for it.
   */
  keepsOpen?: boolean | undefined;
}

export interface SwitcherGroup {
  id: string;
  /** The heading over the group, and the name a screen reader gives it. */
  label: string;
  /** A figure at the heading's end: how many rows the group holds. */
  count?: number | undefined;
  options: SwitcherOption[];
}

/**
 * A state the list is in, said in the panel: nothing matches, nothing loaded,
 * nothing exists yet. Its actions are rows, where the arrows reach them.
 */
export interface SwitcherMessage {
  title: string;
  body?: string | undefined;
  actions?: SwitcherOption[] | undefined;
}

/** The button the panel opens from, drawn as the page's own name. */
export interface SwitcherTrigger {
  /** The subject's name. */
  label: string;
  /** Its key, drawn as a `KeyChip` before the name. */
  keyChip?: string | undefined;
  /** Drawn after the name: a `Tag` saying the subject is archived. */
  tag?: ReactNode;
  /** The name in the mono face: an identifier still waiting for its name. */
  mono?: boolean | undefined;
  /** The tooltip: what the button does and the key that does it from anywhere. */
  title?: string | undefined;
}

export interface SwitcherProps {
  /** Names the panel, "Switch project"; a sheet draws it as its title. */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The button the panel hangs from, drawn where the switcher is rendered.
   * Without one the panel opens centred over the page.
   */
  trigger?: SwitcherTrigger | undefined;
  query: string;
  onQueryChange: (query: string) => void;
  /** The field's placeholder, and its name: "Find a project". */
  placeholder?: string | undefined;
  /** Names the list of rows: "Projects". */
  listLabel?: string | undefined;
  /** The row that is always first and never matched: "All projects". */
  pinned?: SwitcherOption | undefined;
  /** A line about the list itself, under the pinned row: "200 of 340 listed." */
  note?: string | undefined;
  message?: SwitcherMessage | undefined;
  groups?: SwitcherGroup[] | undefined;
  /** Actions in a band under the list that does not scroll: "Browse all projects". */
  footer?: SwitcherOption[] | undefined;
  /** Placeholder rows in place of the groups, while the rows are on their way. */
  loading?: boolean | undefined;
  /** What a screen reader is told while loading: "Loading projects". */
  loadingLabel?: string | undefined;
  /** Said politely whenever it changes: "3 projects". */
  announcement?: string | undefined;
  className?: string | undefined;
}

const PHONE = `(width < ${breakpoint.phone})`;
const TOUCH = '(pointer: coarse)';
/** How far the anchored panel stands under its button, in pixels. */
const DROP = 6;
/** The names a loading list's placeholder rows stand for, in pixels. */
const SKELETON_NAMES = [72, 128, 96, 150, 110, 84];

export function Switcher({ label, open, onOpenChange, trigger, className, ...panel }: SwitcherProps) {
  const phone = useMediaMatch(PHONE);
  const touch = useMediaMatch(TOUCH);
  const triggerId = useId();
  const body = useRef<HTMLDivElement | null>(null);
  const shift = useRef(0);
  const place: SwitcherPlacement = phone ? 'sheet' : trigger ? 'anchored' : 'centered';

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  // NO KEYBOARD OVER THE LIST ON A TOUCH SCREEN: a panel a tap opened starts
  // on itself, and the field takes focus when it is tapped.
  const initialFocus = useCallback(() => (touch ? body.current : null), [touch]);

  /*
   * EVERY ROW'S LEAD COLUMN UNDER THE BUTTON'S OWN KEY. The distance is the
   * button's padding against the panel's border, the list's inset and the
   * row's, all of which move with the density, so it is measured on every
   * placement rather than written down. A panel with no lead column at the
   * moment (a list still loading its first answer) keeps the last distance,
   * so it does not jump sideways when the rows arrive.
   */
  const alignUnder = useCallback((surface: HTMLElement, anchor: HTMLElement) => {
    const mark = anchor.querySelector('.crewlet-key-chip, .crewlet-switcher-trigger__label');
    const lead = surface.querySelector('.crewlet-switcher__lead');
    if (mark && lead) {
      const from = mark.getBoundingClientRect().left - anchor.getBoundingClientRect().left;
      const to = lead.getBoundingClientRect().left - surface.getBoundingClientRect().left;
      shift.current = from - to;
    }
    return shift.current;
  }, []);

  function done() {
    close();
    if (place === 'anchored') returnFocus(document.getElementById(triggerId));
  }

  // ON TO WHAT FOLLOWS THE BUTTON, the stop Tab would have reached from it; or
  // back to the button itself.
  function leave(back: boolean) {
    const button = document.getElementById(triggerId);
    close();
    if (!button) return;
    const surface = body.current;
    const next = back
      ? undefined
      : focusables(document.body).find(
          (el) =>
            (button.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
            !button.contains(el) &&
            !surface?.contains(el),
        );
    (next ?? button).focus();
  }

  const content = (
    <SwitcherPanel
      {...panel}
      panelRef={body}
      onDone={done}
      onLeave={place === 'anchored' ? leave : undefined}
    />
  );

  if (place === 'anchored' && trigger) {
    return (
      <Popover
        label={label}
        open={open}
        onOpenChange={(next) => onOpenChange(next)}
        alignOffset={alignUnder}
        sideOffset={DROP}
        initialFocus={initialFocus}
        className={cx('crewlet-switcher', 'crewlet-switcher--anchored', className)}
        trigger={(isOpen, toggle) => (
          <SwitcherButton {...trigger} id={triggerId} expanded={isOpen} onToggle={toggle} onOpen={() => onOpenChange(true)} />
        )}
      >
        {content}
      </Popover>
    );
  }

  return (
    <>
      {trigger ? (
        <SwitcherButton
          {...trigger}
          id={triggerId}
          expanded={open}
          onToggle={() => onOpenChange(!open)}
          onOpen={() => onOpenChange(true)}
        />
      ) : null}
      <Modal
        open={open}
        onClose={close}
        placement={place === 'sheet' ? 'bottom' : 'top'}
        // A sheet names itself in its head, beside the close control a thumb
        // needs; a centred panel is named and closed by its keys alone.
        title={place === 'sheet' ? label : undefined}
        ariaLabel={label}
        showCloseButton={place === 'sheet'}
        flush
        initialFocus={initialFocus}
        className={cx('crewlet-switcher', `crewlet-switcher--${place}`, className)}
      >
        {content}
      </Modal>
    </>
  );
}

interface SwitcherButtonProps extends SwitcherTrigger, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'id'> {
  id: string;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

/**
 * The page's name as the button that switches it: the key, the name, a tag,
 * and a chevron that turns while the panel is open. No box at rest; the hover
 * fill stays while the panel is open.
 *
 * Rest props come from the Popover, which names the panel this controls.
 */
const SwitcherButton = forwardRef<HTMLButtonElement, SwitcherButtonProps>(function SwitcherButton(
  { label, keyChip, tag, mono, title, id, expanded, onToggle, onOpen, ...rest },
  ref,
) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      {...rest}
      ref={ref}
      id={id}
      title={title}
      className={cx('crewlet-switcher-trigger', mono && 'is-mono')}
      onClick={onToggle}
      onKeyDown={(event) => {
        // DOWN OPENS IT, as it opens every list a button offers.
        if (event.key !== 'ArrowDown' || expanded || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        onOpen();
      }}
    >
      {/* The spaces reach the button's name and nothing else: between two
          flex items they are not drawn. */}
      {keyChip ? (
        <>
          <KeyChip>{keyChip}</KeyChip>{' '}
        </>
      ) : null}
      <span className="crewlet-switcher-trigger__label">{label}</span>
      {tag !== undefined ? (
        <>
          {' '}
          <span className="crewlet-switcher-trigger__tag">{tag}</span>
        </>
      ) : null}
      <ChevronDownGlyph size="sm" className="crewlet-switcher-trigger__chevron" aria-hidden="true" />
    </button>
  );
});

interface SwitcherPanelProps extends Omit<SwitcherProps, 'label' | 'open' | 'onOpenChange' | 'trigger' | 'className'> {
  panelRef: RefObject<HTMLDivElement | null>;
  /** A row was taken: close, and put focus where the reader will look next. */
  onDone: () => void;
  /** Tab, from an anchored panel: close and carry on, or come back to the button. */
  onLeave?: ((back: boolean) => void) | undefined;
}

function SwitcherPanel({
  query,
  onQueryChange,
  placeholder = 'Search',
  listLabel,
  pinned,
  note,
  message,
  groups = [],
  footer = [],
  loading = false,
  loadingLabel = 'Loading',
  announcement,
  panelRef,
  onDone,
  onLeave,
}: SwitcherPanelProps) {
  const id = useId();
  const footerId = `${id}-footer`;
  const noteId = `${id}-note`;
  const titleId = `${id}-message`;
  const bodyId = `${id}-message-body`;

  // One list, in the order the arrows walk it, so an option's index and its
  // place on screen are one number rather than two that have to agree.
  const flat = useMemo(
    () => [...(pinned ? [pinned] : []), ...(message?.actions ?? []), ...groups.flatMap((group) => group.options), ...footer],
    [pinned, message, groups, footer],
  );
  const held = useCallback((index: number) => Boolean(flat[index]?.held), [flat]);

  const listbox = useListbox({
    id,
    open: true,
    count: flat.length,
    // The surface around the list owns Escape and a press outside it.
    popup: false,
    // ENTER TAKES A ROW THE WAY A PRESS DOES: through the row's own click, so
    // a link with nothing else to do is followed as a link.
    onCommit: (index) => document.getElementById(listbox.optionId(index))?.click(),
    onClose: onDone,
  });
  const keys = useOptionKeys({ listbox, count: flat.length, disabled: held, ends: false });
  const { active, setActive } = listbox;
  const { step } = keys;

  // A HELD ROW NEVER CARRIES THE HIGHLIGHT, however the list changed under it.
  useEffect(() => {
    if (active >= 0 && held(active)) setActive(step(active, 1));
  }, [active, held, setActive, step]);

  // WHILE THE ROWS ARE ON THEIR WAY, NOTHING IS HIGHLIGHTED: the one row
  // there is to take is the footer's, and Enter on it is not what a reader who
  // opened the list to switch meant. The first row leads once they arrive.
  useEffect(() => setActive(loading ? -1 : 0), [loading, setActive]);

  useEffect(() => {
    if (announcement) announce(announcement);
  }, [announcement]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isComposing(event)) return;
    if (keys.onKeyDown(event)) return;
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
      const option = flat[active];
      if (option?.href && !option.held) {
        event.preventDefault();
        window.open(option.href, '_blank', 'noopener');
      }
      return;
    }
    if (listbox.onKeyDown(event)) return;
    if (event.key === 'Tab' && onLeave && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      onLeave(event.shiftKey);
    }
  }

  function onRowClick(event: MouseEvent<HTMLElement>, option: SwitcherOption) {
    if (option.held) {
      event.preventDefault();
      return;
    }
    // A NEW TAB OR WINDOW IS THE BROWSER'S, and the panel stays as it was.
    if (option.href && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    if (option.onSelect) event.preventDefault();
    if (!option.keepsOpen) onDone();
    option.onSelect?.();
  }

  let index = -1;
  function row(option: SwitcherOption, highlight: boolean) {
    index += 1;
    const mine = index;
    const name =
      option.accessibleLabel && option.held ? `${option.accessibleLabel}, ${option.held}` : option.accessibleLabel;
    const props = {
      id: listbox.optionId(mine),
      role: 'option',
      className: cx('crewlet-listbox__option', 'crewlet-switcher__option', option.current && 'is-current'),
      'aria-selected': mine === active,
      'aria-current': option.current ? ('page' as const) : undefined,
      'aria-disabled': option.held ? true : undefined,
      'aria-label': name,
      // The press is prevented so focus stays in the field; a middle press is
      // left alone, because it is what opens a link in a new tab.
      onMouseDown: (event: MouseEvent<HTMLElement>) => {
        if (event.button === 0) event.preventDefault();
      },
      onMouseEnter: () => {
        if (!option.held) setActive(mine);
      },
      onClick: (event: MouseEvent<HTMLElement>) => onRowClick(event, option),
    };
    const words = (
      <>
        <span className="crewlet-switcher__lead" aria-hidden={option.keyChip ? undefined : true}>
          {option.keyChip ? <KeyChip highlight={highlight ? query : undefined}>{option.keyChip}</KeyChip> : option.icon}
        </span>{' '}
        <span className="crewlet-switcher__label">
          {highlight ? highlightMatch(option.label, query, 'word', 'crewlet-switcher__match') : option.label}
        </span>
        {option.meta !== undefined || option.held ? (
          <>
            {' '}
            <span className="crewlet-switcher__meta">
              {option.meta}
              {option.held}
            </span>
          </>
        ) : null}
      </>
    );
    /*
     * NOT A TAB STOP, either way: focus never leaves the field, so a row is
     * reached by the arrows and the pointer. A combobox points at its active
     * option with `aria-activedescendant`, which requires that the option
     * never take focus itself, and the key that takes a row (Enter) is handled
     * on the field. The suite's axe run is what holds the panel accessible.
     */
    return option.href && !option.held ? (
      <a key={option.id} {...props} href={option.href} tabIndex={-1}>
        {words}
      </a>
    ) : (
      <div key={option.id} {...props}>
        {words}
      </div>
    );
  }

  const follows = Boolean(note || message || groups.length > 0 || loading);
  const describedBy = [note ? noteId : '', message ? titleId : '', message?.body ? bodyId : ''].filter(Boolean).join(' ');

  return (
    <div ref={panelRef} className="crewlet-switcher__panel" tabIndex={-1}>
      <Input
        appearance="command"
        containerClassName="crewlet-switcher__search"
        // The rows' glyph step, so the field's glyph is the lead column's
        // glyph (see `.crewlet-switcher__search`).
        leading={<SearchGlyph size="md" />}
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          // A new query is a new list: its best match leads it.
          setActive(0);
        }}
        onClear={() => {
          onQueryChange('');
          setActive(0);
        }}
        clearLabel="Clear the search"
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-label={placeholder}
        aria-expanded
        aria-controls={listbox.listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? listbox.optionId(active) : undefined}
        aria-describedby={describedBy || undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {/* THE ONE SCROLLER: the search above it and the footer below it stay
          put, and the listbox keeps the highlighted row in view inside it. */}
      <div className="crewlet-switcher__scroller" ref={listbox.listRef}>
        <div
          id={listbox.listId}
          role="listbox"
          aria-label={listLabel}
          aria-owns={footer.length > 0 ? footerId : undefined}
          aria-busy={loading || undefined}
          className="crewlet-switcher__list"
        >
          {pinned ? row(pinned, false) : null}
          {pinned && follows ? <div className="crewlet-listbox__separator" aria-hidden="true" /> : null}
          {/* Read from the field (`aria-describedby`), so presentation here. */}
          {note ? (
            <div role="presentation" id={noteId} className="crewlet-switcher__note">
              {note}
            </div>
          ) : null}
          {message ? (
            // A MESSAGE NAMES WHAT CAN BE DONE ABOUT IT: its actions are a group
            // labelled by it, so a row reached by the arrows is heard with it.
            <div role="group" aria-labelledby={titleId} aria-describedby={message.body ? bodyId : undefined}>
              <div role="presentation" className="crewlet-switcher__message">
                <span id={titleId} className="crewlet-switcher__message-title">
                  {message.title}
                </span>
                {message.body ? (
                  <span id={bodyId} className="crewlet-switcher__message-body">
                    {message.body}
                  </span>
                ) : null}
              </div>
              {(message.actions ?? []).map((option) => row(option, false))}
            </div>
          ) : null}
          {groups.map((group) => (
            // Named by its heading's own words, not the figure beside them.
            <div key={group.id} role="group" aria-labelledby={`${id}-group-${group.id}`}>
              <div role="presentation" className="crewlet-listbox__heading crewlet-switcher__heading">
                <span id={`${id}-group-${group.id}`}>{group.label}</span>
                {group.count !== undefined ? <span className="crewlet-switcher__count">{group.count}</span> : null}
              </div>
              {group.options.map((option) => row(option, true))}
            </div>
          ))}
        </div>
        {loading ? (
          <>
            {/* NO TOP MARGIN on a bar: a box skeleton stands 32px under what
                is above it by default, which put every bar on the bottom edge
                of its row, 16px under the line a row's words take. */}
            <div className="crewlet-switcher__skeleton" aria-hidden="true">
              {SKELETON_NAMES.map((width) => (
                <div key={width} className="crewlet-switcher__skeleton-row">
                  <span className="crewlet-switcher__lead">
                    <Skeleton variant="box" width={34} height={10} borderRadius={4} marginTop={0} />
                  </span>
                  <Skeleton variant="box" width={width} height={10} borderRadius={4} marginTop={0} />
                  <span className="crewlet-switcher__meta">
                    <Skeleton variant="box" width={14} height={10} borderRadius={4} marginTop={0} />
                  </span>
                </div>
              ))}
            </div>
            <VisuallyHidden>
              <span role="status">{loadingLabel}</span>
            </VisuallyHidden>
          </>
        ) : null}
      </div>
      {footer.length > 0 ? (
        <div id={footerId} role="group" className="crewlet-switcher__footer">
          {footer.map((option) => row(option, false))}
        </div>
      ) : null}
    </div>
  );
}
