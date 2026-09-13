import type { HTMLAttributes, ReactNode } from 'react';

export type CalloutVariant = 'info' | 'success' | 'warning' | 'danger';

export interface CalloutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: CalloutVariant;
  /** Optional bold lead-in rendered before the message. */
  title?: ReactNode;
  /** Optional leading icon (Material symbol, Icon, or any node). */
  icon?: ReactNode;
}

/**
 * Callout, an inline status banner for page-level feedback: an
 * unreachable backend, a permission gate, a destructive-action
 * warning. Sits in the content flow (unlike Toaster, which is for
 * transient notifications) and stays until the condition clears.
 */
export const Callout = ({
  variant = 'info',
  title,
  icon,
  className = '',
  children,
  ...rest
}: CalloutProps) => {
  const classes = ['crewlet-callout', `crewlet-callout--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="status" {...rest} className={classes}>
      {icon ? <span className="crewlet-callout__icon" aria-hidden>{icon}</span> : null}
      <div className="crewlet-callout__content">
        {title ? <span className="crewlet-callout__title">{title}</span> : null}
        {children}
      </div>
    </div>
  );
};
