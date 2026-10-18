/**
 * The name flag: always the name, a pencil while editing, the kind's shape,
 * and decorative to assistive technology.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { CursorFlag } from './index.js';

afterEach(cleanup);

test('draws the name on the hue, hidden from assistive technology', () => {
  const { container } = render(<CursorFlag name="Maya Ortiz" hue="amber" />);
  const flag = container.firstElementChild as HTMLElement;
  expect(flag.getAttribute('aria-hidden')).toBe('true');
  expect(flag.textContent).toBe('Maya Ortiz');
  for (const name of ['crewlet-cursor-flag', 'crewlet-presence-hue--amber', 'crewlet-cursor-flag--human', 'crewlet-cursor-flag--top-end']) {
    expect(flag.classList.contains(name)).toBe(true);
  }
  expect(flag.querySelector('svg')).toBeNull();
});

test('several names share one flag, an editing flag leads with a pencil, and an agent flag is its own shape', () => {
  const { container } = render(<CursorFlag name={['Maya', '@pm']} hue="blue" kind="agent" editing placement="bottom-end" />);
  const flag = container.firstElementChild as HTMLElement;
  expect(flag.textContent).toBe('Maya, @pm');
  expect(flag.querySelector('svg')).not.toBeNull();
  expect(flag.classList.contains('crewlet-cursor-flag--agent')).toBe(true);
  expect(flag.classList.contains('crewlet-cursor-flag--bottom-end')).toBe(true);
});
