import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'subtle';
export type CardPadding = 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Inner padding preset applied to the root surface (not header/body/footer slots). */
  padding?: CardPadding;
  /** Render as an interactive surface (hover state, pointer cursor, focus ring). */
  interactive?: boolean;
}

const CardRoot = ({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}: CardProps) => {
  const classes = [
    'crewlet-card',
    `crewlet-card--${variant}`,
    `crewlet-card--p-${padding}`,
    interactive ? 'is-interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
};

export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional padding override; defaults to inherit the Card's surface padding. */
  padding?: CardPadding;
}

const CardHeader = ({ className = '', children, ...rest }: CardSectionProps) => (
  <div {...rest} className={`crewlet-card__header ${className}`.trim()}>
    {children}
  </div>
);

const CardBody = ({ className = '', children, ...rest }: CardSectionProps) => (
  <div {...rest} className={`crewlet-card__body ${className}`.trim()}>
    {children}
  </div>
);

const CardFooter = ({ className = '', children, ...rest }: CardSectionProps) => (
  <div {...rest} className={`crewlet-card__footer ${className}`.trim()}>
    {children}
  </div>
);

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h2' | 'h3' | 'h4';
}

const CardTitle = ({ as: As = 'h3', className = '', children, ...rest }: CardTitleProps) => (
  <As {...rest} className={`crewlet-card__title ${className}`.trim()}>{children as ReactNode}</As>
);

const CardDescription = ({ className = '', children, ...rest }: HTMLAttributes<HTMLParagraphElement>) => (
  <p {...rest} className={`crewlet-card__description ${className}`.trim()}>{children}</p>
);

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Title: CardTitle,
  Description: CardDescription,
});
