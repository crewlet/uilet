/**
 * The application frame: a rail, a top bar, and ONE scroll container.
 *
 * WHY THE SHELL OWNS THE GRID NOW. It used to be passive: the slots positioned
 * themselves with `position: fixed` and the shell only reserved a matching
 * margin, so every consumer repeated the rail's width and the bar's height as
 * literals in its own stylesheet (280 and 64, in two files, in two projects),
 * and a change to either meant editing four places that nothing compared. The
 * grid is sized from `--size-shell-rail` and `--size-shell-topbar` here, and
 * the slots simply fill their cells.
 *
 * THE DOCUMENT DOES NOT SCROLL. `100dvh` with `overflow: hidden` on the root,
 * and one scroller inside it, which is what lets a router restore a scroll
 * position per history entry: a page with three independent scrollers has
 * three positions and no way to name them. A page that can also scroll as a
 * whole carries the rail off the top of the window and leaves the reader with
 * two scrollbars, neither obviously the one they want.
 *
 * THE LANDMARKS ARE REAL. The rail is an `aside`, the bar is a `header`
 * OUTSIDE `main` (so it is the page's banner rather than part of the screen),
 * and `main` is a focusable target for the skip link that precedes everything.
 *
 * NARROW IS A DIFFERENT SHAPE, NOT A SMALLER ONE. Below the shell breakpoint
 * the rail is a modal drawer on the shared layer stack: it takes Escape, traps
 * Tab, hands focus back to the toggle, and closes on a navigation and when the
 * layout it belongs to ends. Hidden rather than merely moved off screen, too,
 * because a rail translated out of view keeps every link in the tab order and
 * a keyboard reader walks through a dozen stops nobody can see.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import { breakpoint } from '@crewlethq/tokens';
import { MenuGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { focusables, useModalLayer } from '../Layer/index.js';
import { cx } from '../utils/cx.js';

/** Where the rail stops being a column beside the page and becomes a drawer. */
const NARROW = `(max-width: ${breakpoint.shell})`;

/** What the shell tells the components inside it. */
interface AppShellContextValue {
  /** Whether the layout is below the shell breakpoint. */
  narrow: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  /** The one scroll container, for a router restoring a position. */
  scroller: HTMLElement | null;
  railId: string;
  toggleLabel: string;
  hasRail: boolean;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export type { AppShellContextValue };

/**
 * The shell around this component.
 *
 * Throws outside one, rather than answering with a shell-shaped default: a
 * drawer control that silently does nothing is a control nobody can debug.
 */
export function useAppShell(): AppShellContextValue {
  const shell = useContext(AppShellContext);
  if (!shell) throw new Error('useAppShell must be called inside an <AppShell>.');
  return shell;
}

/** Whether a media query matches now, and again whenever that changes. */
function useMediaMatch(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  const read = useCallback(
    () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    [query],
  );
  // On the server the layout is the wide one: it is the shape that needs no
  // JavaScript to be usable.
  return useSyncExternalStore(subscribe, read, () => false);
}

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * The rail. Normally an `<AppShell.Rail>`; the slot keeps its 0.2.0 name
   * because renaming it would break every consumer for nothing.
   */
  sidebar?: ReactNode;
  /** The top bar, normally an `<AppShell.Topbar>`. It is the page's banner. */
  topbar?: ReactNode;
  /**
   * A strip between the bar and the screen: a degraded connection, a missing
   * configuration. It is chrome rather than screen content, so it stays put
   * while the screen scrolls under it.
   */
  banner?: ReactNode;
  /** A strip under the screen, in the content column and outside `main`. */
  footer?: ReactNode;
  /** The id of the `main` element, which the skip link points at. */
  mainId?: string | undefined;
  /** The scroll container itself, for a router restoring a position. */
  mainRef?: Ref<HTMLElement> | undefined;
  /**
   * Gives the screen the whole height left under the bar, as a flex column,
   * for a canvas or a split view that draws to the bottom of the window
   * instead of scrolling.
   */
  fill?: boolean | undefined;
  /**
   * Any value that changes when the reader goes somewhere. The drawer closes
   * when it does: a drawer left open over the screen you have just navigated
   * to is the classic mobile navigation defect.
   */
  navigationKey?: string | number | undefined;
  /** Names the control that opens the rail, and the drawer it opens. */
  toggleLabel?: string | undefined;
  /** The link that precedes everything, for a keyboard reader. */
  skipLabel?: string | undefined;
  children?: ReactNode;
}

