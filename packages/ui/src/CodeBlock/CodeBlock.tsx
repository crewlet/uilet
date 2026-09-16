import {
  forwardRef,
  useRef,
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
   */
  wrap?: boolean | undefined;
  /**
   * A ceiling, after which the block scrolls itself: a CSS length, or a number
   * of px. Without one a 900-line record pushes everything under it off the
   * screen.
   */
  maxHeight?: string | number | undefined;
  /** No header at all, for a block inside a row that already has one. */
  plain?: boolean | undefined;
}

/**
 * `selectable` and `label` travel together, and the type is what says so: a
 * focusable `role="region"` with no accessible name is a tab stop a screen
 * reader announces as nothing, which is worse than the plain block it
 * replaced. A union rather than two optional props, because an optional label
 * beside an optional flag is a label somebody forgets.
 */
export type CodeBlockProps = CodeBlockLook &
  (
    | {
        /** Take Command or Control plus A while focused, and take focus. */
        selectable: true;
        /** What this block is: "The turn record, as JSON". */
        label: string;
      }
    | { selectable?: false | undefined; label?: never }
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
      */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <pre
        ref={box}
        className="crewlet-codeblock__pre"
        data-language={language}
        tabIndex={selectable ? 0 : undefined}
        role={selectable ? 'region' : undefined}
        aria-label={selectable ? label : undefined}
        onKeyDown={selectable ? onKeyDown : undefined}
      >
        <code className="crewlet-codeblock__code">{content}</code>
      </pre>
    </div>
  );
});
