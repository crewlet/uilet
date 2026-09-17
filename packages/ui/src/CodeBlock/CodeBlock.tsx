import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { CopyButton } from '../Copyable/index.js';
import { cx } from '../utils/cx.js';

interface CodeBlockLook extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The code to display and copy. A trailing newline is trimmed. */
  code: string;
  /** Shown in the header when there is no filename, and set as a data attribute. */
  language?: string | undefined;
  /** Shown on the left of the header. */
  filename?: string | undefined;
  showLineNumbers?: boolean | undefined;
  /** Render the copy control. On by default. */
  copyable?: boolean | undefined;
  /** Names the copy control's action. */
  copyLabel?: string | undefined;
  /** A per-line prefix that is not part of the copy: `$` for a shell command. */
  prompt?: string | undefined;
  /**
   * Wrap long lines instead of scrolling sideways. ON by default, because a
   * block a reader reads is the common case, a message, a record, a stack
   * trace, and a sideways scrollbar on one of those is a line nobody finds the
   * end of. Turn it off for a block whose columns are the point: a diff, a
   * table of output, a log that is aligned on purpose.
   *
   * THIS IS THE WRAPPING PROP, and the only one. `plain` is about the header;
   * see its note.
   */
  wrap?: boolean | undefined;
  /**
   * A ceiling for THIS block, after which it scrolls itself: a CSS length, or
   * a number of px. Without one a 900-line record pushes everything under it
   * off the screen.
   *
   * There is no default, and a ceiling every caller has to remember is a
   * ceiling somebody forgets — so the value is also readable from the CASCADE.
   * An application that wants one ceiling for every block it renders declares
   * `--crewlet-codeblock-max-height` on an ancestor (`:root`, a route's own
   * wrapper) and passes nothing here; this prop then OVERRIDES that ancestor
   * for one block, `maxHeight="none"` escapes it, and with neither set the
   * block is unbounded exactly as it has always been.
   */
  maxHeight?: string | number | undefined;
  /**
   * No HEADER at all, for a block inside a row that already has one: no
   * filename strip, no language, no copy control.
   *
   * IT IS ABOUT THE CHROME, NEVER THE TEXT. A `plain` block still wraps, and a
   * block with a header wraps too — wrapping is `wrap` and nothing else. The
   * name is worth reading twice when porting, because it is a word other code
   * blocks spend on the opposite meaning: a `plain` that turned WRAPPING off
   * is `wrap={false}` here.
   */
  plain?: boolean | undefined;
}

/**
 * WHAT MAKES A BLOCK FOCUSABLE IS TWO DECISIONS, AND A NAME IS WHAT BOTH OWE.
 *
 * `selectable` is an INTENT only the caller has: this block is the record the
 * screen is about, so while it has focus Command or Control plus A means this
 * record rather than the document.
 *
 * `focusWhenScrollable` is an OBLIGATION the component discharges for itself.
 * The `pre` is `overflow: auto`, so a ceiling or `wrap={false}` can turn any
 * block into a scroll container, and a scroll container no keyboard can reach
 * is content no keyboard can read. Whether a given block is one is a fact
 * about the RENDERED BOX, not about any prop — the same code overflows at one
 * viewport and not at the next — so the component measures it. A card carrying
 * dozens of tool-argument blocks then gets a tab stop in front of the two that
 * scroll rather than in front of all of them.
 *
 * They are separate because they answer different questions, and welding them
 * gets both cases wrong: a block promoted for its scrollbar would start
 * swallowing a chord nobody pressed for it, and a block that owns the chord
 * would have to scroll to be named.
 *
 * `label` is the part they SHARE, and the type is what says so: a focusable
 * `role="region"` with no accessible name is a tab stop a screen reader
 * announces as nothing, which is worse than the plain block it replaced. So
 * every arm that can take focus demands one, from either door, and the arm
 * that cannot take focus refuses one — an optional label beside an optional
 * flag is a label somebody forgets, and a label on a block that can never be
 * named is a prop that silently does nothing.
 */
