/**
 * The measure, and the way out of it.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
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
