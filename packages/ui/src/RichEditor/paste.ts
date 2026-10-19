/**
 * What a paste or a drop becomes: Markdown, HTML or plain text, read into the
 * editor's document WITHOUT EVER PARSING MARKUP THROUGH A SINK.
 *
 * # Why HTML is tokenized here
 *
 * ProseMirror reads pasted HTML by assigning it to `innerHTML` on a detached
 * document, behind a pass-through Trusted Types policy it creates for itself.
 * A page that enforces Trusted Types with `trusted-types 'none'` allows no
 * policy at all, so that path throws; and a pass-through policy, where one is
 * allowed, is exactly the hole Trusted Types exists to close. So the editor
 * takes the paste and the drop itself (`handleDOMEvents`), and reads HTML
 * with the small tokenizer below, which builds elements one by one in an
 * inert document (`createElement`, `setAttribute` and `createTextNode`, none
 * of them a sink), keeping only the elements and attributes the editor has a
 * meaning for. ProseMirror's own `DOMParser` then reads that tree, so every
 * rule about what an element becomes is the schema's.
 *
 * NOTHING IN THE TREE LOADS ANYTHING: it lives in a document with no browsing
 * context, a picture's address is kept in `data-src` rather than `src`, and a
 * link whose scheme is not allowed is dropped to its text.
 */

import { DOMParser as PMDOMParser, Fragment, Slice, type Node as PMNode, type ResolvedPos } from 'prosemirror-model';
import { safeHref } from '../Markdown/index.js';
import { readMarkdown } from './codec.js';
import { schema } from './schema.js';

/** Elements whose content is never shown, and is skipped whole. */
const SKIP = new Set([
  'script',
  'style',
  'template',
  'iframe',
  'object',
  'embed',
  'noscript',
  'head',
  'title',
  'svg',
  'math',
  'canvas',
  'video',
  'audio',
  'select',
  'textarea',
  'button',
  'xml',
]);

/** Elements with no content and no end tag. */
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr', 'param']);

/** The elements kept, each as itself; any other element keeps only its content. */
const KEEP = new Set([
  'p',
  'div',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'a',
  'img',
  'strong',
  'b',
  'em',
  'i',
  's',
  'del',
  'strike',
  'hr',
  'input',
]);

/** Elements that close an open paragraph, as a browser's parser closes one. */
const BLOCK = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'table',
  'hr',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'aside',
  'nav',
  'figure',
]);

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  bull: '\u2022',
  middot: '\u00b7',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
  times: '\u00d7',
  laquo: '\u00ab',
  raquo: '\u00bb',
};

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

interface Token {
  kind: 'open' | 'close' | 'text';
  name?: string;
  attrs?: Record<string, string>;
  text?: string;
}

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/y;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

/** HTML as a flat run of tokens: tags with their attributes, and text. */
function tokenize(html: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let text = '';
  const flush = () => {
    if (text) out.push({ kind: 'text', text: decode(text) });
    text = '';
  };
  while (i < html.length) {
    const c = html[i];
    if (c !== '<') {
      text += c;
      i++;
      continue;
    }
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html[i + 1] === '!' || html[i + 1] === '?') {
      const end = html.indexOf('>', i);
      i = end < 0 ? html.length : end + 1;
      continue;
    }
    TAG.lastIndex = i;
    const m = TAG.exec(html);
    if (!m) {
      text += c;
      i++;
      continue;
    }
    flush();
    const name = (m[2] ?? '').toLowerCase();
    if (m[1]) {
      out.push({ kind: 'close', name });
    } else {
      const attrs: Record<string, string> = {};
      for (const a of (m[3] ?? '').matchAll(ATTR)) {
        attrs[(a[1] ?? '').toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
      }
      out.push({ kind: 'open', name, attrs });
      if (SKIP.has(name)) {
        // Raw text: everything up to the matching end tag is skipped, so a
        // `<` inside a script is never read as a tag.
        const end = html.toLowerCase().indexOf(`</${name}`, TAG.lastIndex);
        i = end < 0 ? html.length : end;
        continue;
      }
    }
    i = TAG.lastIndex;
  }
  flush();
  return out;
}

