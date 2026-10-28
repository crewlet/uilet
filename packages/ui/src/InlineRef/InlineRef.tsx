import { Children, type ReactNode } from 'react';
import { safeHref } from '../Markdown/grammar.js';
import { cx } from '../utils/cx.js';

export type InlineRefMarkShape =
  /** A vendor's mark, a kind's glyph or a colour chip: a square at the text's size. */
  | 'glyph'
  /** A face (`Avatar size="text"`), which stands a little taller than the words. */
  | 'face';

export interface InlineRefProps {
  /**
   * What the reference is, drawn before its words at the text's own size: a
   * vendor's mark, a kind's glyph, a colour chip, a face. Decoration, hidden
   * from assistive technology and left out of a copy: `kind` says it in words.
   */
  mark?: ReactNode;
  /** `face` for an `Avatar size="text"`, which keeps its own box; `glyph` (the default) for the rest. */
  markShape?: InlineRefMarkShape | undefined;
  /**
   * What the mark says, read before the words by a screen reader and never
   * drawn: "GitHub" for `gophrase/backend#14`, "Slack" for `Message in
   * gophrase`, "Colour" for `#ffe100`. The visible words stay in the name, so
   * a voice user can say what they see.
   */
  kind?: string | undefined;
  /** What the reference says: `gophrase/backend#14`, `~design-review`, `#ffe100`. */
  children: ReactNode;
  /**
   * Where it goes. Only an `http:`, `https:` or `mailto:` address or an app
   * route (`#/...`) is followed; anything else draws the reference as words,
   * never as a link, so a caller cannot hand a sentence a `javascript:` one.
   */
  href?: string | undefined;
  /** The whole of what it shortens, for a pointer reader: the full address. */
  title?: string | undefined;
  /** An identifier (a reference, a key, a commit) is set in mono, at `InlineCode`'s size. */
  code?: boolean | undefined;
  /**
   * Words that wrap like the sentence around them: a link somebody labelled
   * with a phrase. The mark and the first word still never part. Off, the
   * reference is one token and moves to the next line whole.
   */
  wrap?: boolean | undefined;
  /** Read after the words of a link that leaves the application. */
  newTabLabel?: string | undefined;
  className?: string | undefined;
}

/** The first word of a phrase, which the mark is never parted from, and the rest. */
function splitHead(children: ReactNode): { head: ReactNode; rest: ReactNode[] } {
  const parts = Children.toArray(children);
  const first = parts[0];
  if (typeof first === 'string') {
    const at = first.search(/\s/);
    if (at > 0) return { head: first.slice(0, at), rest: [first.slice(at), ...parts.slice(1)] };
  }
  return { head: first ?? null, rest: parts.slice(1) };
}

/**
 * A reference named inside a sentence: a link, a key, a commit, a seat or a
 * colour, drawn with the mark that says what it is before its words.
 *
 * WHY IT EXISTS. Operator-facing text is full of things a reader has to stop
 * and decode: `gophrase/backend#14` is a pull request on GitHub, `#ffe100` a
 * yellow, `~design-review` a Mattermost channel. A mark at the text's own size
 * says which before the words are read, and costs the line no height.
 *
 * NOT A CHIP. A `RecordChip` is a button that opens a peek of a record the
 * host resolved; this is a link, or words, in the sentence's own ink, so the
 * two never read as the same control.
 *
 * ITS NAME IS ITS WORDS. What the mark means (`kind`) is read before them and
 * the new tab after them, both hidden from the eye; nothing REPLACES the
 * visible words as the name, so a voice user says what they see. None of it,
 * and none of the mark, is carried by a copy: what a reader copies is the
 * words.
 *
 * A LINK THAT LEAVES THE APPLICATION opens a tab and withholds the referrer
 * and the opener, as every link a sentence carries must: the words around it
 * were often written by an agent from something it read elsewhere. An app
 * route (`#/...`) is the application, and opens in place.
 *
 * NEVER A MARK ALONE AT A LINE'S END: the mark and the first word are one
 * unbreakable run, and a reference that is not a phrase (`wrap`) moves to the
 * next line whole.
 */
export function InlineRef({
  mark,
  markShape = 'glyph',
  kind,
  children,
  href,
  title,
  code = false,
  wrap = false,
  newTabLabel = 'opens in a new tab',
  className,
}: InlineRefProps) {
  const target = href === undefined ? null : safeHref(href);
  const hasMark = mark !== undefined && mark !== null;
  const external = target !== null && !target.startsWith('#');
  const { head, rest } = wrap ? splitHead(children) : { head: children, rest: [] };
  const classes = cx(
    'crewlet-inline-ref',
    code && 'crewlet-inline-ref--code',
    wrap && 'crewlet-inline-ref--wrap',
    target !== null && 'crewlet-inline-ref--link',
    className,
  );
  const body = (
    <>
      <span className="crewlet-inline-ref__head">
        {!hasMark ? null : (
          <span
            className={cx('crewlet-inline-ref__mark', `crewlet-inline-ref__mark--${markShape}`)}
            aria-hidden="true"
          >
            {mark}
          </span>
        )}
        {/*
         * Its own space ends it, kept by `white-space: pre`: the gap the eye
         * sees is the mark's margin, so no space of the words' own is spent
         * on it and a copy carries none.
         */}
        {kind === undefined ? null : <span className="crewlet-inline-ref__said">{`${kind}: `}</span>}
        <span className="crewlet-inline-ref__text">{head}</span>
      </span>
      {rest.length === 0 ? null : <span className="crewlet-inline-ref__text">{rest}</span>}
      {/*
       * IN BRACKETS, because a browser reads hidden text out of flow as a
       * word of its own: a comma after the words was read with a space before
       * it.
       */}
      {external ? <span className="crewlet-inline-ref__said">{` (${newTabLabel})`}</span> : null}
    </>
  );
  if (target === null) {
    return (
      <span className={classes} title={title}>
        {body}
      </span>
    );
  }
  return (
    <a
      className={classes}
      href={target}
      title={title}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {body}
    </a>
  );
}
