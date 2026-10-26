import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from '../utils/cx.js';
import { useFocusModality } from '../utils/focusModality.js';

export type DocumentSize =
  /**
   * A page read on its own: the small step at the relaxed leading, sections at
   * the ramp's xl and lg. THE DEFAULT, because a knowledge page, a runbook and
   * a design are what this is for.
   */
  | 'md'
  /**
   * A document read beside other things: a comment, a preview in a side
   * pane, a result's peek. The body's own size, sections a step over it.
   */
  | 'sm';

export type DocumentElement = 'div' | 'article' | 'section';

export interface DocumentProps extends HTMLAttributes<HTMLElement> {
  /** The element to draw. A `div` by default; an `article` for a page that stands alone. */
  as?: DocumentElement | undefined;
  size?: DocumentSize | undefined;
  /** Bounds the line length at the measure token. On by default; a measure is the point. */
  measure?: 'normal' | 'none' | undefined;
}

/**
 * Rendered markdown, set as a document: headings, paragraphs, lists and task
 * lists, quotes, callouts, code, tables, rules, links and images.
 *
 * A STYLESHEET OVER ELEMENTS, NOT A RENDERER. What a body may contain (which
 * link schemes are safe, whether raw HTML is text) is a decision about the
 * application's own content, so the parser stays with the application and
 * emits plain semantic elements, and this draws them. Any renderer that emits
 * `h2`, `ul`, `table` and the rest works unchanged, and nothing here reads a
 * class name a renderer would have to know about.
 *
 * WHAT IT RECOGNISES BY SHAPE. A task item is a list item whose first child is
 * a checkbox; a table that may be wider than the column sits in an element of
 * its own, and that element scrolls. Both are read off the structure, so a
 * renderer gets them by emitting the markup it would emit anyway. A renderer
 * gives that element `tabIndex={0}`, a `region` role and a name, because a
 * scroller no keyboard can reach is a table no keyboard can read to its end.
 *
 * A CALLOUT is recognised the same way: an element with `data-callout` set
 * to its tone (`note`, `tip`, `important`, `warning`, `caution`), the tone's
 * name in an element with `data-callout-label` and its blocks in one with
 * `data-callout-body`. A table cell aligned by `data-align` is set as one
 * aligned by a style, so an editor that may write no style attribute sets a
 * column exactly as the reader's renderer does.
 *
 * THE TITLE IS NOT PART OF IT. A page's title is its address and its `h1`, set
 * above the body by `DocumentTitle`, so a renderer draws the body's own
 * headings from `h2` down and the outline of the page starts there.
 */
