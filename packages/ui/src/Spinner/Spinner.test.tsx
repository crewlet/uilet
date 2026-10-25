/**
 * The package's one ring: decoration with no words, a box at every size (an
 * inline ring draws only a sliver of its border), and under reduced motion a
 * ring that stops and stays open rather than closing into an empty circle.
 */
import { cleanup, render } from '@testing-library/react';
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

test('is a box, and turns only for a reader who has not asked for less motion', () => {
  let uninstall = installMotion('no-preference', 'Spinner/Spinner.css');
  const { container } = render(<Spinner size="sm" />);
  const ring = container.querySelector('.crewlet-spinner')!;
  expect(getComputedStyle(ring).display).toBe('inline-block');
  expect(getComputedStyle(ring).animation).toContain('crewlet-spinner-turn');
  uninstall();
  uninstall = installMotion('reduce', 'Spinner/Spinner.css');
  expect(getComputedStyle(ring).animation).toBe('none');
  // Still open: the right quarter stays transparent when it stops.
  expect(getComputedStyle(ring).borderRightColor).toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
  uninstall();
});

test("a pending button draws the same ring in its leading icon's place", () => {
  const { container } = render(<Button loading>Save</Button>);
  const ring = container.querySelector('.crewlet-btn__spinner')!;
  expect(ring.classList.contains('crewlet-spinner')).toBe(true);
  expect(container.querySelector('button')!.getAttribute('aria-busy')).toBe('true');
});
