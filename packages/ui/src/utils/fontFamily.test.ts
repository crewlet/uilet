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
    'a, b, c, d, e, f, g, h, i',
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
