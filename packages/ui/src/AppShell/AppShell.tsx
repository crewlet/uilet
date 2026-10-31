/**
 * The application frame: a rail on the frame, and beside it a floating sheet
 * holding a top bar and ONE scroll container.
 *
 * WHY THE SHELL OWNS THE GRID NOW. It used to be passive: the slots positioned
 * themselves with `position: fixed` and the shell only reserved a matching
 * margin, so every consumer repeated the rail's width and the bar's height as
 * literals in its own stylesheet (280 and 64, in two files, in two projects),
 * and a change to either meant editing four places that nothing compared. The
 * grid is sized from `--size-shell-rail` and `--size-shell-topbar` here, and
 * the slots simply fill their cells.
 *
 * THE SCREEN FLOATS ON A SHEET. The rail stands on the frame, the lowest rung,
 * and everything the reader reads (the bar, a banner, the screen, a footer) is
 * one sheet a rung above it, held off the frame's edges by `--size-shell-inset`
 * and rounded at `--radius-sheet`. It is one element rather than a background
 * the bar and the scroller each paint, because the corner has to clip both and
 * the hairline has to run round both: two surfaces that each drew half of it
 * would meet in a seam under the bar.
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
 * the sheet is the whole window, its inset, corner and hairline collapsed to
 * nothing, and the rail is a modal drawer on the shared layer stack: it takes Escape, traps
 * Tab, hands focus back to the toggle, and closes on a navigation and when the
 * layout it belongs to ends. Hidden rather than merely moved off screen, too,
 * because a rail translated out of view keeps every link in the tab order and
 * a keyboard reader walks through a dozen stops nobody can see.
 *
 * THE ASIDE MIRRORS THE RAIL. A panel the whole frame keeps open beside every
 * screen (the assistant) is a third track of the shell's grid, a second sheet
 * on the frame to the right of the page's, so opening it PUSHES the page
 * narrower rather than covering it. Nothing about the page changes but its
 * width: the bar, the sticky headers, the one scroller and the measured
 * gutter are all the sheet's, and the sheet keeps them. Where the window
 * cannot hold the page and the panel side by side the panel is an overlay
 * over the page's end, and on a phone it is the whole window; both are
 * modal surfaces on the shared layer stack, unless the host asks for an
 * overlay that leaves the page live beside it (`asideModal={false}`). WHICH SHAPE is the host's
 * decision (`asideShape`), never a media query's: the width that leaves the
 * page its floor depends on what else the frame holds and on the density,
 * which only the application knows.
 *
 * AND THE PEEK IS A COLUMN OF THE SHEET. A detail panel opened from a list
 * (`peek`) stands beside the scroller inside the sheet, under the bar, so the
 * section the reader is on still reads across the top. It is a column where
 * the host says there is room and a drawer over the page where there is not.
 */

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type AriaAttributes,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import { breakpoint } from '@crewlethq/tokens';
import { ChevronUpGlyph, ChevronsLeftGlyph, ChevronsRightGlyph, MenuGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { Kbd, ariaKeyshortcuts, isApplePlatform } from '../Kbd/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { focusables, isComposing, layerCount, useModalLayer } from '../Layer/index.js';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
import { cx } from '../utils/cx.js';
import { returnFocus } from '../utils/focusModality.js';
import type { Tone } from '../utils/tone.js';
import { useMediaMatch } from '../MediaMatch/index.js';
import { AccountRow } from './AccountRow.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { ResizeHandle } from './ResizeHandle.js';
import { AsideContext, PeekContext, type AppShellAsideShape, type AppShellPeekShape } from './regions.js';
import { ScreenWidthContext, contentInlineSize, createScreenWidthStore } from './screenWidth.js';
import { RailLeavingContext, RailShapeContext, useRailShape, type AppShellRailShape } from './railShape.js';
import { useRailMotion } from './railMotion.js';
import { releaseFocus } from '../Presence/index.js';

export { useAppShellAside, useAppShellPeek } from './regions.js';
export type { AppShellAsideShape, AppShellPeekShape, AppShellRegionValue } from './regions.js';
export type { AppShellRailShape } from './railShape.js';
export type { AppShellRailMotion } from './railMotion.js';

/** The aside's resting width, in px, where the host names none. */
export const APP_SHELL_ASIDE_WIDTH = 420;

/** How the reader resizes the aside while it is a column. */
export interface AppShellAsideResize {
  /** The narrowest the aside may be, in px. */
  min: number;
  /** The widest, in px, already capped by the host so the page keeps its floor. */
  max: number;
  /** The resting width a reset returns to. */
  defaultValue?: number | undefined;
  /** Every change while it happens. */
  onChange: (width: number) => void;
  /** Where a gesture ends: the moment to keep the width. */
  onCommit?: ((width: number) => void) | undefined;
  /** Names the grip: "Resize the Ask Crewlet panel". */
  label: string;
}

/**
 * Where the rail stops being a column beside the page and becomes a drawer:
 * STRICTLY UNDER the shell step. The step is the rail, the inset and the
 * sheet's floor added up, so at exactly that width the wide layout fits, and
 * `max-width` would draw the drawer at the one width the arithmetic says it
 * is not needed. AppShell.css switches on the same query, and the suite holds
 * the two to each other.
 */
const NARROW = `(width < ${breakpoint.shell})`;

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
  /**
   * The shape the rail is drawn in NOW: `compact` only where the host asked
   * for it and the layout is wide, `full` in the drawer and everywhere else,
   * so an application picks `CompactNav` or `SidebarNav` from this alone.
   * While the rail folds it is still `full`, and it turns `compact` when the
   * rail reaches the compact column (see `railMotion.ts`).
   */
  rail: AppShellRailShape;
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
  /** A strip under the screen, on the sheet and outside `main`. */
  footer?: ReactNode;
  /** The id of the `main` element, which the skip link points at. */
  mainId?: string | undefined;
  /** The scroll container itself, for a router restoring a position. */
  mainRef?: Ref<HTMLElement> | undefined;
  /**
   * Gives the screen the whole height left under the bar, as a flex column,
   * for a canvas or a split view that draws to the bottom of the window
   * instead of scrolling.
   *
   * `flush` is the same column EDGE TO EDGE: the content column gives up its
   * pad, its measure and its gap, and the scroller reserves no gutter, for a
   * screen that draws its own frame to the sheet's edges (a conversation with
   * a list and a pane either side of it). The column is positioned, so a
   * `LayerHost` the screen keeps inside it fills exactly the screen.
   */
  fill?: boolean | 'flush' | undefined;
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
  /**
   * The rail's shape the reader chose: the full navigation, or the compact
   * column of glyphs. A desktop choice: under the shell step the rail is a
   * drawer drawn full whatever this says, and `useAppShell().rail` reports
   * the shape actually drawn.
   */
  rail?: AppShellRailShape | undefined;
  /**
   * Called with the other shape when the reader presses the fold control.
   * Given, the shell draws THE fold control (never in the drawer): a chevron
   * on the head's row, before the brand's mark, pointing left while the rail
   * is full and right while it is compact. Keeping the choice, and binding a
   * key to it, are the application's.
   */
  onRailChange?: ((next: AppShellRailShape) => void) | undefined;
  /**
   * The keys the application binds to the fold (`['Mod', '\\']`), drawn in
   * the control's tooltip and set as its `aria-keyshortcuts`. The shell binds
   * nothing: the same press may mean something else where the rail is a
   * drawer, and only the application knows.
   */
  railFoldKeys?: readonly string[] | undefined;
  /** The fold control's two names. Defaults to "Collapse the sidebar" and "Expand the sidebar". */
  railFoldLabels?: { collapse: string; expand: string } | undefined;
  /**
   * A panel the frame keeps beside every screen: the assistant. Nothing (or
   * null) means no aside and no track. Normally a `SidePanel`, which leaves
   * the landmark, the width and the grip to the shell here.
   */
  aside?: ReactNode;
  /** The aside's width while it is a column or an overlay, in px. */
  asideWidth?: number | undefined;
  /**
   * The page's floor beside an aside column, in px: the column's track is
   * capped at what leaves the sheet this wide, so a width dragged on a wide
   * window never takes a narrower window's page away.
   */
  asideReserve?: number | undefined;
  /** Names the complementary region and, as an overlay or a sheet, the dialog. */
  asideLabel?: string | undefined;
  /** Which shape the aside takes; the host decides it. */
  asideShape?: AppShellAsideShape | undefined;
  /**
   * Whether the aside is modal as an `overlay`: true (the default) draws it
   * as a dialog behind a veil, with Tab held inside; false leaves the page
   * live beside it, a complementary region with no veil and no trap that
   * Escape from inside still closes, handing focus back to what opened it.
   * A column is never modal and a sheet, which covers the whole window,
   * always is.
   */
  asideModal?: boolean | undefined;
  /** Closes the aside: Escape and, behind a veil, a press on the veil, as an overlay or a sheet. */
  onAsideClose?: (() => void) | undefined;
  /** Gives the aside a grip in the seam beside it while it is a column. */
  asideResize?: AppShellAsideResize | undefined;
  /**
   * A detail panel beside the scroller, inside the sheet and under the bar:
   * a peek opened from a list. Normally a `PeekRail`.
   */
  peek?: ReactNode;
  /**
   * Whether the peek is a column of the sheet or a drawer over the page; the
   * host decides it. The peek sizes itself (`PeekRail` takes its width and
   * the page's floor), because a column of the sheet is the peek's own box
   * rather than a track of the frame.
   */
  peekShape?: AppShellPeekShape | undefined;
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
  rail: railChoice = 'full',
  onRailChange,
  railFoldKeys,
  railFoldLabels,
  aside,
  asideWidth = APP_SHELL_ASIDE_WIDTH,
  asideReserve,
  asideLabel,
  asideShape = 'column',
  asideModal = true,
  onAsideClose,
  asideResize,
  peek,
  peekShape = 'column',
  className,
  style,
  children,
  ...rest
}: AppShellProps) {
  const hasAside = aside !== undefined && aside !== null && aside !== false;
  const hasPeek = peek !== undefined && peek !== null && peek !== false;
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

  /*
   * MEASUREMENTS ARE HELD WHILE THE RAIL MOVES. The rail eases its width, and
   * the sheet beside it with it, so every observer below fires on every frame
   * of a fold: the screen's width re-rendered every `useScreenWidth` and
   * `useScreenBelow` reader sixty times a second, and a screen could change
   * shape mid motion and again at its end. While a phase runs a measurement
   * is kept rather than taken, and each kept one is taken once, at the width
   * the rail comes to rest at. A container query on the column still follows
   * every frame: that is the stylesheet's, and costs no render.
   */
  const railMoving = useRef(false);
  const heldMeasures = useRef(new Set<() => void>());
  const unlessRailMoving = useCallback(
    (measure: () => void) => () => {
      if (railMoving.current) heldMeasures.current.add(measure);
      else measure();
    },
    [],
  );

  /*
   * THE SCROLLER'S GUTTER, measured, so the top bar can reserve the same
   * strip. The scroller keeps its scrollbar's gutter at every height (see
   * AppShell.css), and where the platform draws scrollbars in the layout
   * that strip moves the content's end edge in by its width while the bar
   * above it, which does not scroll, kept its own: every page's actions ended
   * 15px past the cards under them. CSS cannot read a scrollbar's width, so
   * it is read here, as the scroller's border box less its client box, and
   * handed to the stylesheet as `--crewlet-app-shell-gutter`. It is 0 where
   * scrollbars overlay the content, and on a screen that does not scroll.
   */
  const [gutter, setGutter] = useState(0);
  useLayoutEffect(() => {
    if (!scroller) return undefined;
    const measure = () => setGutter(Math.max(0, scroller.offsetWidth - scroller.clientWidth));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(unlessRailMoving(measure));
    observer.observe(scroller);
    const held = heldMeasures.current;
    return () => {
      observer.disconnect();
      held.delete(measure);
    };
  }, [scroller, unlessRailMoving]);

  /*
   * WHAT THE ASIDE COLUMN TAKES FROM THE WINDOW'S RIGHT, measured, so a peek
   * drawn as a drawer covers the PAGE beside the aside rather than the aside
   * itself: the reader opened the assistant to talk about the page, and a
   * peek it opened stands over the page, next to it. It is the distance from
   * the page sheet's right edge to the shell's, which CSS cannot read because
   * the aside's track is capped by arithmetic on the shell's own width. It is
   * published only while the aside is a column, as
   * `--crewlet-app-shell-aside-occupied`.
   */
  const root = useRef<HTMLDivElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);
  const asideColumn = hasAside && asideShape === 'column';
  const [occupied, setOccupied] = useState<number | null>(null);
  useLayoutEffect(() => {
    const frame = root.current;
    const page = sheet.current;
    if (!asideColumn || !frame || !page) {
      setOccupied(null);
      return undefined;
    }
    const measure = () =>
      setOccupied(Math.max(0, Math.round(frame.getBoundingClientRect().right - page.getBoundingClientRect().right)));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(unlessRailMoving(measure));
    observer.observe(page);
    observer.observe(frame);
    const held = heldMeasures.current;
    return () => {
      observer.disconnect();
      held.delete(measure);
    };
  }, [asideColumn, unlessRailMoving]);

  /*
   * THE SCREEN'S WIDTH, measured on the content column and published for the
   * decisions a stylesheet cannot make (`useScreenBelow`, screenWidth.ts). It
   * is the content box, the width a container query on the column reads, so
   * a screen's JavaScript and its stylesheet fold at the same pixel. Measured
   * in a layout effect, so the first paint already has it.
   */
  const content = useRef<HTMLDivElement | null>(null);
  const [screenWidth] = useState(createScreenWidthStore);
  useLayoutEffect(() => {
    const column = content.current;
    if (!column) return undefined;
    const measure = () => screenWidth.set(contentInlineSize(column));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(unlessRailMoving(measure));
    observer.observe(column);
    const held = heldMeasures.current;
    return () => {
      observer.disconnect();
      held.delete(measure);
      screenWidth.set(null);
    };
  }, [screenWidth, unlessRailMoving]);

  const hasRail = sidebar !== undefined && sidebar !== null;
  // THE SHAPE THE READER CHOSE, where it can be drawn: compact is a desktop
  // shape, and the drawer under the step is always the full list.
  const railTarget: AppShellRailShape = hasRail && railChoice === 'compact' && !narrow ? 'compact' : 'full';
  // AND THE SHAPE DRAWN, which trails the choice while the rail folds, so the
  // full rail's words fade out under the moving edge rather than vanishing.
  const { drawn: railShape, motion: railMotion, leaving: railLeaving } = useRailMotion(railTarget, hasRail && !narrow, rail);
  const foldable = hasRail && onRailChange !== undefined && !narrow;
  // Read by the observers above, between renders.
  railMoving.current = railMotion !== null;
  // The rail has come to rest: every measurement kept while it moved is
  // taken now, once.
  useLayoutEffect(() => {
    if (railMotion !== null) return;
    const held = [...heldMeasures.current];
    heldMeasures.current.clear();
    for (const measure of held) measure();
  }, [railMotion]);

  /*
   * FOCUS LEAVES THE FOLDING CONTENT FOR THE RAIL'S FIRST LIVE CONTROL. A
   * reader who folds the rail by its key from a row inside it would otherwise
   * be left in content that has just turned inert. The first control the
   * fold leaves live is the fold control, where the host draws one, and
   * otherwise the brand's link in the head, both in the same place in both
   * shapes. A rail with neither has nowhere live to go while it folds: focus
   * is taken off the row, and handed to the folded rail's first control once
   * that is drawn.
   */
  const refocusFolded = useRef(false);
  useLayoutEffect(() => {
    const aside = rail.current;
    if (!aside) return;
    if (railLeaving) {
      const held = aside.ownerDocument.activeElement;
      const leavingPart = held instanceof HTMLElement ? held.closest('[inert]') : null;
      if (!leavingPart || !aside.contains(leavingPart)) return;
      const live = focusables(aside).find((element) => !element.closest('[inert]')) ?? null;
      releaseFocus(leavingPart, live);
      refocusFolded.current = live === null;
      return;
    }
    if (!refocusFolded.current) return;
    refocusFolded.current = false;
    const held = aside.ownerDocument.activeElement;
    if (held === null || held === aside.ownerDocument.body) focusables(aside)[0]?.focus();
  }, [railLeaving]);

  const shell: AppShellContextValue = {
    narrow,
    drawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    scroller,
    railId,
    toggleLabel,
    hasRail,
    rail: railShape,
  };

  return (
    <AppShellContext.Provider value={shell}>
      <div
        {...rest}
        ref={root}
        className={cx(
          'crewlet-app-shell',
          fill && 'crewlet-app-shell--fill',
          fill === 'flush' && 'crewlet-app-shell--fill-flush',
          // Named on the root rather than read off the tree by a selector,
          // because a shell with no rail is one column whatever else it holds.
          !shell.hasRail && 'crewlet-app-shell--no-rail',
          foldable && 'crewlet-app-shell--foldable',
          className,
        )}
        /*
         * THE SHAPES ARE ATTRIBUTES, one value each, so there is no width at
         * which the aside is both a column and an overlay, or the peek both a
         * column and a drawer: the stylesheet switches on the value the host
         * decided rather than on a media query that would have to be kept
         * tiling with the host's arithmetic.
         */
        data-aside={hasAside ? asideShape : undefined}
        data-peek={hasPeek ? peekShape : undefined}
        data-rail={hasRail ? railShape : undefined}
        data-rail-motion={railMotion ?? undefined}
        style={{
          ...style,
          ['--crewlet-app-shell-gutter' as string]: `${gutter}px`,
          ...(drawerZ === null ? null : { ['--crewlet-app-shell-drawer-z' as string]: String(drawerZ) }),
          // The aside's width is published on the ROOT, because two things
          // read it from opposite sides: the grid track that sizes the column
          // is declared here, and the overlay that sizes itself is a
          // descendant. A custom property inherits downward only.
          ...(hasAside
            ? {
                ['--crewlet-app-shell-aside' as string]: `${asideWidth}px`,
                ...(asideReserve === undefined
                  ? null
                  : { ['--crewlet-app-shell-aside-reserve' as string]: `${asideReserve}px` }),
              }
            : null),
          ...(occupied === null ? null : { ['--crewlet-app-shell-aside-occupied' as string]: `${occupied}px` }),
        }}
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
            {/*
             * THE FOLD CONTROL IS THE SHELL'S, before the rail's own content
             * and outside it, so it is ONE ELEMENT whichever shape the
             * application draws: an application that swaps its whole rail
             * between the shapes cannot remount it, and the focus that folded
             * the rail is still on it. First in the rail's order because it
             * acts on the whole rail, as a region's own control precedes it.
             * It says the CHOSEN shape, not the one drawn: while the rail
             * folds, it already offers to unfold it.
             */}
            {foldable ? (
              <RailFold rail={railTarget} onRailChange={onRailChange} keys={railFoldKeys} labels={railFoldLabels} railId={railId} />
            ) : null}
            <RailShapeContext.Provider value={railShape}>
              <RailLeavingContext.Provider value={railLeaving}>{sidebar}</RailLeavingContext.Provider>
            </RailShapeContext.Provider>
          </aside>
        ) : null}
        <div ref={sheet} className="crewlet-app-shell__sheet">
          {topbar}
          {banner ? <div className="crewlet-app-shell__banner">{banner}</div> : null}
          {/*
           * THE BODY IS ALWAYS THERE, peek or none. It is the row the
           * scroller and a peek column share, and it is never added or taken
           * away with the peek: a wrapper that came and went would remount
           * `main`, and with it the whole screen and its scroll position,
           * every time a row was peeked.
           */}
          <div className="crewlet-app-shell__body">
            <main id={main} ref={setMain} className="crewlet-app-shell__main" tabIndex={-1}>
              <div ref={content} className="crewlet-app-shell__content">
                <ScreenWidthContext.Provider value={screenWidth}>{children}</ScreenWidthContext.Provider>
              </div>
            </main>
            {hasPeek ? <PeekContext.Provider value={{ shape: peekShape }}>{peek}</PeekContext.Provider> : null}
          </div>
          {footer}
        </div>
        {hasAside ? (
          <ShellAside
            shape={asideShape}
            modal={asideShape === 'sheet' || (asideShape === 'overlay' && asideModal)}
            label={asideLabel}
            width={asideWidth}
            resize={asideResize}
            onClose={onAsideClose}
          >
            {aside}
          </ShellAside>
        ) : null}
      </div>
    </AppShellContext.Provider>
  );
}

