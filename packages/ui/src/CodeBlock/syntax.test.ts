/**
 * The JSON and YAML a CodeBlock colours: every run's text joined is the code,
 * and each run is the kind a reader expects.
 */
import { expect, test } from 'vitest';
import { CODE_BLOCK_HIGHLIGHT_LIMIT, tokenLines, tokenizeCode, type CodeToken } from './syntax.js';

const coloured = (tokens: CodeToken[] | null) => (tokens ?? []).filter((t) => t.kind !== null).map((t) => `${t.kind}:${t.text}`);

test('a JSON string followed by a colon is a key, and escapes do not end a string', () => {
  expect(coloured(tokenizeCode('{"a\\"b" : "c\\\\", "n": -1.5e3}', 'json'))).toEqual([
    'punctuation:{',
    'key:"a\\"b"',
    'punctuation::',
    'string:"c\\\\"',
    'punctuation:,',
    'key:"n"',
    'punctuation::',
    'number:-1.5e3',
    'punctuation:}',
  ]);
});

test('YAML: keys, scalars by kind, comments, list items and flow collections', () => {
  const code = [
    '# the company',
    'company:',
    '  name: Acme  # shown on the dashboard',
    '  seats: 12',
    '  live: true',
    '  owner: ~',
    '  url: https://example.com:8443/x',
    '  "quoted key": \'it\'\'s\'',
    '  roles:',
    '    - id: pm',
    '    - plain item',
    '  tags: [a, 2, {k: v}]',
  ].join('\n');
  expect(coloured(tokenizeCode(code, 'yaml'))).toEqual([
    'comment:# the company',
    'key:company',
    'punctuation::',
    'key:name',
    'punctuation::',
    'string:Acme',
    'comment:# shown on the dashboard',
    'key:seats',
    'punctuation::',
    'number:12',
    'key:live',
    'punctuation::',
    'boolean:true',
    'key:owner',
    'punctuation::',
    'null:~',
    'key:url',
    'punctuation::',
    'string:https://example.com:8443/x',
    'key:"quoted key"',
    'punctuation::',
    "string:'it''s'",
    'key:roles',
    'punctuation::',
    'punctuation:-',
    'key:id',
    'punctuation::',
    'string:pm',
    'punctuation:-',
    'string:plain item',
    'key:tags',
    'punctuation::',
    'punctuation:[',
    'string:a',
    'punctuation:,',
    'number:2',
    'punctuation:,',
    'punctuation:{',
    'key:k',
    'punctuation::',
    'string:v',
    // Signs that touch are one run.
    'punctuation:}]',
  ]);
});

test('a YAML block scalar is one string to its end, whatever its lines look like', () => {
  const code = 'prompt: |\n  You are: a reviewer\n  # not a comment\nnext: 1';
  expect(coloured(tokenizeCode(code, 'yml'))).toEqual([
    'key:prompt',
    'punctuation::',
    'punctuation:|',
    'string:You are: a reviewer',
    'string:# not a comment',
    'key:next',
    'punctuation::',
    'number:1',
  ]);
});

test.each([
  ['json', '{"a": [1, true, null, "x"], "b": {"c": "d"}}\n'],
  ['json', '{"unterminated": "abc\n  "next": 1}'],
  ['yaml', 'a: b\n- c\n  d: "e\n f: [g, h\n---\n...\n'],
  ['yaml', 'key: >-\n  folded\n\n  more\nback: x'],
])('the runs join back into the code (%s)', (language, code) => {
  const tokens = tokenizeCode(code, language)!;
  expect(tokens.map((t) => t.text).join('')).toBe(code);
  expect(tokenLines(tokens).map((line) => line.map((t) => t.text).join('')).join('\n')).toBe(code);
});

test('another language, or a block past the limit, is not coloured', () => {
  expect(tokenizeCode('{"a": 1}', 'go')).toBeNull();
  expect(tokenizeCode('{"a": 1}', undefined)).toBeNull();
  expect(tokenizeCode(`"${'x'.repeat(CODE_BLOCK_HIGHLIGHT_LIMIT)}"`, 'json')).toBeNull();
  expect(tokenizeCode('{"a": 1}', ' JSON ')).not.toBeNull();
});