/** Inline styles that carry meaning in pasted HTML (Google Docs writes bold as a style). */
function styleOf(style: string): { bold?: boolean; italic?: boolean; strike?: boolean; normal?: boolean; align?: string } {
  const read = (prop: string) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i').exec(style)?.[1]?.trim().toLowerCase();
  const weight = read('font-weight');
  const out: { bold?: boolean; italic?: boolean; strike?: boolean; normal?: boolean; align?: string } = {};
  if (weight) {
    if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) out.bold = true;
    if (weight === 'normal' || Number(weight) <= 400) out.normal = true;
  }
  if (read('font-style') === 'italic') out.italic = true;
  if (/line-through/.test(read('text-decoration') ?? read('text-decoration-line') ?? '')) out.strike = true;
  const align = read('text-align');
  if (align === 'center' || align === 'right') out.align = align;
  return out;
}

/**
 * The paste as an element tree in an inert document, kept to what the
 * editor understands. Unclosed `p`, `li`, `tr`, `td` and `th` close where a
 * browser would close them, which is how real clipboard HTML is written.
 */
export function htmlTree(html: string, doc: Document = document.implementation.createHTMLDocument('')): HTMLElement {
  const root = doc.createElement('div');
  const stack: { name: string; el: HTMLElement }[] = [{ name: '#root', el: root }];
  const top = () => stack[stack.length - 1]!;
  const closeTo = (names: string[], stop: string[] = []) => {
    for (let k = stack.length - 1; k > 0; k--) {
      const n = stack[k]!.name;
      if (stop.includes(n)) return;
      if (names.includes(n)) {
        stack.length = k;
        return;
      }
    }
  };
  for (const token of tokenize(html)) {
    if (token.kind === 'text') {
      top().el.appendChild(doc.createTextNode(token.text ?? ''));
      continue;
    }
    const name = token.name ?? '';
    if (token.kind === 'close') {
      if (SKIP.has(name)) continue;
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k]!.name === name) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    if (SKIP.has(name)) continue;
    if (BLOCK.has(name)) closeTo(['p'], ['li', 'td', 'th', 'blockquote']);
    if (name === 'li') closeTo(['li'], ['ul', 'ol']);
    if (name === 'tr') closeTo(['tr'], ['table']);
    if (name === 'td' || name === 'th') closeTo(['td', 'th'], ['tr', 'table']);
    const attrs = token.attrs ?? {};
    const style = styleOf(attrs.style ?? '');
    let el: HTMLElement | null = null;
    if (KEEP.has(name)) {
      el = element(doc, name, attrs, style);
    } else if (style.bold || style.italic || style.strike) {
      // A styled span is the formatting Google Docs and Word paste.
      el = doc.createElement(style.bold ? 'strong' : style.italic ? 'em' : 's');
    } else if (BLOCK.has(name)) {
      el = doc.createElement('div');
    }
    if (el === null) {
      // Kept only for its content: a span, a font, a section of its own.
      if (VOID.has(name)) continue;
      el = doc.createElement('span');
    }
    top().el.appendChild(el);
    if (!VOID.has(name)) stack.push({ name, el });
  }
  return root;
}