interface ShellAsideProps {
  shape: AppShellAsideShape;
  /** A dialog behind a veil on the layer stack, rather than a complementary region. */
  modal: boolean;
  label: string | undefined;
  width: number;
  resize: AppShellAsideResize | undefined;
  onClose: (() => void) | undefined;
  children: ReactNode;
}

/**
 * The aside's track: a complementary region as a column, a modal dialog as an
 * overlay or a sheet, and a complementary region again as a non-modal
 * overlay, which lies over the page without taking it away.
 *
 * ONE ELEMENT IN EVERY SHAPE, with its role switched rather than its tag, so
 * a window resized across the column threshold does not remount the panel
 * and lose what the reader had in it (a half-typed message, a scrolled
 * thread). A `div` with a role rather than an `aside`, because an `aside` may
 * not be a dialog.
 *
 * THE GRIP STANDS OUTSIDE THE SHEET THAT CLIPS, in the frame's inset between
 * the page's sheet and this one, which is the seam it sizes. Only as a
 * column: an overlay or a sheet has no page beside it to give way.
 */
function ShellAside({ shape, modal, label, width, resize, onClose, children }: ShellAsideProps) {
  const region = useRef<HTMLDivElement | null>(null);
  const surfaceId = useId();
  useLooseOverlay(region, shape === 'overlay' && !modal, onClose);
  // The modal's place in the layer band, reported back by the surface that
  // registered it, so the aside paints one step above its own veil.
  const [z, setZ] = useState<number | null>(null);
  return (
    <AsideContext.Provider value={{ shape }}>
      <div
        ref={region}
        className="crewlet-app-shell__aside"
        data-shape={shape}
        role={modal ? 'dialog' : 'complementary'}
        aria-modal={modal || undefined}
        aria-label={label}
        // A dialog the layer stack can always focus, even before its content
        // has a control: focus never stays behind the veil. An overlay that
        // is not modal is focused the same way when it opens.
        tabIndex={modal || shape === 'overlay' ? -1 : undefined}
        data-modal={modal ? 'true' : 'false'}
        style={modal && z !== null ? { zIndex: z + 1 } : undefined}
      >
        {shape === 'column' && resize ? (
          <ResizeHandle
            label={resize.label}
            value={width}
            min={resize.min}
            max={resize.max}
            defaultValue={resize.defaultValue}
            onValueChange={resize.onChange}
            onValueCommit={resize.onCommit}
            controls={surfaceId}
            edge="left"
          />
        ) : null}
        <div id={surfaceId} className="crewlet-app-shell__aside-sheet">
          {children}
        </div>
      </div>
      {/*
       * AFTER the region, so the region's ref is attached by the time the
       * veil's layout effect hands it to the layer stack: on the commit that
       * opens both, an earlier sibling's effects run before a later one's ref.
       */}
      {modal ? <AsideVeil region={region} onClose={onClose} onZIndex={setZ} /> : null}
    </AsideContext.Provider>
  );
}

