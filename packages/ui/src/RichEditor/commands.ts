/**
 * What the editor can do to a document, as ProseMirror commands: each takes a
 * state and, given a dispatch, applies itself, and without one answers
 * whether it could. The slash menu, the selection toolbar, the shortcuts and
 * the table bar all call these, so a block is made one way whichever of them
 * made it.
 */

import { setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { Fragment, type Mark, type MarkType, type Node as PMNode } from 'prosemirror-model';
import { liftListItem, splitListItem, wrapInList } from 'prosemirror-schema-list';
import { NodeSelection, Selection, TextSelection, type Command, type EditorState, type Transaction } from 'prosemirror-state';
import type { MarkdownAlign, MarkdownCalloutTone } from '../Markdown/index.js';
import { schema } from './schema.js';

const N = schema.nodes;
const M = schema.marks;

// --- what is on ---------------------------------------------------------------

/** Whether a mark is on across the selection, or stored for the next keystroke. */
export function markActive(state: EditorState, type: MarkType): boolean {
  const { from, $from, to, empty } = state.selection;
  if (empty) return Boolean(type.isInSet(state.storedMarks ?? $from.marks()));
  return state.doc.rangeHasMark(from, to, type);
}

/** The heading level the selection sits in, or 0 for any other block. */
export function headingLevel(state: EditorState): number {
  const parent = state.selection.$from.parent;
  return parent.type === N.heading ? (parent.attrs.level as number) : 0;
}

/** Whether the selection is inside a code block, where no formatting applies. */
export function inCode(state: EditorState): boolean {
  return Boolean(state.selection.$from.parent.type.spec.code);
}

// --- marks ----------------------------------------------------------------------

export const toggleStrong: Command = toggleMark(M.strong!);
export const toggleEm: Command = toggleMark(M.em!);
export const toggleStrike: Command = toggleMark(M.strike!);
export const toggleCode: Command = toggleMark(M.code!);

/** The link the selection is on: its whole range, and the mark. */
export function linkAt(state: EditorState): { from: number; to: number; mark: Mark } | null {
  const { $from, from, to, empty } = state.selection;
  const parent = $from.parent;
  if (!parent.inlineContent) return null;
  // The runs of the parent's children that carry one link mark each.
  const runs: { from: number; to: number; mark: Mark }[] = [];
  let pos = $from.start();
  let run: { from: number; to: number; mark: Mark } | null = null;
  parent.forEach((child) => {
    const mark = M.link!.isInSet(child.marks);
    const end = pos + child.nodeSize;
    if (mark && run && run.mark.eq(mark)) {
      run.to = end;
    } else {
      run = mark ? { from: pos, to: end, mark } : null;
      if (run) runs.push(run);
    }
    pos = end;
  });
  // A caret right before a link is not on it (a link does not grow at its
  // start), and one right after it is, which is where typing the link left it.
  return runs.find((r) => (empty ? from > r.from && from <= r.to : from >= r.from && to <= r.to)) ?? null;
}

/**
 * Link the selection to `href`, or the link the caret is on; with nothing
 * selected and no link under the caret, insert `text` linked.
 */
export function setLink(href: string, text?: string): Command {
  return (state, dispatch) => {
    if (inCode(state)) return false;
    if (!dispatch) return true;
    const mark = M.link!.create({ href });
    const at = linkAt(state);
    const { from, to, empty } = state.selection;
    const tr = state.tr;
    if (!empty) {
      tr.removeMark(from, to, M.link!).addMark(from, to, mark);
    } else if (at) {
      tr.removeMark(at.from, at.to, M.link!).addMark(at.from, at.to, mark);
    } else {
      const words = text?.trim() || href;
      tr.insert(from, schema.text(words, [mark, ...state.selection.$from.marks().filter((m) => m.type !== M.link)]));
      tr.setSelection(TextSelection.create(tr.doc, from + words.length));
      tr.removeStoredMark(M.link!);
    }
    dispatch(tr.scrollIntoView());
    return true;
  };
}

/** Remove the link under the caret or across the selection. */
export const removeLink: Command = (state, dispatch) => {
  const at = linkAt(state);
  const { from, to, empty } = state.selection;
  if (!at && (empty || !state.doc.rangeHasMark(from, to, M.link!))) return false;
  if (dispatch) {
    const tr = state.tr;
    if (at) tr.removeMark(at.from, at.to, M.link!);
    if (!empty) tr.removeMark(from, to, M.link!);
    dispatch(tr);
  }
  return true;
};

// --- blocks ---------------------------------------------------------------------

/** A heading of `level`, or back to a paragraph when the block already is one. */
export function toggleHeading(level: number): Command {
  return (state, dispatch) =>
    headingLevel(state) === level
      ? setBlockType(N.paragraph!)(state, dispatch)
      : setBlockType(N.heading!, { level })(state, dispatch);
}

export const setParagraph: Command = setBlockType(N.paragraph!);

export function setCodeBlock(lang = ''): Command {
  return setBlockType(N.code_block!, { lang, fence: '```' });
}

export const wrapQuote: Command = wrapIn(N.blockquote!);

export function wrapCallout(tone: MarkdownCalloutTone = 'note'): Command {
  return wrapIn(N.callout!, { tone });
}

export type ListKind = 'bullet' | 'ordered' | 'task';

/** The list the selection's block is directly in, and where. */
function listAround(state: EditorState): { node: PMNode; pos: number; depth: number } | null {
  const { $from } = state.selection;
  for (let d = $from.depth - 1; d > 0; d--) {
    const node = $from.node(d);
    if (node.type === N.list_item) {
      const list = $from.node(d - 1);
      return { node: list, pos: $from.before(d - 1), depth: d - 1 };
    }
  }
  return null;
}

function kindOf(list: PMNode): ListKind {
  if (list.type === N.ordered_list) return 'ordered';
  let task = false;
  list.forEach((item) => {
    if (item.attrs.checked !== null) task = true;
  });
  return task ? 'task' : 'bullet';
}

/** Give every item of the list at `pos` the task state `kind` means. */
function retask(tr: Transaction, pos: number, kind: ListKind): void {
  const list = tr.doc.nodeAt(pos);
  if (!list) return;
  let offset = pos + 1;
  list.forEach((item) => {
    const checked = kind === 'task' ? (item.attrs.checked ?? false) : null;
    if (checked !== item.attrs.checked) tr.setNodeMarkup(offset, undefined, { ...item.attrs, checked });
    offset += item.nodeSize;
  });
}

/**
 * Make the selection a list of `kind`. In a list of that kind already, the
 * items come out of it; in a list of another kind, the list changes kind.
 */
export function setList(kind: ListKind): Command {
  return (state, dispatch) => {
    const around = listAround(state);
    if (around) {
      if (kindOf(around.node) === kind) return liftListItem(N.list_item!)(state, dispatch);
      if (dispatch) {
        const type = kind === 'ordered' ? N.ordered_list! : N.bullet_list!;
        const tr = state.tr.setNodeMarkup(around.pos, type, type === around.node.type ? around.node.attrs : null);
        retask(tr, around.pos, kind);
        dispatch(tr);
      }
      return true;
    }
    const type = kind === 'ordered' ? N.ordered_list! : N.bullet_list!;
    let wrapped: Transaction | null = null;
    if (!wrapInList(type)(state, (tr) => (wrapped = tr))) return false;
    if (dispatch && wrapped) {
      const tr: Transaction = wrapped;
      if (kind === 'task') {
        const $pos = tr.selection.$from;
        for (let d = $pos.depth; d > 0; d--) {
          if ($pos.node(d).type === type) {
            retask(tr, $pos.before(d), 'task');
            break;
          }
        }
      }
      dispatch(tr);
    }
    return true;
  };
}

/** Enter in a list item: a new item, a task when this one is a task. */
export const splitItem: Command = (state, dispatch) => {
  const { $from } = state.selection;
  if ($from.depth < 2 || $from.node(-1).type !== N.list_item) return false;
  const checked = $from.node(-1).attrs.checked;
  return splitListItem(N.list_item!, checked === null ? undefined : { checked: false })(state, dispatch);
};

/** Tick or untick the task item at `pos`. */
export function toggleTask(pos: number): Command {
  return (state, dispatch) => {
    const item = state.doc.nodeAt(pos);
    if (!item || item.type !== N.list_item || item.attrs.checked === null) return false;
    if (dispatch) dispatch(state.tr.setNodeMarkup(pos, undefined, { ...item.attrs, checked: !item.attrs.checked }));
    return true;
  };
}

/**
 * Put a block where the caret is: in place of the empty paragraph the caret
 * is in (which is where a slash command leaves it), or after the caret's
 * block. A paragraph follows a block nobody types into, so the caret always
 * has somewhere to go.
 */
function insertBlock(node: PMNode, caret: 'inside' | 'after'): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    if ($from.parent.type.spec.code) return false;
    const depth = $from.depth;
    const empty = $from.parent.type === N.paragraph && $from.parent.childCount === 0;
    const from = empty ? $from.before(depth) : $from.after(depth);
    const to = empty ? $from.after(depth) : from;
    const container = $from.node(depth - 1);
    const index = empty ? $from.index(depth - 1) : $from.indexAfter(depth - 1);
    const end = empty ? index + 1 : index;
    const nodes = end >= container.childCount ? [node, N.paragraph!.create()] : [node];
    if (!container.canReplace(index, end, Fragment.from(nodes))) return false;
    if (dispatch) {
      const tr = state.tr.replaceWith(from, to, nodes);
      const target = caret === 'inside' ? from + 1 : from + node.nodeSize;
      tr.setSelection(Selection.near(tr.doc.resolve(Math.min(target, tr.doc.content.size)), 1));
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

export const insertRule: Command = insertBlock(N.horizontal_rule!.create(), 'after');

export function insertImage(src: string, alt: string): Command {
  return (state, dispatch) => {
    if (inCode(state)) return false;
    const image = N.image!.create({ src, alt });
    if (dispatch) dispatch(state.tr.replaceSelectionWith(image, false).scrollIntoView());
    return true;
  };
}

// --- tables -----------------------------------------------------------------------

/** The table the caret is in, and the cell. */
export interface TableAt {
  table: PMNode;
  pos: number;
  row: number;
  col: number;
}

export function tableAt(state: EditorState): TableAt | null {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === N.table) {
      if ($from.depth < d + 2) return null;
      return { table: $from.node(d), pos: $from.before(d), row: $from.index(d), col: $from.index(d + 1) };
    }
  }
  return null;
}

