import {
  Children,
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

export type IconButtonSize = 'sm' | 'md';
export type IconButtonVariant =
  | 'ghost'         // transparent surface, neutral text, surface tint on hover
  | 'ghost-brand'   // transparent surface, brand-accent on hover (lavender)
  | 'ghost-danger'  // transparent surface, danger-rose on hover
  | 'soft-brand';   // soft lavender fill with matching outlined border (the policy + look)

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  /**
   * Required: icon-only buttons have no visible text label, so screen
   * readers need the aria-label to know what the button does.
   */
  'aria-label': string;
  /**
   * Radix-style asChild: render the single child element with IconButton
   * classes merged in rather than wrapping in a native <button>. Useful
   * when the underlying control must be a <Link> or <a>.
   */
  asChild?: boolean;
  children?: ReactNode;
}

/**
 * IconButton: small square icon-only affordance. Distinct from
 * <Button> (the text-CTA primitive); IconButton has no label slot,
 * fixed-square dimensions (22 or 28 px), and is sized for a single
 * Material Symbol or equivalent inline SVG inside.
 *
 * Typical use: row-action gears, copy icons, drag handles, the
 * inline "+" / "×" affordances next to form labels.
 */
export const IconButton = ({
  size = 'sm',
  variant = 'ghost',
  className = '',
  type = 'button',
  asChild = false,
  children,
  ...rest
}: IconButtonProps) => {
  const classes = [
    'crewlet-icon-btn',
    `crewlet-icon-btn--${size}`,
    `crewlet-icon-btn--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error('IconButton with asChild expects exactly one valid React element child.');
    }
    const childEl = child as ReactElement<{ className?: string }>;
    const merged = [childEl.props.className, classes].filter(Boolean).join(' ');
    return cloneElement(childEl, { ...rest, className: merged });
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
};
