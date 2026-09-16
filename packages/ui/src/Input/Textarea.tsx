import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from '../utils/cx.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Marks the value as refused. Sets `aria-invalid`. */
  error?: boolean;
  /**
   * When true, the textarea height tracks its content. The element's
   * `overflow` is hidden and the `rows` attribute is ignored.
   */
  autoResize?: boolean;
  /**
   * Content drawn inside the field at its top right, such as a keycap
   * hinting that Enter adds the value. It does not take the pointer.
   */
  trailing?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error = false, autoResize = false, trailing, className = '', value, disabled, ...rest },
  ref,
) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLTextAreaElement);

  useEffect(() => {
    if (!autoResize) return;
    const el = localRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize, value]);

  const control = (
    <textarea
      ref={localRef}
      className={cx(
        'crewlet-textarea',
        error && 'is-error',
        disabled && 'is-disabled',
        autoResize && 'is-auto-resize',
        className,
      )}
      value={value}
      disabled={disabled}
      aria-invalid={error || undefined}
      {...rest}
    />
  );

  if (!trailing) return control;
  return (
    <span className="crewlet-textarea-shell">
      {control}
      <span className="crewlet-input__trailing">{trailing}</span>
    </span>
  );
});
