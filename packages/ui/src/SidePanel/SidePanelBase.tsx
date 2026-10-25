/**
 * The drawing and the behaviour every side panel shares: `SidePanel`, and
 * `ArtifactPanel`, which is a preset of it.
 *
 * Not exported from the package. It carries the two things only a preset
 * needs: `alias`, the block class a preset has always published (so a
 * consumer's selectors on `crewlet-artifact-panel__body` keep matching), and
 * `expanded`, the artifact's full-workspace view.
 */

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { MaximizeGlyph, MinimizeGlyph, XGlyph } from '@crewlethq/icons/glyphs';
import { useAppShellAside } from '../AppShell/regions.js';
import { ResizeHandle } from '../AppShell/ResizeHandle.js';
import { IconButton } from '../IconButton/index.js';
import { useModalLayer } from '../Layer/index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { cx } from '../utils/cx.js';

/**
 * Where a side panel stands, decided by its host.
 *
 * - `column`: beside the content, which narrows to make room; a complementary
 *   region.
 * - `drawer`: over the content's end edge, lifted off it, with no veil and no
 *   trap: the content stays live and reachable.
 * - `sheet`: the whole frame, on a phone; a modal dialog, because nothing else
 *   is reachable.
 */
export type SidePanelShape = 'column' | 'drawer' | 'sheet';

/** What a `SidePanelFrame` tells the panel inside it. Null where the frame measures (`shape` left out). */
export const SidePanelFrameContext = createContext<{ shape: SidePanelShape | null } | null>(null);

/** Where focus goes when the panel opens. */
export type SidePanelInitialFocus = 'heading' | 'none' | RefObject<HTMLElement | null>;