function element(
  doc: Document,
  name: string,
  attrs: Record<string, string>,
  style: ReturnType<typeof styleOf>,
): HTMLElement | null {
  if (name === 'a') {
    const href = safeHref(attrs.href ?? '');
    if (!href) return doc.createElement('span');
    const a = doc.createElement('a');
    a.setAttribute('href', href);
    if (attrs.title) a.setAttribute('title', attrs.title);
    return a;
  }
  if (name === 'img') {
    // The address is kept as text, and what loads it is the reader's
    // renderer, by its own rules. A picture copied out of an editor carries
    // its address in `data-src`, a file of the document's own, and keeps it;
    // one from any other page keeps only an address a reader may follow, so
    // neither a page-relative path that means nothing here nor an inline
    // `data:` picture (the whole image in the body) comes in.
    const own = attrs['data-src'];
    const src = own ?? attrs.src ?? '';
    if (!src) return null;
    if (own === undefined ? !safeHref(src) : /^[a-z][a-z0-9+.-]*:/i.test(src) && !safeHref(src)) return null;
    const img = doc.createElement('img');
    img.setAttribute('data-src', src);
    img.setAttribute('alt', attrs.alt ?? '');
    if (attrs.title) img.setAttribute('title', attrs.title);
    return img;
  }
  if (name === 'input') {
    if ((attrs.type ?? '').toLowerCase() !== 'checkbox') return null;
    const box = doc.createElement('input');
    box.setAttribute('type', 'checkbox');
    if ('checked' in attrs) box.setAttribute('checked', '');
    return box;
  }
  if (name === 'b' && style.normal) return doc.createElement('span');
  const el = doc.createElement(name);
  if (name === 'ol' && attrs.start) el.setAttribute('start', attrs.start.replace(/\D/g, '') || '1');
  if ((name === 'pre' || name === 'code') && attrs.class) {
    const lang = /(?:^|\s)(?:language|lang)-([A-Za-z0-9_+-]+)/.exec(attrs.class)?.[1];
    if (lang) el.setAttribute('class', `language-${lang}`);
  }
  if (name === 'pre' && attrs['data-lang'] && /^[A-Za-z0-9_+-]+$/.test(attrs['data-lang'])) {
    el.setAttribute('data-lang', attrs['data-lang']);
  }
  if (/^h[1-6]$/.test(name) && /^[1-6]$/.test(attrs['data-level'] ?? '')) el.setAttribute('data-level', attrs['data-level']!);
  if (name === 'div' && attrs['data-callout'] !== undefined) el.setAttribute('data-callout', attrs['data-callout']);
  if (name === 'div' && attrs['data-callout-body'] !== undefined) el.setAttribute('data-callout-body', '');
  if ((name === 'td' || name === 'th') && (style.align || attrs.align || attrs['data-align'])) {
    const align = style.align ?? (attrs['data-align'] ?? attrs.align)?.toLowerCase();
    if (align === 'center' || align === 'right') el.setAttribute('data-align', align);
  }
  return el;
}

/** A slice of the editor's document from pasted HTML. */
export function htmlSlice(html: string, $context: ResolvedPos): Slice {
  return PMDOMParser.fromSchema(schema).parseSlice(htmlTree(html), { context: $context });
}

/**
 * Whether plain text is written in Markdown: a block's syntax at a line's
 * start, or a span's (strong, a link, a code span) anywhere. Text with
 * neither is pasted line by line, as it was written.
 */
export function looksLikeMarkdown(text: string): boolean {
  return (
    /^(#{1,6}\s|[-*+]\s|\d{1,9}[.)]\s|>|```|~~~|\|.*\|)/m.test(text) ||
    /\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\([^)\s]+\)|`[^`\n]+`|~~[^~\n]+~~/.test(text)
  );
}

/** A slice from Markdown text. */
export function markdownSlice(text: string): Slice {
  const doc = readMarkdown(text).doc;
  return Slice.maxOpen(doc.content);
}

/** A slice from plain text: one paragraph per line. */
export function textSlice(text: string): Slice {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const paragraphs: PMNode[] = lines.map((line) => schema.node('paragraph', null, line ? schema.text(line) : undefined));
  return Slice.maxOpen(Fragment.from(paragraphs));
}

/**
 * Whether clipboard HTML carries structure worth keeping. A code editor puts
 * its text on the clipboard as HTML too, every line a styled `div`, and
 * reading that as HTML would lose the Markdown the text was written in.
 */
export function richHtml(html: string, types: readonly string[]): boolean {
  if (!html) return false;
  if (types.includes('vscode-editor-data')) return false;
  return /<(p|h[1-6]|ul|ol|li|table|blockquote|pre|strong|b|em|i|a|img|code|br)[\s>]/i.test(html);
}
