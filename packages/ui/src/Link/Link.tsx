import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { OpenInNewGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export type LinkVariant =
  /** A navigation: the accent ink, underlined on hover. */
  | 'default'
  /** An identity a reader clicks through to: neutral ink, underlined on hover. */
  | 'subtle';

export type LinkSize = 'body' | 'caption';

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
 * A link that reads as one.
 *
 * WHY IT IS NOT A `Text` WITH A COLOUR. The registers used to be utility
 * classes, and a caption-sized link spelled with the caption class took the
 * caption's quiet ink, which won over the anchor rule: four real navigations
 * rendered as dim static micro-text that a reader could only find by hovering.
 * A link is a different thing from a piece of text, so it is a different
 * component, and `size="caption"` sets the caption's SIZE without its ink.
 *
 * `subtle` is for a link whose words are an identity rather than an
 * instruction, a seat's name in a row, say. It is still underlined on hover
 * and still takes the focus ring, because a link a reader cannot find is not
 * quieter, it is hidden.
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
      <OpenInNewGlyph className="crewlet-link__external" size="sm" />
      {/*
        The space is a TEXT NODE BESIDE the sentence, not inside it. An
        accessible name is the concatenation of an element's parts with nothing
        inserted between them, and whitespace inside a part is trimmed off it,
        so the link is announced as "Install(opens in a new tab)" without this
        and with a space inside the span alike.
      */}
      {' '}
      <VisuallyHidden>{newTabLabel}</VisuallyHidden>
    </>
  ) : null;

  // The MARK, THE SENTENCE AND THE BEHAVIOUR travel together, and they are
  // spelled once for that reason: set on the anchor branch alone, `asChild`
  // drew the glyph and read the sentence over a link that opened in this tab
  // and handed the referrer over on the way.
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
