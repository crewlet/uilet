/**
 * The package's one ring: decoration with no words, a box at every size (an
 * inline ring draws only a sliver of its border), and under reduced motion a
 * ring that stops and stays open rather than closing into an empty circle.
 */
import { cleanup, render } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { installMotion } from '../../../../apps/ui-tests/src/cascade.js';
import { Button } from '../Button/index.js';
import { Spinner } from './index.js';

afterEach(cleanup);

test('is decoration, sized on the glyph scale or by the text around it', () => {
  const { container } = render(
    <>
      <Spinner />
      <Spinner size="sm" />
    </>,
  );
  const [plain, small] = Array.from(container.querySelectorAll('.crewlet-spinner'));
  expect(plain!.getAttribute('aria-hidden')).toBe('true');
  expect(plain!.className).toContain('crewlet-spinner--em');
  expect(small!.className).toContain('crewlet-spinner--sm');
});

const SOURCE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = readFileSync(join(SOURCE, 'Spinner/Spinner.css'), 'utf8');

test('is a box, and turns and breathes only for a reader who has not asked for less motion', () => {
  let uninstall = installMotion('no-preference', 'Spinner/Spinner.css');
  const { container } = render(<Spinner size="sm" />);
  const ring = container.querySelector('.crewlet-spinner')!;
  expect(getComputedStyle(ring).display).toBe('inline-block');
  const animation = getComputedStyle(ring).animation;
  // Both periods come from the motion scale. The ring turned once per slow
  // TRANSITION step (300ms), more than three turns a second, and read as
  // frantic; a period of its own is what keeps it calm.
  expect(animation).toContain('crewlet-spinner-turn var(--motion-duration-turn) linear infinite');
  expect(animation).toContain('crewlet-spinner-sweep var(--motion-duration-sweep) var(--motion-easing-in-out) infinite');
  expect(animation).not.toMatch(/duration-slow/);
  uninstall();
  uninstall = installMotion('reduce', 'Spinner/Spinner.css');
  expect(getComputedStyle(ring).animation).toBe('none');
  uninstall();
});

test('the stroke is one 2px border at every size, cut to an arc by a mask', () => {
  const uninstall = installMotion('no-preference', 'Spinner/Spinner.css');
  const { container } = render(
    <>
      <Spinner />
      <Spinner size="xs" />
      <Spinner size="sm" />
      <Spinner size="md" />
    </>,
  );
  for (const ring of Array.from(container.querySelectorAll('.crewlet-spinner'))) {
    expect(getComputedStyle(ring).borderTopWidth).toBe('2px');
    // No side of the border is cut away: the mask draws the opening, so the
    // arc can change length while the ring turns.
    expect(getComputedStyle(ring).borderRightColor).toBe(getComputedStyle(ring).borderTopColor);
  }
  uninstall();
  expect(SHEET).toMatch(/[^-]mask-image:\s*conic-gradient\(\s*from var\(--crewlet-spinner-from\)/);
  expect(SHEET).toMatch(/-webkit-mask-image:\s*conic-gradient\(\s*from var\(--crewlet-spinner-from\)/);
});

test('at rest the arc is three quarters of the ring, so a stopped ring still reads as open', () => {
  // A reduced-motion reader sees the arc's registered initial value. A closed
  // ring would read as an empty status circle.
  const registered = /@property --crewlet-spinner-arc\s*\{([^}]*)\}/.exec(SHEET)?.[1] ?? '';
  expect(registered).toMatch(/syntax:\s*'<angle>'/);
  expect(registered).toMatch(/initial-value:\s*270deg/);
  // The breath stays between a quarter and three quarters: never closed, never
  // a dot.
  const sweep = /@keyframes crewlet-spinner-sweep\s*\{([\s\S]*?)\n\}/.exec(SHEET)?.[1] ?? '';
  const arcs = Array.from(sweep.matchAll(/--crewlet-spinner-arc:\s*(\d+)deg/g), (match) => Number(match[1]));
  expect(arcs).toEqual([90, 270]);
});

test('every ring in the package turns on this one definition', () => {
  // ImageUpload drew a ring of its own on its own keyframes, at a different
  // pace from every other ring. A component that needs a ring draws Spinner.
  const sheets = readdirSync(SOURCE, { recursive: true, encoding: 'utf8' }).filter((path) => path.endsWith('.css'));
  const turning = sheets.filter((path) =>
    /@keyframes[^{]+\{[^@]*?rotate\(\s*(360deg|1turn)\s*\)/.test(readFileSync(join(SOURCE, path), 'utf8')),
  );
  expect(turning).toEqual([join('Spinner', 'Spinner.css')]);
});

test("a pending button draws the same ring in its leading icon's place", () => {
  const { container } = render(<Button loading>Save</Button>);
  const ring = container.querySelector('.crewlet-btn__spinner')!;
  expect(ring.classList.contains('crewlet-spinner')).toBe(true);
  expect(container.querySelector('button')!.getAttribute('aria-busy')).toBe('true');
});