export type CodeBlockProps = CodeBlockLook &
  (
    | {
        /** Take Command or Control plus A while focused, and take focus. */
        selectable: true;
        /** Also take focus when the rendered box turns out to scroll. */
        focusWhenScrollable?: boolean | undefined;
        /** What this block is: "The turn record, as JSON". */
        label: string;
      }
    | {
        selectable?: false | undefined;
        /**
         * Take focus when, and only when, the rendered box scrolls — on
         * either axis. The block is a named region then and nothing more: the
         * select-all chord stays with the browser.
         */
        focusWhenScrollable: true;
        /**
         * What this block is. Required although the block may never take
         * focus, because whether it does is a property of the box at one
         * viewport and not of this call.
         */
        label: string;
      }
    | { selectable?: false | undefined; focusWhenScrollable?: false | undefined; label?: never }
  );

/**
 * A block of code, a config or a record.
 *
 * WHY THE LINES CARRY THEIR OWN NEWLINE. Each line used to be a `span` with
 * nothing between them, so the block's `textContent` and any Range taken over
 * it ran every line together: a reader who selected the block and copied it
 * got one line of JSON with the structure gone. The newline is a real
 * character in the markup now, and with line numbers off the code is ONE TEXT
 * NODE, which is what a selection and a browser's own find both want.
 */
