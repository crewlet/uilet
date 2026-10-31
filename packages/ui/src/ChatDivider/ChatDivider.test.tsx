/**
 * A line between the rows of a conversation: the New line, which takes no
 * height, and a quiet labelled rule.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
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
