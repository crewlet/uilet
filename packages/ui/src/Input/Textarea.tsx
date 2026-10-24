import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { announce } from '../Announcer/index.js';
import { isComposing } from '../Layer/stack.js';
import { cx } from '../utils/cx.js';
import { useFocusModality } from '../utils/focusModality.js';

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
  /**
   * A value of ONE LINE that wraps so it can be read whole: a mission, a
   * policy, a title with a long tail. A one-line `Input` scrolls a long value
   * sideways, so a 160-character mission shows only its last words while it
   * is being edited; this field wraps it instead, and still holds one line.
   * Enter inserts no line break (the key stays the surrounding form's or
   * list's to act on), and a line break pasted or dropped in is folded into
   * a space, and said so (`foldedMessage`), since the value is then not
   * quite what was pasted. `aria-multiline` is false, so it is announced as
   * the one-line field it is. Pair it with `autoResize` and `rows={1}`.
   */
  singleLine?: boolean;
  /** Said through the page's `Announcer` when a `singleLine` field folds line breaks it was given. */
  foldedMessage?: string;
}

/*
 * EVERY CHARACTER THE ENGINE CALLS A LINE BREAK, which is more than \r and
 * \n: the vertical tab, the form feed, NEL (U+0085) and the Unicode line and
 * paragraph separators (U+2028, U+2029), as the engine's charter rule and its
 * shared vectors spell it. Text copied from a PDF or some editors carries
 * U+2028; folded as \n alone, it survived into a one-line field, drew as a
 * break and was then refused on save.
 */
const LINE_BREAK = /[\r\n\v\f\u0085\u2028\u2029]/;
const LINE_BREAKS = /[ \t]*(?:\r\n|[\r\n\v\f\u0085\u2028\u2029])+[ \t]*/g;

/** A value with its line breaks, and the space around each, folded into one space. */
export function foldLineBreaks(text: string): string {
  return text.replace(LINE_BREAKS, ' ');
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    error = false,
    autoResize = false,
    trailing,
    singleLine = false,
    foldedMessage = 'Line breaks were replaced with spaces: this field holds one line.',
    className = '',
    value,
    disabled,
    onChange,
    onKeyDown,
    ...rest
  },
  ref,
) {
  useFocusModality();
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

  /*
   * ONE LINE, ENFORCED WHERE THE TEXT ARRIVES. The caller's handler runs
   * first, so a list that turns Enter into "add" or "next" still does; only
   * a plain or Shift+Enter nobody claimed is kept from writing a newline, and
   * Ctrl or Command with Enter passes through untouched to a form's save. An
   * input method's Enter is its own.
   */
  const keys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (!singleLine || event.defaultPrevented || event.key !== 'Enter') return;
    if (event.ctrlKey || event.metaKey || isComposing(event)) return;
    event.preventDefault();
  };
  /*
   * A pasted or dropped line break never reaches the caller: it is folded
   * into a space before `onChange` is called, with the caret kept where the
   * writer left it, and the fold is SAID, so the writer knows the field
   * holds something other than what they pasted. Folded rather than
   * refused, because the break carries no meaning a one-line value can keep,
   * and a refusal would throw away the whole paste for it.
   */
  const change = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const el = event.target;
    if (singleLine && LINE_BREAK.test(el.value)) {
      const caret = foldLineBreaks(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
      el.value = foldLineBreaks(el.value);
      el.setSelectionRange(caret, caret);
      announce(foldedMessage);
    }
    onChange?.(event);
  };

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
      aria-multiline={singleLine ? false : undefined}
      {...rest}
      onChange={change}
      onKeyDown={keys}
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
