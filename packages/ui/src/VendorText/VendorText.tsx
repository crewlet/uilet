import { Fragment, isValidElement, type ReactNode } from 'react';
import { ChevronRightGlyph, ExternalLinkGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { Link } from '../Link/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface VendorUIProps {
  /**
   * The name as the vendor's screen prints it: a button, a field, a role or a
   * page. Several names are a menu path, outermost first.
   */
  path: string | readonly string[];
  /** Read between the levels of a path, where the chevron is drawn. */
  separatorLabel?: string | undefined;
  /** The vendor page the name opens, in a new tab with no opener and no referrer. */
  href?: string | undefined;
  /** Read after the name when `href` is set. */
  newTabLabel?: string | undefined;
  className?: string | undefined;
}

/**
 * A name on a vendor's screen, set inside a sentence of instructions: semibold
 * in a framed chip that stands off the surface under it, so it reads apart from
 * the words around it by shape as well as ink. A menu path draws a chevron
 * between its levels. With `href` the chip is the link: the external mark is
 * its last item, and the frame, not an underline, says it can be pressed.
 */
export function VendorUI({
  path,
  separatorLabel = 'then',
  href,
  newTabLabel = '(opens in a new tab)',
  className,
}: VendorUIProps) {
  const levels = typeof path === 'string' ? [path] : path;
  const name = (
    <>
      {levels.map((level, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <>
              {/* The spaces sit outside the hidden word: whitespace inside a part of a name is trimmed. */}{' '}
              <ChevronRightGlyph size="xs" className="crewlet-vendor-ui__separator" aria-hidden="true" />
              <VisuallyHidden>{separatorLabel}</VisuallyHidden>{' '}
            </>
          ) : null}
          <span className="crewlet-vendor-ui__level">{level}</span>
        </Fragment>
      ))}
    </>
  );
  if (!href) return <span className={cx('crewlet-vendor-ui', className)}>{name}</span>;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      size="inherit"
      className={cx('crewlet-vendor-ui', 'crewlet-vendor-ui--link', className)}
    >
      {name}
      {/*
        A no-break space: the gap before the mark, never a line break, and the
        word space before the hidden sentence (whitespace inside a part of a name is trimmed).
      */}
      {'\u00a0'}
      <span className="crewlet-vendor-ui__tail">
        {/* The word joiner holds the mark to the space: a browser may break before an inline svg. */}
        <span aria-hidden="true">
          {'\u2060'}
          <ExternalLinkGlyph size="sm" className="crewlet-vendor-ui__external" />
        </span>
        <VisuallyHidden>{newTabLabel}</VisuallyHidden>
      </span>
    </Link>
  );
}

export interface StepLinkProps {
  /** The vendor's page. It opens in a new tab, with no opener and no referrer. */
  href: string;
  children: ReactNode;
  /** Read after the link's words. */
  newTabLabel?: string | undefined;
  className?: string | undefined;
}

/**
 * The words of a step that name a vendor's page, linked to it: underlined in
 * the link ink with the external mark, at the size of the sentence. A lone
 * `VendorUI` child is drawn as a linked chip instead (`VendorUI`'s `href`).
 */
export function StepLink({ href, children, newTabLabel, className }: StepLinkProps) {
  if (isValidElement<VendorUIProps>(children) && children.type === VendorUI) {
    return (
      <VendorUI
        {...children.props}
        href={href}
        newTabLabel={newTabLabel ?? children.props.newTabLabel}
        className={cx(children.props.className, className)}
      />
    );
  }
  return (
    <Link
      href={href}
      external
      size="inherit"
      newTabLabel={newTabLabel}
      className={cx('crewlet-step-link', className)}
    >
      {children}
    </Link>
  );
}

/** One run of a vendor instruction: plain words, or a vendor UI name; either linked where `url` is set. */
export interface VendorTextPart {
  /** Plain words, or a link's words. */
  text?: string | undefined;
  /** A vendor UI name; several are a menu path, outermost first. Drawn over `text` when both are set. */
  ui?: readonly string[] | undefined;
  /** The vendor page the run links to. */
  url?: string | undefined;
}

export interface VendorTextProps {
  parts: readonly VendorTextPart[];
  /** Draws plain words, to mark values in them; as written by default. */
  renderWords?: ((text: string) => ReactNode) | undefined;
  /**
   * The address a part's `url` opens, such as one with a form's values filled
   * in; a part whose address is `undefined` or empty is drawn without a link.
   */
  resolveUrl?: ((url: string) => string | undefined) | undefined;
}

/**
 * A vendor instruction from its parts: each vendor UI name a `VendorUI`, a
 * linked one a linked chip, and each other linked run a `StepLink` on the words
 * that name the page.
 */
export function VendorText({ parts, renderWords, resolveUrl }: VendorTextProps) {
  return (
    <>
      {parts.map((part, i) => {
        const href = part.url ? (resolveUrl ? resolveUrl(part.url) : part.url) || undefined : undefined;
        if (part.ui && part.ui.length > 0) return <VendorUI key={i} path={part.ui} href={href} />;
        const body = renderWords ? renderWords(part.text ?? '') : (part.text ?? '');
        return href ? (
          <StepLink key={i} href={href}>
            {body}
          </StepLink>
        ) : (
          <Fragment key={i}>{body}</Fragment>
        );
      })}
    </>
  );
}

/** A vendor instruction as plain words, for a label or a search: a menu path joined with ` > `. */
export function vendorTextString(parts: readonly VendorTextPart[]): string {
  return parts.map((p) => (p.ui && p.ui.length > 0 ? p.ui.join(' > ') : (p.text ?? ''))).join('');
}
