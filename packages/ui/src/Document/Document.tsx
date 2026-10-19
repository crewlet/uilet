import type { HTMLAttributes, InputHTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

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

export interface DocumentTitleFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Marks the title as refused. Sets `aria-invalid`, which is what a screen reader reads. */
  error?: boolean | undefined;
}

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
 */
export function DocumentTitleField({ error = false, className, ...rest }: DocumentTitleFieldProps) {
  return (
    <input
      {...rest}
      type="text"
      aria-invalid={error || undefined}
      className={cx('crewlet-document-title', 'crewlet-document-title-field', className)}
    />
  );
}
