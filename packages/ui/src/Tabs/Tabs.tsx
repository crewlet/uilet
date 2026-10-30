import React, { useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { Count } from '../Count/index.js';
import { Menu, type MenuItem } from '../Menu/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
import { cx } from '../utils/cx.js';
import { useFold } from './fold.js';
import { tabStop, useRoving } from './roving.js';

/**
 * How the row is drawn. `pill` is a segmented well with a raised chip for the
 * one that is on; `underline` is a strip with a sliding bar, for a screen's
 * sections; `chip` is a row of quiet chips with no well, the one that is on
 * outlined in the accent, for the lenses beside an object's name in a bar.
 */
export type TabsVariant = 'pill' | 'underline' | 'chip';

export type TabsSize = 'sm' | 'md';

/**
 * What a row does with tabs it has no room for. `scroll` scrolls the row with
 * its bar hidden; `menu` draws the tabs that fit and folds the rest into a
 * "More" menu at the row's end.
 */
export type TabsOverflow = 'scroll' | 'menu';

export interface TabsItem {
  /** Stable identity: the value reported, and half of the tab's id. */
  value: string;
  /** Visible label text or node. */
  label: ReactNode;
  /** A glyph drawn before the label. A component, not a name. */
  icon?: ReactNode;
  /**
   * How many things are behind this tab. Drawn as a Count beside the label,
   * as it is given: a string is a figure the caller has already formatted
   * ("1.2k", "50+").
   */
  count?: number | string | null;
  /**
   * What needs the reader behind this tab, drawn after the label: problems
   * as a danger count, a warning or an unsaved change as a 6px dot. A danger
   * count replaces the tab's count while it is set, since two figures side by
   * side read as one; a dot sits after the count, since how many things are
   * behind a tab and whether one needs the reader are two facts ("Agents 5"
   * with a warning). `label` is what a screen reader hears.
   */
  marker?: TabsMarker | undefined;
  /**
   * What is happening behind the tab right now, IN WORDS ("running now"):
   * drawn as a pulsing dot in place of the icon and read after the label. The
   * words rather than a flag, so a tab cannot be marked without saying what
   * the mark means; folded into "More", they are the item's second line.
   */
  live?: string | undefined;
  /**
   * How the tab reads folded into "More", where `label` is a node (a label
   * drawn with a lock, say). A string `label` is used as it is.
   */
  menuLabel?: string | undefined;
  disabled?: boolean;
  /** Any extra props the consumer's renderItem needs to read. */
  [key: string]: unknown;
}

/**
 * A tab's marker. ONE PER TAB, the most urgent: a problem, then a warning,
 * then a change, so a row of tabs reads as "where is something wrong" first.
 */
export type TabsMarker =
  | { tone: 'danger'; count: number; label: string }
  | { tone: 'warning' | 'changed'; label: string };

export interface TabsRenderItemProps {
  item: TabsItem;
  /**
   * Base and state-modifier class for the tab. Apply it to the element you
   * render so the variant chrome stays consistent. In router mode the
   * consumer appends its own active modifier, because the URL is the source
   * of truth and the slider is measured from whichever child carries it.
   */
  className: string;
  /** True when `value === item.value`. */
  isActive: boolean;
  /** Calls onValueChange?.(item.value) when invoked. */
  onSelect: () => void;
  /** Pre-rendered icon, label and count nodes for the tab body. */
  children: ReactNode;
  /** Folded into "More" (overflow `menu`): drawn there, and kept here only to be measured. */
  folded: boolean;
  /**
   * SPREAD THESE on the element you render. A folded link stays in the row to
   * be measured, and these take it out of reach of the pointer, the keyboard
   * and a screen reader, which meet it in the menu instead. Empty while it is
   * drawn.
   */
  foldProps: TabsFoldProps;
}

/** What takes a folded item out of reach. See [TabsRenderItemProps.foldProps]. */
export interface TabsFoldProps {
  'aria-hidden'?: true;
  inert?: true;
}

const FOLDED: TabsFoldProps = { 'aria-hidden': true, inert: true };
const SHOWN: TabsFoldProps = {};

export interface TabsProps {
  items: TabsItem[];
  variant?: TabsVariant;
  size?: TabsSize;
  /** Names the row. A tab row with no name is announced as "tab list" alone. */
  ariaLabel?: string;
  /**
   * On the outermost element: the row; with overflow `menu` on a tab list, the
   * box holding the row and "More"; with `actions`, the bar holding both.
   */
  className?: string;
  /** Currently active item value. */
  value?: string;
  /** Fires when a tab is chosen. */
  onValueChange?: (value: string) => void;
  /**
   * The id of the [TabPanel] this row controls. With it every tab carries a
   * stable id and `aria-controls`, which is what lets a screen reader move
   * from a tab to the section it opens.
   */
  panelId?: string;
  /**
   * Render each item yourself, for a row of ROUTER LINKS. The root becomes a
   * `nav` and nothing carries a tab role: a link that navigates is not a tab,
   * and a screen reader told otherwise looks for a panel that never arrives.
   */
  renderItem?: (props: TabsRenderItemProps) => ReactNode;
  /**
   * Drawn inside the row after the last item, ROUTER MODE ONLY: the menu a
   * navigation row folds its overflow into ("More"), or a note about every
   * section. It is part of the navigation landmark, so a screen reader meets
   * it with the links it continues. A tab list holds tabs alone, so a row
   * without `renderItem` ignores it.
   */
  trailing?: ReactNode;
  /**
   * Controls at the row's far end that act on the screen the tabs belong to,
   * such as "Check now" or "New", in EITHER MODE.
   *
   * BESIDE THE ROW, NEVER IN IT. A tab list holds tabs alone, so the actions
   * are the row's next sibling in one bar, and a screen reader meets the tab
   * list and then the buttons, as the keyboard does: one stop for the tabs,
   * then each action. In router mode they stand outside the navigation
   * landmark for the same reason: an action is not a place.
   *
   * THE TABS GIVE WAY FIRST. The actions keep their own width at every size;
   * the row takes what is left, and scrolls or folds into "More" inside it,
   * so its slider and its fold are measured in that room.
   */
  actions?: ReactNode;
  /**
   * What the row does with tabs it has no room for. `scroll` (the default)
   * scrolls it. `menu` draws the tabs that FIT, in order, and folds the rest
   * into a "More" menu at its end, each entry with its figure; the tab the
   * reader is on is always drawn, taking the last place that fits. The widths
   * are measured, not guessed, and measured again whenever anything in the
   * row changes size. Choosing an entry calls `onValueChange`, in router mode
   * too, where it is the consumer's navigation.
   */
  overflow?: TabsOverflow | undefined;
  /** The "More" trigger's words. */
  moreLabel?: string | undefined;
  /** The menu's accessible name. Defaults to "More of" the row's `ariaLabel`. */
  moreMenuLabel?: string | undefined;
  /**
   * A sentence about every tab, at the row's far end, overflow `menu` only.
   * It GIVES WAY TO THE TABS: drawn only where every tab fits beside it, and
   * gone before a single tab folds, because a tab is a place and the note is
   * not.
   */
  note?: ReactNode;
  /**
   * The row's root element, for a consumer that measures the row: which of
   * its items fit, and what folds into its trailing menu.
   */
  ref?: Ref<HTMLElement> | undefined;
}

/** A tab's figure, as a menu entry's hint: a number in the reader's own grouping, a string as given. */
function figureOf(count: TabsItem['count']): string | undefined {
  if (count === null || count === undefined || count === '') return undefined;
  return typeof count === 'number' ? count.toLocaleString() : count;
}

/**
 * The id of the tab that labels a tab panel, so a panel and the row that
 * controls it agree on it without passing ids between them.
 */
export function tabId(panelId: string, value: string): string {
  return `${panelId}-tab-${value}`;
}

/**
 * Bring the active tab into the row's OWN visible range.
 *
 * The underline row scrolls, so a screen whose current section is the eighth
 * of ten opened with that tab and its bar past the end of the row and nothing
 * on screen saying the row went further.
 *
 * It moves the row's own scrollLeft rather than calling `scrollIntoView`,
 * which walks every scrolling ancestor and would pull the page sideways under
 * a reader who is looking at something else. And it moves only when the tab
 * is actually outside, so a reader who has scrolled the row themselves is not
 * dragged back on the next render.
 */
function reveal(nav: HTMLElement) {
  const active = nav.querySelector<HTMLElement>('.crewlet-tabs__tab.is-active');
  if (!active) return;
  const row = nav.getBoundingClientRect();
  const tab = active.getBoundingClientRect();
  if (tab.left < row.left) nav.scrollLeft -= row.left - tab.left;
  else if (tab.right > row.right) nav.scrollLeft += tab.right - row.right;
}

/**
 * The in-page sections a screen owns, as the ARIA tabs pattern with MANUAL
 * activation.
 *
 * WHAT CHANGED. Every tab was a tab stop and no arrow key did anything, so a
 * keyboard user walked an eight-tab row with eight presses of Tab and a
 * screen reader was told a list of eight independent buttons. It is one stop
 * now: the arrows, Home and End move focus along the row and Enter or Space
 * selects, which a real button already turns into its own click.
 *
 * SELECTION DOES NOT FOLLOW FOCUS. A tab is a section, and in this product a
 * section pushes a history entry: a row that selected on every arrow press
 * left one entry per keystroke for Back to walk through.
 *
 * AND NO `aria-current`. A tab says which one is chosen with
 * `aria-selected`; `aria-current="page"` on top of it told a screen reader
 * the tab was the page the reader was on, which is what a navigation link
 * says. In router mode that IS what the items are, so the root becomes a
 * `nav`, the tab roles go, and the consumer's own link carries the state.
 */
export function Tabs({
  items,
  variant = 'pill',
  size = 'md',
  ariaLabel,
  className = '',
  value,
  onValueChange,
  panelId,
  renderItem,
  trailing,
  actions,
  overflow = 'scroll',
  moreLabel = 'More',
  moreMenuLabel,
  note,
  ref,
}: TabsProps) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const folding = overflow === 'menu';
  // A tab list holds tabs alone, so "More" stands beside it in a box of its
  // own; a row of links holds its menu itself.
  const boxed = folding && !renderItem;
  // Actions stand beside the row in a bar, which then carries `className`.
  const barred = actions !== undefined && actions !== null && actions !== false;
  useImperativeHandle(ref, () => (boxed ? boxRef.current : navRef.current) as HTMLElement, [boxed]);
  const { buttons, onKeyDown } = useRoving(items.length, null);
  const fold = useFold(
    folding,
    boxed ? boxRef : navRef,
    navRef,
    items.map((item) => item.value),
    value,
    barred,
  );
  const isFolded = (item: TabsItem) => fold.folded.includes(item.value);

  /*
   * Slider-position effect. Runs only for the underline variant. It reads the
   * active tab's rectangle relative to the row and writes the two custom
   * properties the sliding bar is drawn from. The slider starts at width 0, so
   * it is invisible before the first measurement and needs no separate flag.
   *
   * Mutation observation is scoped to each tab NODE, not to the row with
   * `subtree: true`. Watching the row that way makes every attribute write on
   * the row itself, including this effect's own, re-fire the callback in a
   * chain with React's commit phase, which deadlocked the page tab in Chrome.
   * Per-tab observers see only the className changes that matter (a router
   * link toggling its active class) and never this effect's own writes.
   *
   * ResizeObserver is FEATURE-CHECKED. It is not in jsdom, so an unguarded
   * `new ResizeObserver` throws in every suite that renders a tab row, and it
   * is absent in older embedded browsers, where the throw takes the page.
   *
   * THE OFFSET IS MEASURED PAST THE SCROLL. The underline row is a scroller,
   * and the bar is drawn inside it, so it travels with the content: a
   * viewport difference alone is the content offset MINUS how far the row is
   * scrolled, and a bar placed at that and then carried by the scroll lands
   * two scroll lengths to the left of its own tab. Adding scrollLeft back
   * makes the property the content offset, which is the one number that does
   * not change as the row moves, so nothing has to listen for a scroll.
   */
  useLayoutEffect(() => {
    if (variant !== 'underline') return;
    const nav = navRef.current;
    if (!nav) return;

    const update = () => {
      const active = nav.querySelector<HTMLElement>('.crewlet-tabs__tab.is-active');
      if (!active) {
        nav.style.setProperty('--crewlet-tabs-slider-width', '0px');
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const left = activeRect.left - navRect.left + nav.scrollLeft;
      nav.style.setProperty('--crewlet-tabs-slider-left', `${left}px`);
      nav.style.setProperty('--crewlet-tabs-slider-width', `${activeRect.width}px`);
    };

    update();
    reveal(nav);

    const mutation = new MutationObserver(update);
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    /*
     * THE TABS THEMSELVES, not only the row they sit in. `update` measures the
     * ACTIVE TAB's box, and neither watcher could see that box change: the
     * mutation observer is filtered to `class`, so it catches the active
     * toggle and not a label being rewritten, and the row's own border box is
     * pinned by `width: 100%` with the scrolling inside it — a tab growing
     * moves the row's scrollWidth and never its border box, so a resize
     * observer on the row alone never fires. That left the slider correct only
     * for the changes that arrive as a new `items` array, which the deps below
     * already cover, and wrong for every one that does not: a label loaded
     * late, a count appearing beside it, a font settling.
     */
    nav.querySelectorAll<HTMLElement>('.crewlet-tabs__tab').forEach((tab) => {
      mutation.observe(tab, { attributes: true, attributeFilter: ['class'] });
      resize?.observe(tab);
    });

    // The row's own width still matters: it decides where the tabs sit.
    resize?.observe(nav);

    return () => {
      mutation.disconnect();
      resize?.disconnect();
    };
    // `barred`: the row's box changes with the actions beside it, and an
    // environment without ResizeObserver hears of that from nothing else.
  }, [variant, value, items, barred]);

  /*
   * A PILL OR CHIP ROW SCROLLS INSIDE A BAR, and only there, so there its
   * current tab is brought into the row's view as an underline row's is: a
   * lens past the room the actions leave was otherwise chosen and never shown.
   */
  useLayoutEffect(() => {
    if (variant === 'underline' || !barred) return;
    const nav = navRef.current;
    if (nav) reveal(nav);
  }, [variant, value, items, barred]);

  const rootClass = cx(
    'crewlet-tabs',
    `crewlet-tabs--${variant}`,
    `crewlet-tabs--${size}`,
    folding && 'crewlet-tabs--fold',
    !boxed && !barred && className,
  );
  const selected = tabStop(
    items.map((item) => ({ disabled: item.disabled || isFolded(item) })),
    Math.max(
      0,
      items.findIndex((item) => item.value === value),
    ),
  );

  const rows = items.map((item, index) => {
    const isActive = value !== undefined && value === item.value;
    const folded = isFolded(item);
    const tabClassName = cx(
      'crewlet-tabs__tab',
      HIT_AREA_CLASS,
      isActive && 'is-active',
      item.disabled && 'is-disabled',
      folded && 'is-folded',
    );

    const icon = item.live ? <StatusDot tone="info" pulse /> : item.icon;
    const children = (
      <>
        {icon ? <span className="crewlet-tabs__icon">{icon}</span> : null}
        <span className="crewlet-tabs__label">
          {item.label}
          {item.live ? <VisuallyHidden>{`, ${item.live}`}</VisuallyHidden> : null}
        </span>
        {item.marker?.tone === 'danger' ? (
          <span className="crewlet-tabs__marker crewlet-tabs__marker--danger">
            <span aria-hidden="true">{item.marker.count}</span>
            <VisuallyHidden>{item.marker.label}</VisuallyHidden>
          </span>
        ) : (
          <>
            {item.count != null && item.count !== '' ? <Count value={item.count} /> : null}
            {item.marker ? (
              <span className={`crewlet-tabs__marker crewlet-tabs__marker--${item.marker.tone}`}>
                <VisuallyHidden>{item.marker.label}</VisuallyHidden>
              </span>
            ) : null}
          </>
        )}
      </>
    );

    const onSelect = () => {
      if (item.disabled) return;
      onValueChange?.(item.value);
    };

    if (renderItem) {
      return (
        <React.Fragment key={item.value}>
          {renderItem({
            item,
            className: tabClassName,
            isActive,
            onSelect,
            children,
            folded,
            foldProps: folded ? FOLDED : SHOWN,
          })}
        </React.Fragment>
      );
    }

    return (
      <button
        key={item.value}
        ref={(el) => {
          buttons.current[index] = el;
        }}
        type="button"
        role="tab"
        id={panelId ? tabId(panelId, item.value) : undefined}
        aria-selected={isActive}
        aria-controls={panelId}
        tabIndex={index === selected ? 0 : -1}
        disabled={item.disabled}
        className={tabClassName}
        {...(folded ? FOLDED : SHOWN)}
        onClick={onSelect}
        // On the TAB, not on the row: a key pressed on a tab is the tab's, and
        // a row that is not focusable has no business listening for one.
        onKeyDown={(event) => onKeyDown(event, false)}
      >
        {children}
      </button>
    );
  });

  /*
   * A NAV IN ROUTER MODE, a plain div otherwise. A tab list is not a
   * navigation landmark: a screen reader listing a page's landmarks was
   * offered every tab strip on it. A row of router links IS one.
   */
  const out = folding ? items.filter(isFolded) : [];
  /*
   * "MORE" AND THE NOTE ARE ALWAYS IN THE DOCUMENT while the row folds, so
   * their widths are known before they are needed; each is folded itself (out
   * of the flow, out of reach) while it has nothing to say or no room.
   */
  const more = folding ? (
    <span
      className={cx('crewlet-tabs__more', out.length === 0 && 'is-folded')}
      data-tabs-more=""
      {...(out.length === 0 ? FOLDED : SHOWN)}
    >
      <Menu
        label={moreMenuLabel ?? (ariaLabel ? `More of ${ariaLabel}` : moreLabel)}
        // THE CHEVRON SAYS IT OPENS: a bare "More" after a row of tabs read
        // as one more tab.
        trigger={moreLabel}
        trailingIcon={<ChevronDownGlyph size="xs" aria-hidden="true" />}
        triggerVariant="ghost"
        align="end"
        // NO GLYPHS but the live dot: a tab's glyph at the head of a menu row
        // sits where a menu draws its check. The name and its figure are the
        // row, and what is happening behind it is the second line.
        items={out.map(
          (item): MenuItem => ({
            key: item.value,
            label: item.menuLabel ?? (typeof item.label === 'string' ? item.label : item.value),
            hint: figureOf(item.count),
            disabled: item.disabled,
            ...(item.live ? { icon: <StatusDot tone="info" pulse />, description: item.live } : {}),
            ...(!item.live && item.marker ? { description: item.marker.label } : {}),
            onSelect: () => onValueChange?.(item.value),
          }),
        )}
      />
    </span>
  ) : null;
  const noteNode =
    folding && note ? (
      <span
        className={cx('crewlet-tabs__note', !fold.note && 'is-folded')}
        data-tabs-note=""
        {...(fold.note ? {} : { 'aria-hidden': true })}
      >
        {note}
      </span>
    ) : null;

  /*
   * THE BAR: the row, then its actions, siblings in one flex line. The row
   * shrinks and the actions do not, so a tight bar scrolls or folds tabs
   * while every action stays drawn.
   *
   * THE WRAPPER IS ALWAYS THERE, so the row is never re-parented. Actions
   * often arrive after a fetch; a row that moved into a new element when they
   * did was a new node, which dropped the focused tab and left the slider and
   * the fold measuring the node that was gone. With no actions the wrapper is
   * `display: contents`, draws nothing and carries no class of the caller's:
   * `className` stays on the row as before.
   */
  const bar = (row: ReactNode) => (
    <div className={barred ? cx('crewlet-tabs-bar', `crewlet-tabs-bar--${variant}`, className) : 'crewlet-tabs-host'}>
      {row}
      {barred ? (
        <div className="crewlet-tabs__actions" data-tabs-actions="">
          {actions}
        </div>
      ) : null}
    </div>
  );

  if (renderItem) {
    return bar(
      <nav ref={navRef} className={rootClass} aria-label={ariaLabel}>
        {rows}
        {more}
        {noteNode}
        {folding && trailing ? (
          <span className="crewlet-tabs__trailing" data-tabs-trailing="">
            {trailing}
          </span>
        ) : (
          trailing
        )}
      </nav>,
    );
  }

  const list = (
    <div ref={navRef} className={rootClass} aria-label={ariaLabel} role="tablist">
      {rows}
    </div>
  );
  if (!boxed) return bar(list);
  return bar(
    <div
      ref={boxRef}
      className={cx('crewlet-tabs-fold', `crewlet-tabs-fold--${variant}`, !barred && className)}
    >
      {list}
      {more}
      {noteNode}
    </div>,
  );
}

export interface TabPanelProps {
  /** The same id the row was given as `panelId`. */
  id: string;
  /** The selected tab's value, which is what labels the panel. */
  value: string;
  children?: ReactNode;
  className?: string;
}

/**
 * The region a tab row controls, labelled by whichever tab is selected.
 *
 * It keeps the layout it sits in, so wrapping a screen's sections in one
 * changes nothing a reader can see and everything a screen reader hears.
 */
export function TabPanel({ id, value, children, className }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={tabId(id, value)}
      className={cx('crewlet-tab-panel', className)}
    >
      {children}
    </div>
  );
}
