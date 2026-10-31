/**
 * The rail folded to its marks: each destination is its glyph over its name,
 * in one column, and a whole group can fold into one tile whose flyout lists
 * its places beside the rail.
 *
 * IT IS THE SAME LIST AS `SidebarNav`, DRAWN NARROW. Every prop a place takes
 * here has the type `SidebarNav.Item` gives it (`NavFigure` for a badge and a
 * count, `NavLinkProps` for a router's link, a reason string for a lock), so
 * an application keeps ONE list of its places and hands each to whichever of
 * the two the shell is drawing (`useAppShell().rail`). Two lists would be two
 * answers to "where can I go from here", and the first place added to one of
 * them is the place the other forgets.
 *
 * THE HIGHLIGHT IS ON THE GLYPH'S TILE, not the whole entry: the name under it
 * stays quiet, and the current place reads at a glance down a column of
 * shapes. It is the full rail's own selected row (raised, a hairline, no hue),
 * drawn on the tile and from `aria-current`, so the two shapes say "you are
 * here" the same way.
 *
 * A FIGURE RIDES THE TILE'S CORNER, and is READ as part of the name ("Inbox,
 * 5 unread"), exactly as a full row's figure is, so nothing a reader needs is
 * hidden by the fold: a folded group's tile carries its places' badges added
 * up, and says each of them.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type MouseEventHandler,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from '@crewlethq/tokens';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
import {
  LAYER_GAP,
  LAYER_REPOSITION_EVENT,
  anchorGone,
  usePopupLayer,
  useLayerContainer,
  viewportBounds,
  type PlacementRect,
} from '../Layer/index.js';
import { LockedLabel } from '../LockedLabel/index.js';
import type { NavFigure, NavLinkProps } from '../SidebarNav/index.js';
import { cx } from '../utils/cx.js';
import { returnFocus } from '../utils/focusModality.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface CompactNavProps {
  /** Names the navigation region, as `SidebarNav`'s label does. */
  label: string;
  className?: string | undefined;
  children?: ReactNode;
}

/** The column of tiles: a navigation landmark holding one list. */
export function CompactNav({ label, className, children }: CompactNavProps) {
  return (
    <nav className={cx('crewlet-compact-nav', className)} aria-label={label}>
      <ul className="crewlet-compact-nav__list">{children}</ul>
    </nav>
  );
}

/** What a place in the compact rail takes, whether it is a tile or a link in a flyout. */
interface CompactPlace {
  /** The place's name. Drawn under the glyph on a tile, beside it in a flyout. */
  label: string;
  /** The place's glyph (a nav glyph, `size="sm"`). Decoration: the label is the name. */
  icon: ReactNode;
  /** Where it goes. Without it (and without `renderLink`) the tile is a button. */
  href?: string | undefined;
  /** Whether this is the screen the reader is on. */
  current?: boolean | undefined;
  /**
   * How many things here are waiting on the reader: the accent figure on the
   * tile's corner, as `SidebarNav.Item`'s badge.
   */
  badge?: NavFigure | undefined;
  /** How many of something the place holds: the quiet figure, as `SidebarNav.Item`'s count. */
  count?: NavFigure | undefined;
  /**
   * Closed to this reader, and why ("Needs Admin access"). The place stays a
   * link, its name carries the key, and the reason is its title and is read
   * after its name, as `SidebarNav.Item`'s `locked`.
   */
  locked?: string | undefined;
  /** Called when the pointer reaches the place and when it takes focus, as `SidebarNav.Item`'s. */
  onPrefetch?: (() => void) | undefined;
}

export interface CompactNavItemProps extends CompactPlace {
  /**
   * The pointer's title. Defaults to the name with its figure and its lock,
   * because the name under a tile is the rail's narrowest line and ends in an
   * ellipsis where it is long: the title is where it is read whole.
   */
  title?: string | undefined;
  /** The tile's shortcut, in the syntax `aria-keyshortcuts` takes: the Search tile's `Meta+K Control+K`. */
  keyshortcuts?: string | undefined;
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  /** Draws the link element, for a router that owns navigation, as `SidebarNav.Item`'s. */
  renderLink?: ((props: NavLinkProps) => ReactNode) | undefined;
  className?: string | undefined;
}

/**
 * What a figure says as the end of a name: ", 5 unread". One string inside
 * the label's own box, for the reason `SidebarNav`'s rows give: written there,
 * the comma lands after the last word rather than before a box.
 */
function figureWords(figure: NavFigure): string {
  return `, ${String(figure.value)} ${figure.label}`;
}

