import { useId, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { safeHref } from '../Markdown/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** The state a linked object is in, as its bar and its status dot draw it. */
export type LinkCardTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface LinkCardSource {
  /** The app the object belongs to: "Worklet", "Doclet", "Artifacts", "GitHub". */
  name: string;
  /** The app's small mark (a 12px product mark or glyph). Decorative: the name says it. */
  mark: ReactNode;
}

export interface LinkCardOwner {
  /** A small face (a 16px `Avatar`). Decorative: the name says who. */
  face: ReactNode;
  name: string;
}

export interface LinkCardProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'title' | 'children' | 'target' | 'rel'> {
  /**
   * Where the preview leads. Only an address `safeHref` allows is followed
   * (`http:`, `https:`, `mailto:` and the application's own `#/` routes);
   * anything else, or none, draws the same preview with no link in it.
   */
  href?: string | undefined;
  /**
   * Leaves the application: opens a new tab, withholds the referrer and the
   * opener, and says so to a screen reader. An in-app route opens in place.
   */
  external?: boolean | undefined;
  /** Read after the title when `external`. */
  newTabLabel?: string | undefined;
  /** The full address, shown on hover over the preview. */
  address?: string | undefined;
  source: LinkCardSource;
  /** The object's own code, before its title: "WRK-41", "#212". */
  code?: string | undefined;
  /** The object's title, two lines at most. */
  title: string;
  /** A quiet line of details under the title: "Due Friday · 3 subtasks". */
  meta?: string | undefined;
  /** The object's state in words: "In progress", "Merged". */
  status?: string | undefined;
  /** The state's tone, which colours the bar and the status dot. The words carry the meaning. */
  statusTone?: LinkCardTone | undefined;
  /** Who holds the object. */
  owner?: LinkCardOwner | undefined;
}

/**
 * What a link points at, unfurled under the message that carried it.
 *
 * AN UNFURL, NOT A CARD. No box and no fill: a slim bar on the left in the
 * status's line colour (a quiet grey with none), then a line naming the
 * source app with its mark, the title, a quiet line of details, and the
 * status and owner as words, a dot and a small face. It reads as part of the
 * message rather than a card laid on it, and the same unfurl serves a room's
 * list of everything shared in it.
 *
 * THE LINK IS THE TITLE, AND IT IS NAMED BY WHAT IT SHOWS. A reader moving
 * through the links of a room hears "WRK-41 Fix the login redirect", and then
 * where it is from and what state it is in as its description. The link used
 * to be the whole preview, named by its title alone while it showed the
 * source, the details and the owner as well: a link whose visible words were
 * not its name, so a person who said what they saw could not reach it (WCAG
 * 2.5.3, label in name). Now only the title is the link, its name its own
 * words, and it stretches over the whole preview, so a press anywhere on the
 * preview still follows it and its ring still rings the whole preview.
 *
 * AN ADDRESS IS FOLLOWED ONLY WHEN IT IS SAFE. The href passes `safeHref`, so
 * a `javascript:` or a bare relative address in a message never becomes a
 * link; the preview is still drawn, as words.
 *
 * `className` and `style` are the preview's; every other attribute (a press
 * handler, an id, a data attribute) is the link's.
 */
export function LinkCard({
  href,
  external = false,
  newTabLabel = '(opens in a new tab)',
  address,
  source,
  code,
  title,
  meta,
  status,
  statusTone = 'neutral',
  owner,
  className,
  style,
  ...rest
}: LinkCardProps) {
  const id = useId();
  const safe = href === undefined ? null : safeHref(href);
  const ids = {
    source: `${id}-source`,
    meta: `${id}-meta`,
    status: `${id}-status`,
    owner: `${id}-owner`,
  };
  const words = (
    <span className="crewlet-link-card__title">
      {code ? <span className="crewlet-link-card__code">{code}</span> : null}
      {code ? ' ' : null}
      {title}
    </span>
  );
  const sourceLine = (
    <span id={ids.source} className="crewlet-link-card__source">
      <span className="crewlet-link-card__mark" aria-hidden="true">
        {source.mark}
      </span>
      {source.name}
    </span>
  );
  const details = (
    <>
      {meta ? (
        <span id={ids.meta} className="crewlet-link-card__meta">
          {meta}
        </span>
      ) : null}
      {status || owner ? (
        <span className="crewlet-link-card__fields">
          {status ? (
            <span id={ids.status} className="crewlet-link-card__status">
              <span className="crewlet-link-card__dot" aria-hidden="true" />
              {status}
            </span>
          ) : null}
          {owner ? (
            <span id={ids.owner} className="crewlet-link-card__owner">
              <span className="crewlet-link-card__face" aria-hidden="true">
                {owner.face}
              </span>
              {owner.name}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );
  const classes = cx('crewlet-link-card', `crewlet-link-card--${statusTone}`, safe === null && 'crewlet-link-card--inert', className);

  if (safe === null) {
    return (
      <div className={classes} style={style} title={address}>
        {sourceLine}
        {words}
        {details}
      </div>
    );
  }

  // Each part on its own, so a description never runs two of them together
  // ("In progressMiles") where a reader's browser joins inline text as is.
  const describedBy = [ids.source, meta ? ids.meta : null, status ? ids.status : null, owner ? ids.owner : null]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} style={style}>
      {sourceLine}
      <a
        {...rest}
        href={safe}
        title={address}
        className="crewlet-link-card__link"
        aria-describedby={describedBy}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {words}
        {external ? (
          <>
            {' '}
            <VisuallyHidden>{newTabLabel}</VisuallyHidden>
          </>
        ) : null}
      </a>
      {details}
    </div>
  );
}
