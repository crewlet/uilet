/**
 * The family-list grammar every brand part takes before a list reaches a
 * style: names, quoted or plain, and the package's own family tokens, and
 * nothing else, refused whole.
 */

import { expect, test } from 'vitest';
import { fontStack, safeFontFamily } from './fontFamily.js';

/*
 * A reference to a property that is not a package family token, spelt in
 * pieces so the package's own custom property check does not read the test's
 * input as a stylesheet asking for it.
 */
const foreign = (name: string) => ['var(', '--', name, ')'].join('');

/*
 * THE ENGINE'S OWN LISTS, verbatim: brandformat `FaceFamilies`
 * (internal/artifacts/brandformat/face.go), which the dashboard contract
 * mirrors byte for byte as `BRAND_FACE_FAMILIES`. Copied rather than imported
 * because they live in the engine's repository; a list the engine adds or
 * changes is added here, and the check must take it.
 */
const ENGINE_FACE_FAMILIES = {
  geist: 'Geist, -apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji',
  'geist-mono': 'Geist Mono, ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
  'system-sans': 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Noto Sans, Helvetica Neue, Arial, sans-serif',
  'system-serif': 'ui-serif, Iowan Old Style, Palatino Linotype, Palatino, Georgia, Cambria, Times New Roman, serif',
  'system-mono': 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
} as const;

test("takes every list the engine writes for a brand's face, verbatim", () => {
  for (const [face, list] of Object.entries(ENGINE_FACE_FAMILIES)) {
    expect(safeFontFamily(list), face).toBe(list);
  }
  // An uploaded face: the engine quotes the brand's own family (brandformat
  // `FontStack`, a name of at most 40 bytes that may begin with a digit) in
  // front of the system sans stack, and the dashboard quotes the family it
  // registered the file under in the same place.
  for (const family of ['"Acme Sans"', '"1990 Grotesk"', `"${'A'.repeat(40)}"`, '"crewlet-brand-heading-1k2j3"']) {
    const list = `${family}, ${ENGINE_FACE_FAMILIES['system-sans']}`;
    expect(safeFontFamily(list), family).toBe(list);
  }
  // The longest stack with one more family registered in front of it.
  const longest = `"crewlet-brand-body-9zz", ${ENGINE_FACE_FAMILIES.geist}`;
  expect(safeFontFamily(longest)).toBe(longest);
});

test('reads quoted names, plain names, generic families and the package family tokens', () => {
  for (const list of [
    'Inter',
    '"Acme Display"',
    "'Acme Display', Georgia, serif",
    'ui-serif, Georgia',
    'Geist Mono, monospace',
    'var(--font-family-sans)',
    '"Acme Sans", var(--font-family-display)',
  ]) {
    expect(safeFontFamily(list), list).toBe(list);
  }
  expect(safeFontFamily('  Inter , sans-serif  ')).toBe('Inter , sans-serif');
});

test('refuses anything that is not a list of family names, whole', () => {
  for (const list of [
    '',
    '   ',
    'x; color: red',
    'Inter, url(evil.woff2)',
    foreign('anything-else'),
    `var(--font-family-sans), ${foreign('x')}`,
    '"unterminated',
    '"a"b"',
    '"back\\slash"',
    'Inter,',
    ', Inter',
    '1Up',
    'inherit',
    'Inter, initial',
    '"line\nbreak"',
    // One name past the engine's longest stack with a family in front of it.
    'a, b, c, d, e, f, g, h, i, j, k, l',
    // A custom property's name, a hyphen before a digit, and a lone hyphen are not identifiers.
    ['--', 'apple-system'].join(''),
    'Inter, --x',
    '-1x',
    '-',
    'Inter, - Sans',
    `"${'x'.repeat(81)}"`,
  ]) {
    expect(safeFontFamily(list), JSON.stringify(list)).toBeNull();
  }
  expect(safeFontFamily(undefined)).toBeNull();
  expect(safeFontFamily(null)).toBeNull();
});

test('a stack always ends in the fallback, with the chosen list before it only when it reads', () => {
  expect(fontStack('Inter', 'var(--font-family-sans)')).toBe('Inter, var(--font-family-sans)');
  expect(fontStack('x; color: red', 'var(--font-family-sans)')).toBe('var(--font-family-sans)');
  expect(fontStack(undefined, 'var(--font-family-display)')).toBe('var(--font-family-display)');
});