/** The title a place carries where its caller gives none: its name, its figure and its lock. */
function titleOf(place: Pick<CompactPlace, 'label' | 'badge' | 'count' | 'locked'>): string {
  const figure = place.badge ?? place.count;
  const named = figure ? `${place.label}${figureWords(figure)}` : place.label;
  return place.locked ? `${named}. ${place.locked}` : named;
}

/**
 * The glyph's tile and the figure on its corner.
 *
 * THE FIGURE IS DRAWN FOR THE EYE AND HIDDEN FROM ASSISTIVE TECHNOLOGY: what
 * it says is read in words at the end of the entry's name, so each reader is
 * told it once.
 */
function Tile({ icon, figure, attention }: { icon: ReactNode; figure: NavFigure | undefined; attention: boolean }) {
  return (
    <span className="crewlet-compact-nav__tile" aria-hidden>
      {icon}
      {figure ? (
        <span className={cx('crewlet-compact-nav__figure', attention && 'crewlet-compact-nav__figure--badge')}>
          {figure.value}
        </span>
      ) : null}
    </span>
  );
}

/** A tile's words: its name under the glyph, its figures and its lock read after it. */
function TileLabel({ label, figures, locked }: { label: string; figures: string; locked: string | undefined }) {
  return (
    <span className="crewlet-compact-nav__label">
      <LockedLabel reason={locked}>{label}</LockedLabel>
      {figures ? <VisuallyHidden>{figures}</VisuallyHidden> : null}
    </span>
  );
}

/**
 * One destination: its glyph on a tile, its name under it.
 *
 * A LINK WHERE IT GOES SOMEWHERE AND A BUTTON WHERE IT DOES SOMETHING. A place
 * with an `href` is an anchor (a modified press opens a tab, as a full row
 * does); one without is a button, which is what the compact rail's Search tile
 * is, since it opens the palette rather than going anywhere.
 */
export function CompactNavItem({
  label,
  icon,
  href,
  current = false,
  badge,
  count,
  locked,
  onPrefetch,
  title,
  keyshortcuts,
  onClick,
  renderLink,
  className,
}: CompactNavItemProps) {
  const figure = badge ?? count;
  const inside = (
    <>
      <Tile icon={icon} figure={figure} attention={badge !== undefined} />
      <TileLabel label={label} figures={[count, badge].filter((f) => f !== undefined).map(figureWords).join('')} locked={locked} />
    </>
  );
  const shown = title ?? titleOf({ label, badge, count, locked });
  const itemClass = cx('crewlet-compact-nav__item', HIT_AREA_CLASS, locked && 'crewlet-compact-nav__item--locked');
  let item: ReactNode;
  if (renderLink) {
    item = renderLink({
      className: itemClass,
      children: inside,
      ...(href === undefined ? {} : { href }),
      ...(current ? { 'aria-current': 'page' as const } : {}),
      ...(onClick === undefined ? {} : { onClick }),
      title: shown,
      ...(onPrefetch === undefined ? {} : { onPointerEnter: onPrefetch, onFocus: onPrefetch }),
    });
  } else if (href !== undefined) {
    item = (
      <a
        className={itemClass}
        href={href}
        aria-current={current ? 'page' : undefined}
        aria-keyshortcuts={keyshortcuts}
        title={shown}
        onClick={onClick}
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
      >
        {inside}
      </a>
    );
  } else {
    item = (
      <button
        type="button"
        className={itemClass}
        aria-current={current ? 'page' : undefined}
        aria-keyshortcuts={keyshortcuts}
        title={shown}
        onClick={onClick}
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
      >
        {inside}
      </button>
    );
  }
  return <li className={cx('crewlet-compact-nav__entry', className)}>{item}</li>;
}

export interface CompactNavSeparatorProps {
  /**
   * What the runs either side of it are, said rather than drawn: "Company and
   * Workspace". A separator with no name parts the column for the eye alone.
   */
  label?: string | undefined;
}

/**
 * A short rule between two runs of tiles: the full rail's group headings,
 * which a 76px column has no room to print.
 *
 * A SEPARATOR INSIDE AN ENTRY of the list, so the list holds only entries (a
 * list item in another role breaks the list for assistive technology) and the
 * rule is named where it has a name.
 */
export function CompactNavSeparator({ label }: CompactNavSeparatorProps) {
  return (
    <li className="crewlet-compact-nav__separator">
      <span className="crewlet-compact-nav__rule" role="separator" aria-label={label} />
    </li>
  );
}