/**
 * What a NON-MODAL overlay keeps of a modal's manners without holding the
 * page: focus moves in when it opens and goes back to what opened it when it
 * closes, and Escape from inside closes it. Nothing is trapped, nothing is
 * veiled, and the page beside it takes presses and Tab as before.
 *
 * NOT ON THE LAYER STACK, because the stack's entries own every Escape and
 * Tab in the document, and this surface owns neither outside itself. It
 * gives way to the stack instead: while any surface is on it (a menu opened
 * inside the panel, a dialog it opened), Escape is that surface's.
 *
 * WHERE FOCUS CAME FROM is read during the aside's FIRST render, before
 * anything inside it takes focus with `autoFocus`, and handed back only if
 * focus is still inside the panel when it closes: a reader who has moved on
 * to the page is not pulled back. A change of shape is not a close: the
 * panel stays mounted, and so does focus.
 */
function useLooseOverlay(
  region: { current: HTMLElement | null },
  active: boolean,
  onClose: (() => void) | undefined,
): void {
  const [opener] = useState<Element | null>(() => (typeof document === 'undefined' ? null : document.activeElement));
  const loose = useRef(active);
  loose.current = active;
  const close = useRef(onClose);
  close.current = onClose;

  // On the aside's open only, and only as a loose overlay: a column takes no
  // focus, and a modal overlay's layer moves it in itself.
  useEffect(() => {
    const panel = region.current;
    if (!loose.current || !panel || panel.contains(document.activeElement)) return;
    (focusables(panel)[0] ?? panel).focus();
  }, [region]);

  // A LAYOUT cleanup, so it runs while the panel is still in the document and
  // can still tell whether focus was inside it.
  useLayoutEffect(() => {
    const panel = region.current;
    return () => {
      if (!loose.current || !panel?.contains(document.activeElement)) return;
      if (opener instanceof HTMLElement && opener.isConnected && opener !== document.body) returnFocus(opener);
    };
  }, [region, opener]);

  // HEARD AT THE DOCUMENT, AFTER EVERYTHING INSIDE, as `SidePanel` hears it:
  // a control that answers Escape itself prevents the default, and a press
  // from outside the panel's own element is not this surface's.
  useEffect(() => {
    const panel = region.current;
    if (!active || !panel) return undefined;
    const doc = panel.ownerDocument;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isComposing(event)) return;
      if (!(event.target instanceof Node) || !panel.contains(event.target)) return;
      if (layerCount() > 0 || !close.current) return;
      event.preventDefault();
      close.current();
    };
    doc.addEventListener('keydown', onKeyDown);
    return () => doc.removeEventListener('keydown', onKeyDown);
  }, [active, region]);
}

