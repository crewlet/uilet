import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface AsideLayoutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The page's main column: what the page is about. */
  children: ReactNode;
  /** The column beside it: facts about the subject, how it is used, related places. */
  aside: ReactNode;
  /** What the aside is, for a screen reader's landmark: "About the company". */
  asideLabel: string;
}

/**
 * A page's main column with an aside beside it, each a stack of blocks one
 * page step apart.
 *
 * THE COLUMNS FOLLOW THE ROOM THE PAGE HAS, NOT THE WINDOW. It is a container
 * query on its own width, because a page beside a navigation rail is narrow
 * on a wide screen too: from 56rem the aside stands beside the main column at
 * `--crewlet-aside-layout-aside` (18rem by default), and below that it
 * follows the main column under one hairline, so a phone reads the subject
 * first and its facts after it.
 *
 * THE ASIDE IS A COMPLEMENTARY LANDMARK named by `asideLabel`, so a screen
 * reader can skip to it or past it.
 */
export function AsideLayout({ children, aside, asideLabel, className, ...rest }: AsideLayoutProps) {
  return (
    <div {...rest} className={cx('crewlet-aside-layout', className)}>
      <div className="crewlet-aside-layout__columns">
        <div className="crewlet-aside-layout__main">{children}</div>
        <aside className="crewlet-aside-layout__aside" aria-label={asideLabel}>
          {aside}
        </aside>
      </div>
    </div>
  );
}
