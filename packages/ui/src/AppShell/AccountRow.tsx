import type { ReactNode } from 'react';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

export interface AccountRowProps {
  /** The reader's badge, drawn decorative: the name beside it says who it is. */
  avatar: ReactNode;
  /** Who the reader is. */
  name: ReactNode;
  /** The line under the name: a login, a seat. Left out where it would repeat the name. */
  detail?: ReactNode;
  /** The reader's account page. Without it the row states who is signed in and goes nowhere. */
  href?: string | undefined;
  /** Whether the reader is on that page, which marks the row as the rail marks its current row. */
  current?: boolean | undefined;
  /** What the link opens, as its tooltip. */
  title?: string | undefined;
  /**
   * Said after the name to a screen reader, so the link names its target as
   * well as its owner. Defaults to ", your account".
   */
  linkSuffix?: string | undefined;
  /** Controls at the row's end: a theme toggle, the trigger of a preferences panel. */
  actions?: ReactNode;
  className?: string | undefined;
}

/**
 * The signed-in reader at the foot of the rail: their badge, their name and
 * the line under it, as the way to their own account, with the row's
 * controls beside it.
 *
 * THE LINK ENDS IN A CHEVRON AT REST. A name says nothing about being the way
 * to a password and a second factor, and a row that drew no mark until it was
 * hovered was one nobody found.
 *
 * WHERE THE READER IS, as the rail says it: on the account page the row wears
 * the lift and hairline the rail's current row wears, with no hue, and an
 * outline rather than a shadow so forced colours keep it.
 *
 * The controls are siblings of the link, never inside it, so each keeps its
 * own name and the link's name stays the reader's.
 */
export function AccountRow({
  avatar,
  name,
  detail,
  href,
  current = false,
  title,
  linkSuffix = ', your account',
  actions,
  className,
}: AccountRowProps) {
  const who = (
    <>
      <span className="crewlet-account-row__avatar">{avatar}</span>
      <span className="crewlet-account-row__text">
        <span className="crewlet-account-row__name">{name}</span>
        {/* A SPOKEN COMMA between the two lines: drawn as two blocks they
            read apart, but an accessible name runs its parts together, and
            the link was named "Lee Parklee". The space is a text node BESIDE
            the comma, because whitespace inside a part is trimmed off it. */}
        {detail ? (
          <>
            <VisuallyHidden>,</VisuallyHidden>{' '}
            <span className="crewlet-account-row__detail">{detail}</span>
          </>
        ) : null}
      </span>
    </>
  );
  return (
    <div className={cx('crewlet-account-row', className)}>
      {href === undefined ? (
        <span className="crewlet-account-row__who">{who}</span>
      ) : (
        <a
          className="crewlet-account-row__who"
          href={href}
          title={title}
          aria-current={current ? 'page' : undefined}
        >
          {who}
          <VisuallyHidden>{linkSuffix}</VisuallyHidden>
          <ChevronRightGlyph size="xs" className="crewlet-account-row__go" aria-hidden="true" />
        </a>
      )}
      {actions ? <div className="crewlet-account-row__actions">{actions}</div> : null}
    </div>
  );
}
