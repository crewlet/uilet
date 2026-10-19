/**
 * The editor's plugins: the slash trigger, the placeholder, and the clipboard.
 */

import { Fragment, Slice, type Node as PMNode } from 'prosemirror-model';
import { Plugin, PluginKey, TextSelection, type EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import { safeHref } from '../Markdown/index.js';
import { writeMarkdown } from './codec.js';
import { htmlSlice, looksLikeMarkdown, markdownSlice, richHtml, textSlice } from './paste.js';
import { schema } from './schema.js';

// --- slash ------------------------------------------------------------------------

/** Where the slash the writer typed is, and what they have typed after it. */
export interface SlashState {
  open: boolean;
  /** The position of the `/`. */
  from: number;
  query: string;
}

export const slashKey = new PluginKey<SlashState>('crewlet-slash');

const CLOSED: SlashState = { open: false, from: 0, query: '' };

/**
 * The slash trigger: a `/` typed at the start of a line or after a space
 * opens the block menu, and the menu follows what is typed after it until
 * the caret leaves, a space ends the word, or Escape closes it.
 *
 * ONLY A TYPED SLASH OPENS IT. A caret moved into an address that holds one
 * (`https://…`) is not asking for a block.
 */
export function slashPlugin(keys: { current: ((event: KeyboardEvent) => boolean) | null }): Plugin<SlashState> {
  return new Plugin<SlashState>({
    key: slashKey,
    state: {
      init: () => CLOSED,
      apply(tr, prev, _old, state) {
        const meta = tr.getMeta(slashKey) as { open: boolean; from?: number } | undefined;
        if (meta) return meta.open ? read(state, meta.from ?? 0) : CLOSED;
        if (!prev.open) return prev;
        return read(state, tr.mapping.map(prev.from));
      },
    },
    props: {
      handleTextInput(view, from, to, text) {
        if (text !== '/' || from !== to) return false;
        const $from = view.state.doc.resolve(from);
        if (!$from.parent.isTextblock || $from.parent.type.spec.code) return false;
        const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
        if (before !== '' && !/\s$/.test(before)) return false;
        view.dispatch(view.state.tr.insertText('/', from, to).setMeta(slashKey, { open: true, from }));
        return true;
      },
      handleKeyDown(_view, event) {
        return keys.current?.(event) ?? false;
      },
      decorations(state) {
        const slash = slashKey.getState(state);
        if (!slash?.open) return null;
        const to = slash.from + 1 + slash.query.length;
        return DecorationSet.create(state.doc, [Decoration.inline(slash.from, to, { class: 'crewlet-rich-editor__slash' })]);
      },
    },
  });
}

function read(state: EditorState, from: number): SlashState {
  const { selection } = state;
  if (!(selection instanceof TextSelection) || !selection.empty) return CLOSED;
  const cursor = selection.from;
  if (cursor <= from || from < 0 || from >= state.doc.content.size) return CLOSED;
  const $from = state.doc.resolve(from);
  const $cursor = selection.$from;
  if ($from.parent !== $cursor.parent) return CLOSED;
  const typed = state.doc.textBetween(from, cursor, '\n', '￼');
  if (!typed.startsWith('/') || /\s/.test(typed) || typed.length > 32) return CLOSED;
  return { open: true, from, query: typed.slice(1) };
}

// --- placeholder ------------------------------------------------------------------

export const focusKey = new PluginKey<boolean>('crewlet-focus');

/** Whether the editor has focus, kept as state so a decoration can follow it. */
export const focusPlugin = new Plugin<boolean>({
  key: focusKey,
  state: {
    init: () => false,
    apply: (tr, prev) => (tr.getMeta(focusKey) as boolean | undefined) ?? prev,
  },
  props: {
    handleDOMEvents: {
      focus(view) {
        if (!focusKey.getState(view.state)) view.dispatch(view.state.tr.setMeta(focusKey, true));
        return false;
      },
      blur(view) {
        if (focusKey.getState(view.state)) view.dispatch(view.state.tr.setMeta(focusKey, false));
        return false;
      },
    },
  },
});

/**
 * The words an empty editor shows, and the hint an empty line shows while the
 * caret is on it. Both are a decoration's attribute drawn by the stylesheet,
 * never text in the document, so neither can be saved.
 */
export function placeholderPlugin(text: () => { empty: string; line: string }): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        const doc = state.doc;
        const words = text();
        if (doc.childCount === 1 && doc.firstChild!.isTextblock && doc.firstChild!.content.size === 0) {
          return DecorationSet.create(doc, [
            Decoration.node(0, doc.firstChild!.nodeSize, { class: 'is-empty', 'data-placeholder': words.empty }),
          ]);
        }
        const { $from, empty } = state.selection;
        if (!empty || !focusKey.getState(state) || slashKey.getState(state)?.open) return null;
        const parent = $from.parent;
        if (parent.type !== schema.nodes.paragraph || parent.content.size > 0) return null;
        const pos = $from.before();
        return DecorationSet.create(doc, [Decoration.node(pos, pos + parent.nodeSize, { class: 'is-empty', 'data-placeholder': words.line })]);
      },
    },
  });
}