export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code,
    language,
    filename,
    showLineNumbers = false,
    copyable = true,
    copyLabel = 'Copy',
    prompt,
    wrap = true,
    maxHeight,
    plain = false,
    selectable = false,
    focusWhenScrollable = false,
    label,
    className,
    style,
    ...rest
  },
  ref,
) {
  const box = useRef<HTMLPreElement>(null);
  const body = code.replace(/\n+$/, '');
  const showHeader = !plain && (filename !== undefined || language !== undefined || copyable);
  // A prefix is drawn per line, so it needs the lines even with numbers off.
  const perLine = showLineNumbers || prompt !== undefined;

  /*
   * DOES THIS BLOCK ACTUALLY SCROLL — measured, because there is nothing else
   * to read the answer off. Browsers disagree about a scroll container with no
   * focusable content in it: Firefox has always put one in the tab order and
   * Chrome does from 127, while Safari does not, so on Safari an overflowing
   * block is content a keyboard cannot reach at all.
   */
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    // A block that did not ask pays for no observer and can never be
    // promoted, which is every call site written before this prop existed.
    if (!focusWhenScrollable) return;
    const node = box.current;
    if (!node) return;
    /*
     * BOTH AXES. A ceiling makes a block scroll down; `wrap={false}` makes a
     * wide line scroll sideways in a box that is not tall enough to scroll at
     * all. Either one is a scroll container, and a block reachable only for
     * the axis somebody thought of is the same bug with a smaller blast
     * radius.
     */
    const measure = () =>
      setOverflows(node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth);
    measure();
    /*
     * The box is resized by the window, by a disclosure opening above it, and
     * by a font finally loading — none of which is a render of this
     * component, so ResizeObserver is the only one of the three it can see.
     * Content arriving IS a render, and the values this list names past the
     * flag are the ones that change what the box has to hold.
     *
     * FEATURE-CHECKED as every observer in this package is: it is absent in
     * older embedded browsers, where an unguarded construction throws and
     * takes the page with it, and the one-off measurement above still stands.
     */
    if (typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(measure);
    watch.observe(node);
    return () => watch.disconnect();
  }, [focusWhenScrollable, body, wrap, showLineNumbers, prompt, maxHeight]);

  /*
   * Reachable because it owns the chord, or because it is a scroll container a
   * reader would otherwise have no way into. The flag is read again here
   * rather than trusted to the state, so a block that stops asking gives the
   * tab stop back on the same render instead of on the effect after it.
   */
  const focusable = selectable || (focusWhenScrollable && overflows);

  const onKeyDown = (event: KeyboardEvent<HTMLPreElement>) => {
    /*
     * THE PHYSICAL KEY FIRST. Browsers resolve select-all from the key's
     * position, not from the character a layout maps it to, so matching only
     * `event.key` misses on every non-Latin layout: where `ф` or `α` comes
     * back this handler would decline, and the document-wide select-all it
     * exists to replace would happen instead. `event.key` stays as the
     * fallback for anything that reports no `code`.
     */
    const isA = event.code === 'KeyA' || (!event.code && event.key.toLowerCase() === 'a');
    /*
     * Shift and Alt make DIFFERENT chords, several of which the browser owns
     * (Control plus Shift plus A is Chrome's tab search). Swallowing one takes
     * a shortcut away and puts nothing in its place.
     */
    if (!isA || event.altKey || event.shiftKey || !(event.metaKey || event.ctrlKey)) return;
    const node = box.current;
    const selection = window.getSelection?.();
    // No Selection API: the browser's own select-all is then strictly better
    // than nothing, so this hands the key back rather than swallowing it.
    if (!node || !selection) return;
    event.preventDefault();
    selection.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.addRange(range);
  };

  let content: ReactNode = body;
  if (perLine) {
    const lines = body.split('\n');
    content = lines.map((line, index) => (
      <span className="crewlet-codeblock__line" key={`${index}-${line}`}>
        {showLineNumbers ? (
          <span className="crewlet-codeblock__ln" aria-hidden>
            {index + 1}
          </span>
        ) : null}
        {prompt === undefined ? null : (
          <span className="crewlet-codeblock__prompt" aria-hidden>
            {prompt}
          </span>
        )}
        <span className="crewlet-codeblock__linecontent">{line}</span>
        {/* A REAL newline, so textContent and a Range keep the structure. */}
        {index < lines.length - 1 ? '\n' : null}
      </span>
    ));
  }

  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'crewlet-codeblock',
        showLineNumbers && 'crewlet-codeblock--numbered',
        !wrap && 'crewlet-codeblock--nowrap',
        maxHeight !== undefined && 'crewlet-codeblock--bounded',
        className,
      )}
      style={
        maxHeight === undefined
          ? style
          : ({
              ...style,
              '--crewlet-codeblock-max-height': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
            } as CSSProperties)
      }
    >
      {showHeader ? (
        <div className="crewlet-codeblock__header">
          <span className="crewlet-codeblock__meta">
            {filename === undefined ? null : <span className="crewlet-codeblock__filename">{filename}</span>}
            {language !== undefined && filename === undefined ? (
              <span className="crewlet-codeblock__lang">{language}</span>
            ) : null}
          </span>
          {copyable ? <CopyButton text={code} label={copyLabel} className="crewlet-codeblock__copy" /> : null}
        </div>
      ) : null}
      {/*
        A named region that takes one key, which is what the rule below exists
        to catch and is exactly what this is. It is not a widget and must not
        claim to be one: `region` is the honest role for a labelled chunk a
        reader navigates to, it carries a tabindex and a name, and the only key
        it takes is the select-all a reader pressed FOR this block. Silencing
        the rule here rather than picking a widget role that lies about what
        the element does.

        The key follows `selectable` alone, while the name and the tab stop
        follow either door: a block promoted because it scrolls is a region a
        reader can reach and read, and nothing more.
      */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <pre
        ref={box}
        className="crewlet-codeblock__pre"
        data-language={language}
        tabIndex={focusable ? 0 : undefined}
        role={focusable ? 'region' : undefined}
        aria-label={focusable ? label : undefined}
        onKeyDown={selectable ? onKeyDown : undefined}
      >
        <code className="crewlet-codeblock__code">{content}</code>
      </pre>
    </div>
  );
});