/** A place in a folded group's flyout. */
export interface CompactNavLink extends CompactPlace {
  /** Unique within the group. */
  key: string;
  onClick?: MouseEventHandler<HTMLElement> | undefined;
}

export interface CompactNavGroupProps {
  /** The group's name: "Company". Drawn under the tile and at the head of its flyout. */
  label: string;
  /** The group's glyph, for its tile. */
  icon: ReactNode;
  /** The group's places, in the order the full rail lists them. */
  links: readonly CompactNavLink[];
  /** Draws each link's element, for a router that owns navigation. */
  renderLink?: ((props: NavLinkProps) => ReactNode) | undefined;
  className?: string | undefined;
}

/**
 * A figure a value is read as, for adding badges up: `5` is five, `"50+"` is
 * at least fifty. Anything else is not a number this can add.
 */
function figureNumber(value: number | string): { n: number; more: boolean } | null {
  if (typeof value === 'number') return Number.isFinite(value) ? { n: value, more: false } : null;
  const match = /^(\d[\d,]*)(\+?)$/.exec(value.trim());
  if (!match) return null;
  return { n: Number(match[1]!.replaceAll(',', '')), more: match[2] === '+' };
}

/**
 * What a folded group's tile carries: its places' badges, ADDED UP, so the
 * fold never hides what is waiting on the reader. One badge is drawn as it
 * is; several are summed, keeping a `+` where any of them stopped counting
 * ("50+" and 3 are "53+"); a value that is not a count is drawn as the first
 * badge's own value with a `+`, since there is more than it says.
 *
 * The quiet counts are not carried: a count says how much a place holds, and
 * a sum of how much six places hold is a figure about nothing.
 */
export function groupBadge(links: readonly Pick<CompactNavLink, 'badge'>[]): (number | string) | undefined {
  const badges = links.flatMap((link) => (link.badge ? [link.badge] : []));
  if (badges.length === 0) return undefined;
  if (badges.length === 1) return badges[0]!.value;
  const read = badges.map((badge) => figureNumber(badge.value));
  if (read.some((figure) => figure === null)) return `${String(badges[0]!.value)}+`;
  const total = read.reduce((sum, figure) => sum + figure!.n, 0);
  return read.some((figure) => figure!.more) ? `${total}+` : total;
}

/**
 * Where a flyout stands: BESIDE the rail, not beside the tile, so every
 * group's flyout opens on one line a gap off the rail's edge, with its head
 * level with the tile it opened from and slid back inside the bounds where
 * the tile is near the window's foot.
 *
 * Pure arithmetic, in whichever coordinate space the caller uses for all
 * three, for the reason `placePopup` is: none of it can be observed in jsdom.
 */
export function placeFlyout(
  tile: PlacementRect,
  railEnd: number,
  size: { width: number; height: number },
  bounds: PlacementRect,
  /** How far above the tile's top the flyout's top stands: its own edge and inset, so its head is level with the tile. */
  lift = 0,
): { left: number; top: number } {
  const maxTop = bounds.y + bounds.height - size.height;
  const top = Math.max(bounds.y, Math.min(tile.y - lift, maxTop));
  const maxLeft = bounds.x + bounds.width - size.width;
  const left = Math.max(bounds.x, Math.min(railEnd + LAYER_GAP, maxLeft));
  return { left, top };
}

/** A motion token as milliseconds, for a delay JavaScript counts. */
function ms(value: string): number {
  return Number.parseFloat(value);
}

/*
 * THE POINTER'S TWO DELAYS. Opening waits the fast step, so a pointer
 * crossing the column on its way to the page does not flash a flyout at every
 * tile it passes; closing waits the moderate step, the grace the pointer needs
 * to cross the gap from the tile onto the flyout (WCAG 2.2's 1.4.13: content
 * shown on hover can be hovered).
 */
const OPEN_DELAY = ms(motion.duration.fast);
const CLOSE_DELAY = ms(motion.duration.moderate);

/** How the flyout was opened, which decides what closes it. */
type Opener = 'pointer' | 'press' | 'keys';

