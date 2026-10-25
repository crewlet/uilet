/**
 * Words a screen reader reads and nobody sees, with the spaces at their edges
 * kept, so a hidden label never runs into the word beside it.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { VisuallyHidden } from './index.js';

afterEach(cleanup);

test('keeps the spaces at its edges and never wraps', () => {
  const uninstall = installThemed('light', 'VisuallyHidden/VisuallyHidden.css');
  const { container } = render(
    <p>
      <VisuallyHidden>{'removed: '}</VisuallyHidden>
      relationship
    </p>,
  );
  const hidden = container.querySelector('.crewlet-visually-hidden')!;
  const style = getComputedStyle(hidden);
  // A positioned box drops the collapsible spaces that start or end its line;
  // `pre` keeps them, and keeps the sentence on one line in its pixel.
  expect(style.whiteSpace).toBe('pre');
  expect(style.position).toBe('absolute');
  expect(container.textContent).toBe('removed: relationship');
  uninstall();
});