interface Grid {
  cells: Fragment[][];
  align: MarkdownAlign[];
}

function gridOf(table: PMNode): Grid {
  const cells: Fragment[][] = [];
  const align: MarkdownAlign[] = [];
  let width = 0;
  table.forEach((row, _o, r) => {
    const line: Fragment[] = [];
    row.forEach((cell, _co, c) => {
      line.push(cell.content);
      if (r === 0) align[c] = cell.attrs.align as MarkdownAlign;
    });
    width = Math.max(width, line.length);
    cells.push(line);
  });
  for (const line of cells) while (line.length < width) line.push(Fragment.empty);
  for (let c = 0; c < width; c++) align[c] ??= 'left';
  return { cells, align };
}

/** A table from a grid: the first row is the header, as Markdown's is. */
function tableOf(grid: Grid): PMNode {
  return N.table!.create(
    null,
    grid.cells.map((line, r) =>
      N.table_row!.create(
        null,
        line.map((content, c) => (r === 0 ? N.table_header! : N.table_cell!).create({ align: grid.align[c] ?? 'left' }, content)),
      ),
    ),
  );
}

function rebuild(state: EditorState, at: TableAt, grid: Grid, row: number, col: number): Transaction {
  const table = tableOf(grid);
  const tr = state.tr.replaceWith(at.pos, at.pos + at.table.nodeSize, table);
  let pos = at.pos + 1;
  table.forEach((r, _o, ri) => {
    if (ri < row) pos += r.nodeSize;
  });
  pos += 1;
  const target = table.child(Math.min(row, table.childCount - 1));
  target.forEach((cell, _o, ci) => {
    if (ci < col) pos += cell.nodeSize;
  });
  tr.setSelection(TextSelection.create(tr.doc, pos + 1));
  return tr.scrollIntoView();
}

