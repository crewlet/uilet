import type { ReactNode, Ref } from 'react';
import { SidePanelFrameBase } from '../SidePanel/SidePanel.js';
import { SidePanelBase } from '../SidePanel/SidePanelBase.js';
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
   * What stays under the body however far it scrolls: the panel's own
   * commit, such as a hand-off's Send. Drawn on a hairline at the panel's
   * foot, never inside the scrolling body, so it is in reach while the
   * reader is at the top of a long form.
   */
  footer?: ReactNode;
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
 * A PRESET OF `SidePanel`, which carries the region, the focus contract and
 * Escape (see there). What is the artifact's own: two resting widths, the
 * expanded view, the control that toggles it, the head on the row step, and
 * a heading that rings when the keyboard reaches it. It keeps the class names
 * it has always published (`crewlet-artifact-panel__body` and the rest), so a
 * stylesheet written against them keeps matching.
 */
export function ArtifactPanel({
  title,
  icon,
  onClose,
  size = 'md',
  expanded = false,
  onExpandedChange,
  actions,
  footer,
  focusOnOpen = true,
  labels,
  className,
  children,
}: ArtifactPanelProps) {
  const words = { ...ARTIFACT_PANEL_LABELS, ...labels };
  return (
    <SidePanelBase
      alias="crewlet-artifact-panel"
      title={title}
      icon={icon}
      onClose={onClose}
      closeLabel={words.close(title)}
      actions={actions}
      footer={footer}
      initialFocus={focusOnOpen ? 'heading' : 'none'}
      ringHeading
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      expandLabel={words.expand}
      collapseLabel={words.collapse}
      className={cx(`crewlet-artifact-panel--${size}`, className)}
    >
      {children}
    </SidePanelBase>
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
 *
 * A PRESET OF `SidePanelFrame` with no `shape`, which is the frame measuring
 * itself, under the names it has always published.
 */
export function ArtifactWorkspace(props: ArtifactWorkspaceProps) {
  return <SidePanelFrameBase {...props} alias="crewlet-artifact-workspace" />;
}