/**
 * A group folded into one tile, and its flyout.
 *
 * THE FLYOUT IS A MENU OF LINKS BESIDE THE RAIL. Pointing at the tile opens it
 * after a moment; a press, Enter, Space or Right opens it too, and the keys
 * put focus on its first place. In the flyout Up and Down move (wrapping),
 * Home and End jump, Escape or Left close it and hand focus back to the tile,
 * and Tab closes it and moves on FROM THE TILE, as if the flyout sat right
 * after it: the flyout is drawn in the layer host at the end of the document,
 * so the browser's own Tab from inside it would have left the rail for
 * whatever came next in the document.
 *
 * EVERY PLACE IS A REAL LINK, so a modified press opens a tab as it does in
 * the full rail; choosing one closes the flyout and, where the keyboard chose
 * it, hands focus back to the tile.
 *
 * WHAT OPENED IT DECIDES WHAT CLOSES IT. Opened by the pointer resting on the
 * tile, it closes when the pointer leaves both; opened by a press or the keys,
 * it stays until it is dismissed, so a reader who clicked does not lose it by
 * moving the pointer toward it the long way round. It is on the shared layer
 * stack, so a press outside closes it and Escape closes it before anything
 * beneath it.
 *
 * THE TILE SAYS WHERE THE READER IS: it is current (`aria-current="true"`,
 * since the tile is not itself the page) while one of its places is, so the
 * fold never hides which part of the product the reader is in.
 */
