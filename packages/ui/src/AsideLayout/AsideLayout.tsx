import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/** The room the layout is drawn in: a whole page, or a detail pane beside a list. */
export type AsideLayoutFit = 'page' | 'pane';

/**
 * The layout's own width, in rem, from which the aside stands beside the main
 * column, by `fit`. The stylesheet's container queries split at these widths.
 */
export const ASIDE_LAYOUT_SPLIT_REM: Readonly<Record<AsideLayoutFit, number>> = { page: 56, pane: 44 };

export interface AsideLayoutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The page's main column: what the page is about. */
  children: ReactNode;
  /**
   * The column beside it: facts about the subject, how it is used, related
   * places. Left out (or null), the main column stands alone at the full width.
   */
  aside?: ReactNode;
  /** What the aside is, for a screen reader's landmark: "About the company". */
  asideLabel: string;
  /**
   * `page` (the default): the aside stands beside the main column from 56rem,
   * 18rem wide. `pane`: from 44rem, 16rem wide and 16px apart, for a detail
   * pane beside a list, such as setup steps beside the form they explain.
   */
  fit?: AsideLayoutFit | undefined;
  /**
   * Beside the main column, the aside's content stays at the scroller's top
   * while the main column scrolls past. For an aside shorter than its scroller.
   */
  sticky?: boolean | undefined;
}

/**
 * A page's main column with an aside beside it, each a stack of blocks one
 * page step apart.
 *
 * THE COLUMNS FOLLOW THE ROOM THE PAGE HAS, NOT THE WINDOW. It is a container
 * query on its own width, because a page beside a navigation rail is narrow
 * on a wide screen too: from 56rem (44rem in a `pane`) the aside stands beside
 * the main column at `--crewlet-aside-layout-aside` (18rem by default, 16rem
 * in a pane), and below that it follows the main column under one hairline,
 * so a phone reads the subject first and its facts after it.
 *
 * THE MAIN COLUMN IS ALWAYS THE FIRST CHILD, so it stays the same element as
 * an aside comes and goes, and nothing in it is drawn afresh.
 *
 * THE ASIDE IS A COMPLEMENTARY LANDMARK named by `asideLabel`, so a screen
 * reader can skip to it or past it.
 */
export function AsideLayout({
  children,
  aside,
  asideLabel,
  fit = 'page',
  sticky = false,
  className,
  ...rest
}: AsideLayoutProps) {
  const alone = aside === null || aside === undefined || aside === false;
  return (
    <div
      {...rest}
      className={cx(
        'crewlet-aside-layout',
        fit === 'pane' && 'crewlet-aside-layout--pane',
        sticky && 'crewlet-aside-layout--sticky',
        alone && 'crewlet-aside-layout--alone',
        className,
      )}
    >
      <div className="crewlet-aside-layout__columns">
        <div className="crewlet-aside-layout__main">{children}</div>
        {alone ? null : (
          <aside className="crewlet-aside-layout__aside" aria-label={asideLabel}>
            {sticky ? <div className="crewlet-aside-layout__stick">{aside}</div> : aside}
          </aside>
        )}
      </div>
    </div>
  );
}
