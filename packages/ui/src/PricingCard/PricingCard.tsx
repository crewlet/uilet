import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Tag as SharedTag, type TagVariant } from '../Tag/index.js';

export type PricingCardTagVariant = 'neutral' | 'top' | 'save' | 'pending';

/**
 * PricingCard is the canonical plan-tier card surface. It owns the
 * outer container (the selected, pending, unavailable and disabled
 * states, plus the interactive hover), and exposes compound parts
 * (`PricingCard.Header / Name / Tag / Price / Amount / Cadence /
 * PriceNote / Body / Footer`) so the caller composes the content.
 *
 * The card renders as a `<button>` by default so the entire surface
 * is clickable in a picker context. Pass `interactive={false}` for
 * a static display card (a pricing comparison) and the surface
 * renders as a `<div>` instead.
 */
export interface PricingCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  selected?: boolean;
  pending?: boolean;
  /**
   * Soft-disabled: the option is shown but cannot be chosen right now.
   * Click is suppressed and the interactive card is announced as
   * disabled through `aria-disabled` while staying focusable, so a
   * keyboard or screen reader user can still reach it and read why.
   * State that reason in the card content, since the dimmed surface
   * alone does not explain it.
   */
  unavailable?: boolean;
  /** Hard disabled. Click is suppressed. */
  disabled?: boolean;
  /** When false (default true), render a `<div>` instead of a `<button>`. */
  interactive?: boolean;
}

interface PricingCardRootProps extends PricingCardProps {
  children?: ReactNode;
}

const PricingCardRoot = forwardRef<HTMLButtonElement, PricingCardRootProps>(function PricingCardRoot(
  {
    selected = false,
    pending = false,
    unavailable = false,
    disabled = false,
    interactive = true,
    className = '',
    type,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const classes = [
    'crewlet-pricing-card',
    selected ? 'is-selected' : '',
    pending ? 'is-pending' : '',
    unavailable ? 'is-unavailable' : '',
    disabled ? 'is-disabled' : '',
    interactive ? 'is-interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!interactive) {
    const { 'aria-pressed': _ignored, ...divRest } = rest as Record<string, unknown>;
    return (
      <div className={classes} {...(divRest as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  const onClickGuarded = disabled || unavailable ? undefined : onClick;
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || undefined}
      aria-pressed={selected || undefined}
      aria-disabled={unavailable && !disabled ? true : undefined}
      onClick={onClickGuarded}
      {...rest}
    >
      {children}
    </button>
  );
});

const Header = ({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={`crewlet-pricing-card__header ${className}`.trim()}>{children}</div>
);

const Name = ({ className = '', children, ...rest }: HTMLAttributes<HTMLSpanElement>) => (
  <span {...rest} className={`crewlet-pricing-card__name ${className}`.trim()}>{children}</span>
);

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: PricingCardTagVariant;
}

/**
 * Which tone of the shared Tag each pricing variant is.
 *
 * A pricing tag is a tag. It had its own pill here, with its own radius, its
 * own type and its own tint table, so a "Save 10 percent" chip and a success
 * tag two screens away were the same claim drawn two ways. The shape comes
 * from the one primitive now and this card contributes only the placement.
 */
const TAG_TONE: Record<PricingCardTagVariant, TagVariant> = {
  neutral: 'neutral',
  top: 'brand',
  save: 'success',
  pending: 'warning',
};

const Tag = ({ variant = 'neutral', className = '', children, ...rest }: TagProps) => (
  <SharedTag
    {...rest}
    variant={TAG_TONE[variant]}
    className={`crewlet-pricing-card__tag crewlet-pricing-card__tag--${variant} ${className}`.trim()}
  >
    {children}
  </SharedTag>
);

const Price = ({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={`crewlet-pricing-card__price ${className}`.trim()}>{children}</div>
);

interface AmountProps extends HTMLAttributes<HTMLSpanElement> {
  /** Strikethrough; used to show the pre-discount price. */
  strike?: boolean;
  /** Highlighted with the discounted accent colour. */
  discounted?: boolean;
}

const Amount = ({ strike = false, discounted = false, className = '', children, ...rest }: AmountProps) => {
  const classes = [
    'crewlet-pricing-card__amount',
    strike ? 'crewlet-pricing-card__amount--strike' : '',
    discounted ? 'crewlet-pricing-card__amount--discounted' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <span {...rest} className={classes}>{children}</span>;
};

const Cadence = ({ className = '', children, ...rest }: HTMLAttributes<HTMLSpanElement>) => (
  <span {...rest} className={`crewlet-pricing-card__cadence ${className}`.trim()}>{children}</span>
);

/**
 * Small contextual note shown beneath the price, for example "Save $X
 * (10% off)" on a discounted plan, or "Billed annually" and "Free
 * forever" hints on a pricing page.
 */
const PriceNote = ({ className = '', children, ...rest }: HTMLAttributes<HTMLSpanElement>) => (
  // The success tag, on its own line. The shape and the tint come from the one
  // primitive; this file adds only the line of its own it sits on and the way
  // it arrives.
  <SharedTag {...rest} variant="success" className={`crewlet-pricing-card__price-note ${className}`.trim()}>
    {children}
  </SharedTag>
);

const Body = ({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={`crewlet-pricing-card__body ${className}`.trim()}>{children}</div>
);

const Footer = ({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={`crewlet-pricing-card__footer ${className}`.trim()}>{children}</div>
);

/**
 * Responsive grid container for a row of PricingCards. Drops from 4 to
 * 2 to 1 columns as the viewport narrows, so a card never shrinks below
 * a readable width.
 */
const Grid = ({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={`crewlet-pricing-card-grid ${className}`.trim()}>{children}</div>
);

export const PricingCard = Object.assign(PricingCardRoot, {
  Header,
  Name,
  Tag,
  Price,
  Amount,
  Cadence,
  PriceNote,
  Body,
  Footer,
  Grid,
});
