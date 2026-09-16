import React, { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Count } from '../Count/index.js';
import { cx } from '../utils/cx.js';
import { tabStop, useRoving } from './roving.js';

export type TabsVariant = 'pill' | 'underline';

export type TabsSize = 'sm' | 'md';

export interface TabsItem {
  /** Stable identity: the value reported, and half of the tab's id. */
  value: string;
  /** Visible label text or node. */
  label: ReactNode;
  /** A glyph drawn before the label. A component, not a name. */
  icon?: ReactNode;
  /** How many things are behind this tab. Drawn as a Count beside the label. */
  count?: number | null;
  disabled?: boolean;
  /** Any extra props the consumer's renderItem needs to read. */
  [key: string]: unknown;
}

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
}

export interface TabsProps {
  items: TabsItem[];
  variant?: TabsVariant;
  size?: TabsSize;
  /** Names the row. A tab row with no name is announced as "tab list" alone. */
  ariaLabel?: string;
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
}: TabsProps) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const { buttons, onKeyDown } = useRoving(items.length, null);

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
    nav.querySelectorAll<HTMLElement>('.crewlet-tabs__tab').forEach((tab) => {
      mutation.observe(tab, { attributes: true, attributeFilter: ['class'] });
    });

    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    resize?.observe(nav);

    return () => {
      mutation.disconnect();
      resize?.disconnect();
    };
  }, [variant, value, items]);

  const rootClass = cx('crewlet-tabs', `crewlet-tabs--${variant}`, `crewlet-tabs--${size}`, className);
  const selected = tabStop(
    items,
    Math.max(
      0,
      items.findIndex((item) => item.value === value),
    ),
  );

  const rows = items.map((item, index) => {
    const isActive = value !== undefined && value === item.value;
    const tabClassName = cx(
      'crewlet-tabs__tab',
      isActive && 'is-active',
      item.disabled && 'is-disabled',
    );

    const children = (
      <>
        {item.icon ? <span className="crewlet-tabs__icon">{item.icon}</span> : null}
        <span className="crewlet-tabs__label">{item.label}</span>
        {item.count != null ? <Count value={item.count} /> : null}
      </>
    );

    const onSelect = () => {
      if (item.disabled) return;
      onValueChange?.(item.value);
    };

    if (renderItem) {
      return (
        <React.Fragment key={item.value}>
          {renderItem({ item, className: tabClassName, isActive, onSelect, children })}
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
  if (renderItem) {
    return (
      <nav ref={navRef} className={rootClass} aria-label={ariaLabel}>
        {rows}
      </nav>
    );
  }

  return (
    <div ref={navRef} className={rootClass} aria-label={ariaLabel} role="tablist">
      {rows}
    </div>
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
