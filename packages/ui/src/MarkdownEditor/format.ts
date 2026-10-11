/**
 * What a formatting control does to markdown source, as pure functions over a
 * value and a selection.
 *
 * WHY PURE. A formatting bar that edits a textarea by hand is a bar whose
 * rules can only be tested by driving a browser, and the rules are where it
 * goes wrong: a bold applied to " word " that CommonMark refuses to read as
 * bold, a list applied twice that nests a marker inside a marker, a heading
 * that stacks `## ### `. Each control here answers the new value and where
 * the selection lands, and the component only applies the answer.
 *
 * EVERY CONTROL IS A TOGGLE. Pressed on text that already carries its format,
 * it takes the format off, which is what a writer expects of a bar and what
 * keeps a second press from writing `****word****`.
 */

/** The formats the bar offers, in the order it draws them. */
export const MARKDOWN_FORMATS = [
  'heading2',
  'heading3',
  'bold',
  'italic',
  'code',
  'bulletList',
  'numberedList',
  'checklist',
  'table',
] as const;

export type MarkdownFormat = (typeof MARKDOWN_FORMATS)[number];

/** A selection in the source, as the textarea reports it. `start === end` is a caret. */
export interface MarkdownSelection {
  start: number;
  end: number;
}

/** What a control answers: the new source, and the selection to leave in it. */
export interface MarkdownEdit {
  value: string;
  selection: MarkdownSelection;
}

/**
 * The markers an inline format wraps text in. Italic is the underscore rather
 * than a single asterisk, so a bold run and an italic one never share a
 * marker a reader has to count.
 */
const WRAP: Record<'bold' | 'italic' | 'code', string> = { bold: '**', italic: '_', code: '`' };

/** A line's own marker, whichever block format put it there. */
const LINE_MARKER = /^(#{1,6} |- \[[ xX]\] |[-*+] |\d+[.)] )/;

/** Replaces the selection with `text` and leaves the caret after it. */
export function insertMarkdown(value: string, { start, end }: MarkdownSelection, text: string): MarkdownEdit {
  const next = value.slice(0, start) + text + value.slice(end);
  const caret = start + text.length;
  return { value: next, selection: { start: caret, end: caret } };
}

/** The format applied to the selection, or taken off it when it is already there. */
export function formatMarkdown(value: string, selection: MarkdownSelection, format: MarkdownFormat): MarkdownEdit {
  switch (format) {
    case 'bold':
    case 'italic':
    case 'code':
      return wrap(value, selection, WRAP[format]);
    case 'heading2':
      return prefixLines(value, selection, () => '## ', (marker) => marker === '## ');
    case 'heading3':
      return prefixLines(value, selection, () => '### ', (marker) => marker === '### ');
    case 'bulletList':
      return prefixLines(value, selection, () => '- ', (marker) => /^[-*+] $/.test(marker));
    case 'numberedList':
      return prefixLines(value, selection, (index) => `${index + 1}. `, (marker) => /^\d+[.)] $/.test(marker));
    case 'checklist':
      return prefixLines(value, selection, () => '- [ ] ', (marker) => /^- \[[ xX]\] $/.test(marker));
    case 'table':
      return table(value, selection);
  }
}

/**
 * Wraps the selection in `marker`, or unwraps it.
 *
 * THE SELECTION IS TRIMMED FIRST. CommonMark reads `** word **` as four
 * asterisks and a word, because a run may not open or close against a space,
 * so a double-click that took the space after a word would otherwise write
 * bold nobody sees.
 */
function wrap(value: string, selection: MarkdownSelection, marker: string): MarkdownEdit {
  let { start, end } = selection;
  while (start < end && /\s/.test(value[start] ?? '')) start += 1;
  while (end > start && /\s/.test(value[end - 1] ?? '')) end -= 1;
  const size = marker.length;

  // Already wrapped around the selection: take the markers off.
  if (value.slice(start - size, start) === marker && value.slice(end, end + size) === marker) {
    return {
      value: value.slice(0, start - size) + value.slice(start, end) + value.slice(end + size),
      selection: { start: start - size, end: end - size },
    };
  }
  // The markers are inside the selection: the same, from the other side.
  const selected = value.slice(start, end);
  if (selected.length >= size * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(size, selected.length - size);
    return { value: value.slice(0, start) + inner + value.slice(end), selection: { start, end: start + inner.length } };
  }
  return {
    value: value.slice(0, start) + marker + selected + marker + value.slice(end),
    selection: { start: start + size, end: end + size },
  };
}

/** The whole lines a selection touches, as `[from, to)` offsets. */
function lineSpan(value: string, { start, end }: MarkdownSelection): [number, number] {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  // A selection that ends just after a newline does not take the line below.
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const newline = value.indexOf('\n', last);
  return [from, newline === -1 ? value.length : newline];
}

/**
 * Gives every line the selection touches the marker `marker(index)` asks for,
 * or takes it off when every one of them already has the kind `has` names.
 *
 * A line's old marker is REPLACED rather than kept: a bullet turned into a
 * numbered item is `1. item`, never `1. - item`. A blank line inside a longer
 * selection is left alone, because a marker on it is an empty item the
 * writer never asked for; a caret on a blank line marks it, because that is
 * where the next item is about to be written.
 */
function prefixLines(
  value: string,
  selection: MarkdownSelection,
  marker: (index: number) => string,
  has: (existing: string) => boolean,
): MarkdownEdit {
  const [from, to] = lineSpan(value, selection);
  const lines = value.slice(from, to).split('\n');
  const single = lines.length === 1;
  const written = lines.filter((line) => single || line.trim() !== '');
  const off = written.length > 0 && written.every((line) => has(LINE_MARKER.exec(line)?.[0] ?? ''));

  let index = 0;
  let caretShift = 0;
  const caretLine = value.slice(from, selection.start).split('\n').length - 1;
  const next = lines.map((line, at) => {
    if (!single && line.trim() === '') return line;
    const old = LINE_MARKER.exec(line)?.[0] ?? '';
    const body = line.slice(old.length);
    const added = off ? '' : marker(index);
    index += 1;
    if (at === caretLine) caretShift = added.length - old.length;
    return added + body;
  });
  const block = next.join('\n');
  const result = value.slice(0, from) + block + value.slice(to);
  if (selection.start === selection.end) {
    const caret = Math.max(from, selection.start + caretShift);
    return { value: result, selection: { start: caret, end: caret } };
  }
  return { value: result, selection: { start: from, end: from + block.length } };
}

/** The table the bar inserts: a header, its rule and one empty row. */
const TABLE = '| Column | Column |\n| --- | --- |\n|  |  |';

/**
 * Inserts a two-column table at the caret, on lines of its own with a blank
 * line either side, because a table glued to a paragraph is read as part of
 * the paragraph. The first header cell is left selected, ready to be named.
 */
function table(value: string, { start, end }: MarkdownSelection): MarkdownEdit {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = after === '' ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  const at = before.length + lead.length + 2;
  return {
    value: before + lead + TABLE + trail + after,
    selection: { start: at, end: at + 'Column'.length },
  };
}

/** How many words a body holds, counted the way a writer would. */
export function markdownWords(value: string): number {
  return (value.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}
