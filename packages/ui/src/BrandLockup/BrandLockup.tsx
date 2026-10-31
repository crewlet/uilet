import type { ReactNode } from 'react';
import { useRailShape } from '../AppShell/railShape.js';
import { cx } from '../utils/cx.js';

/** What a caller is handed when it draws the link element itself. */
export interface BrandLinkProps {
  className: string;
  children: ReactNode;
  /** Present only when `href` was given; a router link takes its own target. */
  href?: string | undefined;
  'aria-label': string;
  /** The name as the pointer's title, where the rail is compact and draws the mark alone. */
  title?: string | undefined;
}

export interface BrandLockupProps {
  /** The product's name, and the name of the link. Required, for that reason. */
  name: string;
  /** The mark. DECORATION: the name beside it is what a reader is told. */
  mark?: ReactNode;
  /**
   * Where the reader is: the company, the workspace, "Superadmin". It sits
   * under the product name, because on this screen the company is the subject
   * and the product is the tool.
   */
  context?: ReactNode;
  /** Home. Without it, and without `renderLink`, the lockup is not a link. */
  href?: string | undefined;
  /** Draws the link element, for a router that owns navigation (conlet's NavLink). */
  renderLink?: ((props: BrandLinkProps) => ReactNode) | undefined;
  className?: string | undefined;
}

/**
 * The mark, the product name and what the reader is inside, as one block at
 * the head of the rail.
 *
 * THE LINK IS NAMED BY THE PRODUCT, and the context line is outside it. Inside
 * it, the link's accessible name would be "Crewlet Acme Holdings" and would
 * change whenever the company was renamed, so the one landmark that always
 * means "go home" would be announced differently on every deployment. It stays
 * readable, drawn on the line below and indented to the name above it by the
 * mark's own box, which is a component variable rather than a guess.
 *
 * The mark is hidden from assistive technology: a logo beside its own name is
 * the definition of decoration.
 *
 * IN A COMPACT RAIL THE MARK STANDS ALONE (the shell's stylesheet stops
 * drawing the name), so the link takes the name as its title too: the
 * pointer is told what the mark is, and the link is still named by it.
 */
export function BrandLockup({ name, mark, context, href, renderLink, className }: BrandLockupProps) {
  const title = useRailShape() === 'compact' ? name : undefined;
  const inside = (
    <>
      {mark ? (
        <span className="crewlet-brand__mark" aria-hidden>
          {mark}
        </span>
      ) : null}
      <span className="crewlet-brand__name">{name}</span>
    </>
  );
  const linkProps: BrandLinkProps = {
    className: 'crewlet-brand__home',
    children: inside,
    'aria-label': name,
    ...(href === undefined ? {} : { href }),
    ...(title === undefined ? {} : { title }),
  };
  return (
    <div className={cx('crewlet-brand', className)}>
      {renderLink ? (
        renderLink(linkProps)
      ) : href === undefined ? (
        // Not a link, because it goes nowhere. An anchor with no href is
        // announced as text anyway, and one with href="#" navigates the page
        // it is meant to be the way out of.
        <span className="crewlet-brand__home" title={title}>
          {inside}
        </span>
      ) : (
        <a className="crewlet-brand__home" href={href} aria-label={name} title={title}>
          {inside}
        </a>
      )}
      {context ? <span className="crewlet-brand__context">{context}</span> : null}
    </div>
  );
}
