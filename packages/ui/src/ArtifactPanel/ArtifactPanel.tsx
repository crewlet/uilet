import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react';
import { MaximizeGlyph, MinimizeGlyph, XGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { cx } from '../utils/cx.js';

/**
 * How wide a panel rests beside the artifact: text (facts, a list, a form) or
 * a table. ONE WIDTH FOR TEXT, so moving from one text panel to another never
 * moves the artifact's edge under the reader.
 */
export type ArtifactPanelSize = 'md' | 'lg';

export interface ArtifactPanelLabels {
  close: (title: string) => string;
  expand: string;
  collapse: string;
}

export const ARTIFACT_PANEL_LABELS: ArtifactPanelLabels = {
  close: (title) => `Close ${title.toLowerCase()}`,
  expand: 'Expand to the full view',
  collapse: 'Back to the side',
};

export interface ArtifactPanelProps {
  title: string;
  /** A glyph before the title: the one on the bar's control that opened it. */
  icon?: ReactNode;
  onClose: () => void;
  size?: ArtifactPanelSize | undefined;
  /**
   * The panel takes the whole workspace, the artifact hidden behind it, for a
   * table or a comparison the side's width cannot hold. With `onExpandedChange`
   * the head carries the control that toggles it.
   */
  expanded?: boolean | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
  /** Controls in the head, before expand and close. */
  actions?: ReactNode;
  /**
   * Whether focus moves to the panel's heading when it opens. True when the
   * reader opened it; false for a panel a link opened on arrival, which must
   * not take focus from wherever the page put it.
   */
  focusOnOpen?: boolean | undefined;
  labels?: Partial<ArtifactPanelLabels> | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * A panel at the artifact's side: its details, its history, its data, who is
 * here, its settings. One at a time, opened from the bar's controls.
 *
 * A COMPLEMENTARY REGION, NOT A DIALOG. The artifact beside it stays live and
 * reachable, so the panel is an `aside` named by its heading and never traps
 * focus; the reader moves between the two with Tab as between any two parts
 * of a page.
 *
 * FOCUS IS STILL MANAGED, because a panel opened from a control that is then
 * pressed again, or closed from inside, would otherwise leave focus on nothing.
 * Opening moves focus to the heading, so a screen reader announces what
 * opened; closing with focus inside hands it back to whatever held it before
 * (the bar's control, as a rule), and leaves it alone otherwise.
 *
 * ESCAPE CLOSES IT from anywhere inside, a field included, unless something
 * inside answered the press first: a menu or a dialog opened from the panel is
 * portalled out of it, and the press that closes one of them never reaches
 * this.
 */
export function ArtifactPanel({
  title,
  icon,
  onClose,
  size = 'md',
  expanded = false,
  onExpandedChange,
  actions,
  focusOnOpen = true,
  labels,
  className,
  children,
}: ArtifactPanelProps) {
  const words = { ...ARTIFACT_PANEL_LABELS, ...labels };
  const titleId = useId();
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const before = useRef<Element | null>(null);
  const focusing = useRef(focusOnOpen);

  // A LAYOUT EFFECT, both ways: the heading is focused before the paint, and
  // the cleanup runs while the panel is still in the document, which is the
  // only moment it can still tell whether focus was inside it.
  useLayoutEffect(() => {
    const panel = root.current;
    before.current = document.activeElement;
    if (focusing.current) heading.current?.focus({ preventScroll: true });
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

  return (
    <aside
      ref={root as Ref<HTMLElement>}
      className={cx('crewlet-artifact-panel', `crewlet-artifact-panel--${size}`, className)}
      aria-labelledby={titleId}
      data-expanded={expanded || undefined}
    >
      <div className="crewlet-artifact-panel__head">
        {icon ? (
          <span className="crewlet-artifact-panel__icon" aria-hidden>
            {icon}
          </span>
        ) : null}
        <h2 ref={heading} id={titleId} className="crewlet-artifact-panel__title" tabIndex={-1}>
          {title}
        </h2>
        <span className="crewlet-artifact-panel__actions">
          {actions}
          {onExpandedChange ? (
            <IconButton
              label={expanded ? words.collapse : words.expand}
              icon={expanded ? <MinimizeGlyph size="sm" /> : <MaximizeGlyph size="sm" />}
              size="sm"
              variant="ghost"
              onClick={() => onExpandedChange(!expanded)}
            />
          ) : null}
          <IconButton label={words.close(title)} icon={<XGlyph size="sm" />} size="sm" variant="ghost" onClick={onClose} />
        </span>
      </div>
      {/* THE PANEL'S TITLE IS ITS LEVEL TWO, so a section inside it heads at three. */}
      <div className="crewlet-artifact-panel__body">
        <HeadingLevelProvider level={3}>{children}</HeadingLevelProvider>
      </div>
    </aside>
  );
}

export interface ArtifactWorkspaceProps {
  /** The open panel, if any: an [ArtifactPanel]. */
  panel?: ReactNode;
  /** Whether the open panel takes the whole workspace. */
  expanded?: boolean | undefined;
  /** The artifact's own body: the element a caller scrolls, measures or listens on. */
  bodyRef?: Ref<HTMLDivElement> | undefined;
  bodyClassName?: string | undefined;
  /** Names the body region: the artifact's title. */
  bodyLabel?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * The artifact's body and its one open panel, side by side.
 *
 * THE PANEL IS A COLUMN WHERE THERE IS ROOM FOR TWO, AND A DRAWER WHERE THERE
 * IS NOT. Measured on the workspace itself (a container query), since a
 * sidebar beside it decides its room: wide, the artifact narrows to make room
 * and the two are read together, which is the point of a panel of history or
 * of who is here; narrower than two useful columns, the panel slides over the
 * artifact's end edge; on a phone it covers the artifact whole. An expanded
 * panel takes the workspace at every width, with the artifact kept mounted
 * behind it so a page's state survives the look at its data.
 */
export function ArtifactWorkspace({
  panel,
  expanded = false,
  bodyRef,
  bodyClassName,
  bodyLabel,
  className,
  children,
}: ArtifactWorkspaceProps) {
  return (
    <div
      className={cx('crewlet-artifact-workspace', className)}
      data-panel={panel ? (expanded ? 'expanded' : 'open') : undefined}
    >
      <div
        ref={bodyRef}
        className={cx('crewlet-artifact-workspace__body', bodyClassName)}
        role={bodyLabel ? 'region' : undefined}
        aria-label={bodyLabel}
      >
        {children}
      </div>
      {panel}
    </div>
  );
}
