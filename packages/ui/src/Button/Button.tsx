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
import { OpenInNewGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'tertiary' | 'accent' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonShape = 'square' | 'pill';

interface ButtonLook {
  /** The hierarchy, not a palette: primary is the one action on the screen. */
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  shape?: ButtonShape | undefined;
  /** Drawn before the label. A glyph component, not a name. */
  leadingIcon?: ReactNode;
  /** Drawn after the label: a chevron, an external mark, a count. */
  trailingIcon?: ReactNode;
  /** Fills the line it is on. */
  block?: boolean | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonLook {
  /** Sets `aria-pressed`: a toggle that is on, such as a filter. */
  pressed?: boolean | undefined;
  /**
   * Mid-action. The spinner takes the leading icon's place, the label stays
   * put, and the press does nothing.
   *
   * NOT the native `disabled`, which takes focus away from the control the
   * reader just used and drops it on the page body, then refuses to give it
   * back when the action finishes. `aria-disabled` with `aria-busy` says the
   * same thing to a screen reader and leaves focus where it was.
   */
  loading?: boolean | undefined;
  /**
   * Unavailable, and why. It reads the same as `disabled` to a screen reader
   * and keeps its focus and its pointer events, which is the whole point: a
   * natively disabled button takes no hover and no focus, so the tooltip
   * explaining why "Review and save" cannot be pressed is unreachable by
   * exactly the reader who needs it. The reason is linked with
   * `aria-describedby`, so it is read after the name rather than instead of it.
   */
  disabledReason?: string | undefined;
  /**
   * Render the single child element with the Button's styling merged onto it
   * instead of a native button, to put this look on a router's own Link while
   * keeping its navigation. Mirrors the Radix `asChild` API.
   *
   * Ignored by `loading`: a link has no pending state to show.
   */
  asChild?: boolean | undefined;
}

function buttonClass({ variant = 'primary', size = 'medium', shape = 'square', block, className }: ButtonLook, extra?: string) {
  return cx(
    'crewlet-btn',
    `crewlet-btn--${variant}`,
    `crewlet-btn--${size}`,
    `crewlet-btn--${shape}`,
    block && 'crewlet-btn--block',
    extra,
    className,
  );
}

function Inner({
  leadingIcon,
  trailingIcon,
  loading,
  children,
}: Pick<ButtonLook, 'leadingIcon' | 'trailingIcon' | 'children'> & { loading?: boolean }) {
  return (
    <>
      {loading ? (
        <span className="crewlet-btn__spinner" aria-hidden />
      ) : leadingIcon ? (
        <span className="crewlet-btn__icon">{leadingIcon}</span>
      ) : null}
      <span className="crewlet-btn__label">{children}</span>
      {trailingIcon ? <span className="crewlet-btn__icon">{trailingIcon}</span> : null}
    </>
  );
}

/**
 * The button recipe, spelled once for every element drawn as a button.
 *
 * IT FORWARDS EVERYTHING. A menu trigger needs `aria-haspopup`,
 * `aria-expanded`, `aria-controls`, a ref to hand focus back to and a
 * `tabIndex` of -1 when the keyboard reaches its actions another way; a list's
 * Move buttons need a ref and a name longer than their tooltip; a canvas node
 * needs a data attribute a stylesheet reads. Without those, each of them
 * hand-wrote the class list beside the primitive, and a recipe spelled in two
 * places is how the two drift apart.
 *
 * An icon-only button is named by its `title` unless `aria-label` names it
 * more precisely: "Move goal 2 of 3 up" where the tooltip says "Move up".
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'medium',
    shape = 'square',
    leadingIcon,
    trailingIcon,
    block,
    className,
    type = 'button',
    asChild = false,
    loading = false,
    pressed,
    disabledReason,
    disabled,
    onClick,
    title,
    children,
    ...rest
  },
  ref,
) {
  const reasonId = useId();
  const look = { variant, size, shape, leadingIcon, trailingIcon, block, className, children };
  const classes = buttonClass(look, loading ? 'crewlet-btn--loading' : undefined);

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error('Button with asChild expects exactly one valid React element child.');
    }
    const childEl = child as ReactElement<Record<string, unknown>>;
    return cloneElement(
      childEl,
      { ...rest, title, className: cx(childEl.props['className'] as string | undefined, classes) },
      <Inner leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
        {childEl.props['children'] as ReactNode}
      </Inner>,
    );
  }

  // Soft, never native: see `loading` and `disabledReason`.
  const inert = loading || disabledReason !== undefined;
  return (
    <>
      <button
        {...rest}
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled}
        title={title}
        aria-label={rest['aria-label'] ?? (children === undefined ? title : undefined)}
        aria-pressed={pressed}
        aria-busy={loading || undefined}
        aria-disabled={inert || undefined}
        aria-describedby={disabledReason === undefined ? rest['aria-describedby'] : cx(rest['aria-describedby'], reasonId)}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          if (inert) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        <Inner leadingIcon={leadingIcon} trailingIcon={trailingIcon} loading={loading}>
          {children}
        </Inner>
      </button>
      {disabledReason === undefined ? null : <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden>}
    </>
  );
});

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement>, ButtonLook {
  href: string;
  /**
   * Leaves the application. Opens a tab and withholds the referrer and the
   * opener, which a link to somebody else's site must never be without, and
   * draws the mark that says so unless the caller supplies its own trailing
   * icon or turns it off.
   */
  external?: boolean | undefined;
}

/**
 * A link drawn as a button: it goes somewhere rather than doing something.
 *
 * An action that navigates has to be a real anchor, so it can be opened in a
 * tab, copied, and read as a link. It wears exactly the class list the
 * matching Button wears, because it used to be a hand-written anchor carrying
 * the recipe at each call site.
 *
 * There is deliberately no `asChild` here and no `loading`: `asChild` would
 * push `target` and `rel` back out to every call site, and a link has no
 * pending state.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  {
    variant = 'primary',
    size = 'medium',
    shape = 'square',
    leadingIcon,
    trailingIcon,
    block,
    className,
    external = false,
    title,
    children,
    ...rest
  },
  ref,
) {
  const trailing = trailingIcon ?? (external ? <OpenInNewGlyph size="sm" /> : undefined);
  return (
    <a
      {...rest}
      ref={ref}
      className={buttonClass({ variant, size, shape, block, className })}
      title={title}
      aria-label={rest['aria-label'] ?? (children === undefined ? title : undefined)}
      target={external ? '_blank' : rest.target}
      rel={external ? 'noreferrer' : rest.rel}
    >
      <Inner leadingIcon={leadingIcon} trailingIcon={trailing}>
        {children}
      </Inner>
    </a>
  );
});
