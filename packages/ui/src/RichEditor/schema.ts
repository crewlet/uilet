/**
 * The document model `RichEditor` edits: exactly what the Markdown grammar
 * (`../Markdown`) reads, and nothing it cannot write back.
 *
 * EVERY NODE DRAWS WHAT THE READER SEES. The editor's DOM is the element shape
 * an application's renderer emits for the same block (an `h2` for a `#`
 * heading, a list item whose first child is a checkbox, a table inside a
 * scrolling wrapper), inside `Document`, so the page looks the same while it
 * is edited as when it is read, and one stylesheet sets both.
 *
 * A NODE CARRIES THE SPELLING IT WAS READ WITH (a bullet's character, a
 * fence's marker, emphasis by `*` or `_`), so a block somebody edits is
 * written back in the hand it was written in rather than in the editor's.
 *
 * NO STYLE ATTRIBUTE IS EVER WRITTEN. A strict Content-Security-Policy refuses
 * `style-src 'unsafe-inline'`, which covers a `style` attribute set through
 * `setAttribute`, so a cell's alignment is a data attribute the stylesheet
 * reads.
 */

import { Schema, type DOMOutputSpec, type Mark, type Node as PMNode } from 'prosemirror-model';
import { MARKDOWN_CALLOUT_TONES, type MarkdownAlign, type MarkdownCalloutTone } from '../Markdown/index.js';

/** A heading's element: a body's `#` is an `h2`, because the page's title is its `h1`. */
export function headingTag(level: number): string {
  return `h${Math.min(6, level + 1)}`;
}

function alignOf(value: unknown): MarkdownAlign {
  return value === 'center' || value === 'right' ? value : 'left';
}

function toneOf(value: unknown): MarkdownCalloutTone {
  return MARKDOWN_CALLOUT_TONES.includes(value as MarkdownCalloutTone) ? (value as MarkdownCalloutTone) : 'note';
}

const cell = (tag: 'th' | 'td') => ({
  content: '(text | image)*',
  marks: '_',
  attrs: { align: { default: 'left' } },
  isolating: true,
  parseDOM: [{ tag, getAttrs: (dom: HTMLElement) => ({ align: alignOf(dom.getAttribute('data-align') ?? dom.style.textAlign) }) }],
  toDOM: (node: PMNode): DOMOutputSpec => [tag, { 'data-align': node.attrs.align as string }, 0],
});