export function Document({ as: Tag = 'div', size = 'md', measure = 'normal', className, children, ...rest }: DocumentProps) {
  return (
    <Tag
      {...rest}
      className={cx(
        'crewlet-document',
        `crewlet-document--${size}`,
        measure === 'normal' && 'crewlet-document--measure',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export interface DocumentTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The heading level. An `h1` by default: on a page of its own, the title is the page's. */
  as?: 'h1' | 'h2' | undefined;
}

/**
 * A document's title: the largest step a reading screen spends, at the tight
 * tracking every title on the ramp takes.
 *
 * A component rather than a class, so a screen does not set a page's title in
 * a size of its own beside the body it heads.
 */
export function DocumentTitle({ as: Tag = 'h1', className, children, ...rest }: DocumentTitleProps) {
  return (
    <Tag {...rest} className={cx('crewlet-document-title', className)}>
      {children}
    </Tag>
  );
}

export interface DocumentTitleFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows' | 'cols' | 'wrap'> {
  /** Marks the title as refused. Sets `aria-invalid`, which is what a screen reader reads. */
  error?: boolean | undefined;
}

/** Every line break a paste, a drop or an autofill can carry, for one space each. */
const LINE_BREAKS = /\r\n|[\r\n\u2028\u2029]/g;

/**
 * A title being written: the field a new page's title is typed into, set as
 * `DocumentTitle` sets it once the page exists, so what a writer types is what
 * a reader will see above the body rather than a form's field above a page.
 *
 * IT DRAWS NO BOX. The words are the field, as the body under it is; a line
 * along its foot marks it under the pointer, in focus (the ring's colour,
 * since the caret alone is no indicator a keyboard can rely on) and in the
 * danger ink when the title is refused. The name is the caller's
 * (`aria-label`, or a label it points at), because a title field's visible
 * cue is its placeholder, and a placeholder is not a name.
 *
 * IT WRAPS, AND IT IS STILL ONE LINE OF TEXT. A title is set in the page's
 * largest type, and an `<input>` cuts what does not fit: on a phone a long
 * title, or the example in its placeholder, was clipped mid-word ("Weekly
 * planning, Octobe"). So it is a textarea of one row that grows with what it
 * holds, as the title it becomes wraps, and every way it could take a second
 * line is closed: Enter inserts nothing (its `keydown` reaches the caller and
 * the page exactly as an input's does, and in a form with a submit button it
 * submits, as an input's Enter does), and a pasted, dropped or autofilled line
 * break becomes a space before the caller's `onChange` reads the value. It is
 * named to assistive technology as a single-line text field
 * (`aria-multiline="false"`).
 */
export const DocumentTitleField = forwardRef<HTMLTextAreaElement, DocumentTitleFieldProps>(function DocumentTitleField(
  { error = false, className, onChange, onKeyDown, value, defaultValue, ...rest },
  forwarded,
) {
  useFocusModality();
  const own = useRef<HTMLTextAreaElement | null>(null);
  const ref = useCallback(
    (element: HTMLTextAreaElement | null) => {
      own.current = element;
      if (typeof forwarded === 'function') forwarded(element);
      else if (forwarded) forwarded.current = element;
    },
    [forwarded],
  );

  // GROW TO WHAT IT HOLDS: one row's height and no more, so the line along
  // its foot sits under the last line of the title. Measured on every value
  // and whenever its width changes, which is when a title rewraps.
  const fit = useCallback(() => {
    const element = own.current;
    if (!element) return;
    element.style.height = 'auto';
    const style = getComputedStyle(element);
    const edges =
      style.boxSizing === 'border-box'
        ? parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
        : -(parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
    element.style.height = `${element.scrollHeight + (Number.isFinite(edges) ? edges : 0)}px`;
  }, []);
  useLayoutEffect(fit, [fit, value]);
  useEffect(() => {
    const element = own.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      fit();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit]);

  // AND ONCE THE FACE HAS LOADED. A field fitted in the fallback face is
  // measured in that face's widths: a placeholder that wraps onto two lines
  // there wraps onto three in the title's own face, and the field, still two
  // lines tall, cut the third off. A face arriving changes no width, so the
  // observer above never sees it (SheetGrid measures again for the same
  // reason).
  useEffect(() => {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    if (!fonts) return undefined;
    let live = true;
    const loaded = () => {
      if (live) fit();
    };
    void fonts.ready.then(loaded);
    fonts.addEventListener('loadingdone', loaded);
    return () => {
      live = false;
      fonts.removeEventListener('loadingdone', loaded);
    };
  }, [fit]);

  // ENTER INSERTS NOTHING. Refused at `beforeinput`, the one event every way
  // of typing a line break passes through, so the keydown is left exactly as
  // an input's: the caller's handler and the page's see it unprevented.
  useEffect(() => {
    const element = own.current;
    if (!element) return undefined;
    const refuse = (event: InputEvent) => {
      if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') event.preventDefault();
    };
    element.addEventListener('beforeinput', refuse);
    return () => element.removeEventListener('beforeinput', refuse);
  }, []);

  const change = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const element = event.currentTarget;
    if (LINE_BREAKS.test(element.value)) {
      LINE_BREAKS.lastIndex = 0;
      const caret = element.selectionStart;
      element.value = element.value.replace(LINE_BREAKS, ' ');
      element.setSelectionRange(caret, caret);
    }
    LINE_BREAKS.lastIndex = 0;
    onChange?.(event);
    if (value === undefined) fit();
  };

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing) return;
    // An input's Enter submits its form when the form has a submit button, or
    // when the input is the only field in it. A textarea's never does, so
    // that is done here, through the form's own submission.
    const form = event.currentTarget.form;
    if (!form) return;
    const submitter = form.querySelector<HTMLButtonElement | HTMLInputElement>(
      'button[type="submit"], button:not([type]), input[type="submit"], input[type="image"]',
    );
    if (submitter) {
      if (!submitter.disabled) form.requestSubmit(submitter);
      return;
    }
    const fields = form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea');
    if (fields.length === 1) form.requestSubmit();
  };

  return (
    <textarea
      {...rest}
      ref={ref}
      rows={1}
      value={value}
      defaultValue={defaultValue}
      aria-multiline="false"
      aria-invalid={error || undefined}
      className={cx('crewlet-document-title', 'crewlet-document-title-field', className)}
      onChange={change}
      onKeyDown={keyDown}
    />
  );
});
