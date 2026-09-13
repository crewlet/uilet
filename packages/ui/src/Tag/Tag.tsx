import type { HTMLAttributes, ReactNode } from 'react';

export type TagVariant = 'neutral' | 'info' | 'success' | 'warn' | 'danger' | 'brand';
export type TagSize = 'sm' | 'md';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  size?: TagSize;
  /** Optional leading icon (Material symbol, Icon, or any node). */
  leadingIcon?: ReactNode;
  /** When set, renders a close button that fires this on click. Turns the Tag into a Chip. */
  onRemove?: (() => void) | undefined;
  /** ARIA label for the remove button. Defaults to "Remove tag". */
  removeAriaLabel?: string;
  /** Force a monospace font, for machine values such as IP addresses and CIDR ranges. */
  monospace?: boolean;
}

export const Tag = ({
  variant = 'neutral',
  size = 'md',
  leadingIcon,
  onRemove,
  removeAriaLabel = 'Remove tag',
  monospace = false,
  className = '',
  children,
  ...rest
}: TagProps) => {
  const classes = [
    'crewlet-tag',
    `crewlet-tag--${variant}`,
    `crewlet-tag--${size}`,
    monospace ? 'crewlet-tag--monospace' : '',
    onRemove ? 'is-removable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span {...rest} className={classes}>
      {leadingIcon ? <span className="crewlet-tag__icon" aria-hidden>{leadingIcon}</span> : null}
      <span className="crewlet-tag__label">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className="crewlet-tag__remove"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={removeAriaLabel}
        >
          <span aria-hidden>×</span>
        </button>
      ) : null}
    </span>
  );
};
