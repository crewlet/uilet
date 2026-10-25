import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant =
  /**
   * The accent square: a primary Button with no room for a label, for the one
   * icon-only control that IS the decision on its surface (a composer's Send).
   */
  | 'primary'
  /** The bordered square: a secondary Button with no room for a label. */
  | 'secondary'
  /** Transparent, neutral ink, a surface tint on hover. */
  | 'ghost'
  /** Transparent, the accent on hover. */
  | 'ghost-brand'
  /** Transparent, the critical hue on hover. */
  | 'ghost-danger'
  /** A soft accent square with a matching boundary: the add beside a label. */
  | 'soft-brand';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /**
   * What the button does, in words. REQUIRED, and not a convenience: an
   * icon-only control has no text, so without this it is announced as
   * "button" and a reader has to press it to find out what it was.
   */
  label: string;
  /** The glyph. A component from @crewlethq/icons/glyphs, not a name. */
  icon?: ReactNode;
  size?: IconButtonSize | undefined;
  variant?: IconButtonVariant | undefined;
  /** Sets `aria-pressed`: a toggle that is on. */
  pressed?: boolean | undefined;
  /** Unavailable, and why. See Button's own prop for why it is not `disabled`. */
  disabledReason?: string | undefined;
  /** Render the single child element with these classes instead of a button. */
  asChild?: boolean | undefined;
  children?: ReactNode;
}

/**
 * A square icon-only control: a row action, a copy, a drag handle, the close
 * in a dialog's corner.
 *
 * ITS SMALLEST STEP IS 24px, not the 22 it was. A pointer target under 24px
 * fails WCAG 2.2, and at compact density a 22px square was 18: this size, like
 * every control step, is `--size-control-*`, which floors at 24 for that
 * reason.
 *
 * Distinct from Button, which has a label slot and a text size. Anything with
 * a word beside the glyph is a Button.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    size = 'md',
    variant = 'ghost',
    pressed,
    disabledReason,
    className,
    type = 'button',
    asChild = false,
    disabled,
    onClick,
    title,
    children,
    ...rest
  },
  ref,
) {
  const reasonId = useId();
  const classes = cx('crewlet-icon-btn', `crewlet-icon-btn--${size}`, `crewlet-icon-btn--${variant}`, className);
  const content = icon ?? children;

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error('IconButton with asChild expects exactly one valid React element child.');
    }
    const childEl = child as ReactElement<{ className?: string }>;
    return cloneElement(childEl, {
      ...rest,
      'aria-label': label,
      title: title ?? label,
      className: cx(childEl.props.className, classes),
    } as Record<string, unknown>);
  }

  const inert = disabledReason !== undefined;
  return (
    <>
      <button
        {...rest}
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled}
        // The tooltip repeats the name rather than adding to it, so a pointer
        // reader and a screen reader are told the same thing.
        title={title ?? label}
        aria-label={label}
        aria-pressed={pressed}
        aria-disabled={inert || undefined}
        aria-describedby={inert ? cx(rest['aria-describedby'], reasonId) : rest['aria-describedby']}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          if (inert) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        {content}
      </button>
      {inert ? <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden> : null}
    </>
  );
});

export interface IconButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'aria-label' | 'aria-current'> {
  /** Where it goes, in words: the link's name and its title. REQUIRED, for IconButton's reason. */
  label: string;
  href: string;
  /** The glyph. A component from @crewlethq/icons/glyphs, not a name. */
  icon: ReactNode;
  size?: IconButtonSize | undefined;
  variant?: IconButtonVariant | undefined;
  /**
   * The reader is on the page it leads to: `aria-current="page"` and the
   * selected treatment a nav row draws, the lifted ground inside a hairline.
   */
  current?: boolean | undefined;
}

/**
 * An icon-only LINK, drawn as an IconButton: a place reached by its glyph, such
 * as Settings beside the reader's own row in a rail's foot.
 *
 * A REAL LINK rather than a button that navigates, so a modified press opens a
 * tab and the address can be copied, and it says when the reader is already
 * there, as a nav row does. A router's link is the `asChild` form of
 * IconButton; this is the plain anchor.
 */
export const IconButtonLink = forwardRef<HTMLAnchorElement, IconButtonLinkProps>(function IconButtonLink(
  { label, href, icon, size = 'md', variant = 'ghost', current = false, className, title, ...rest },
  ref,
) {
  return (
    <a
      {...rest}
      ref={ref}
      href={href}
      className={cx(
        'crewlet-icon-btn',
        `crewlet-icon-btn--${size}`,
        `crewlet-icon-btn--${variant}`,
        current && 'crewlet-icon-btn--current',
        className,
      )}
      title={title ?? label}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
    >
      {icon}
    </a>
  );
});
