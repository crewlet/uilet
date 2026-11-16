/**
 * The comment pin: a named button over the content, its mark, its state and
 * whether its thread is the one open.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CommentPin } from './index.js';

afterEach(cleanup);

test('is a button named for its thread, drawing its mark, and says whether it is selected', () => {
  const onClick = vi.fn();
  render(<CommentPin mark="3" label="Avery on the comparison: Can the table say which plan most teams pick?" onClick={onClick} />);
  const pin = screen.getByRole('button', { name: /Avery on the comparison/ });
  expect(pin.textContent).toBe('3');
  expect(pin.getAttribute('aria-pressed')).toBe('false');
  expect(pin.classList.contains('crewlet-comment-pin--open')).toBe(true);
  fireEvent.click(pin);
  expect(onClick).toHaveBeenCalledOnce();
});

test('a resolved pin shows a check instead of its mark, a draft is its own state, and a selected one is pressed', () => {
  const { rerender } = render(<CommentPin mark="2" label="Resolved thread" state="resolved" />);
  const pin = screen.getByRole('button', { name: 'Resolved thread' });
  expect(pin.textContent).toBe('');
  expect(pin.querySelector('svg')).not.toBeNull();
  rerender(<CommentPin mark="A" label="Your new comment" state="draft" selected />);
  const draft = screen.getByRole('button', { name: 'Your new comment' });
  expect(draft.classList.contains('crewlet-comment-pin--draft')).toBe(true);
  expect(draft.classList.contains('crewlet-comment-pin--selected')).toBe(true);
  expect(draft.getAttribute('aria-pressed')).toBe('true');
});
