/**
 * The keyboard: Markdown typed as Markdown becomes the block or the format it
 * spells (`# `, `- `, `1. `, `[ ] `, `> `, ```` ``` ````, `---`, `**bold**`),
 * and the shortcuts every editor shares.
 *
 * AN INPUT RULE IS UNDONE BY BACKSPACE: a writer who meant a literal `# ` or
 * `**` presses it once right after, and has the characters they typed.
 */

import { baseKeymap, chainCommands, exitCode, setBlockType } from 'prosemirror-commands';
import { redo, undo } from 'prosemirror-history';
import { InputRule, inputRules, textblockTypeInputRule, undoInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import { findWrapping } from 'prosemirror-transform';
import type { MarkType } from 'prosemirror-model';
import { TextSelection, type Command, type Plugin } from 'prosemirror-state';
import { liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { safeHref } from '../Markdown/index.js';
import {
  exitCodeOnBlankLines,
  fenceToCode,
  moveCell,
  setList,
  setParagraph,
  splitItem,
  tableAt,
  toggleCode,
  toggleEm,
  toggleHeading,
  toggleStrike,
  toggleStrong,
} from './commands.js';
import { schema } from './schema.js';

const N = schema.nodes;
const M = schema.marks;

/**
 * A span typed between its delimiters: the delimiters go and the mark takes
 * what was between them. `lead` is the one character the pattern matched
 * before the opening delimiter (start, space or punctuation), which stays.
 */
function markRule(pattern: RegExp, type: MarkType, delimiter: number, attrs?: Record<string, unknown>): InputRule {
  return new InputRule(pattern, (state, match, start, end) => {
    const whole = match[1] ?? '';
    const inner = match[2] ?? '';
    const from = start + (match[0].length - whole.length);
    const innerFrom = from + delimiter;
    const innerTo = innerFrom + inner.length;
    const tr = state.tr;
    // The closing delimiter's last character was never inserted (the rule
    // runs on it), so what is in the document is `end - innerTo` of it.
    tr.delete(innerTo, end);
    tr.delete(from, innerFrom);
    tr.addMark(from, from + inner.length, type.create(attrs));
    tr.removeStoredMark(type);
    return tr;
  });
}

/** `[ ] ` or `[x] ` at the start of a line or of a list item: a task. */
const taskRule = new InputRule(/^\[( |x|X)?\]\s$/, (state, match, start, end) => {
  const checked = (match[1] ?? ' ').toLowerCase() === 'x';
  const tr = state.tr.delete(start, end);
  const $start = tr.doc.resolve(start);
  const item = $start.depth >= 2 ? $start.node(-1) : null;
  if (item && item.type === N.list_item && $start.index(-1) === 0) {
    return tr.setNodeMarkup($start.before(-1), undefined, { ...item.attrs, checked });
  }
  const range = $start.blockRange();
  const wrapping = range && findWrapping(range, N.bullet_list!);
  if (!range || !wrapping) return null;
  tr.wrap(range, wrapping);
  const $inner = tr.doc.resolve(tr.mapping.map(start));
  for (let d = $inner.depth; d > 0; d--) {
    if ($inner.node(d).type === N.list_item) {
      tr.setNodeMarkup($inner.before(d), undefined, { checked });
      break;
    }
  }
  return tr;
});

/** `---`, `***` or `___` alone on a line: a divider, with the caret after it. */
const ruleRule = new InputRule(/^(?:---|\*\*\*|___)$/, (state, _match, start, end) => {
  const $start = state.doc.resolve(start);
  if ($start.parent.type !== N.paragraph || $start.parent.content.size !== end - start) return null;
  const from = $start.before();
  const to = $start.after();
  const tr = state.tr.replaceWith(from, to, [N.horizontal_rule!.create(), N.paragraph!.create()]);
  return tr.setSelection(TextSelection.create(tr.doc, from + 2));
});

/** `[text](address)` typed out: a link, when its address is one a reader may follow. */
const linkRule = new InputRule(/(?:^|[^!])(\[([^\]]+)\]\(([^)\s]+)\))$/, (state, match, start, end) => {
  const whole = match[1] ?? '';
  const text = match[2] ?? '';
  const href = safeHref(match[3] ?? '');
  if (!href) return null;
  const from = start + (match[0].length - whole.length);
  return state.tr.replaceWith(from, end, schema.text(text, [M.link!.create({ href })]));
});