export const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block item_first item_rest',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    heading: {
      attrs: { level: { default: 1 } },
      // A heading is one line of Markdown, so it holds no line break.
      content: '(text | image)*',
      group: 'block item_first',
      defining: true,
      // THE ELEMENT IS ONE LEVEL DOWN from the Markdown (a `#` is an `h2`), so
      // the level it was written at travels in `data-level`, and a heading
      // copied out of an editor reads back at the level it had. Pasted from
      // anywhere else, an `h2` is a second level heading.
      parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({
        tag: `h${level}`,
        getAttrs: (dom: HTMLElement) => {
          const written = Number(dom.getAttribute('data-level'));
          return { level: written >= 1 && written <= 6 ? written : level };
        },
      })),
      toDOM: (node) => [headingTag(node.attrs.level as number), { 'data-level': String(node.attrs.level) }, 0],
    },
    code_block: {
      attrs: { lang: { default: '' }, fence: { default: '```' } },
      content: 'text*',
      marks: '',
      group: 'block',
      code: true,
      defining: true,
      parseDOM: [
        {
          tag: 'pre',
          preserveWhitespace: 'full',
          getAttrs: (dom: HTMLElement) => ({
            lang: (dom.getAttribute('data-lang') ?? languageOfClass(dom.querySelector('code')?.className ?? '')).trim(),
          }),
        },
      ],
      toDOM: (node) => [
        'pre',
        { class: 'md-code', ...(node.attrs.lang ? { 'data-lang': node.attrs.lang as string } : {}) },
        ['code', 0],
      ],
    },
    blockquote: {
      content: 'block+',
      group: 'block item_first item_rest',
      defining: true,
      parseDOM: [{ tag: 'blockquote' }],
      toDOM: () => ['blockquote', 0],
    },
    callout: {
      attrs: { tone: { default: 'note' } },
      content: 'block+',
      group: 'block item_first item_rest',
      defining: true,
      parseDOM: [
        {
          tag: 'div[data-callout]',
          contentElement: '[data-callout-body]',
          getAttrs: (dom: HTMLElement) => ({ tone: toneOf(dom.getAttribute('data-callout')) }),
        },
      ],
      toDOM: (node) => [
        'div',
        { 'data-callout': node.attrs.tone as string, role: 'note' },
        ['div', { 'data-callout-body': '' }, 0],
      ],
    },
    horizontal_rule: {
      group: 'block item_first item_rest',
      parseDOM: [{ tag: 'hr' }],
      toDOM: () => ['hr'],
    },
    bullet_list: {
      attrs: { marker: { default: '-' }, loose: { default: false } },
      content: 'list_item+',
      group: 'block item_first item_rest',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0],
    },
    ordered_list: {
      attrs: { start: { default: 1 }, marker: { default: '.' }, loose: { default: false } },
      content: 'list_item+',
      group: 'block item_first item_rest',
      parseDOM: [
        {
          tag: 'ol',
          getAttrs: (dom: HTMLElement) => ({ start: dom.hasAttribute('start') ? Number(dom.getAttribute('start')) || 1 : 1 }),
        },
      ],
      toDOM: (node) => ['ol', (node.attrs.start as number) === 1 ? {} : { start: node.attrs.start as number }, 0],
    },
    list_item: {
      // null is a plain item; true and false are a task item, ticked or not.
      attrs: { checked: { default: null } },
      // WHAT AN ITEM CAN HOLD AND STILL BE WRITTEN BACK: the grammar reads an
      // item's later blocks from indented lines, and an indented fence or
      // heading is a paragraph to it. A heading is kept on the marker line;
      // a code block is never inside an item.
      content: 'item_first item_rest*',
      defining: true,
      parseDOM: [
        {
          tag: 'li',
          getAttrs: (dom: HTMLElement) => {
            const box = dom.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
            return { checked: box ? (box as HTMLInputElement).checked || box.hasAttribute('checked') : null };
          },
        },
      ],
      toDOM: (node) =>
        node.attrs.checked === null
          ? ['li', 0]
          : [
              'li',
              ['input', { type: 'checkbox', disabled: '', ...(node.attrs.checked ? { checked: '' } : {}) }],
              ['div', { class: 'md-task-body' }, 0],
            ],
    },
    table: {
      // A column's alignment is on each of its cells, which is where the
      // reader's renderer draws it; the header row's is what is written.
      content: 'table_row+',
      group: 'block item_first item_rest',
      isolating: true,
      parseDOM: [{ tag: 'table' }],
      toDOM: () => ['div', { class: 'md-table' }, ['table', ['tbody', 0]]],
    },
    table_row: {
      content: '(table_header | table_cell)+',
      parseDOM: [{ tag: 'tr' }],
      toDOM: () => ['tr', 0],
    },
    table_header: cell('th'),
    table_cell: cell('td'),
    text: { group: 'inline' },
    image: {
      inline: true,
      group: 'inline',
      attrs: { src: { default: '' }, alt: { default: '' }, title: { default: null } },
      draggable: true,
      parseDOM: [
        {
          // A pasted picture arrives with its address in `data-src`, never
          // `src`: the paste tree is built by hand and must load nothing.
          tag: 'img',
          getAttrs: (dom: HTMLElement) => ({
            src: dom.getAttribute('data-src') ?? '',
            alt: dom.getAttribute('alt') ?? '',
            title: dom.getAttribute('title'),
          }),
        },
      ],
      toDOM: (node) => ['img', { alt: node.attrs.alt as string, 'data-src': node.attrs.src as string }],
    },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      attrs: { style: { default: 'backslash' } },
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br'],
    },
  },
  marks: {
    // ORDER IS NESTING: a link outside the emphasis inside it, and a code
    // span innermost, because its content is raw text.
    link: {
      attrs: { href: {}, title: { default: null }, auto: { default: false } },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs: (dom: HTMLElement) => ({ href: dom.getAttribute('href') ?? '', title: dom.getAttribute('title') }),
        },
      ],
      toDOM: (mark: Mark) => ['a', { href: mark.attrs.href as string, rel: 'noopener noreferrer' }, 0],
    },
    strong: {
      attrs: { marker: { default: '**' } },
      parseDOM: [
        { tag: 'strong' },
        // Google Docs wraps a whole paste in a `b` that is not bold.
        { tag: 'b', getAttrs: (dom: HTMLElement) => (dom.style.fontWeight === 'normal' ? false : null) },
      ],
      toDOM: () => ['strong', 0],
    },
    em: {
      attrs: { marker: { default: '*' } },
      parseDOM: [{ tag: 'em' }, { tag: 'i' }],
      toDOM: () => ['em', 0],
    },
    strike: {
      parseDOM: [{ tag: 'del' }, { tag: 's' }, { tag: 'strike' }],
      toDOM: () => ['del', 0],
    },
    code: {
      parseDOM: [{ tag: 'code' }],
      toDOM: () => ['code', 0],
    },
  },
});

/** A language named the way highlighters name it on a pasted block: `language-go`. */
function languageOfClass(className: string): string {
  return /(?:^|\s)(?:language|lang)-([A-Za-z0-9_+-]+)/.exec(className)?.[1] ?? '';
}