export function CompactNavGroup({ label, icon, links, renderLink, className }: CompactNavGroupProps) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const tile = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const opener = useRef<Opener>('pointer');
  const focusFirst = useRef(false);
  const id = useId();
  const container = useLayerContainer();
  const current = links.some((link) => link.current);
  const badge = groupBadge(links);
  const spoken = links
    .filter((link) => link.badge)
    .map((link) => `${link.label} ${String(link.badge!.value)} ${link.badge!.label}`)
    .join(', ');

  const clear = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const close = useCallback(
    (refocus: boolean) => {
      clear();
      setOpen(false);
      if (refocus) returnFocus(tile.current);
    },
    [clear],
  );

  const show = useCallback(
    (by: Opener, first: boolean) => {
      clear();
      opener.current = by;
      focusFirst.current = first;
      setOpen(true);
    },
    [clear],
  );

  const popup = usePopupLayer({
    open,
    // Escape hands focus back to the tile; a press elsewhere leaves it where
    // the reader put it.
    onDismiss: (reason) => close(reason === 'escape' && panel.current?.contains(document.activeElement) === true),
  });

  const position = useCallback(() => {
    const at = tile.current;
    const box = panel.current;
    if (!at || !box || !container) return;
    const inHost = container !== document.body;
    const host = inHost ? container.getBoundingClientRect() : viewportBounds();
    const rect = at.getBoundingClientRect();
    if (anchorGone(rect, host, inHost)) {
      close(false);
      return;
    }
    const rail = at.closest('.crewlet-compact-nav')?.getBoundingClientRect() ?? rect;
    const own = box.getBoundingClientRect();
    const head = box.querySelector<HTMLElement>('.crewlet-compact-nav__flyout-head');
    const spot = placeFlyout(
      { x: rect.x - (inHost ? host.x : 0), y: rect.y - (inHost ? host.y : 0), width: rect.width, height: rect.height },
      rail.right - (inHost ? host.x : 0),
      { width: own.width, height: own.height },
      { x: LAYER_GAP, y: LAYER_GAP, width: host.width - 2 * LAYER_GAP, height: host.height - 2 * LAYER_GAP },
      // The flyout's HEAD stands level with the tile: the group's name beside
      // the group's tile, and its places running down from there. The panel's
      // own edge and inset go above the tile's top.
      head ? head.offsetTop + box.clientTop : 0,
    );
    setPlace((was) => (was && was.left === spot.left && was.top === spot.top ? was : spot));
  }, [close, container]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    position();
    if (focusFirst.current) {
      focusFirst.current = false;
      panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
    const onLayout = () => position();
    container?.addEventListener(LAYER_REPOSITION_EVENT, onLayout);
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      container?.removeEventListener(LAYER_REPOSITION_EVENT, onLayout);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, container, position]);

  useEffect(() => {
    if (!open) setPlace(null);
  }, [open]);

  useEffect(() => clear, [clear]);

  const items = () => [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  const onTileKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (open) items()[0]?.focus();
      else show('keys', true);
    }
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        all[(at + step + all.length) % all.length]?.focus();
        break;
      }
      case 'Home':
      case 'End':
        event.preventDefault();
        (event.key === 'Home' ? all[0] : all.at(-1))?.focus();
        break;
      case 'ArrowLeft':
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        // Back to the tile, and the key's own move carries on from there.
        close(true);
        break;
      default:
        break;
    }
  };

  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    clear();
    if (!open) timer.current = setTimeout(() => show('pointer', false), OPEN_DELAY);
  };

  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    clear();
    if (opener.current === 'pointer') timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  const choose = (link: CompactNavLink) => (event: MouseEvent<HTMLElement>) => {
    link.onClick?.(event);
    close(panel.current?.contains(document.activeElement) === true && event.detail === 0);
  };

  const flyout = open ? (
    <div
      ref={(el) => {
        panel.current = el;
        popup.panelRef(el);
      }}
      id={`${id}-flyout`}
      role="menu"
      aria-label={label}
      // Focusable as a whole, so focus never falls to the document while it
      // moves between places; the places themselves are the roving stops.
      tabIndex={-1}
      className={cx(
        'crewlet-compact-nav__flyout',
        container !== null && container !== document.body && 'crewlet-compact-nav__flyout--in-host',
      )}
      style={place ? { left: place.left, top: place.top, zIndex: popup.zIndex } : { visibility: 'hidden' }}
      onKeyDown={onPanelKeyDown}
      onPointerEnter={(event) => event.pointerType === 'mouse' && clear()}
      onPointerLeave={onPointerLeave}
    >
      {/* The menu is named by its label already; the head is for the eye. */}
      <div className="crewlet-compact-nav__flyout-head" aria-hidden>
        {label}
      </div>
      {links.map((link) => {
        const figure = link.badge ?? link.count;
        const inside = (
          <>
            <span className="crewlet-compact-nav__link-icon" aria-hidden>
              {link.icon}
            </span>
            <span className="crewlet-compact-nav__link-label">
              <LockedLabel reason={link.locked}>{link.label}</LockedLabel>
              {figure ? <VisuallyHidden>{[link.count, link.badge].filter((f) => f !== undefined).map(figureWords).join('')}</VisuallyHidden> : null}
            </span>
            {figure ? (
              <span
                className={cx('crewlet-compact-nav__link-figure', link.badge && 'crewlet-compact-nav__link-figure--badge')}
                aria-hidden
              >
                {figure.value}
              </span>
            ) : null}
          </>
        );
        const linkClass = cx('crewlet-compact-nav__link', link.locked && 'crewlet-compact-nav__link--locked');
        const onClick = choose(link);
        if (renderLink) {
          return (
            <MenuLink key={link.key}>
              {renderLink({
                className: linkClass,
                children: inside,
                ...(link.href === undefined ? {} : { href: link.href }),
                ...(link.current ? { 'aria-current': 'page' as const } : {}),
                onClick,
                ...(link.onPrefetch === undefined ? {} : { onPointerEnter: link.onPrefetch, onFocus: link.onPrefetch }),
              })}
            </MenuLink>
          );
        }
        return (
          <a
            key={link.key}
            className={linkClass}
            href={link.href}
            role="menuitem"
            tabIndex={-1}
            aria-current={link.current ? 'page' : undefined}
            onClick={onClick}
            onPointerEnter={link.onPrefetch}
            onFocus={link.onPrefetch}
          >
            {inside}
          </a>
        );
      })}
    </div>
  ) : null;

  return (
    <li className={cx('crewlet-compact-nav__entry', className)}>
      <button
        ref={(el) => {
          tile.current = el;
          popup.insideRef(el);
        }}
        type="button"
        className={cx('crewlet-compact-nav__item', HIT_AREA_CLASS)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-flyout` : undefined}
        aria-current={current ? 'true' : undefined}
        title={spoken ? `${label}, ${spoken}` : label}
        data-open={open || undefined}
        onClick={(event) => {
          // A pointer that opened it by resting keeps it open on the press
          // that follows, rather than closing what the reader reached for.
          if (open && opener.current === 'pointer' && event.detail !== 0) {
            opener.current = 'press';
            return;
          }
          if (open) close(false);
          else show(event.detail === 0 ? 'keys' : 'press', event.detail === 0);
        }}
        onKeyDown={onTileKeyDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <Tile icon={icon} figure={badge === undefined ? undefined : { value: badge, label: '' }} attention />
        <TileLabel label={label} figures={spoken ? `, ${spoken}` : ''} locked={undefined} />
      </button>
      {flyout && container ? createPortal(flyout, container) : null}
    </li>
  );
}

/**
 * A router's link as a menu item: the role and the roving tab stop go on the
 * element the caller drew, which is the first child here, by a wrapper that
 * stays out of the box tree.
 */
function MenuLink({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const element = ref.current?.firstElementChild;
    if (!(element instanceof HTMLElement)) return;
    element.setAttribute('role', 'menuitem');
    element.tabIndex = -1;
  });
  return (
    <span ref={ref} className="crewlet-compact-nav__link-slot">
      {children}
    </span>
  );
}
