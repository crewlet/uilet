import { Fragment, type ReactNode } from 'react';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
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
  className?: string | undefined;
}

/**
 * A name on a vendor's screen, set inside a sentence of instructions: medium
 * weight in a hairline frame, so it reads apart from the words around it by
 * shape as well as ink. A menu path draws a chevron between its levels.
 */
export function VendorUI({ path, separatorLabel = 'then', className }: VendorUIProps) {
  const levels = typeof path === 'string' ? [path] : path;
  return (
    <span className={cx('crewlet-vendor-ui', className)}>
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
    </span>
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
 * the link ink with the external mark, at the size of the sentence. A
 * `VendorUI` inside takes the link's ink and underline.
 */
export function StepLink({ href, children, newTabLabel, className }: StepLinkProps) {
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
 * A vendor instruction from its parts: each vendor UI name a `VendorUI`, each
 * linked run a `StepLink` on the words that name the page.
 */
export function VendorText({ parts, renderWords, resolveUrl }: VendorTextProps) {
  return (
    <>
      {parts.map((part, i) => {
        const body =
          part.ui && part.ui.length > 0 ? (
            <VendorUI path={part.ui} />
          ) : renderWords ? (
            renderWords(part.text ?? '')
          ) : (
            (part.text ?? '')
          );
        const href = part.url ? (resolveUrl ? resolveUrl(part.url) : part.url) : undefined;
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
