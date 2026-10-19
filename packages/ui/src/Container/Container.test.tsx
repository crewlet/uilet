/**
 * The measure, and the way out of it.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { installAtWidth, px } from '../../../../apps/ui-tests/src/cascade.js';
import { Container } from './index.js';

afterEach(cleanup);

test('every size is a class the stylesheet has a rule for', () => {
  // The two new steps are the ones a console needs: the content-max width, and
  // no measure at all for a canvas or a wide grid.
  for (const size of ['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const) {
    const { container } = render(<Container size={size}>x</Container>);
    expect(container.firstElementChild?.className).toBe(`crewlet-container crewlet-container--${size}`);
    cleanup();
  }
});

test('the size prop does not reach the DOM', () => {
  const { container } = render(<Container size="2xl">x</Container>);
  expect((container.firstElementChild as HTMLElement).getAttribute('size')).toBeNull();
});

test("a phone's gutter is the shell's 16px, the top bar's own inset, and 20px wider", () => {
  // The logical property, as the stylesheet writes it: jsdom does not resolve
  // `padding-inline` into the physical sides.
  for (const [width, gutter] of [
    [390, 16],
    [1024, 20],
  ] as const) {
    const uninstall = installAtWidth(width, 'light', 'Container/Container.css');
    try {
      const { container } = render(<Container>x</Container>);
      expect(px(container.firstElementChild!, 'padding-inline'), `${width}px`).toBe(gutter);
      cleanup();
    } finally {
      uninstall();
    }
  }
});
