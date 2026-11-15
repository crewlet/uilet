import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ExternalLinkGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export type LinkVariant =
  /** A navigation: the accent ink, underlined on hover. */
  | 'default'
  /** An identity a reader clicks through to: neutral ink, underlined on hover. */
  | 'subtle'
  /**
   * A reference set among other words, the task a question is about, say: a
   * softer ink than a navigation, never underlined, stepping up to the full
   * accent ink on hover.
   */
  | 'quiet'
  /**
   * A name that is also a link, in the ink it already has there (a toned row's
   * name, a heading): no colour of its own, underlined on hover and focus.
   */
  | 'plain';

export type LinkSize =
  | 'body'
  | 'caption'
  /** The size of the words around it, for a link set inside a sentence. */
  | 'inherit';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: LinkVariant | undefined;
  size?: LinkSize | undefined;
  /**
   * Leaves the application. Opens a tab, withholds the referrer and the
   * opener, draws the mark that says so, and reads the sentence below.
   */
  external?: boolean | undefined;
  /** Read after the link's own words when `external`. */
  newTabLabel?: string | undefined;
  /**
   * A whole row is the target. It fills its line, draws no underline, and the
   * focus ring is drawn inside the row rather than around the words.
   */
  block?: boolean | undefined;
  /**
   * Render the single child element with these classes instead of an anchor,
   * to put this look on a router's own Link while keeping its navigation.
   */
  asChild?: boolean | undefined;
  children?: ReactNode;
}

/**
 * A link that reads as one: `size="caption"` takes the caption's size, not its
 * ink. Inside a sentence (`size="inherit"`) a `default` or `subtle` link is
 * underlined at rest, since its ink alone does not set it apart from the words.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    variant = 'default',
    size = 'body',
    external = false,
    newTabLabel = '(opens in a new tab)',
    block = false,
    asChild = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const classes = cx(
    'crewlet-link',
    `crewlet-link--${variant}`,
    `crewlet-link--${size}`,
    block && 'crewlet-link--block',
    className,
  );

  // The mark AND the sentence, together. The glyph alone says "new tab" to
  // somebody looking at it and nothing at all to somebody listening.
  const externalMark = external ? (
    <>
      {/*
        The word joiner keeps the mark on the last word's line; hidden, so it is
        never part of the link's name.
      */}
      <span className="crewlet-link__external-mark" aria-hidden="true">
        {'\u2060'}
        <ExternalLinkGlyph className="crewlet-link__external" size="sm" />
      </span>
      {/*
        The space sits beside the hidden sentence, not inside it: whitespace
        inside a part of an accessible name is trimmed off.
      */}
      {' '}
      <VisuallyHidden>{newTabLabel}</VisuallyHidden>
    </>
  ) : null;

  // The mark, the sentence and the new-tab behaviour travel together, so
  // `asChild` gets them too.
  const externalAttributes = external
    ? { target: '_blank', rel: 'noreferrer' }
    : { target: rest.target, rel: rest.rel };

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error('Link with asChild expects exactly one valid React element child.');
    }
    const childEl = child as ReactElement<Record<string, unknown>>;
    return cloneElement(
      childEl,
      {
        ...rest,
        ...externalAttributes,
        className: cx(childEl.props['className'] as string | undefined, classes),
      },
      <>
        {childEl.props['children'] as ReactNode}
        {externalMark}
      </>,
    );
  }

  return (
    <a {...rest} {...externalAttributes} ref={ref} className={classes}>
      {children}
      {externalMark}
    </a>
  );
});
