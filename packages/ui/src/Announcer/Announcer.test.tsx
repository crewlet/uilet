/**
 * What a polite region promises: the same sentence twice is said twice, it is
 * never part of a control's own name, and an announcement with nowhere to go
 * says so rather than disappearing.
 *
 * The keyed child is the rule the engine's own ListField and MultiPicker
 * discovered: a live region whose text is set to the string it already holds
 * announces nothing, so two removals of the same tag were read as one.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer, announce } from './index.js';

afterEach(cleanup);

test('it is polite, hidden from the eye, and read by everything else', () => {
  render(<Announcer />);
  const region = screen.getByRole('status');
  expect(region.getAttribute('aria-live')).toBe('polite');
  expect(region.closest('.crewlet-visually-hidden')).not.toBeNull();
});

test('the same sentence twice is announced twice', () => {
  const { container } = render(<Announcer />);
  const keyed = () => container.querySelector('[role="status"] > span');

  act(() => announce('Removed Site Reliability'));
  const first = keyed();
  expect(first?.textContent).toBe('Removed Site Reliability');

  act(() => announce('Removed Site Reliability'));
  const second = keyed();
  expect(second?.textContent).toBe('Removed Site Reliability');
  // A NEW element, which is what makes a screen reader read it again. Set as
  // text on the same node, the second removal announced nothing at all.
  expect(second).not.toBe(first);
});

test('it is a sibling of the control it describes, never part of its name', () => {
  render(
    <>
      <button>Copy</button>
      <Announcer />
    </>,
  );
  act(() => announce('copied to the clipboard'));
  // getByRole matches on the accessible NAME, so an exact-name query is the
  // assertion: with the region inside the button, the control was named "Copy
  // copied to the clipboard".
  expect(screen.getByRole('button', { name: 'Copy' })).toBeDefined();
  expect(screen.getByRole('status').textContent).toBe('copied to the clipboard');
});

test('an announcement with no region mounted is reported, not swallowed', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    announce('nobody hears this');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('<Announcer>');
  } finally {
    warn.mockRestore();
  }
});

test('an empty announcement is not an announcement', () => {
  const { container } = render(<Announcer />);
  act(() => announce(''));
  expect(container.querySelector('[role="status"]')?.textContent).toBe('');
});