export function AppShell({
  sidebar,
  topbar,
  banner,
  footer,
  mainId,
  mainRef,
  fill = false,
  navigationKey,
  toggleLabel = 'Sections',
  skipLabel = 'Skip to content',
  className,
  style,
  children,
  ...rest
}: AppShellProps) {
  const generatedId = useId();
  const railId = `${generatedId}-rail`;
  const main = mainId ?? `${generatedId}-main`;
  const narrow = useMediaMatch(NARROW);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  /*
   * The drawer's own place in the layer band, reported back by the surface
   * that registered it, so the rail can be painted ONE step above the veil
   * that belongs to it. It cannot be a constant: the band's steps are handed
   * out by depth, so a drawer opened over something else sits higher than one
   * opened from the page, and a dialog raised over either has to clear both.
   */
  const [drawerZ, setDrawerZ] = useState<number | null>(null);
  const rail = useRef<HTMLElement | null>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((open) => !open), []);

  // A navigation closes it. The effect also runs on mount, where it is a
  // no-op, which is cheaper than the flag that would avoid it.
  useEffect(() => setDrawerOpen(false), [navigationKey]);

  /*
   * THE DRAWER ENDS WITH THE LAYOUT IT BELONGS TO. A tablet turned to
   * landscape crosses the breakpoint with the drawer open, and the rail
   * becomes the page's own column again under a veil that traps Tab in it.
   */
  useEffect(() => {
    if (!narrow) setDrawerOpen(false);
  }, [narrow]);

  const setMain = useCallback(
    (element: HTMLElement | null) => {
      setScroller(element);
      if (typeof mainRef === 'function') mainRef(element);
      else if (mainRef) (mainRef as { current: HTMLElement | null }).current = element;
    },
    [mainRef],
  );

  const shell: AppShellContextValue = {
    narrow,
    drawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    scroller,
    railId,
    toggleLabel,
    hasRail: sidebar !== undefined && sidebar !== null,
  };

  return (
    <AppShellContext.Provider value={shell}>
      <div
        {...rest}
        className={cx('crewlet-app-shell', fill && 'crewlet-app-shell--fill', className)}
        style={drawerZ === null ? style : { ...style, ['--crewlet-app-shell-drawer-z' as string]: String(drawerZ) }}
      >
        {/*
         * FIRST IN THE DOCUMENT, and it moves focus itself rather than letting
         * the browser follow the fragment: an application routed on the hash
         * would read "#main" as a route and navigate away from the page the
         * reader was trying to skip into.
         */}
        <a
          className="crewlet-app-shell__skip"
          href={`#${main}`}
          onClick={(event) => {
            event.preventDefault();
            scroller?.focus();
          }}
        >
          {skipLabel}
        </a>
        {drawerOpen ? <ShellDrawer rail={rail} onClose={closeDrawer} onZIndex={setDrawerZ} /> : null}
        {shell.hasRail ? (
          <aside
            ref={rail}
            id={railId}
            className="crewlet-app-shell__rail"
            data-open={drawerOpen || undefined}
            /*
             * A DIALOG ONLY WHILE OPEN. Wide, the rail is the page's own
             * navigation beside the screen; narrow and open, it is a modal
             * over it, and a screen reader should hear that the page behind
             * it is inert.
             */
            role={drawerOpen ? 'dialog' : undefined}
            aria-modal={drawerOpen || undefined}
            aria-label={drawerOpen ? toggleLabel : undefined}
          >
            {sidebar}
          </aside>
        ) : null}
        <div className="crewlet-app-shell__column">
          {topbar}
          {banner ? <div className="crewlet-app-shell__banner">{banner}</div> : null}
          <main id={main} ref={setMain} className="crewlet-app-shell__main" tabIndex={-1}>
            <div className="crewlet-app-shell__content">{children}</div>
          </main>
          {footer}
        </div>
      </div>
    </AppShellContext.Provider>
  );
}

