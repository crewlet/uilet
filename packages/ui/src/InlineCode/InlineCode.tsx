import { Children, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export type InlineCodeVariant =
  /** An identifier, a path, a config key, a header name. */
  | 'default'
  /**
   * A `${NAME}` pointing at a secret or an environment variable. Ligatures are
   * off everywhere in this component, and this variant holds `${` and `}` to
   * the name: the chip moves to the next line whole where it fits there, and
   * breaks inside the name only where it does not fit on a line of its own.
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
  /**
   * Never broken across lines: a short token a reader reads as one (a cron
   * expression, an event type, a version). The chip moves to the next line
   * whole rather than splitting. Leave it off for a URL or a path, which has
   * to wrap or it tears the sentence around it apart.
   */
  whole?: boolean | undefined;
}

/**
 * A reference's text in three runs: `${` with the name's first character, the
 * rest of the name, and its last character with `}`. A name of one character
 * is one run. Null for anything not shaped `${NAME}`, which is drawn as given.
 */
function referenceRuns(children: ReactNode): readonly [string, string, string] | null {
  const parts = Children.toArray(children);
  if (!parts.every((part) => typeof part === 'string' || typeof part === 'number')) return null;
  const text = parts.join('');
  if (!text.startsWith('${') || !text.endsWith('}')) return null;
  // Code points, so a character outside the BMP is never cut in half.
  const name = Array.from(text.slice(2, -1));
  if (name.length === 0) return null;
  if (name.length === 1) return [text, '', ''];
  const first = name[0]!;
  const last = name[name.length - 1]!;
  return ['${' + first, name.slice(1, -1).join(''), last + '}'];
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
  whole = false,
  className,
  children,
  ...rest
}: InlineCodeProps) {
  const runs = variant === 'reference' ? referenceRuns(children) : null;
  return (
    <code
      {...rest}
      className={cx(
        'crewlet-inline-code',
        `crewlet-inline-code--${variant}`,
        tone === 'inherit' && 'crewlet-inline-code--inherit',
        truncate && 'crewlet-inline-code--truncate',
        whole && 'crewlet-inline-code--whole',
        className,
      )}
    >
      {runs === null ? (
        children
      ) : (
        <>
          <span className="crewlet-inline-code__end">{runs[0]}</span>
          {runs[1]}
          {runs[2] === '' ? null : <span className="crewlet-inline-code__end">{runs[2]}</span>}
        </>
      )}
    </code>
  );
}