/** A table of `rows` by `cols`, header included, with the caret in its first cell. */
export function insertTable(rows = 3, cols = 3): Command {
  const grid: Grid = {
    cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => Fragment.empty)),
    align: Array.from({ length: cols }, () => 'left' as const),
  };
  return insertBlock(tableOf(grid), 'inside');
}

type TableEdit = (grid: Grid, at: TableAt) => { row: number; col: number } | 'delete';

function tableCommand(edit: TableEdit): Command {
  return (state, dispatch) => {
    const at = tableAt(state);
    if (!at) return false;
    if (!dispatch) return true;
    const grid = gridOf(at.table);
    const result = edit(grid, at);
    if (result === 'delete') {
      const tr = state.tr.delete(at.pos, at.pos + at.table.nodeSize);
      if (tr.doc.childCount === 0) tr.insert(0, N.paragraph!.create());
      tr.setSelection(Selection.near(tr.doc.resolve(Math.min(at.pos, tr.doc.content.size)), -1));
      dispatch(tr.scrollIntoView());
      return true;
    }
    dispatch(rebuild(state, at, grid, result.row, result.col));
    return true;
  };
}

const blankRow = (grid: Grid) => grid.align.map(() => Fragment.empty);

export const addRowBefore = tableCommand((grid, at) => {
  grid.cells.splice(at.row, 0, blankRow(grid));
  return { row: at.row, col: at.col };
});