export function buildInputRules(): Plugin {
  return inputRules({
    rules: [
      textblockTypeInputRule(/^(#{1,6})\s$/, N.heading!, (m) => ({ level: (m[1] ?? '#').length })),
      taskRule,
      wrappingInputRule(/^\s*([-+*])\s$/, N.bullet_list!, (m) => ({ marker: m[1] })),
      wrappingInputRule(
        /^(\d{1,9})([.)])\s$/,
        N.ordered_list!,
        (m) => ({ start: Number(m[1]), marker: m[2] }),
        (m, node) => node.childCount + (node.attrs.start as number) === Number(m[1]),
      ),
      wrappingInputRule(/^\s*>\s$/, N.blockquote!),
      textblockTypeInputRule(/^```([A-Za-z0-9_+-]*)\s$/, N.code_block!, (m) => ({ lang: m[1] ?? '', fence: '```' })),
      ruleRule,
      linkRule,
      markRule(/(?:^|[^*\w])(\*\*([^*\s](?:[^*]*[^*\s])?)\*\*)$/, M.strong!, 2, { marker: '**' }),
      markRule(/(?:^|[^_\p{L}\p{N}])(__([^_\s](?:[^_]*[^_\s])?)__)$/u, M.strong!, 2, { marker: '__' }),
      markRule(/(?:^|[^*\w])(\*([^*\s](?:[^*]*[^*\s])?)\*)$/, M.em!, 1, { marker: '*' }),
      markRule(/(?:^|[^_\p{L}\p{N}])(_([^_\s](?:[^_]*[^_\s])?)_)$/u, M.em!, 1, { marker: '_' }),
      markRule(/(?:^|[^~])(~~([^~\s](?:[^~]*[^~\s])?)~~)$/, M.strike!, 2),
      markRule(/(?:^|[^`])(`([^`]+)`)$/, M.code!, 1),
    ],
  });
}

/** Shift-Enter: a line break, or out of a code block. A table cell holds one line. */
const softBreak: Command = (state, dispatch) => {
  if (tableAt(state)) return true;
  if (state.selection.$from.parent.type === N.heading) return false;
  if (exitCode(state, dispatch)) return true;
  if (dispatch) dispatch(state.tr.replaceSelectionWith(N.hard_break!.create()).scrollIntoView());
  return true;
};

/** Tab in a code block indents the line by two spaces; Shift-Tab takes them back. */
const indentCode: Command = (state, dispatch) => {
  if (!state.selection.$from.parent.type.spec.code) return false;
  if (dispatch) dispatch(state.tr.insertText('  ').scrollIntoView());
  return true;
};

const outdentCode: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!$from.parent.type.spec.code || !empty) return false;
  const text = $from.parent.textContent;
  const lineStart = text.lastIndexOf('\n', $from.parentOffset - 1) + 1;
  const spaces = /^ {1,2}/.exec(text.slice(lineStart))?.[0].length ?? 0;
  if (spaces > 0 && dispatch) dispatch(state.tr.delete($from.start() + lineStart, $from.start() + lineStart + spaces));
  return true;
};

export interface KeyHooks {
  submit: () => boolean;
  link: () => boolean;
  toolbar: () => boolean;
}

export function buildKeymap(hooks: KeyHooks): Plugin[] {
  const keys: Record<string, Command> = {
    'Mod-z': undo,
    'Shift-Mod-z': redo,
    'Mod-y': redo,
    Backspace: undoInputRule,
    'Mod-b': toggleStrong,
    'Mod-i': toggleEm,
    'Mod-e': toggleCode,
    'Mod-Shift-s': toggleStrike,
    'Mod-Shift-x': toggleStrike,
    'Mod-k': () => hooks.link(),
    'Mod-Alt-0': setParagraph,
    'Mod-Shift-7': setList('ordered'),
    'Mod-Shift-8': setList('bullet'),
    'Mod-Shift-9': setList('task'),
    'Mod-Enter': () => hooks.submit(),
    'Shift-Enter': softBreak,
    Enter: chainCommands(moveCell('down'), fenceToCode, exitCodeOnBlankLines, splitItem),
    Tab: chainCommands(moveCell('next'), sinkListItem(N.list_item!), indentCode),
    'Shift-Tab': chainCommands(moveCell('previous'), liftListItem(N.list_item!), outdentCode),
    'Alt-F10': () => hooks.toolbar(),
  };
  for (let level = 1; level <= 6; level++) {
    keys[`Mod-Alt-${level}`] = level <= 3 ? toggleHeading(level) : setBlockType(N.heading!, { level });
  }
  return [keymap(keys), keymap(baseKeymap)];
}
