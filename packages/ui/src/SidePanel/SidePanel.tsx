import { useMemo, type ReactNode, type Ref } from 'react';
import { cx } from '../utils/cx.js';
import {
  SidePanelBase,
  SidePanelFrameContext,
  type SidePanelInitialFocus,
  type SidePanelShape,
} from './SidePanelBase.js';

export type { SidePanelInitialFocus, SidePanelShape } from './SidePanelBase.js';

/** The panel's resting width, in px, where the host names none. */
export const SIDE_PANEL_WIDTH = 420;
/** The narrowest a reader may drag it, in px. */
export const SIDE_PANEL_MIN_WIDTH = 360;
/** The widest, in px, before any cap the host applies so the content keeps its floor. */
export const SIDE_PANEL_MAX_WIDTH = 640;

export interface SidePanelLabels {
  /** Names the close button: "Close the assistant". */
  close: (title: string) => string;
  /** Names the grip: "Resize the assistant panel". */
  resize: (title: string) => string;
}

export const SIDE_PANEL_LABELS: SidePanelLabels = {
  close: (title) => `Close ${title}`,
  resize: (title) => `Resize ${title}`,
};

export interface SidePanelProps {
  /** Names the panel; it is the panel's heading, level two. */
  title: string;
  /** A mark before the title: the product mark, the glyph of the control that opened it. */
  icon?: ReactNode;
  /** Draw the title for assistive technology only, where the icon says it. */
  hideTitle?: boolean | undefined;
  /** Closes the panel: its close button, and Escape from anywhere inside it. */
  onClose: () => void;
  /** Controls in the head, before Close: New conversation, a history menu. */
  actions?: ReactNode;
  /**
   * What stays under the body however far it scrolls: a composer, a commit.
   * Drawn on a hairline at the panel's foot, outside the scrolling body.
   */
  footer?: ReactNode;
  /**
   * Drops the body's inset and its scrolling, for content that owns both: a
   * `ChatThread`, which scrolls itself and insets its own items, so its
   * scrollbar stands on the panel's edge and the inset is not drawn twice.
   * The body clips (`overflow: clip`) rather than scrolls, so a focus or a
   * script inside cannot move it; content that may be taller than the panel
   * scrolls itself (`min-height: 0` in the body's column, as `ChatThread`
   * does). `--crewlet-side-panel-inset` reads 0 inside the body.
   */
  flush?: boolean | undefined;
  /**
   * The width, in px, in a `SidePanelFrame`. In the shell's aside the shell's
   * track sizes the panel (`AppShell` `asideWidth`), and this is ignored.
   */
  width?: number | undefined;
  /** The narrowest a drag or a key may take it. */
  minWidth?: number | undefined;
  /** The widest, already capped by the host so the content beside it keeps its floor. */
  maxWidth?: number | undefined;
  /** The resting width a reset (Enter on the grip, a double press) returns to. */
  defaultWidth?: number | undefined;
  /** Every change of width while a drag or a key moves it. */
  onWidthChange?: ((width: number) => void) | undefined;
  /** Where a resize ends: the moment to keep the reader's width. */
  onWidthCommit?: ((width: number) => void) | undefined;
  /**
   * Draws the grip on the panel's start edge as a column or a drawer. In the
   * shell's aside the shell draws the grip in its seam (`AppShell`
   * `asideResize`), so this is ignored there.
   */
  resizable?: boolean | undefined;
  /**
   * Where focus goes on open: the heading (the default, so a screen reader
   * announces what opened), nowhere (a panel a link opened on arrival must
   * not take focus from the page), or a field of the panel's own, such as a
   * composer. The heading takes focus without drawing a ring: it is not a
   * control, and a ring round it reads as one.
   */
  initialFocus?: SidePanelInitialFocus | undefined;
  labels?: Partial<SidePanelLabels> | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * A panel beside what the reader is working on: the assistant, a peek at a
 * record, an artifact's details. Head, scrolling body, foot.
 *
 * A REGION, NOT A DIALOG, wherever the content beside it is still reachable:
 * a complementary landmark named by its heading, which never traps focus, so
 * the reader moves between the two with Tab as between any two parts of a
 * page. Only as a `sheet`, where it covers everything, is it a modal dialog
 * on the shared layer stack.
 *
 * FOCUS IS STILL MANAGED. Opening moves focus to the heading (or to
 * `initialFocus`); closing with focus inside hands it back to whatever held
 * it before, and leaves it alone otherwise. Escape closes it from anywhere
 * inside, a field included, unless something inside answered the press
 * first.
 *
 * IN THE SHELL'S ASIDE it is a box that fills the aside: the shell names the
 * region, sizes the track and draws the grip in the seam, from the same
 * width the host keeps for both.
 */
export function SidePanel({
  title,
  icon,
  hideTitle,
  onClose,
  actions,
  footer,
  flush,
  width,
  minWidth = SIDE_PANEL_MIN_WIDTH,
  maxWidth = SIDE_PANEL_MAX_WIDTH,
  defaultWidth = SIDE_PANEL_WIDTH,
  onWidthChange,
  onWidthCommit,
  resizable,
  initialFocus,
  labels,
  className,
  children,
}: SidePanelProps) {
  const words = { ...SIDE_PANEL_LABELS, ...labels };
  return (
    <SidePanelBase
      title={title}
      icon={icon}
      hideTitle={hideTitle}
      onClose={onClose}
      closeLabel={words.close(title)}
      resizeLabel={words.resize(title)}
      actions={actions}
      footer={footer}
      flush={flush}
      width={width ?? (resizable ? defaultWidth : undefined)}
      minWidth={minWidth}
      maxWidth={maxWidth}
      defaultWidth={defaultWidth}
      onWidthChange={onWidthChange}
      onWidthCommit={onWidthCommit}
      resizable={resizable}
      initialFocus={initialFocus}
      className={className}
    >
      {children}
    </SidePanelBase>
  );
}

export interface SidePanelFrameProps {
  /** The open panel, if any: a `SidePanel`. */
  panel?: ReactNode;
  /**
   * Where the panel stands, decided by the host from its own arithmetic. Left
   * out, the frame measures itself: a column where there is room for two, a
   * drawer over the content's end below 960px, and the whole frame below
   * 640px (still a region, since nothing told it the content is out of reach).
   */
  shape?: SidePanelShape | undefined;
  /**
   * The content's floor beside a column, in px: the panel is capped at what
   * leaves the content this wide, so a width dragged in a wide frame never
   * takes a narrower frame's content away.
   */
  reserve?: number | undefined;
  /** Whether the open panel takes the whole frame. */
  expanded?: boolean | undefined;
  /** The content's own element: the one a caller scrolls, measures or listens on. */
  bodyRef?: Ref<HTMLDivElement> | undefined;
  bodyClassName?: string | undefined;
  /** Names the content's region. */
  bodyLabel?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** A frame's own parts, with a preset's names beside them. */
export interface SidePanelFrameBaseProps extends SidePanelFrameProps {
  alias?: string | undefined;
}

/**
 * The content and its one open side panel, side by side or one over the
 * other. Not exported from the package; `SidePanelFrame` and
 * `ArtifactWorkspace` are its two names.
 */
export function SidePanelFrameBase({
  alias,
  panel,
  shape,
  reserve,
  expanded = false,
  bodyRef,
  bodyClassName,
  bodyLabel,
  className,
  children,
}: SidePanelFrameBaseProps) {
  const context = useMemo(() => ({ shape: shape ?? null }), [shape]);
  return (
    <SidePanelFrameContext.Provider value={context}>
      <div
        className={cx('crewlet-side-panel-frame', alias, className)}
        data-shape={shape ?? 'auto'}
        data-panel={panel ? (expanded ? 'expanded' : 'open') : undefined}
        style={reserve === undefined ? undefined : { ['--crewlet-side-panel-reserve' as string]: `${reserve}px` }}
      >
        <div
          ref={bodyRef}
          className={cx('crewlet-side-panel-frame__body', alias && `${alias}__body`, bodyClassName)}
          role={bodyLabel ? 'region' : undefined}
          aria-label={bodyLabel}
        >
          {children}
        </div>
        {panel}
      </div>
    </SidePanelFrameContext.Provider>
  );
}

/**
 * The content and its one open side panel: a column beside it, a drawer over
 * its end edge, or a sheet over all of it, as the host decides (`shape`), or
 * as the frame's own width decides where the host leaves it out.
 */
export function SidePanelFrame(props: SidePanelFrameProps) {
  return <SidePanelFrameBase {...props} />;
}
