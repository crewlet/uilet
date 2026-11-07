/**
 * A line between the rows of a conversation: the New line, which takes no
 * height, and a quiet labelled rule.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { installMotion, installSheets, pseudoElement } from '../../../../apps/ui-tests/src/cascade.js';
import { afterEach, expect, test } from 'vitest';
import { motion } from '@crewlethq/tokens';
import { tokenMs } from '../utils/tokenMs.js';
import { ChatDivider } from './index.js';

afterEach(cleanup);

test('each line is a separator named by its words, found again by its variant', () => {
  render(
    <>
      <ChatDivider variant="unread" label="New" />
      <ChatDivider variant="date" label="3 replies" />
    </>,
  );
  const unread = screen.getByRole('separator', { name: 'New' });
  expect(unread.getAttribute('data-divider')).toBe('unread');
  expect(unread.classList.contains('crewlet-chat-divider--unread')).toBe(true);
  const date = screen.getByRole('separator', { name: '3 replies' });
  expect(date.getAttribute('data-divider')).toBe('date');
  // The words are drawn once and named once.
  expect(date.textContent).toBe('3 replies');
});

test('the New line takes no height and stops under the pinned pill when brought into view', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(here, 'ChatDivider.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const at = css.indexOf('.crewlet-chat-divider--unread {');
  const body = css.slice(at, css.indexOf('}', at));
  expect(body).toMatch(/height:\s*0;/);
  expect(body).toMatch(/scroll-margin-top:\s*calc\(var\(--crewlet-chat-day-pin\) \+ var\(--crewlet-chat-day-pill\)/);
  // The line is drawn in the danger hue and its word in the danger ink.
  expect(css).toMatch(/\.crewlet-chat-divider--unread::before \{[^}]*background:\s*var\(--color-feedback-danger\);/);
  expect(css).toMatch(/\.crewlet-chat-divider--unread \.crewlet-chat-divider__label \{[^}]*color:\s*var\(--color-feedback-danger-ink\);/);
});

test('a count stands at the start on the faces\' edge, its hairline running on after it', () => {
  const uninstall = installSheets('ChatMessage/ChatScale.css', 'ChatDivider/ChatDivider.css');
  try {
    render(<ChatDivider variant="count" label="24 replies" />);
    const line = screen.getByRole('separator', { name: '24 replies' });
    expect(line.getAttribute('data-divider')).toBe('count');
    expect(line.classList.contains('crewlet-chat-divider--count')).toBe(true);
    // A row whose words lead: the rule is its pseudo-element, drawn after them.
    expect(getComputedStyle(line).display).toBe('flex');
    expect(line.firstElementChild!.textContent).toBe('24 replies');
  } finally {
    uninstall();
  }
});

// THE NEW LINE GLOWS ONCE AS IT APPEARS, when asked: in for a step, held, out
// for a step, and still under reduced motion. Mutation: drop the animation or
// its reduced-motion stop.
test('a pulsing New line glows once as it appears, and stands still under reduced motion', () => {
  const sheets = ['ChatMessage/ChatScale.css', 'ChatDivider/ChatDivider.css'] as const;
  const moving = installMotion('no-preference', ...sheets);
  try {
    const { container, rerender } = render(<ChatDivider variant="unread" label="New" />);
    const line = () => pseudoElement(container.querySelector('.crewlet-chat-divider')!, 'before');
    expect(['', 'none']).toContain(getComputedStyle(line()).animationName);
    rerender(<ChatDivider variant="unread" label="New" pulse />);
    expect(getComputedStyle(line()).animation).toMatch(/crewlet-chat-divider-pulse/);
    // Five base steps: about 150ms in, 450ms held and 150ms out.
    expect(getComputedStyle(line()).animation).toMatch(/calc\(var\(--motion-duration-base\) \* 5\)/);
    expect(tokenMs(motion.duration.base) * 5).toBeGreaterThanOrEqual(700);
    expect(tokenMs(motion.duration.base) * 5).toBeLessThanOrEqual(800);
    // Only the New line pulses.
    rerender(<ChatDivider variant="date" label="Today" pulse />);
    expect(container.querySelector('.is-pulsing')).toBeNull();
  } finally {
    moving();
    cleanup();
  }
  const still = installMotion('reduce', ...sheets);
  try {
    const { container } = render(<ChatDivider variant="unread" label="New" pulse />);
    expect(getComputedStyle(pseudoElement(container.querySelector('.crewlet-chat-divider')!, 'before')).animation).toBe('none');
  } finally {
    still();
  }
});