export const addRowAfter = tableCommand((grid, at) => {
  grid.cells.splice(at.row + 1, 0, blankRow(grid));
  return { row: at.row + 1, col: at.col };
});

export const addColumnBefore = tableCommand((grid, at) => {
  for (const line of grid.cells) line.splice(at.col, 0, Fragment.empty);
  grid.align.splice(at.col, 0, 'left');
  return { row: at.row, col: at.col };
});

export const addColumnAfter = tableCommand((grid, at) => {
  for (const line of grid.cells) line.splice(at.col + 1, 0, Fragment.empty);
  grid.align.splice(at.col + 1, 0, 'left');
  return { row: at.row, col: at.col + 1 };
});

export const deleteRow = tableCommand((grid, at) => {
  if (grid.cells.length <= 1) return 'delete';
  grid.cells.splice(at.row, 1);
  return { row: Math.min(at.row, grid.cells.length - 1), col: at.col };
});

export const deleteColumn = tableCommand((grid, at) => {
  if (grid.align.length <= 1) return 'delete';
  for (const line of grid.cells) line.splice(at.col, 1);
  grid.align.splice(at.col, 1);
  return { row: at.row, col: Math.min(at.col, grid.align.length - 1) };
});

export const deleteTable = tableCommand(() => 'delete');

export function alignColumn(align: MarkdownAlign): Command {
  return tableCommand((grid, at) => {
    grid.align[at.col] = align;
    return { row: at.row, col: at.col };
  });
}

/** The alignment of the column the caret is in. */
export function columnAlign(state: EditorState): MarkdownAlign | null {
  const at = tableAt(state);
  if (!at) return null;
  return gridOf(at.table).align[at.col] ?? 'left';
}

/**
 * Tab and Shift-Tab between cells, and Enter to the cell below: past the last
 * cell (or the last row, for Enter) a row is added, as a spreadsheet does.
 */
