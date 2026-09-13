import type { HTMLAttributes } from 'react';

export interface FormRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of columns at desktop width. Collapses to 1 on small screens. */
  columns?: 1 | 2 | 3;
}

export const FormRow = ({ columns = 2, className = '', children, ...rest }: FormRowProps) => {
  const classes = ['crewlet-form-row', `crewlet-form-row--${columns}`, className].filter(Boolean).join(' ');
  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
};
