import type { LabelHTMLAttributes, ReactNode } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean | undefined;
  /** Optional action node (button, link) rendered inline next to the label text. */
  action?: ReactNode;
}

export const Label = ({ required, action, className = '', children, ...rest }: LabelProps) => {
  const classes = ['crewlet-label', action ? 'crewlet-label--with-action' : '', className]
    .filter(Boolean)
    .join(' ');

  if (action) {
    return (
      <div className={classes}>
        <label {...rest} className="crewlet-label__text">
          {children}
          {required ? <span className="crewlet-label__required" aria-hidden>*</span> : null}
        </label>
        <span className="crewlet-label__action">{action}</span>
      </div>
    );
  }

  return (
    <label {...rest} className={classes}>
      {children}
      {required ? <span className="crewlet-label__required" aria-hidden>*</span> : null}
    </label>
  );
};