/**
 * The veil behind an overlay or a sheet aside, and its place on the layer
 * stack: Escape, the Tab trap, a press on the veil, focus moved in and handed
 * back. Mounted only while the aside is modal, which is what registers it.
 * Not portalled, for the reason the rail drawer's veil is not: the panel it
 * belongs to is the shell's own element and cannot be moved.
 */
function AsideVeil({
  region,
  onClose,
  onZIndex,
}: {
  region: { current: HTMLElement | null };
  onClose: (() => void) | undefined;
  onZIndex: (zIndex: number | null) => void;
}) {
  const layer = useModalLayer({
    onClose: () => onClose?.(),
    // A modal that nothing can close keeps Escape and its veil from doing
    // anything rather than pretending to: the host gave no way to close it.
    dismissable: onClose !== undefined,
  });
  const { panelRef, zIndex } = layer;
  useEffect(() => {
    onZIndex(zIndex);
    return () => onZIndex(null);
  }, [onZIndex, zIndex]);
  useLayoutEffect(() => {
    panelRef(region.current);
    return () => panelRef(null);
  }, [panelRef, region]);
  return (
    <div
      className="crewlet-app-shell__veil crewlet-app-shell__aside-veil"
      ref={layer.veilRef}
      role="presentation"
      style={{ zIndex }}
    />
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

/**
 * THE FOLD CONTROL: one button on the head's row, before the brand's mark, in
 * the same place in both shapes. Its chevrons point the way the rail will go,
 * left to fold it while it is full and right to unfold it while it is
 * compact. Its name says what pressing it does, `aria-expanded` says whether
 * the rail is open now, and its tooltip carries the keys the application
 * binds.
 *
 * THE CONTROL AND THE MARK ARE ONE PAIR, a step apart and centred together in
 * the compact column, so the column holds both and neither moves when the
 * rail folds (AppShell.css).
 */
function RailFold({
  rail,
  onRailChange,
  keys,
  labels,
  railId,
}: {
  rail: AppShellRailShape;
  onRailChange: ((next: AppShellRailShape) => void) | undefined;
  keys: readonly string[] | undefined;
  labels: { collapse: string; expand: string } | undefined;
  railId: string;
}) {
  const compact = rail === 'compact';
  const label = compact ? (labels?.expand ?? 'Expand the sidebar') : (labels?.collapse ?? 'Collapse the sidebar');
  const apple = isApplePlatform();
  return (
    <span className="crewlet-app-shell__fold">
      <Tooltip
        placement="bottom"
        content={
          <>
            {label}
            {keys ? (
              <>
                {' '}
                <Kbd keys={keys} subtle apple={apple} />
              </>
            ) : null}
          </>
        }
      >
        <IconButton
          label={label}
          size="sm"
          variant="ghost"
          icon={compact ? <ChevronsRightGlyph size="sm" /> : <ChevronsLeftGlyph size="sm" />}
          aria-controls={railId}
          aria-expanded={!compact}
          aria-keyshortcuts={keys ? ariaKeyshortcuts(keys, apple) : undefined}
          onClick={() => onRailChange?.(compact ? 'full' : 'compact')}
        />
      </Tooltip>
    </span>
  );
}

export interface AppShellRailProps {
  /**
   * The head of the rail, drawn at the top bar's own height. Its first child
   * takes the head's width, so a long name (a company's, in a lockup)
   * truncates rather than wrapping.
   */
  header?: ReactNode;
  /**
   * The rail's field, first in its scrolling middle: a `SearchTrigger` with
   * `variant="rail"`. The slot stands it on the nav's own gutter with its
   * glyph on the nav rows' glyph column, so the field needs no inset of its
   * application's own.
   */
  search?: ReactNode;
  /**
   * A compact status at the end of the head's line, beside the name the head
   * carries: an `<AppShell.RailStatus>`, the application's own state in a
   * dot and a count. It takes its own width, so the name keeps the rest and
   * truncates there, and it stands in the drawer's head the same way. In the
   * compact rail it has a row of its own under the head's mark.
   */
  status?: ReactNode;
  /**
   * The foot: what a reader reaches for rarely, such as a settings link and
   * their own account row. An `<AppShell.RailRow>` puts a line there on the
   * rail's own insets, so its mark lands on the line every nav glyph above it
   * sits on. A state the application reports belongs in `status`, compact.
   */
  footer?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * The rail's three regions: a head, a scrolling middle, and a foot.
 *
 * ONE RAIL IN BOTH SHAPES, its slots kept. Compact, the head holds the brand
 * alone (the lockup shows its mark, over the column's centre, and keeps its
 * name as the link's name and title); the field is not drawn, because a
 * 76px column has no room for one and the application draws a Search tile
 * among its `CompactNav` places instead; and the status stands in a row of
 * its own under the mark, as its dot and count, since the head has no line
 * left beside the mark. That row is the first thing under the head in the
 * column, before the places, so the state a reader checks at a glance is
 * where their eye starts. The middle and the foot are drawn as the
 * application gives them.
 */
export function AppShellRail({ header, search, status, footer, className, children }: AppShellRailProps) {
  const compact = useRailShape() === 'compact';
  /*
   * ON ITS WAY OUT while the rail folds over it: nothing in what changes shape
   * (the middle, the foot, the status) takes focus or a press until the
   * compact column is drawn in its place. The head stays live: its mark
   * stands in the same place in both shapes, and it is where focus goes from
   * a row that folds away when the host draws no fold control.
   */
  const leaving = useContext(RailLeavingContext) || undefined;
  const statusSlot = status ? (
    <div className="crewlet-app-shell__rail-status" inert={leaving}>
      {status}
    </div>
  ) : null;
  return (
    <div className={cx('crewlet-app-shell__rail-inner', className)}>
      {header || (status && !compact) ? (
        <div className="crewlet-app-shell__rail-head">
          {header}
          {compact ? null : statusSlot}
        </div>
      ) : null}
      {compact ? statusSlot : null}
      <div className="crewlet-app-shell__rail-body" inert={leaving}>
        {search && !compact ? <div className="crewlet-app-shell__rail-search">{search}</div> : null}
        {children}
      </div>
      {footer ? (
        <div className="crewlet-app-shell__rail-foot" inert={leaving}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A figure at the end of a row in the foot, and what it counts.
 *
 * VALUES RATHER THAN AN ELEMENT, for the reason `NavItem`'s figures are
 * values: the rail paints the figure, so its ink is held to its floor on
 * every ground the row can have, the row a panel is open from included, and
 * that is a fact about the rail rather than something a call site can be
 * asked to know.
 */
export interface RailRowCount {
  /** The figure, drawn as given, so the caller decides its formatting. */
  value: number | string;
  /**
   * What is counted, read after the figure as part of the row's name:
   * `alarms` makes the engine's row "Engine serving, 5 alarms". Required,
   * because a figure read with no word after it is a number nobody can place.
   */
  label: string;
  /**
   * A mark before the figure: the triangle beside a count of alarms.
   * Decoration, because the label says the same thing in words.
   */
  mark?: ReactNode;
  /**
   * `warning` draws the figure and its mark in the warning ink, for a count
   * of things that are wrong: the alarms standing on a node. The figure is
   * never the only carrier, since its mark and its label say the same. Left
   * out, it is the quiet figure a count in the nav is, in the tertiary ink.
   */
  tone?: Extract<Tone, 'neutral' | 'warning'> | undefined;
}

/** A count as the end of a name: ", 5 alarms". */
function countWords(count: RailRowCount): string {
  return `, ${String(count.value)} ${count.label}`;
}

/** A count as it is drawn: the figure and its mark, hidden from assistive technology, which reads `countWords`. */
function RailCountFigure({ count }: { count: RailRowCount }) {
  return (
    <span
      className={cx(
        'crewlet-app-shell__rail-row-count',
        count.tone === 'warning' && 'crewlet-app-shell__rail-row-count--warning',
      )}
      aria-hidden
    >
      {count.mark ? <span className="crewlet-app-shell__rail-row-count-mark">{count.mark}</span> : null}
      {count.value}
    </span>
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
  /**
   * A value at the end of the row: a tag, a time. It stands beside the words
   * while both fit on the rail, and drops under them when they do not, so it
   * never takes the room the words need. A figure with words that name it is
   * `count`.
   */
  trailing?: ReactNode;
  /**
   * How many of something the row reports, as a figure after the words: the
   * alarms standing on the engine. It is read as the end of the row's name
   * (", 5 alarms") and hidden from assistive technology where it is drawn, so
   * each reader is told it once.
   */
  count?: RailRowCount | undefined;
  /**
   * A second line under the row's words: "3 nodes · config epoch 42" under
   * "Engine healthy". Given one, the row is the design's STATUS BLOCK, drawn
   * on the card rung inside a hairline, its words in the primary ink over this
   * line in the quiet one.
   */
  detail?: ReactNode;
  className?: string | undefined;
  /** What the row says. */
  children?: ReactNode;
}

/** A row the rail states and nothing presses. */
export interface StaticRailRowProps extends RailRowContent {
  onClick?: undefined;
  label?: undefined;
  'aria-expanded'?: undefined;
  'aria-haspopup'?: undefined;
  'aria-controls'?: undefined;
}

/** A row that opens something: the engine panel, an account menu. */
export interface ActionRailRowProps extends RailRowContent {
  onClick: MouseEventHandler<HTMLButtonElement>;
  /**
   * Names the control where its own words are not a name: "engine connected"
   * names a state rather than what pressing it does. It replaces the name the
   * row's words and its count would give it, so it says the count too.
   */
  label?: string | undefined;
  /**
   * Whether the panel this row opens is open. A `Popover` or a `Menu` the row
   * is the trigger of passes this and the two below, and the row draws its
   * open state from it, so the picture and what a screen reader is told
   * cannot come apart.
   */
  'aria-expanded'?: boolean | undefined;
  /**
   * What the row opens. Given one, the row ends in a chevron pointing up,
   * which is where a panel opened from the rail's foot stands.
   */
  'aria-haspopup'?: AriaAttributes['aria-haspopup'];
  /** The panel the row opens, while it is open. */
  'aria-controls'?: string | undefined;
}

/**
 * A row in the rail's foot.
 *
 * `label` and the three popup attributes are refused without `onClick` by the
 * type rather than ignored at runtime: `aria-label` on an element with no role
 * is dropped by assistive technology, and `aria-expanded` on one is a state of
 * a control that does not exist, so either passed to a row nothing presses is
 * something nobody is ever told, and a silent no-op is the shape a caller
 * cannot debug.
 */
export type AppShellRailRowProps = StaticRailRowProps | ActionRailRowProps;

/** Whether a row's `aria-haspopup` says it opens something. */
function opensSomething(haspopup: AriaAttributes['aria-haspopup']): boolean {
  return haspopup !== undefined && haspopup !== false && haspopup !== 'false';
}

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
 *
 * A ROW THAT OPENS A PANEL IS THE PANEL'S TRIGGER, as it is: the element is
 * handed to `ref`, and the popup attributes a `Popover` or a `Menu` gives its
 * trigger reach the button, so the panel is anchored to the row and the row
 * says whether it is open.
 */
export const AppShellRailRow = forwardRef<HTMLElement, AppShellRailRowProps>(function AppShellRailRow(
  {
    icon,
    trailing,
    count,
    detail,
    onClick,
    label,
    className,
    children,
    'aria-expanded': expanded,
    'aria-haspopup': haspopup,
    'aria-controls': controls,
  },
  ref,
) {
  const block = detail !== undefined && detail !== null && detail !== false && detail !== '';
  const opens = onClick !== undefined && opensSomething(haspopup);
  /*
   * THE WORDS ARE NEVER CUT. A status line says what a node is doing, and the
   * row used to give its words whatever the mark and the trailing value left
   * and end them in an ellipsis, so a pill beside "engine connected" left
   * "engine conn…": the one part of the row that was the point. The words and
   * the value now share a wrapping line, so the value stands beside the words
   * while both fit and drops under them when they do not, and words longer
   * than the rail wrap rather than end.
   */
  const inside = (
    <>
      {icon ? (
        <span className="crewlet-app-shell__rail-row-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      {/*
       * The spaces between the parts are REAL, so a control named by its
       * content reads "Engine healthy 3 nodes" rather than "Engine healthy3
       * nodes". A flex container draws no text node of whitespace alone
       * between its items, so they cost the layout nothing.
       */}
      <span className="crewlet-app-shell__rail-row-body">
        <span className="crewlet-app-shell__rail-row-text">
          <span className="crewlet-app-shell__rail-row-label">
            {children}
            {/* THE COUNT IS READ AS THE END OF THE WORDS, in the words' own
                box: written after the last word, the comma lands where it
                belongs and the pause it buys falls between the state and its
                figure ("Engine serving, 5 alarms"), as a nav row's does. */}
            {count ? <VisuallyHidden>{countWords(count)}</VisuallyHidden> : null}
          </span>
          {block ? (
            <>
              {' '}
              <span className="crewlet-app-shell__rail-row-detail">{detail}</span>
            </>
          ) : null}
        </span>
        {count ? (
          <>
            {' '}
            <RailCountFigure count={count} />
          </>
        ) : null}
        {trailing ? (
          <>
            {' '}
            <span className="crewlet-app-shell__rail-row-trailing">{trailing}</span>
          </>
        ) : null}
      </span>
      {/* OUTSIDE THE LINE THE WORDS SHARE, so it never drops under them: it
          says what pressing the row does, and it is the row's last mark at
          every width. */}
      {opens ? (
        <span className="crewlet-app-shell__rail-row-opens" aria-hidden>
          <ChevronUpGlyph size="xs" />
        </span>
      ) : null}
    </>
  );
  const shape = cx('crewlet-app-shell__rail-row', block && 'crewlet-app-shell__rail-row--block', className);
  if (onClick === undefined) {
    return (
      <div ref={ref as Ref<HTMLDivElement>} className={shape}>
        {inside}
      </div>
    );
  }
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      className={cx(shape, 'crewlet-app-shell__rail-row--action', HIT_AREA_CLASS)}
      aria-label={label}
      aria-expanded={expanded}
      aria-haspopup={haspopup}
      aria-controls={controls}
      onClick={onClick}
    >
      {inside}
    </button>
  );
});

/** What the head's status says, whether or not it is a control. */
interface RailStatusContent {
  /** The state's mark: a status dot. The status draws no words, so the mark and the count are what is seen. */
  icon: ReactNode;
  /**
   * The state in words, "Engine serving". Not drawn: it is the status's name,
   * read by assistive technology and shown as its title, with the count's
   * words after it ("Engine serving, 1 alarm").
   */
  children: string;
  /** How many of something stands against the state, drawn as a row's count is. */
  count?: RailRowCount | undefined;
  /** A mark after the count, for a state a press resolves: the key beside "sign in". */
  trailing?: ReactNode;
  className?: string | undefined;
}

/** A status the head states and nothing presses. */
export interface StaticRailStatusProps extends RailStatusContent {
  onClick?: undefined;
  label?: undefined;
  'aria-expanded'?: undefined;
  'aria-haspopup'?: undefined;
  'aria-controls'?: undefined;
}

/** A status that opens something: the engine's panel. */
export interface ActionRailStatusProps extends RailStatusContent {
  onClick: MouseEventHandler<HTMLButtonElement>;
  /**
   * Names the control where the state and its count are not what pressing it
   * does ("Engine signed out. Sign in"). It replaces that name, and the title.
   */
  label?: string | undefined;
  /** Whether the panel it opens is open, as a `Popover` or a `Menu` trigger passes it. */
  'aria-expanded'?: boolean | undefined;
  /** What it opens. */
  'aria-haspopup'?: AriaAttributes['aria-haspopup'];
  /** The panel it opens, while it is open. */
  'aria-controls'?: string | undefined;
}

export type AppShellRailStatusProps = StaticRailStatusProps | ActionRailStatusProps;

/**
 * The application's state, compact, at the end of the rail head's line.
 *
 * A FOOT ROW'S MEANING IN A DOT AND A COUNT. The state's words are its name
 * and its title rather than a line of the rail ("Engine serving, 1 alarm"),
 * so a sighted reader reads the dot and the count, and hovers for the words,
 * and a screen reader is told what a foot row would have told it. The count
 * is the row's own (`RailRowCount`), in the same inks.
 *
 * IT TAKES A FIXED FLOOR OF WIDTH, a dot and a two-figure count, so the
 * name beside it truncates at one place whatever the count says: the name
 * does not lose a character when an alarm is raised. A count wider than the
 * floor still grows the status rather than being cut.
 *
 * A STATUS THAT OPENS A PANEL IS ITS TRIGGER, as the foot's row is: the
 * element goes to `ref` and the popup attributes reach the button, so a
 * `Popover` anchors to it and it says whether the panel is open.
 */
export const AppShellRailStatus = forwardRef<HTMLElement, AppShellRailStatusProps>(function AppShellRailStatus(
  {
    icon,
    children,
    count,
    trailing,
    onClick,
    label,
    className,
    'aria-expanded': expanded,
    'aria-haspopup': haspopup,
    'aria-controls': controls,
  },
  ref,
) {
  const name = label ?? `${children}${count ? countWords(count) : ''}`;
  const marks = (
    <>
      <span className="crewlet-app-shell__rail-status-icon" aria-hidden>
        {icon}
      </span>
      {count ? <RailCountFigure count={count} /> : null}
      {trailing ? (
        <span className="crewlet-app-shell__rail-status-trailing" aria-hidden>
          {trailing}
        </span>
      ) : null}
    </>
  );
  const shape = cx('crewlet-app-shell__rail-status-mark', className);
  if (onClick === undefined) {
    return (
      <span ref={ref as Ref<HTMLSpanElement>} className={shape} title={name}>
        {marks}
        <VisuallyHidden>{name}</VisuallyHidden>
      </span>
    );
  }
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      className={cx(shape, 'crewlet-app-shell__rail-status-mark--action', HIT_AREA_CLASS)}
      aria-label={name}
      title={name}
      aria-expanded={expanded}
      aria-haspopup={haspopup}
      aria-controls={controls}
      onClick={onClick}
    >
      {marks}
    </button>
  );
});

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
AppShell.RailStatus = AppShellRailStatus;
AppShell.Topbar = AppShellTopbar;
AppShell.Toggle = AppShellToggle;
AppShell.AccountRow = AccountRow;
AppShell.ResizeHandle = ResizeHandle;