/**
 * The narrow layout's drawer, on the shared layer stack.
 *
 * The rail itself is always mounted, because above the breakpoint it is the
 * page's navigation. What this adds while it is open is what every other modal
 * has: a veil, Escape, the Tab trap, focus moved in and handed back. Mounted
 * only while the drawer is open, which is what registers it on the stack.
 *
 * ITS VEIL IS NOT PORTALLED. Everything else in this package portals into the
 * nearest LayerHost because a panel has to be painted beside a fullscreen
 * element; this panel IS a cell of the shell's own grid and cannot be moved
 * anywhere, and a veil portalled away from the panel it belongs to would be
 * the only half of the pair that could.
 */
function ShellDrawer({
  rail,
  onClose,
  onZIndex,
}: {
  rail: { current: HTMLElement | null };
  onClose: () => void;
  onZIndex: (zIndex: number | null) => void;
}) {
  const layer = useModalLayer({
    onClose,
    // The row for the screen the reader is on, which is where the rail's own
    // highlight already points, else the first control in it.
    initialFocus: () => {
      const element = rail.current;
      if (!element) return null;
      return element.querySelector<HTMLElement>('[aria-current="page"]') ?? focusables(element)[0] ?? null;
    },
  });
  const { panelRef, zIndex } = layer;
  // Reported up rather than written on the rail here: the rail is the shell's
  // element, and two owners of one element's style is how they come to
  // disagree.
  useEffect(() => {
    onZIndex(zIndex);
    return () => onZIndex(null);
  }, [onZIndex, zIndex]);
  // The panel is the rail the shell already renders, handed to the stack
  // before its focus effect reads it.
  useLayoutEffect(() => {
    panelRef(rail.current);
    return () => panelRef(null);
  }, [panelRef, rail]);
  return (
    <div
      className="crewlet-app-shell__veil"
      ref={layer.veilRef}
      role="presentation"
      style={{ zIndex }}
    />
  );
}

export interface AppShellRailProps {
  /** The head of the rail, drawn at the top bar's own height. */
  header?: ReactNode;
  /**
   * The foot: what the engine is doing, the theme and density controls. An
   * `<AppShell.RailRow>` puts a line there on the rail's own insets, so its
   * mark lands on the line every nav glyph above it sits on.
   */
  footer?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
}

/** The rail's three regions: a head, a scrolling middle, and a foot. */
export function AppShellRail({ header, footer, className, children }: AppShellRailProps) {
  return (
    <div className={cx('crewlet-app-shell__rail-inner', className)}>
      {header ? <div className="crewlet-app-shell__rail-head">{header}</div> : null}
      <div className="crewlet-app-shell__rail-body">{children}</div>
      {footer ? <div className="crewlet-app-shell__rail-foot">{footer}</div> : null}
    </div>
  );
}

/** What a row in the rail's foot holds, whether or not it is a control. */
interface RailRowContent {
  /**
   * A mark at the head of the row: a status dot, a glyph. Decoration, because
   * the words beside it say the same thing; it is here so it lands on the same
   * vertical line as every nav glyph above it.
   */
  icon?: ReactNode;
  /** A value at the end of the row: a count, a tag, a time. */
  trailing?: ReactNode;
  className?: string | undefined;
  /** What the row says. */
  children?: ReactNode;
}

/** A row the rail states and nothing presses. */
export interface StaticRailRowProps extends RailRowContent {
  onClick?: undefined;
  label?: undefined;
}

/** A row that opens something: the engine panel, an account menu. */
export interface ActionRailRowProps extends RailRowContent {
  onClick: MouseEventHandler<HTMLButtonElement>;
  /**
   * Names the control where its own words are not a name: "engine connected"
   * names a state rather than what pressing it does.
   */
  label?: string | undefined;
}

