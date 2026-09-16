import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

export type InlineCodeVariant =
  /** An identifier, a path, a config key, a header name. */
  | 'default'
  /**
   * A `${NAME}` pointing at a secret or an environment variable. Ligatures are
   * off everywhere in this component, and this variant also holds the braces
   * on one line: a reference torn across a line break names nothing.
   */
  | 'reference';

export type InlineCodeTone =
  /** The component's own quiet ink on the inset surface. */
  | 'default'
  /**
   * Whatever the surrounding text is set in. A chip inside a Callout or a
   * field error has to carry that message's ink, or it reads as a separate,
   * calmer sentence inside an alarming one.
   */
  | 'inherit';

export interface InlineCodeProps extends HTMLAttributes<HTMLElement> {
  variant?: InlineCodeVariant | undefined;
  tone?: InlineCodeTone | undefined;
  /** One line, cut with an ellipsis, for a chip inside a dense row. */
  truncate?: boolean | undefined;
}

/**
 * One identifier inside a sentence.
 *
 * IT WRAPS ANYWHERE, and that is the whole reason it is a component rather
 * than a `code` element with a class. These chips carry public base URLs and
 * config paths, and a URL is ONE UNBREAKABLE WORD to a line breaker: without
 * an explicit break opportunity the chip is pushed whole onto its own line and
 * the sentence around it is torn into fragments.
 *
 * For a block of code, several lines of it, use `CodeBlock`.
 */
export function InlineCode({
  variant = 'default',
  tone = 'default',
  truncate = false,
  className,
  children,
  ...rest
}: InlineCodeProps) {
  return (
    <code
      {...rest}
      className={cx(
        'crewlet-inline-code',
        `crewlet-inline-code--${variant}`,
        tone === 'inherit' && 'crewlet-inline-code--inherit',
        truncate && 'crewlet-inline-code--truncate',
        className,
      )}
    >
      {children}
    </code>
  );
}
