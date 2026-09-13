import React, {
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';

/*
 * Tabs primitive.
 *
 * Two visual variants:
 *
 *   - 'underline' Flat tab strip sitting on a 1px baseline. A 2px
 *                 brand-accent bar slides between tabs as the
 *                 selection changes (left + width animated via CSS
 *                 variables the primitive writes from a measurement
 *                 pass). Use for primary page tabs where each tab
 *                 swaps the full page content.
 *   - 'pill'      Segmented control. The container paints a subtle
 *                 tinted background; the active tab fills with the
 *                 elevated surface token and picks up a 1px lift
 *                 shadow. Use for compact section switches.
 *
 * Modes:
 *
 *   Controlled  Pass `value` and `onValueChange`; the primitive
 *               renders each tab as a button.
 *   Custom      Pass `renderItem`. The primitive yields the per-
 *               item className (with the active modifier resolved
 *               from value === item.value), the icon + label
 *               children, and an onSelect callback. Use this to
 *               plug in a router link (react-router-dom's NavLink,
 *               Next.js Link) so navigation stays client-side and
 *               the link keeps native semantics (right-click open
 *               in new tab, middle-click, copy URL).
 *
 * The underline slider is measured against whichever child carries
 * the .is-active class, so it works in both modes: controlled mode
 * gets the class from `value === item.value`, custom mode (NavLink)
 * gets the class from the consumer's renderItem (typically the
 * NavLink's isActive callback). A MutationObserver re-measures on
 * class changes inside the nav, and a ResizeObserver re-measures on
 * container size changes (window resize, sidebar collapse, font
 * load reflows).
 *
 * Items carry an arbitrary extra payload via the index signature so
 * the render-prop consumer can attach route metadata (a routed
 * subnav, for instance, passes `to` and `end` through to NavLink
 * without the primitive needing to know about either).
 */

export type TabsVariant = 'pill' | 'underline';

export type TabsSize = 'sm' | 'md';

export interface TabsItem {
  /** Stable identity used to compute the active class. */
  value: string;
  /** Visible label text or node. */
  label: ReactNode;
  /** Optional Material Symbols icon name. */
  icon?: string;
  disabled?: boolean;
  /** Any extra props the consumer's renderItem needs to read. */
  [key: string]: unknown;
}

export interface TabsRenderItemProps {
  item: TabsItem;
  /**
   * Base + state-modifier class for the tab. Apply this to the
   * element you render so the variant chrome stays consistent.
   * Already includes the is-active modifier when value + onValueChange
   * are wired; in router mode the consumer appends its own is-active
   * (NavLink's isActive callback) since URL-driven activeness is the
   * source of truth and the primitive re-measures from whichever
   * child carries .is-active.
   */
  className: string;
  /** True when `value === item.value`. */
  isActive: boolean;
  /** Calls onValueChange?.(item.value) when invoked. */
  onSelect: () => void;
  /** Pre-rendered icon + label nodes for the tab body. */
  children: ReactNode;
}

export interface TabsProps {
  items: TabsItem[];
  variant?: TabsVariant;
  size?: TabsSize;
  /** Aria-label on the nav element wrapping the strip. */
  ariaLabel?: string;
  className?: string;
  /** Currently active item value (controlled mode). */
  value?: string;
  /** Fires when a button-rendered tab is clicked. */
  onValueChange?: (value: string) => void;
  /**
   * Override the per-item element renderer. Receives the item, the
   * resolved className, an isActive flag, an onSelect handler, and
   * the icon + label children. Useful for plugging in a router
   * link (NavLink, Next.js Link) so navigation stays client-side.
   */
  renderItem?: (props: TabsRenderItemProps) => ReactNode;
}

export function Tabs({
  items,
  variant = 'pill',
  size = 'md',
  ariaLabel,
  className = '',
  value,
  onValueChange,
  renderItem,
}: TabsProps) {
  const navRef = useRef<HTMLElement | null>(null);

  /*
   * Slider-position effect. Runs only for the underline variant.
   * Reads the active tab's bounding rect relative to the nav, then
   * writes --crewlet-tabs-slider-left and --crewlet-tabs-slider-width
   * inline so the ::after sliding bar lands under the active tab.
   * The slider starts at width:0 so it is invisible before the first
   * measurement and no separate visibility flag is needed.
   *
   * Mutation observation is scoped to each tab DOM node individually,
   * NOT the nav with subtree:true. Watching the nav with subtree:true
   * makes every attribute write on the nav itself (including the
   * style writes from update()) re-fire the callback in a chain
   * with React's commit phase, which can deadlock the page tab in
   * Chrome. Per-tab observers see only the className changes that
   * actually matter (router NavLink toggling is-active on route
   * change) and never see the slider's own DOM writes.
   *
   * ResizeObserver on the nav handles container size changes
   * (viewport, sidebar, font load) so the slider tracks layout
   * shifts even when the active tab does not move in the markup.
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
      const left = activeRect.left - navRect.left;
      const width = activeRect.width;
      nav.style.setProperty('--crewlet-tabs-slider-left', `${left}px`);
      nav.style.setProperty('--crewlet-tabs-slider-width', `${width}px`);
    };

    update();

    const mutation = new MutationObserver(update);
    nav.querySelectorAll<HTMLElement>('.crewlet-tabs__tab').forEach((tab) => {
      mutation.observe(tab, {
        attributes: true,
        attributeFilter: ['class'],
      });
    });

    const resize = new ResizeObserver(update);
    resize.observe(nav);

    return () => {
      mutation.disconnect();
      resize.disconnect();
    };
  }, [variant, value, items]);

  const rootClass = [
    'crewlet-tabs',
    `crewlet-tabs--${variant}`,
    `crewlet-tabs--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <nav
      ref={navRef}
      className={rootClass}
      aria-label={ariaLabel}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = value !== undefined && value === item.value;
        const tabClassName = [
          'crewlet-tabs__tab',
          isActive ? 'is-active' : undefined,
          item.disabled ? 'is-disabled' : undefined,
        ].filter(Boolean).join(' ');

        const children = (
          <>
            {item.icon ? (
              <span className="material-symbols-outlined crewlet-tabs__icon" aria-hidden>
                {item.icon}
              </span>
            ) : null}
            <span className="crewlet-tabs__label">{item.label}</span>
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
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            disabled={item.disabled}
            className={tabClassName}
            onClick={onSelect}
          >
            {children}
          </button>
        );
      })}
    </nav>
  );
}
