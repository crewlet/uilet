import type { HTMLAttributes } from 'react';
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
 * lists, quotes, code, tables, rules, links and images.
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
