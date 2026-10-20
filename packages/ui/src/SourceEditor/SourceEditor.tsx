import {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import { VisuallyHidden } from "../VisuallyHidden/index.js";
import { cx } from "../utils/cx.js";

/** How a marked line reads: a refusal, or advice. */
export type SourceMarkTone = "danger" | "warning";

/** One line called out in the source, as a checker found it. */
export interface SourceMark {
  /** The line, counted from 1. A line past the end is ignored. */
  line: number;
  tone: SourceMarkTone;
  /** What is wrong on the line, shown as the gutter number's tooltip. */
  message?: string;
}

export interface SourceEditorProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "onSubmit" | "children" | "wrap" | "spellCheck"
> {
  value: string;
  onChange: (value: string) => void;
  /** Names the field for a screen reader when no visible label points at it. */
  label?: string;
  /** Lines to call out in the gutter and behind the text. */
  marks?: readonly SourceMark[];
  /** Called on Command+Enter (Control+Enter elsewhere). */
  onSubmit?: (() => void) | undefined;
  /** Spaces one Tab indents by. */
  indent?: number;
  /** Fill the parent's height rather than size to `rows`. */
  fill?: boolean;
  className?: string | undefined;
  /** The field's own class, for a consumer that sets its height. */
  fieldClassName?: string | undefined;
}

/** What a parent can ask of the editor. */
export interface SourceEditorHandle {
  /** Focus the field with the caret at the start of `line` (from 1), scrolled into view. */
  revealLine: (line: number) => void;
  focus: () => void;
  /** The field itself. */
  readonly element: HTMLTextAreaElement | null;
}

/** The keyboard instructions every editor carries for a screen reader. */
export const SOURCE_EDITOR_KEYS =
  "Tab indents and Shift+Tab outdents. Press Escape, then Tab, to move to the next control.";

/** The offset of the start of `line` (from 1) in `text`, clamped to the text. */
export function lineStart(text: string, line: number): number {
  let at = 0;
  for (let n = 1; n < line; n++) {
    const next = text.indexOf("\n", at);
    if (next < 0) return text.length;
    at = next + 1;
  }
  return at;
}

/**
 * Insert `text` over the field's selection the way typing would, so the
 * browser's own undo takes it back. `execCommand` is the one call that keeps a
 * textarea's undo history; where it is refused the range is replaced directly.
 */
function insert(
  field: HTMLTextAreaElement,
  text: string,
  start: number,
  end: number,
): string {
  field.setSelectionRange(start, end);
  const done =
    typeof document.execCommand === "function" &&
    document.execCommand("insertText", false, text);
  if (!done) field.setRangeText(text, start, end, "end");
  return field.value;
}

/**
 * Source text written in place: a monospaced field with a line gutter, and
 * lines a checker called out marked in the gutter and behind the text.
 *
 * A REAL TEXTAREA, so everything a browser gives a field (selection, undo,
 * spelling off, a screen reader's editing commands, autofill off) is there
 * without being rebuilt. The gutter and the marks are drawn behind and beside
 * it and scroll with it; they are hidden from assistive technology, which
 * reads the findings where the consumer lists them.
 *
 * LINES NEVER WRAP, so a line number and a mark always sit on the line they
 * name: a long line scrolls sideways.
 *
 * TAB INDENTS, AND ESCAPE GIVES TAB BACK. Tab and Shift+Tab indent and outdent
 * the lines under the selection, as every code editor does. A keyboard user
 * leaves by pressing Escape first: the next Tab then moves focus as usual. The
 * instructions are the field's description.
 *
 * ENTER KEEPS THE INDENT of the line it breaks, and Command+Enter (Control+Enter)
 * calls `onSubmit`.
 */
export const SourceEditor = forwardRef<SourceEditorHandle, SourceEditorProps>(
  function SourceEditor(
    {
      value,
      onChange,
      label,
      marks = [],
      onSubmit,
      indent = 2,
      fill = false,
      rows = 12,
      className,
      fieldClassName,
      onKeyDown,
      onScroll,
      "aria-describedby": describedBy,
      ...rest
    },
    ref,
  ) {
    const field = useRef<HTMLTextAreaElement>(null);
    const tabLeaves = useRef(false);
    const keysId = useId();
    const [scrollTop, setScrollTop] = useState(0);
    const lines = countLines(value);
    const tone = toneByLine(marks, lines);

    useImperativeHandle(
      ref,
      () => ({
        revealLine(line: number) {
          const el = field.current;
          if (!el) return;
          const at = lineStart(el.value, Math.max(1, line));
          el.focus();
          el.setSelectionRange(at, at);
          const height = parseFloat(getComputedStyle(el).lineHeight) || 20;
          const top = (Math.max(1, line) - 1) * height;
          if (
            top < el.scrollTop ||
            top + height > el.scrollTop + el.clientHeight
          ) {
            el.scrollTop = Math.max(0, top - el.clientHeight / 3);
          }
        },
        focus() {
          field.current?.focus();
        },
        get element() {
          return field.current;
        },
      }),
      [],
    );

    // A value set from outside (a file loaded, a reset) can leave the field
    // scrolled past its new end; the layers follow what the field reports.
    useLayoutEffect(() => {
      const el = field.current;
      if (el && el.scrollTop !== scrollTop) setScrollTop(el.scrollTop);
    }, [value, scrollTop]);

    const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      const el = event.currentTarget;
      if (event.key === "Escape") {
        tabLeaves.current = true;
        return;
      }
      if (event.key === "Tab") {
        if (
          tabLeaves.current ||
          event.altKey ||
          event.metaKey ||
          event.ctrlKey
        ) {
          tabLeaves.current = false;
          return;
        }
        event.preventDefault();
        onChange(
          event.shiftKey ? outdent(el, indent) : indentLines(el, indent),
        );
        return;
      }
      tabLeaves.current = false;
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        if (!onSubmit) return;
        event.preventDefault();
        onSubmit();
        return;
      }
      if (event.key === "Enter" && !event.shiftKey && !event.altKey) {
        const before = el.value.slice(0, el.selectionStart);
        const lead =
          /^[\t ]*/.exec(before.slice(before.lastIndexOf("\n") + 1))?.[0] ?? "";
        if (!lead) return;
        event.preventDefault();
        onChange(insert(el, `\n${lead}`, el.selectionStart, el.selectionEnd));
      }
    };

    return (
      <div
        className={cx("crewlet-source-editor", fill && "is-fill", className)}
        style={
          {
            "--crewlet-source-digits": String(String(lines).length),
          } as CSSProperties
        }
      >
        <div className="crewlet-source-editor__gutter" aria-hidden="true">
          <div
            className="crewlet-source-editor__numbers"
            style={{ transform: `translateY(${-scrollTop}px)` }}
          >
            {Array.from({ length: lines }, (_, i) => {
              const line = i + 1;
              const mark = tone.get(line);
              return (
                <span
                  key={line}
                  className={cx(
                    "crewlet-source-editor__number",
                    mark && `is-${mark.tone}`,
                  )}
                  title={mark?.message}
                >
                  {line}
                </span>
              );
            })}
          </div>
        </div>
        <div className="crewlet-source-editor__body">
          <div className="crewlet-source-editor__marks" aria-hidden="true">
            <div style={{ transform: `translateY(${-scrollTop}px)` }}>
              {[...tone.entries()].map(([line, mark]) => (
                <span
                  key={line}
                  className={cx(
                    "crewlet-source-editor__mark",
                    `is-${mark.tone}`,
                  )}
                  style={
                    {
                      "--crewlet-source-line": String(line - 1),
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          </div>
          <textarea
            ref={field}
            className={cx("crewlet-source-editor__field", fieldClassName)}
            aria-label={label}
            aria-describedby={cx(keysId, describedBy) || undefined}
            aria-invalid={
              [...tone.values()].some((m) => m.tone === "danger") || undefined
            }
            value={value}
            rows={rows}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={keyDown}
            onBlur={() => {
              tabLeaves.current = false;
            }}
            onScroll={(event) => {
              onScroll?.(event);
              setScrollTop(event.currentTarget.scrollTop);
            }}
            {...rest}
          />
        </div>
        <VisuallyHidden id={keysId}>{SOURCE_EDITOR_KEYS}</VisuallyHidden>
      </div>
    );
  },
);

/** How many lines `text` has: an empty text is one empty line. */
function countLines(text: string): number {
  let n = 1;
  for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) n++;
  return n;
}

/** The mark each line shows: a refusal outranks advice on the same line. */
function toneByLine(
  marks: readonly SourceMark[],
  lines: number,
): Map<number, SourceMark> {
  const out = new Map<number, SourceMark>();
  for (const mark of marks) {
    if (!Number.isInteger(mark.line) || mark.line < 1 || mark.line > lines)
      continue;
    const held = out.get(mark.line);
    if (!held || (held.tone === "warning" && mark.tone === "danger"))
      out.set(mark.line, mark);
  }
  return out;
}

/** The lines the selection touches, as offsets: the first line's start and the last line's end. */
function selectedLines(el: HTMLTextAreaElement): { from: number; to: number } {
  const text = el.value;
  const from = text.lastIndexOf("\n", el.selectionStart - 1) + 1;
  // A selection ending at the very start of a line does not take that line.
  const endAt =
    el.selectionEnd > el.selectionStart && text[el.selectionEnd - 1] === "\n"
      ? el.selectionEnd - 1
      : el.selectionEnd;
  const next = text.indexOf("\n", endAt);
  return { from, to: next < 0 ? text.length : next };
}

function indentLines(el: HTMLTextAreaElement, size: number): string {
  const pad = " ".repeat(size);
  if (el.selectionStart === el.selectionEnd) {
    // A caret indents to the next stop from where it stands.
    const column =
      el.selectionStart -
      (el.value.lastIndexOf("\n", el.selectionStart - 1) + 1);
    return insert(
      el,
      " ".repeat(size - (column % size)),
      el.selectionStart,
      el.selectionEnd,
    );
  }
  const { from, to } = selectedLines(el);
  const block = el.value.slice(from, to).replace(/^/gm, pad);
  const value = insert(el, block, from, to);
  el.setSelectionRange(from, from + block.length);
  return value;
}

function outdent(el: HTMLTextAreaElement, size: number): string {
  const { from, to } = selectedLines(el);
  const strip = new RegExp(`^(?: {1,${size}}|\\t)`, "gm");
  const original = el.value.slice(from, to);
  const block = original.replace(strip, "");
  if (block === original) return el.value;
  const caret = el.selectionStart === el.selectionEnd;
  const at = el.selectionStart;
  // What the first line gave up, so a caret stays where it was on its line.
  const removed =
    (/^(?: +|\t)/.exec(original)?.[0].length ?? 0) -
    (/^(?: +|\t)/.exec(block)?.[0].length ?? 0);
  const value = insert(el, block, from, to);
  if (caret) {
    const back = Math.max(from, at - removed);
    el.setSelectionRange(back, back);
  } else el.setSelectionRange(from, from + block.length);
  return value;
}
