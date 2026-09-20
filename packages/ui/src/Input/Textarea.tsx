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

  /*
   * GROWING TO THE CONTENT, which used to depend on the caller controlling it.
   *
   * The effect was keyed on the `value` PROP, so an UNCONTROLLED auto-resizing
   * textarea — one given `defaultValue`, or none at all — measured once at
   * mount and never again: `value` stays undefined however much is typed, so
   * nothing re-ran and the box never grew. And `.crewlet-textarea.is-auto-resize`
   * sets `overflow: hidden`, precisely because a box that grows needs no
   * scrollbar, so the text simply disappeared below the fold with no way to
   * scroll to it. The one combination that worked was the controlled one.
   *
   * `input` is what both modes have in common: it fires on every edit whoever
   * owns the value, and the prop stays in the list so a controlled caller that
   * replaces the text from outside still re-measures.
   *
   * `scrollHeight` EXCLUDES the border, and `.crewlet-textarea` is
   * `box-sizing: border-box`, so assigning it directly left the box a border
   * short of its own content — enough to clip the last line's descenders and,
   * on a growing field, enough to keep a scrollbar the rule above has hidden.
   * The border is added back from the computed style rather than assumed,
   * since a caller's own class can change it.
   */
  useEffect(() => {
    if (!autoResize) return;
    const el = localRef.current;
    if (!el) return;
    const measure = () => {
      el.style.height = 'auto';
      const style = getComputedStyle(el);
      const border =
        style.boxSizing === 'border-box'
          ? Number.parseFloat(style.borderTopWidth || '0') + Number.parseFloat(style.borderBottomWidth || '0')
          : 0;
      el.style.height = `${el.scrollHeight + (Number.isFinite(border) ? border : 0)}px`;
    };
    measure();
    el.addEventListener('input', measure);
    /*
     * AND WHEN THE BOX'S OWN WIDTH CHANGES, which decides how many lines the
     * same text takes. Neither an edit nor a re-render announces a column
     * resizing or a font settling. Feature-checked, as every observer in this
     * package is.
     */
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    resize?.observe(el);
    return () => {
      el.removeEventListener('input', measure);
      resize?.disconnect();
    };
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
