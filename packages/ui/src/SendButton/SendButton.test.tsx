/**
 * Send becomes Stop while a request runs: one element in both modes (so focus
 * stays on it), named in words, the accent square with an arrow for Send and
 * the bordered square with a filled square for Stop. Stop is never disabled.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { SendButton } from './index.js';

afterEach(cleanup);

test('sends, then becomes Stop on the same element, which keeps focus', () => {
  const onPress = vi.fn();
  const { rerender } = render(<SendButton mode="send" onPress={onPress} />);
  const send = screen.getByRole('button', { name: 'Send' });
  expect(send.className).toContain('crewlet-icon-btn--primary');
  send.focus();
  fireEvent.click(send);
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<SendButton mode="stop" onPress={onPress} />);
  const stop = screen.getByRole('button', { name: 'Stop' });
  expect(stop).toBe(send);
  expect(document.activeElement).toBe(stop);
  expect(stop.className).toContain('crewlet-icon-btn--secondary');
  // The square is drawn filled.
  expect(stop.querySelector('svg')!.getAttribute('fill')).toBe('currentColor');
  fireEvent.click(stop);
  expect(onPress).toHaveBeenCalledTimes(2);
});

test('a reason holds Send, soft disabled and described, but never holds Stop', () => {
  const onPress = vi.fn();
  const { rerender } = render(<SendButton mode="send" onPress={onPress} disabledReason="Write a question first" />);
  const send = screen.getByRole('button', { name: 'Send' });
  expect(send.getAttribute('aria-disabled')).toBe('true');
  expect(document.getElementById(send.getAttribute('aria-describedby')!)!.textContent).toBe('Write a question first');
  fireEvent.click(send);
  expect(onPress).not.toHaveBeenCalled();
  rerender(<SendButton mode="stop" onPress={onPress} disabledReason="Write a question first" />);
  const stop = screen.getByRole('button', { name: 'Stop' });
  expect(stop.hasAttribute('aria-disabled')).toBe(false);
  fireEvent.click(stop);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('takes its words from labels', () => {
  render(<SendButton mode="stop" onPress={() => {}} labels={{ stop: 'Stop the answer' }} />);
  expect(screen.getByRole('button', { name: 'Stop the answer' })).toBeTruthy();
});

test('carries no axe violation in either mode', async () => {
  const { container } = render(
    <main>
      <SendButton mode="send" onPress={() => {}} />
      <SendButton mode="stop" onPress={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
