/**
 * The application frame: a rail on the frame and, beside it, a floating sheet
 * holding the top bar and the one scroll container (the document never
 * scrolls). Below the shell step the rail becomes a modal drawer.
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
import { focusables, useEscapeWithin, useModalLayer } from '../Layer/index.js';
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
 * Where the rail becomes a drawer: strictly under the shell step, since the
 * wide layout still fits at exactly that width. AppShell.css uses the same query.
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
   * The shape the rail is drawn in now: `compact` only where the host asked
   * and the layout is wide, `full` otherwise and while the rail folds.
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
   * Gives the screen the whole space under the bar as a positioned flex
   * column, for a canvas or split view that draws to the window's foot instead
   * of scrolling. `flush` also drops the column's pad and gap.
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
   * The rail shape the reader chose. Under the shell step the rail is a full
   * drawer whatever this says; `useAppShell().rail` reports the shape drawn.
   */
  rail?: AppShellRailShape | undefined;
  /**
   * Called with the other shape when the reader presses the fold control,
   * which the shell draws only when this is given (never in the drawer).
   */
  onRailChange?: ((next: AppShellRailShape) => void) | undefined;
  /**
   * The keys the application binds to the fold (`['Mod', '\\']`), shown in
   * the control's tooltip and `aria-keyshortcuts`. The shell binds nothing.
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
   * Whether an `overlay` aside is modal: true (the default) is a dialog behind
   * a veil; false leaves the page live and Escape still closes it. A column is
   * never modal and a sheet always is.
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
   * host decides it. The peek sizes itself (`PeekRail` takes its width).
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
  const [gauge, setGauge] = useState<HTMLElement | null>(null);
  // The drawer's layer step, reported by its surface, so the rail paints one
  // step above its own veil. Steps are handed out by depth, so not a constant.
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

  // Measurements are held while the rail moves: the observers below would
  // fire every frame of a fold, so each held one is taken once at rest.
  const railMoving = useRef(false);
  const heldMeasures = useRef(new Set<() => void>());
  const unlessRailMoving = useCallback(
    (measure: () => void) => () => {
      if (railMoving.current) heldMeasures.current.add(measure);
      else measure();
    },
    [],
  );

  // The scrollbar's width, which CSS cannot read, so the top bar reserves
  // the same strip (`--crewlet-app-shell-gutter`). A fill screen's scroller
  // reserves none, so there it is read off the gauge, which always has one.
  const [gutter, setGutter] = useState(0);
  useLayoutEffect(() => {
    const ruler = gauge ?? scroller;
    if (!ruler) return undefined;
    const measure = () => setGutter(Math.max(0, ruler.offsetWidth - ruler.clientWidth));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(unlessRailMoving(measure));
    observer.observe(ruler);
    const held = heldMeasures.current;
    return () => {
      observer.disconnect();
      held.delete(measure);
    };
  }, [gauge, scroller, unlessRailMoving]);

  // What the aside column takes from the window's right, so a peek drawer
  // covers the page rather than the aside. Published only while the aside is
  // a column, as `--crewlet-app-shell-aside-occupied`.
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

  // The content column's content box, the width its container queries read,
  // published for `useScreenBelow` (screenWidth.ts) before the first paint.
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

  // Focus in content the fold turns inert moves to the rail's first live
  // control, or, where there is none, to the folded rail's first control
  // once it is drawn.
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
        // The shapes are attributes with one value each, so the stylesheet
        // switches on the host's decision rather than on a media query.
        data-aside={hasAside ? asideShape : undefined}
        data-peek={hasPeek ? peekShape : undefined}
        data-rail={hasRail ? railShape : undefined}
        data-rail-motion={railMotion ?? undefined}
        style={{
          ...style,
          ['--crewlet-app-shell-gutter' as string]: `${gutter}px`,
          ...(drawerZ === null ? null : { ['--crewlet-app-shell-drawer-z' as string]: String(drawerZ) }),
          // On the root, since both the grid track here and the overlay
          // below read it, and a custom property inherits downward only.
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
         * First in the document. It moves focus itself rather than following
         * the fragment, which a hash-routed application would read as a route.
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
            // A dialog only while it is the open drawer; otherwise it is the
            // page's own navigation.
            role={drawerOpen ? 'dialog' : undefined}
            aria-modal={drawerOpen || undefined}
            aria-label={drawerOpen ? toggleLabel : undefined}
          >
            {/*
             * The shell's own fold control, outside the rail's content so a
             * rail swapped between shapes never remounts it and loses focus.
             * It follows the chosen shape, not the one drawn.
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
          {fill === true ? (
            <div className="crewlet-app-shell__gauge" aria-hidden="true">
              <div ref={setGauge} className="crewlet-app-shell__gauge-ruler" />
            </div>
          ) : null}
          {/*
           * Always rendered, peek or none: a wrapper that came and went would
           * remount `main`, its screen and its scroll position on every peek.
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
 * The aside's track: one `div` in every shape with its role switched (a
 * dialog when modal), so a change of shape never remounts the panel. Only a
 * column has a grip, outside the clipping sheet.
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
       * After the region, so its ref is attached before the veil's layout
       * effect hands it to the layer stack.
       */}
      {modal ? <AsideVeil region={region} onClose={onClose} onZIndex={setZ} /> : null}
    </AsideContext.Provider>
  );
}

/**
 * A non-modal overlay: focus moves in on open and back to the opener (read on
 * first render) on close if still inside, and Escape from inside closes it.
 * Not on the layer stack, which owns every Escape and Tab in the document.
 */