export interface SidePanelBaseProps {
  /** A preset's own block class, added beside every part's class. */
  alias?: string | undefined;
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  closeLabel: string;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Whether the body drops its inset and its scrolling, for content that owns both. */
  flush?: boolean | undefined;
  initialFocus?: SidePanelInitialFocus | undefined;
  /** Whether the heading draws the focus ring when it holds focus. */
  ringHeading?: boolean | undefined;
  /** Whether the title is drawn, or only names the panel. */
  hideTitle?: boolean | undefined;
  expanded?: boolean | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
  expandLabel?: string | undefined;
  collapseLabel?: string | undefined;
  width?: number | undefined;
  minWidth?: number | undefined;
  maxWidth?: number | undefined;
  defaultWidth?: number | undefined;
  onWidthChange?: ((width: number) => void) | undefined;
  onWidthCommit?: ((width: number) => void) | undefined;
  resizable?: boolean | undefined;
  resizeLabel?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** A part's class, and the preset's own name for the same part. */
function part(name: string, alias: string | undefined): string {
  return cx(`crewlet-side-panel__${name}`, alias && `${alias}__${name}`);
}

export function SidePanelBase({
  alias,
  title,
  icon,
  onClose,
  closeLabel,
  actions,
  footer,
  flush = false,
  initialFocus = 'heading',
  ringHeading = false,
  hideTitle = false,
  expanded = false,
  onExpandedChange,
  expandLabel = 'Expand',
  collapseLabel = 'Collapse',
  width,
  minWidth = 0,
  maxWidth,
  defaultWidth,
  onWidthChange,
  onWidthCommit,
  resizable = false,
  resizeLabel,
  className,
  children,
}: SidePanelBaseProps) {
  const titleId = useId();
  const panelId = useId();
  const root = useRef<HTMLDivElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const before = useRef<Element | null>(null);
  const start = useRef(initialFocus);

  /*
   * WHERE IT STANDS. In the shell's aside the shell is the region (it names
   * it, sizes it and draws its grip), so the panel is a plain box filling it.
   * In a frame, the frame's shape decides: a sheet is a modal dialog, every
   * other shape a complementary region. Anywhere else it is a region.
   */
  const inShell = useAppShellAside() !== null;
  const frame = useContext(SidePanelFrameContext);
  const shape = frame?.shape ?? null;
  const modal = !inShell && shape === 'sheet';
  const role = inShell ? undefined : modal ? 'dialog' : 'complementary';

  // A LAYOUT EFFECT, both ways: the heading is focused before the paint, and
  // the cleanup runs while the panel is still in the document, which is the
  // only moment it can still tell whether focus was inside it.
  useLayoutEffect(() => {
    const panel = root.current;
    before.current = document.activeElement;
    const target = start.current;
    if (target === 'heading') heading.current?.focus({ preventScroll: true });
    else if (target !== 'none') target.current?.focus({ preventScroll: true });
    return () => {
      const back = before.current;
      if (panel?.contains(document.activeElement) && back instanceof HTMLElement && back.isConnected) {
        back.focus({ preventScroll: true });
      }
    };
  }, []);

  // HEARD AT THE DOCUMENT, AFTER EVERYTHING INSIDE: a control in the panel
  // that answers Escape itself (a field that clears, a picker that closes)
  // prevents the default, and only a press nobody answered closes the panel.
  // A press from a surface portalled out of the panel is that surface's, so
  // only one from inside the panel's own element counts. The handler is read
  // through a ref, so a new `onClose` each render does not re-register it.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const panel = root.current;
    if (!panel) return undefined;
    const doc = panel.ownerDocument;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
      if (!(event.target instanceof Node) || !panel.contains(event.target)) return;
      event.preventDefault();
      close.current();
    };
    doc.addEventListener('keydown', onKeyDown);
    return () => doc.removeEventListener('keydown', onKeyDown);
  }, []);

  // THE PANEL SIZES ITSELF only where nothing else does: the shell's aside is
  // a grid track, and an expanded panel takes the whole frame.
  const sized = !inShell && !expanded && width !== undefined;
  // A grip only where the panel stands beside the content: over it, as a
  // drawer or a sheet, there is no edge between the two to move.
  const grip =
    resizable && !inShell && !expanded && (shape === null || shape === 'column') && width !== undefined && onWidthChange;

  return (
    <>
      <div
        ref={root as Ref<HTMLDivElement>}
        id={panelId}
        className={cx('crewlet-side-panel', inShell && 'crewlet-side-panel--fill', alias, className)}
        role={role}
        aria-modal={modal || undefined}
        aria-labelledby={inShell ? undefined : titleId}
        data-expanded={expanded || undefined}
        style={sized ? { ['--crewlet-side-panel-width' as string]: `${width}px` } : undefined}
      >
        {grip ? (
          <ResizeHandle
            label={resizeLabel ?? `Resize ${title}`}
            value={width}
            min={minWidth}
            max={maxWidth ?? width}
            defaultValue={defaultWidth}
            onValueChange={onWidthChange}
            onValueCommit={onWidthCommit}
            controls={panelId}
            edge="left"
          />
        ) : null}
        <div className={part('head', alias)}>
          {icon ? (
            <span className={part('icon', alias)} aria-hidden>
              {icon}
            </span>
          ) : null}
          <h2
            ref={heading}
            id={titleId}
            className={cx(
              part('title', alias),
              !ringHeading && 'crewlet-side-panel__title--quiet',
              hideTitle && 'crewlet-side-panel__title--hidden',
            )}
            tabIndex={-1}
          >
            {title}
          </h2>
          <span className={part('actions', alias)}>
            {actions}
            {onExpandedChange ? (
              <IconButton
                label={expanded ? collapseLabel : expandLabel}
                icon={expanded ? <MinimizeGlyph size="sm" /> : <MaximizeGlyph size="sm" />}
                size="sm"
                variant="ghost"
                onClick={() => onExpandedChange(!expanded)}
              />
            ) : null}
            <IconButton label={closeLabel} icon={<XGlyph size="sm" />} size="sm" variant="ghost" onClick={onClose} />
          </span>
        </div>
        {/* THE PANEL'S TITLE IS ITS LEVEL TWO, so a section inside it heads at three. */}
        <div className={cx(part('body', alias), flush && 'crewlet-side-panel__body--flush')}>
          <HeadingLevelProvider level={3}>{children}</HeadingLevelProvider>
        </div>
        {footer ? <div className={part('foot', alias)}>{footer}</div> : null}
      </div>
      {/* AFTER the panel, so the panel's ref is attached by the time the
          layer's layout effect reads it: a child's effects run before its
          parent's ref on the commit that mounts both. */}
      {modal ? <SheetLayer panel={root} onClose={onClose} /> : null}
    </>
  );
}

/**
 * The panel as a sheet, on the shared layer stack: Tab stays in it, Escape
 * closes it from anywhere, focus is handed back when it goes. There is no
 * veil, because a sheet covers its whole frame.
 */
function SheetLayer({ panel, onClose }: { panel: { current: HTMLElement | null }; onClose: () => void }) {
  const layer = useModalLayer({ onClose });
  const { panelRef } = layer;
  useLayoutEffect(() => {
    panelRef(panel.current);
    return () => panelRef(null);
  }, [panelRef, panel]);
  return null;
}