// --- clipboard ----------------------------------------------------------------------

/** A slice's content as Markdown, for a paste into anything that reads text. */
export function sliceMarkdown(slice: Slice): string {
  const content = slice.content;
  const first = content.firstChild;
  const blocks = first && first.isInline ? Fragment.from(schema.node('paragraph', null, content)) : content;
  const doc = schema.topNodeType.createAndFill(null, blocks);
  return doc ? writeMarkdown(doc) : '';
}

/**
 * The last thing copied from this page, so pasting it back keeps exactly what
 * was copied (its open structure included) rather than what reading its HTML
 * back would make of it. Matched by its text, which is what the clipboard
 * still holds if nothing else was copied since.
 */
let lastCopy: { text: string; slice: Slice } | null = null;

function remember(view: EditorView): void {
  const slice = view.state.selection.content();
  lastCopy = { text: sliceMarkdown(slice), slice };
}

/** Insert a slice where the selection is, or link the selection to a pasted address. */
function insert(view: EditorView, slice: Slice, text: string): void {
  const { state } = view;
  const href = text.trim();
  if (!state.selection.empty && !/\s/.test(href) && safeHref(href) && slice.content.childCount <= 1) {
    const mark = schema.marks.link!.create({ href: safeHref(href) });
    view.dispatch(state.tr.addMark(state.selection.from, state.selection.to, mark).scrollIntoView());
    return;
  }
  view.dispatch(state.tr.replaceSelection(slice).scrollIntoView().setMeta('paste', true).setMeta('uiEvent', 'paste'));
}

/** What a clipboard or a drop holds, as a slice for the position it lands at. */
function sliceOf(view: EditorView, data: DataTransfer, at: number, plain: boolean): { slice: Slice; text: string } | null {
  const text = data.getData('text/plain');
  const html = data.getData('text/html');
  const $at = view.state.doc.resolve(at);
  if ($at.parent.type.spec.code) {
    return text ? { slice: new Slice(Fragment.from(schema.text(text.replace(/\r\n?/g, '\n'))), 0, 0), text } : null;
  }
  if (lastCopy && text && text === lastCopy.text && !plain) return { slice: lastCopy.slice, text };
  if (!plain && richHtml(html, [...data.types])) return { slice: htmlSlice(html, $at), text };
  if (!text) return null;
  if (!plain && looksLikeMarkdown(text)) return { slice: markdownSlice(text), text };
  return { slice: textSlice(text), text };
}

/**
 * The clipboard, taken whole: copy writes Markdown as the text a plain field
 * receives, and paste and drop read Markdown, HTML and text through
 * `paste.ts` rather than through ProseMirror's own HTML path, which assigns
 * markup to `innerHTML` and cannot run under Trusted Types.
 */
export function clipboardPlugin(shift: { current: boolean }): Plugin {
  return new Plugin({
    props: {
      clipboardTextSerializer: (slice) => sliceMarkdown(slice),
      handleDOMEvents: {
        keydown(_view, event) {
          shift.current = event.shiftKey;
          return false;
        },
        keyup(_view, event) {
          shift.current = event.shiftKey;
          return false;
        },
        copy(view) {
          remember(view);
          return false;
        },
        cut(view) {
          remember(view);
          return false;
        },
        paste(view, event) {
          const data = event.clipboardData;
          event.preventDefault();
          if (!data || !view.editable) return true;
          // Shift with the paste shortcut pastes plain text, as browsers do.
          const found = sliceOf(view, data, view.state.selection.from, shift.current);
          if (found) insert(view, found.slice, found.text);
          return true;
        },
        drop(view, event) {
          // A drag from inside the editor is ProseMirror's to move: it holds
          // the slice itself and parses nothing.
          if (view.dragging) return false;
          event.preventDefault();
          const data = event.dataTransfer;
          if (!data || !view.editable) return true;
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!at) return true;
          const found = sliceOf(view, data, at.pos, false);
          if (!found) return true;
          const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(at.pos)));
          view.dispatch(tr);
          insert(view, found.slice, found.text);
          return true;
        },
      },
    },
  });
}

/** Whether a document is the single empty paragraph an empty body reads as. */
export function isEmptyDoc(doc: PMNode): boolean {
  return doc.childCount === 1 && doc.firstChild!.type === schema.nodes.paragraph && doc.firstChild!.content.size === 0;
}
