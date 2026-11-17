/**
 * The tokens a CodeBlock colours by kind: JSON and YAML, read line by line
 * into runs of text. A tokenizer, not a parser: anything it does not know
 * stays plain, and the runs always join back into exactly the code given.
 */

/** What a run of code is, each drawn in its own syntax ink; null is plain. */
export type CodeTokenKind = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'comment';

export interface CodeToken {
  kind: CodeTokenKind | null;
  text: string;
}

/** The languages a CodeBlock colours, by the `language` it is handed. */
export const CODE_BLOCK_GRAMMARS = ['json', 'yaml', 'yml'] as const;

/** Past this many characters a block is drawn plain: a span a token would be hundreds of thousands of nodes. */
export const CODE_BLOCK_HIGHLIGHT_LIMIT = 256 * 1024;

type Grammar = (typeof CODE_BLOCK_GRAMMARS)[number];

function grammarOf(language: string | undefined): Grammar | null {
  const name = language?.trim().toLowerCase();
  return (CODE_BLOCK_GRAMMARS as readonly string[]).includes(name ?? '') ? (name as Grammar) : null;
}

/** Runs of one kind that touch are joined, so the markup holds one span a token. */
class Runs {
  readonly list: CodeToken[] = [];
  push(kind: CodeTokenKind | null, text: string): void {
    if (text === '') return;
    const last = this.list[this.list.length - 1];
    if (last && last.kind === kind) last.text += text;
    else this.list.push({ kind, text });
  }
}

const JSON_NUMBER = /-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/y;
const WORD = /[A-Za-z_$][\w$]*/y;

/** The end of a double-quoted string opened at `start`, past its escapes; the line's end if it never closes. */
function quoted(line: string, start: number, quote: string, escapes: boolean): number {
  let i = start + 1;
  while (i < line.length) {
    const ch = line[i];
    if (escapes && ch === '\\') i += 2;
    else if (ch === quote) {
      // YAML doubles a single quote to write one.
      if (!escapes && line[i + 1] === quote) i += 2;
      else return i + 1;
    } else i += 1;
  }
  return line.length;
}

function sticky(pattern: RegExp, line: string, at: number): number {
  pattern.lastIndex = at;
  return pattern.test(line) ? pattern.lastIndex : at;
}

function jsonLine(line: string, out: Runs): void {
  let i = 0;
  while (i < line.length) {
    const ch = line[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      let end = i + 1;
      while (end < line.length && /[ \t\r]/.test(line[end]!)) end += 1;
      out.push(null, line.slice(i, end));
      i = end;
    } else if (ch === '"') {
      const end = quoted(line, i, '"', true);
      let after = end;
      while (after < line.length && (line[after] === ' ' || line[after] === '\t')) after += 1;
      out.push(line[after] === ':' ? 'key' : 'string', line.slice(i, end));
      i = end;
    } else if ('{}[]:,'.includes(ch)) {
      out.push('punctuation', ch);
      i += 1;
    } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const end = sticky(JSON_NUMBER, line, i);
      out.push(end > i ? 'number' : null, line.slice(i, Math.max(end, i + 1)));
      i = Math.max(end, i + 1);
    } else {
      const end = sticky(WORD, line, i);
      if (end > i) {
        const word = line.slice(i, end);
        out.push(word === 'true' || word === 'false' ? 'boolean' : word === 'null' ? 'null' : null, word);
        i = end;
      } else {
        out.push(null, ch);
        i += 1;
      }
    }
  }
}

