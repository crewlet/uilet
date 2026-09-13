import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

export type InputSize = 'sm' | 'md';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  error?: boolean;
  containerClassName?: string;
  /**
   * Content drawn inside the field at its right edge, such as a keycap
   * hinting that Enter adds the value. It does not take the pointer, so a
   * click on it still focuses the field.
   */
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    inputSize = 'md',
    error = false,
    className = '',
    containerClassName = '',
    trailing,
    disabled,
    ...rest
  },
  ref,
) {
  const containerClasses = [
    'crewlet-input',
    `crewlet-input--${inputSize}`,
    error ? 'is-error' : '',
    disabled ? 'is-disabled' : '',
    containerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <input
        ref={ref}
        className={`crewlet-input__control ${className}`.trim()}
        disabled={disabled}
        {...rest}
      />
      {trailing ? <span className="crewlet-input__trailing">{trailing}</span> : null}
    </div>
  );
});
