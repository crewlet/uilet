/**
 * Send becomes Stop while a request runs: one element in both modes (so focus
 * stays on it), named in words, the accent square with an arrow for Send and
 * the bordered square with a small filled square and a running arc for Stop.
 * A reason holds either mode: nothing to send, or a stop already under way.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { SendButton } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'SendButton.css'), 'utf8');

test('sends, then becomes Stop on the same element, which keeps focus', () => {
  const onPress = vi.fn();
  const { rerender } = render(<SendButton mode="send" onPress={onPress} />);
  const send = screen.getByRole('button', { name: 'Send' });
  expect(send.className).toContain('crewlet-icon-btn--primary');
  expect(send.className).toContain('crewlet-send-button--send');
  send.focus();
  fireEvent.click(send);
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<SendButton mode="stop" onPress={onPress} />);
  const stop = screen.getByRole('button', { name: 'Stop' });
  expect(stop).toBe(send);
  expect(document.activeElement).toBe(stop);
  expect(stop.className).toContain('crewlet-icon-btn--secondary');
  expect(stop.className).toContain('crewlet-send-button--stop');
  fireEvent.click(stop);
  expect(onPress).toHaveBeenCalledTimes(2);
});

test('draws both glyphs in one hidden cell, the stop square filled', () => {
  const { container } = render(<SendButton mode="stop" onPress={() => {}} />);
  const cell = container.querySelector('.crewlet-send-button__glyphs')!;
  expect(cell.getAttribute('aria-hidden')).toBe('true');
  expect(cell.querySelector('.crewlet-send-button__glyph--send')).not.toBeNull();
  expect(cell.querySelector('.crewlet-send-button__glyph--stop')!.getAttribute('fill')).toBe('currentColor');
});

test('a reason holds Send, soft disabled, described and in the tooltip', () => {
  const onPress = vi.fn();
  render(<SendButton mode="send" onPress={onPress} disabledReason="Write a question first" />);
  const send = screen.getByRole('button', { name: 'Send' });
  expect(send.getAttribute('aria-disabled')).toBe('true');
  expect(document.getElementById(send.getAttribute('aria-describedby')!)!.textContent).toBe('Write a question first');
  expect(send.getAttribute('title')).toBe('Write a question first');
  fireEvent.click(send);
  expect(onPress).not.toHaveBeenCalled();
});

test('Stop runs freely, and a stop already under way holds a second press', () => {
  const onPress = vi.fn();
  const { rerender } = render(<SendButton mode="stop" onPress={onPress} />);
  const stop = screen.getByRole('button', { name: 'Stop' });
  expect(stop.hasAttribute('aria-disabled')).toBe(false);
  expect(stop.getAttribute('title')).toBe('Stop');
  fireEvent.click(stop);
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<SendButton mode="stop" onPress={onPress} disabledReason="Stopping" />);
  expect(stop.getAttribute('aria-disabled')).toBe('true');
  expect(stop.getAttribute('title')).toBe('Stopping');
  fireEvent.click(stop);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('takes its words from labels, and a title of its own while it can be pressed', () => {
  render(<SendButton mode="stop" onPress={() => {}} labels={{ stop: 'Stop answering' }} title="Stop answering (Esc)" />);
  const stop = screen.getByRole('button', { name: 'Stop answering' });
  expect(stop.getAttribute('title')).toBe('Stop answering (Esc)');
});

test('the running arc and the glyph change stop under a reduced-motion preference', () => {
  const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  expect(reduced).toMatch(/\.crewlet-send-button--stop::before\s*\{[^}]*animation: none;/);
  expect(reduced).toMatch(/\.crewlet-send-button__glyph\s*\{\s*transition: none;/);
  expect(reduced).toMatch(/\.crewlet-send-button\s*\{\s*transition: none;/);
});

test('carries no axe violation in any state', async () => {
  const { container } = render(
    <main>
      <SendButton mode="send" onPress={() => {}} />
      <SendButton mode="send" onPress={() => {}} disabledReason="Type a question first" />
      <SendButton mode="stop" onPress={() => {}} />
      <SendButton mode="stop" onPress={() => {}} disabledReason="Stopping" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