const YAML_NUMBER = /^[-+]?(?:\d[\d_]*(?:\.\d*)?(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?|0x[\da-fA-F]+|0o[0-7]+|\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;
const YAML_BOOLEAN = /^(?:true|True|TRUE|false|False|FALSE)$/;
const YAML_NULL = /^(?:null|Null|NULL|~)$/;
/** A block scalar's header: `|` or `>`, a chomping sign and an indent, then at most a comment. */
const BLOCK_HEADER = /^[|>][-+]?\d?[-+]?\s*(?:#.*)?$/;

/** A plain scalar's kind, by the YAML 1.2 core schema. */
function scalarKind(text: string): CodeTokenKind {
  if (YAML_BOOLEAN.test(text)) return 'boolean';
  if (YAML_NULL.test(text)) return 'null';
  if (YAML_NUMBER.test(text)) return 'number';
  return 'string';
}

/** Where a plain scalar or a key starting at `start` ends: before `: `, ` #`, or a flow sign inside a flow collection. */
function plainEnd(line: string, start: number, flow: boolean): number {
  let i = start;
  while (i < line.length) {
    const ch = line[i]!;
    if (ch === ':' && (i + 1 === line.length || /[\s,\]}]/.test(line[i + 1]!))) return i;
    if (ch === '#' && i > start && /\s/.test(line[i - 1]!)) return i;
    if (flow && ',[]{}'.includes(ch)) return i;
    i += 1;
  }
  return i;
}

/** A plain scalar with its trailing spaces given back as plain text. */
function pushScalar(out: Runs, text: string, kind?: CodeTokenKind): void {
  const trimmed = text.replace(/\s+$/, '');
  out.push(kind ?? scalarKind(trimmed), trimmed);
  out.push(null, text.slice(trimmed.length));
}

/** One YAML line; returns the indent a block scalar it opens runs deeper than, or null. */
function yamlLine(line: string, out: Runs): number | null {
  const indent = /^[ \t]*/.exec(line)![0].length;
  out.push(null, line.slice(0, indent));
  let i = indent;
  if (/^(?:---|\.\.\.)(?:\s|$)/.test(line.slice(i))) {
    out.push('punctuation', line.slice(i, i + 3));
    i += 3;
  }
  let depth = 0;
  let block: number | null = null;
  let expectKey = true;
  while (i < line.length) {
    const ch = line[i]!;
    const rest = line.slice(i);
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      const end = i + /^[ \t\r]+/.exec(rest)![0].length;
      out.push(null, line.slice(i, end));
      i = end;
    } else if (ch === '#') {
      out.push('comment', rest);
      i = line.length;
    } else if (ch === '-' && depth === 0 && (i + 1 === line.length || /\s/.test(line[i + 1]!))) {
      out.push('punctuation', '-');
      i += 1;
      expectKey = true;
    } else if ('[]{},'.includes(ch)) {
      depth += ch === '[' || ch === '{' ? 1 : ch === ']' || ch === '}' ? -1 : 0;
      depth = Math.max(depth, 0);
      out.push('punctuation', ch);
      i += 1;
      expectKey = ch !== ']' && ch !== '}';
    } else if (ch === ':' && (i + 1 === line.length || /\s/.test(line[i + 1]!))) {
      out.push('punctuation', ':');
      i += 1;
      expectKey = false;
    } else if (depth === 0 && !expectKey && BLOCK_HEADER.test(rest)) {
      const header = /^[|>][-+]?\d?[-+]?/.exec(rest)![0];
      out.push('punctuation', header);
      i += header.length;
      block = indent;
    } else if (ch === '"' || ch === "'") {
      const end = quoted(line, i, ch, ch === '"');
      let after = end;
      while (after < line.length && (line[after] === ' ' || line[after] === '\t')) after += 1;
      const isKey = line[after] === ':' && (after + 1 === line.length || /\s/.test(line[after + 1]!));
      out.push(isKey ? 'key' : 'string', line.slice(i, end));
      i = end;
    } else {
      const end = Math.max(plainEnd(line, i, depth > 0), i + 1);
      const text = line.slice(i, end);
      const isKey = line[end] === ':' && expectKey;
      if (isKey) pushScalar(out, text, 'key');
      else pushScalar(out, text);
      i = end;
    }
  }
  return block;
}

function yaml(code: string, out: Runs): void {
  const lines = code.split('\n');
  let block: number | null = null;
  lines.forEach((line, index) => {
    if (block !== null) {
      const indent = /^[ \t]*/.exec(line)![0].length;
      if (line.trim() === '' || indent > block) {
        out.push(null, line.slice(0, Math.min(indent, line.length)));
        out.push('string', line.slice(indent));
        if (index < lines.length - 1) out.push(null, '\n');
        return;
      }
      block = null;
    }
    block = yamlLine(line, out);
    if (index < lines.length - 1) out.push(null, '\n');
  });
}

/**
 * The code as runs of one kind each, or null where the language is not one
 * the block colours or the code is past the limit. The runs' text joined is
 * the code, character for character.
 */
export function tokenizeCode(code: string, language: string | undefined): CodeToken[] | null {
  const grammar = grammarOf(language);
  if (grammar === null || code.length > CODE_BLOCK_HIGHLIGHT_LIMIT) return null;
  const out = new Runs();
  if (grammar === 'json') {
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      jsonLine(line, out);
      if (index < lines.length - 1) out.push(null, '\n');
    });
  } else yaml(code, out);
  return out.list;
}

/** The runs cut at each newline, one list a line, the newlines themselves dropped. */
export function tokenLines(tokens: readonly CodeToken[]): CodeToken[][] {
  const lines: CodeToken[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part !== '') lines[lines.length - 1]!.push({ kind: token.kind, text: part });
    });
  }
  return lines;
}
