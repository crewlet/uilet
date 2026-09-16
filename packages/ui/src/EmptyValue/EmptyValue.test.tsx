/**
 * The three small marks: an absence that says what kind it is, a count that is
 * never a severity claim, and a dot that is never read twice.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Count } from '../Count/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { EMPTY_VALUE, EmptyValue } from './index.js';

afterEach(cleanup);

test('an absent value is drawn as an en dash and read as words', () => {
  const { container } = render(<EmptyValue />);
  /*
   * An EN dash, U+2013. By CODE POINT rather than by character, because the em
   * dash this rejects is itself banned from every file in this repository, so
   * writing one here to assert it is not written would break the rule the
   * assertion exists to keep.
   */
  expect(EMPTY_VALUE.codePointAt(0)).toBe(0x2013);
  expect(EMPTY_VALUE.codePointAt(0)).not.toBe(0x2014);
  expect([...EMPTY_VALUE]).toHaveLength(1);
  expect(container.textContent).toBe(`${EMPTY_VALUE}Not reported`);
  expect(container.querySelector('[aria-hidden]')?.textContent).toBe(EMPTY_VALUE);
  expect(container.querySelector('.crewlet-visually-hidden')?.textContent).toBe('Not reported');
});

test('a caller that knows which kind of absence this is says so', () => {
  const { container } = render(<EmptyValue label="Not configured" />);
  expect(container.querySelector('.crewlet-visually-hidden')?.textContent).toBe('Not configured');
});

test('a count reads as what it counts, and carries no tone', () => {
  const { container } = render(<Count value={3} label="open incidents" />);
  expect(container.querySelector('.crewlet-visually-hidden')?.textContent).toBe('3 open incidents');
  // The number is hidden once the sentence carries it, so it is not read twice.
  expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('3');
  // One class, always. A tone modifier would be a severity claim a number
  // cannot support.
  expect(container.firstElementChild?.className).toBe('crewlet-count');
});

test('a count with no label is read as the number beside the heading that names it', () => {
  const { container } = render(<Count value={12} />);
  expect(container.textContent).toBe('12');
  expect(container.querySelector('.crewlet-visually-hidden')).toBeNull();
});

test('a status dot is hidden, because the word beside it is the status', () => {
  render(
    <p>
      <StatusDot tone="warning" /> Needs attention
    </p>,
  );
  const dot = document.querySelector('.crewlet-status-dot')!;
  expect(dot.getAttribute('aria-hidden')).toBe('true');
  expect(dot.className).toContain('crewlet-status-dot--warning');
  expect(dot.className).not.toContain('is-pulsing');
});

test('a phase dot takes the phase family, not a status hue', () => {
  render(<StatusDot tone="phase-execute" pulse />);
  const dot = document.querySelector('.crewlet-status-dot')!;
  expect(dot.className).toContain('crewlet-status-dot--phase-execute');
  expect(dot.className).toContain('is-pulsing');
});