function useLooseOverlay(
  region: { current: HTMLElement | null },
  active: boolean,
  onClose: (() => void) | undefined,
): void {
  const [opener] = useState<Element | null>(() => (typeof document === 'undefined' ? null : document.activeElement));
  const loose = useRef(active);
  loose.current = active;
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

  // ESCAPE FROM INSIDE, as `SidePanel` hears it, giving way to any open layer.
  useEscapeWithin(region, onClose, active);
}

/**
 * The veil behind a modal aside, and its place on the layer stack; mounting
 * it registers it. Not portalled: its panel is the shell's own element.
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
 * The narrow layout's drawer: makes the always-mounted rail modal on the
 * layer stack while open. Its veil is not portalled, because the rail is a
 * cell of the shell's grid and the veil must stay beside it.
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
 * The fold control, before the brand's mark in both shapes: its chevrons
 * point the way the rail will go, and its tooltip carries the bound keys.
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
          tooltip={false}
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
   * `variant="rail"`, aligned to the nav rows by the slot.
   */
  search?: ReactNode;
  /**
   * An `<AppShell.RailStatus>` (a dot and a count) at the end of the head's
   * line; in the compact rail, a row of its own under the head's mark.
   */
  status?: ReactNode;
  /**
   * The foot, for what a reader reaches for rarely (settings, their account).
   * An `<AppShell.RailRow>` lines its mark up with the nav glyphs above it.
   */
  footer?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * The rail's three regions: a head, a scrolling middle, and a foot. Compact,
 * the head shows the brand's mark alone, the field is not drawn, and the
 * status takes a row of its own under the mark.
 */
export function AppShellRail({ header, search, status, footer, className, children }: AppShellRailProps) {
  const compact = useRailShape() === 'compact';
  // While the rail folds, what changes shape (middle, foot, status) is inert;
  // the head stays live, since its mark stands still and can take focus.
  const leaving = useContext(RailLeavingContext) || undefined;
  // The middle's own scrollbar width, which CSS cannot read, so the field
  // and the nav take it off their end inset and keep their width whether or
  // not the middle scrolls. 0 where scrollbars overlay the content.
  const [middle, setMiddle] = useState<HTMLDivElement | null>(null);
  const [scrollbar, setScrollbar] = useState(0);
  useLayoutEffect(() => {
    if (!middle) return undefined;
    const measure = () => setScrollbar(Math.max(0, middle.offsetWidth - middle.clientWidth));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    // A bar that changes width (a zoom, the compact shape's unreserved bar
    // arriving) changes the middle's content box, which is what this watches.
    const observer = new ResizeObserver(measure);
    observer.observe(middle);
    return () => observer.disconnect();
  }, [middle]);
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
      <div
        ref={setMiddle}
        className="crewlet-app-shell__rail-body"
        inert={leaving}
        style={{ ['--crewlet-rail-scrollbar' as string]: `${scrollbar}px` }}
      >
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
 * A figure at the end of a row in the foot, and what it counts. Values rather
 * than an element, so the rail paints the figure in an ink it can hold.
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
   * of things that are wrong; left out, the figure is in the tertiary ink.
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
   * A value at the end of the row (a tag, a time), beside the words while
   * both fit and under them when not. A named figure is `count`.
   */
  trailing?: ReactNode;
  /**
   * A figure after the words, such as the alarms on the engine, read once as
   * the end of the row's name (", 5 alarms").
   */
  count?: RailRowCount | undefined;
  /**
   * A second line under the row's words ("3 nodes · config epoch 42"). Given
   * one, the row is drawn as a status block on the card rung inside a hairline.
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
   * Whether the panel this row opens is open, passed by the `Popover` or
   * `Menu` it triggers; the row draws its open state from it.
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
 * A row in the rail's foot. Without `onClick` the type refuses `label` and
 * the popup attributes, which a row nothing presses has no role to carry.
 */
export type AppShellRailRowProps = StaticRailRowProps | ActionRailRowProps;

/** Whether a row's `aria-haspopup` says it opens something. */
function opensSomething(haspopup: AriaAttributes['aria-haspopup']): boolean {
  return haspopup !== undefined && haspopup !== false && haspopup !== 'false';
}

/**
 * A row in the rail's foot, on the rail's own insets so its mark lines up
 * with the nav glyphs. With `onClick` it is a button that can be a `Popover`
 * or `Menu` trigger: `ref` and the popup attributes reach the button.
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
  // The words are never cut: they share a wrapping line with the trailing
  // value, which drops under them when both do not fit.
  const inside = (
    <>
      {icon ? (
        <span className="crewlet-app-shell__rail-row-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      {/*
       * Real spaces between the parts, so a name read from the content is
       * "Engine healthy 3 nodes"; flex layout draws none of them.
       */}
      <span className="crewlet-app-shell__rail-row-body">
        <span className="crewlet-app-shell__rail-row-text">
          <span className="crewlet-app-shell__rail-row-label">
            {children}
            {/* The count is read as the end of the words, in their own box:
                "Engine serving, 5 alarms". */}
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
 * The application's state at the end of the rail head's line: a dot and a
 * count, with the words as its name and title. It keeps a two-figure floor
 * of width so the name beside it truncates at one place.
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
 * The control that opens the rail as a drawer. Drawn at every width and
 * hidden by the stylesheet above the breakpoint.
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
