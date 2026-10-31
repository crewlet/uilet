import type { ReactNode } from 'react';
import { ChevronRightGlyph, ChevronsUpDownGlyph } from '@crewlethq/icons/glyphs';
import { Menu, type MenuEntry } from '../Menu/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { useRailShape } from './railShape.js';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
import { cx } from '../utils/cx.js';

/** The menu the row opens (`AccountRowProps.menu`). */
export interface AccountRowMenu {
  /** The menu's name. Defaults to "Your account". */
  label?: string | undefined;
  /** Facts above the items that the row does not already say: the reader's access. */
  header?: ReactNode;
  /** The reader's own actions: their account, signing out. */
  items: readonly MenuEntry[];
}

export interface AccountRowProps {
  /**
   * The reader's badge, drawn decorative: the name beside it says who it is.
   * In a rail's foot the row is sized for a medium one (`size="md"`, 32px).
   */
  avatar: ReactNode;
  /** Who the reader is. */
  name: ReactNode;
  /** The line under the name: a login, a seat. Left out where it would repeat the name. */
  detail?: ReactNode;
  /** The reader's account page. Without it (or `menu`) the row states who is signed in and goes nowhere. */
  href?: string | undefined;
  /**
   * The reader's own menu, which the row OPENS rather than linking anywhere:
   * their account among its items, and signing out. Given, it takes the place
   * of `href`.
   */
  menu?: AccountRowMenu | undefined;
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
  /**
   * The reader's face alone, for the compact rail's foot: the badge is the
   * link (or the menu's button), the name and the detail are its accessible
   * name and its tooltip, and `actions` are not drawn (the compact rail draws
   * its places, Settings among them, as tiles above it). Defaults to the
   * shape of the rail the row stands in.
   */
  compact?: boolean | undefined;
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
 *
 * OR THE ROW OPENS THE READER'S MENU (`menu`): pressing who you are is where a
 * reader looks for their account and for signing out, so the row is the menu
 * button, ending in the up-and-down chevron a menu's trigger draws, and the
 * account is one item of it. The menu says only what the row does not, in its
 * header (their access), above the actions.
 *
 * IN THE COMPACT RAIL THE ROW IS THE READER'S FACE (`compact`): the same link
 * or menu button, holding the badge alone, named by the name and the detail
 * as the full row is, and showing them in a tooltip, since a face says who
 * it is only to somebody who already knows.
 */
export function AccountRow({
  avatar,
  name,
  detail,
  href,
  menu,
  current = false,
  title,
  linkSuffix = ', your account',
  actions,
  compact: compactProp,
  className,
}: AccountRowProps) {
  const railShape = useRailShape();
  const compact = compactProp ?? railShape === 'compact';
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
  if (compact) return <CompactAccount avatar={avatar} name={name} detail={detail} href={href} menu={menu} current={current} linkSuffix={linkSuffix} className={className} />;
  return (
    <div className={cx('crewlet-account-row', className)}>
      {menu ? (
        <Menu
          label={menu.label ?? 'Your account'}
          items={menu.items}
          header={menu.header}
          // The row spans the rail, so its menu covers it edge to edge, and
          // grows past it when a description needs the room.
          width="trigger"
          renderTrigger={(trigger) => (
            <button
              type="button"
              className={cx('crewlet-account-row__who', HIT_AREA_CLASS)}
              title={title}
              // WHERE THE READER IS: a button carries no `aria-current`, so the
              // account page's lift is drawn from this.
              data-current={current ? '' : undefined}
              {...trigger}
            >
              {who}
              <VisuallyHidden>{linkSuffix}</VisuallyHidden>
              <ChevronsUpDownGlyph size="xs" className="crewlet-account-row__go" aria-hidden="true" />
            </button>
          )}
        />
      ) : href === undefined ? (
        <span className="crewlet-account-row__who">{who}</span>
      ) : (
        <a
          className={cx('crewlet-account-row__who', HIT_AREA_CLASS)}
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

/** The compact rail's account: the face alone, as the same link or menu button. */
function CompactAccount({
  avatar,
  name,
  detail,
  href,
  menu,
  current,
  linkSuffix,
  className,
}: Pick<AccountRowProps, 'avatar' | 'name' | 'detail' | 'href' | 'menu' | 'className'> & {
  current: boolean;
  linkSuffix: string;
}) {
  // What the face stands for, in words: drawn in the tooltip, and read as the
  // control's name, with the comma a screen reader needs between the lines
  // and, where the face goes somewhere, what it opens.
  const words = (suffix: string) => (
    <VisuallyHidden>
      {name}
      {detail ? <>, {detail}</> : null}
      {suffix}
    </VisuallyHidden>
  );
  const tip = (
    <>
      {name}
      {detail ? <> · {detail}</> : null}
    </>
  );
  const face = (
    <span className="crewlet-account-row__avatar" aria-hidden>
      {avatar}
    </span>
  );
  const shape = cx('crewlet-account-row__who', 'crewlet-account-row__who--compact', HIT_AREA_CLASS);
  let control: ReactNode;
  if (menu) {
    control = (
      <Menu
        label={menu.label ?? 'Your account'}
        items={menu.items}
        header={menu.header}
        renderTrigger={(trigger) => (
          <Tooltip content={tip}>
            <button type="button" className={shape} data-current={current ? '' : undefined} {...trigger}>
              {face}
              {words(linkSuffix)}
            </button>
          </Tooltip>
        )}
      />
    );
  } else if (href === undefined) {
    control = (
      <Tooltip content={tip}>
        <span className="crewlet-account-row__who crewlet-account-row__who--compact">
          {face}
          {words('')}
        </span>
      </Tooltip>
    );
  } else {
    control = (
      <Tooltip content={tip}>
        <a className={shape} href={href} aria-current={current ? 'page' : undefined}>
          {face}
          {words(linkSuffix)}
        </a>
      </Tooltip>
    );
  }
  return <div className={cx('crewlet-account-row', 'crewlet-account-row--compact', className)}>{control}</div>;
}