export function moveCell(direction: 'next' | 'previous' | 'down'): Command {
  return (state, dispatch) => {
    const at = tableAt(state);
    if (!at) return false;
    const rows = at.table.childCount;
    const cols = at.table.child(at.row).childCount;
    let row = at.row;
    let col = at.col;
    if (direction === 'next') {
      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
    } else if (direction === 'previous') {
      col--;
      if (col < 0) {
        row--;
        col = row >= 0 ? at.table.child(row).childCount - 1 : 0;
      }
      if (row < 0) return true;
    } else {
      row++;
    }
    if (!dispatch) return true;
    if (row >= rows) {
      const grid = gridOf(at.table);
      grid.cells.push(blankRow(grid));
      dispatch(rebuild(state, at, grid, row, direction === 'down' ? at.col : 0));
      return true;
    }
    let pos = at.pos + 1;
    at.table.forEach((r, _o, ri) => {
      if (ri < row) pos += r.nodeSize;
    });
    pos += 1;
    at.table.child(row).forEach((cell, _o, ci) => {
      if (ci < col) pos += cell.nodeSize;
    });
    const cell = at.table.child(row).child(Math.min(col, at.table.child(row).childCount - 1));
    // Tab selects the cell's text, as a spreadsheet does, so typing replaces it.
    const tr = state.tr.setSelection(
      direction === 'down'
        ? TextSelection.create(state.doc, pos + 1)
        : TextSelection.create(state.doc, pos + 1, pos + 1 + cell.content.size),
    );
    dispatch(tr.scrollIntoView());
    return true;
  };
}

// --- code -------------------------------------------------------------------------

/**
 * Enter on the third blank line at the end of a code block leaves it: the
 * two blank lines go, and a paragraph opens after the block.
 */
export const exitCodeOnBlankLines: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.type.spec.code || $from.parentOffset !== $from.parent.content.size) return false;
  const text = $from.parent.textContent;
  if (!text.endsWith('\n\n')) return false;
  if (dispatch) {
    const end = $from.pos;
    const tr = state.tr.delete(end - 2, end);
    const after = tr.mapping.map($from.after());
    tr.insert(after, N.paragraph!.create());
    tr.setSelection(TextSelection.create(tr.doc, after + 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/** Enter after ```` ```lang ```` in a paragraph opens a code block in that language. */
export const fenceToCode: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== N.paragraph || $from.parentOffset !== $from.parent.content.size) return false;
  const m = /^```([A-Za-z0-9_+-]*)$/.exec($from.parent.textContent);
  if (!m) return false;
  if (dispatch) {
    const start = $from.start();
    const tr = state.tr.delete(start, $from.pos).setBlockType(start, start, N.code_block!, { lang: m[1] ?? '', fence: '```' });
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/** Select a whole node: an image the writer clicked, a rule. */
export function selectNode(pos: number): Command {
  return (state, dispatch) => {
    if (dispatch) dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
    return true;
  };
}

export function setCalloutTone(pos: number, tone: MarkdownCalloutTone): Command {
  return (state, dispatch) => {
    const node = state.doc.nodeAt(pos);
    if (!node || node.type !== N.callout) return false;
    if (dispatch) dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, tone }));
    return true;
  };
}

export function setCodeLanguage(pos: number, lang: string): Command {
  return (state, dispatch) => {
    const node = state.doc.nodeAt(pos);
    if (!node || node.type !== N.code_block) return false;
    if (dispatch) dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, lang: lang.replace(/[^A-Za-z0-9_+-]/g, '') }));
    return true;
  };
}

/** Take the callout or quote at `pos` away, keeping what it holds. */
export function unwrapAt(pos: number): Command {
  return (state, dispatch) => {
    const node = state.doc.nodeAt(pos);
    if (!node || (node.type !== N.callout && node.type !== N.blockquote)) return false;
    if (dispatch) {
      const tr = state.tr.replaceWith(pos, pos + node.nodeSize, node.content);
      tr.setSelection(Selection.near(tr.doc.resolve(Math.min(pos + 1, tr.doc.content.size))));
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}
