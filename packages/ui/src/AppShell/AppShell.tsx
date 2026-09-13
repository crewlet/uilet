import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Sidebar slot. Rendered first; the slot's own CSS (typically
   * `position: fixed; left: 0; top: 0; width: 280px`) drives its
   * placement. AppShell reserves the matching horizontal gutter on
   * the content column via `sidebarWidth`.
   */
  sidebar?: ReactNode;
  /**
   * Top bar slot. Rendered next; the slot's own CSS (typically
   * `position: fixed; top: 0; left: 280px; right: 0`) drives its
   * placement. AppShell reserves the matching vertical gutter on
   * the content column via `topbarHeight`.
   */
  topbar?: ReactNode;
  /** Footer slot. Rendered at the bottom of the content column. */
  footer?: ReactNode;
  /** Main scrollable content. */
  children?: ReactNode;
  /**
   * Width reserved for a fixed-position sidebar, in pixels. The
   * content column's left margin is set to this value. Defaults
   * to 280, wide enough for a labelled navigation rail.
   */
  sidebarWidth?: number;
  /**
   * Height reserved for a fixed-position topbar, in pixels. The
   * content column's top padding is set to this value. Defaults
   * to 64, a single-row topbar.
   */
  topbarHeight?: number;
}

/**
 * AppShell composes the three permanent regions of a console app.
 *
 * Layout pattern:
 *   - Sidebar is rendered as the first child; its own CSS is
 *     responsible for positioning (typically `position: fixed`).
 *   - Topbar is rendered second; same deal.
 *   - The Main + Footer column receives `margin-left` and
 *     `padding-top` set to the sidebar width and topbar height,
 *     reserving the gutters the fixed slots overlay.
 *
 * This passive composition means an existing app can drop its
 * already-positioned Sidebar / Header into the slots without
 * changing the Sidebar / Header CSS one line. Future apps that
 * prefer flex/grid composition can build their own shell on top
 * of the same slot props.
 */
export const AppShell = ({
  sidebar,
  topbar,
  footer,
  children,
  sidebarWidth = 280,
  topbarHeight = 64,
  className = '',
  style,
  ...rest
}: AppShellProps) => {
  const composedStyle: CSSProperties = {
    ...style,
    ['--crewlet-app-shell-sidebar-width' as keyof CSSProperties]: `${sidebarWidth}px`,
    ['--crewlet-app-shell-topbar-height' as keyof CSSProperties]: `${topbarHeight}px`,
  };

  return (
    <div className={`crewlet-app-shell ${className}`.trim()} style={composedStyle} {...rest}>
      {sidebar}
      <div className="crewlet-app-shell__column">
        {topbar}
        <main className="crewlet-app-shell__main">{children}</main>
        {footer}
      </div>
    </div>
  );
};
