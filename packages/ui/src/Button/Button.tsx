import {
  Children,
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'tertiary' | 'accent' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonShape = 'square' | 'pill';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  leadingIcon?: ReactNode;
  /**
   * When true, render the single child element with the Button's styling
   * merged onto it instead of rendering a native <button>. Used to apply
   * Button styling to a <Link> or <a> while keeping their routing or
   * navigation semantics. Mirrors the Radix `asChild` API.
   */
  asChild?: boolean;
  /**
   * When true, replace the leading icon with a spinner and disable the
   * button. The label stays put, so a button does not change width or
   * lose its meaning mid-action.
   *
   * Ignored with `asChild`: a link has no pending state to show and
   * cannot be disabled.
   */
  loading?: boolean;
}

const renderInner = (
  leadingIcon: ReactNode,
  children: ReactNode,
  loading = false,
) => (
  <>
    {loading ? (
      <span className="crewlet-btn__spinner" aria-hidden />
    ) : (
      leadingIcon ? <span className="crewlet-btn__icon">{leadingIcon}</span> : null
    )}
    <span className="crewlet-btn__label">{children}</span>
  </>
);

export const Button = ({
  variant = 'primary',
  size = 'medium',
  shape = 'square',
  leadingIcon,
  className = '',
  type = 'button',
  asChild = false,
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) => {
  const classes = [
    'crewlet-btn',
    `crewlet-btn--${variant}`,
    `crewlet-btn--${size}`,
    `crewlet-btn--${shape}`,
    loading ? 'crewlet-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error('Button with asChild expects exactly one valid React element child.');
    }
    const childEl = child as ReactElement<{ className?: string; children?: ReactNode }>;
    const mergedClassName = [childEl.props.className, classes].filter(Boolean).join(' ');
    return cloneElement(childEl, { ...rest, className: mergedClassName }, renderInner(
      leadingIcon,
      childEl.props.children,
    ));
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {renderInner(leadingIcon, children, loading)}
    </button>
  );
};