/**
 * A row in the rail's foot.
 *
 * `label` is refused without `onClick` by the type rather than ignored at
 * runtime: `aria-label` on an element with no role is dropped by assistive
 * technology, so a name passed to a row nothing presses is a name nobody is
 * ever told, and a silent no-op is the shape a caller cannot debug.
 */
export type AppShellRailRowProps = StaticRailRowProps | ActionRailRowProps;

/**
 * A row in the rail's foot, on the rail's own two insets.
 *
 * WHY IT IS A COMPONENT RATHER THAN A BUTTON THE CALLER DROPS IN. The rail's
 * geometry is in two parts: the gutter insets the rail, which is where a row's
 * background begins, and the row pad insets the content inside the row. A
 * control brings its own inset and lands its mark a few pixels off the line
 * every nav glyph above it sits on, which is the one thing a reader notices
 * about a rail without being able to say what it is.
 *
 * AND THE FOOT CLAIMS WHAT LANDS THERE ANYWAY, because an application with a
 * status button of its own reaches for that one whatever this package offers:
 * the stylesheet gives a direct child of the foot the same row this draws, so
 * a dropped-in control is a row in the rail rather than a control sitting on a
 * toolbar's inset. This is still the one to reach for, because it is also the
 * thing that decides whether the row is a control at all.
 */
export function AppShellRailRow({ icon, trailing, onClick, label, className, children }: AppShellRailRowProps) {
  const inside = (
    <>
      {icon ? (
        <span className="crewlet-app-shell__rail-row-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="crewlet-app-shell__rail-row-label">{children}</span>
      {trailing ? <span className="crewlet-app-shell__rail-row-trailing">{trailing}</span> : null}
    </>
  );
  if (onClick === undefined) return <div className={cx('crewlet-app-shell__rail-row', className)}>{inside}</div>;
  return (
    <button
      type="button"
      className={cx('crewlet-app-shell__rail-row', 'crewlet-app-shell__rail-row--action', className)}
      aria-label={label}
      onClick={onClick}
    >
      {inside}
    </button>
  );
}

export interface AppShellToggleProps {
  className?: string | undefined;
}

/**
 * The control that opens the rail as a drawer.
 *
 * Drawn at every width and HIDDEN BY THE STYLESHEET above the breakpoint,
 * rather than removed by a second copy of the width rule in JavaScript. It
 * used to be drawn at every width and to work at every width, and pressing it
 * on a desktop put an unstyled veil into the shell's own grid, which took the
 * rail's column and pushed the whole application into the next row.
 */
export function AppShellToggle({ className }: AppShellToggleProps) {
  const { drawerOpen, toggleDrawer, railId, toggleLabel, hasRail } = useAppShell();
  if (!hasRail) return null;
  return (
    <span className={cx('crewlet-app-shell__toggle', className)}>
      <IconButton
        label={toggleLabel}
        icon={<MenuGlyph size="md" />}
        size="md"
        aria-expanded={drawerOpen}
        aria-controls={railId}
        aria-haspopup="dialog"
        onClick={toggleDrawer}
      />
    </span>
  );
}

export interface AppShellTopbarProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * The screen's name. It is the page's `h1`, which is why everything below
   * it starts at level 2.
   */
  title?: ReactNode;
  /** Names the heading, for anything that points at it. */
  titleId?: string | undefined;
  /** What can be done from the chrome: search, an account menu. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** The page's banner: the drawer toggle, the screen's name, and the actions. */
export function AppShellTopbar({ title, titleId, actions, className, children, ...rest }: AppShellTopbarProps) {
  return (
    <header {...rest} className={cx('crewlet-app-shell__topbar', className)}>
      <AppShellToggle />
      {title === undefined ? null : (
        <h1 className="crewlet-app-shell__title" id={titleId}>
          {title}
        </h1>
      )}
      {children}
      {actions ? <div className="crewlet-app-shell__actions">{actions}</div> : null}
    </header>
  );
}

AppShell.Rail = AppShellRail;
AppShell.RailRow = AppShellRailRow;
AppShell.Topbar = AppShellTopbar;
AppShell.Toggle = AppShellToggle;
