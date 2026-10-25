/**
 * The assistant at work: the Assistant's mark with turning blades, a status
 * line under a shimmer, and one announcement however often the line changes.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ThinkingIndicator } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'ThinkingIndicator.css'), 'utf8');

test('draws the Assistant mark, hidden, with the blades the stylesheet turns', () => {
  const { container } = render(<ThinkingIndicator status="Thinking" />);
  const mark = container.querySelector('svg.crewlet-product-mark--assistant')!;
  expect(mark.getAttribute('aria-hidden')).toBe('true');
  expect(mark.querySelectorAll('[data-motion="turn"]')).toHaveLength(1);
  expect(css).toMatch(/\.crewlet-thinking__mark \[data-motion='turn'\]\s*\{[^}]*animation:/);
});

test('says the status beside the mark, and nothing beside it without one', () => {
  const { container, rerender } = render(<ThinkingIndicator status="Listing the agents" />);
  const line = container.querySelector('.crewlet-thinking__status')!;
  expect(line.textContent).toBe('Listing the agents');
  // The visible line is decoration for assistive technology: steps are read
  // from their own list, not from a line that changes every second.
  expect(line.getAttribute('aria-hidden')).toBe('true');
  rerender(<ThinkingIndicator />);
  expect(container.querySelector('.crewlet-thinking__status')).toBeNull();
});

test('announces its label once, and a new status does not change what is announced', () => {
  const { rerender } = render(<ThinkingIndicator status="Thinking" />);
  const region = screen.getByRole('status');
  expect(region.textContent).toBe('Thinking');
  rerender(<ThinkingIndicator status="Reading Worklet" />);
  expect(screen.getByRole('status')).toBe(region);
  expect(region.textContent).toBe('Thinking');
  expect(screen.getAllByRole('status')).toHaveLength(1);
});

test('takes its spoken words from label', () => {
  render(<ThinkingIndicator label="Working on your question" />);
  expect(screen.getByRole('status').textContent).toBe('Working on your question');
});

test('stops every motion under a reduced-motion preference', () => {
  const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  expect(reduced).toMatch(/\.crewlet-thinking__mark \[data-motion='turn'\]\s*\{\s*animation: none;/);
  expect(reduced).toMatch(/\.crewlet-thinking__status\s*\{[^}]*animation: none;/);
  expect(reduced).toMatch(/\.crewlet-thinking__status\s*\{[^}]*background-image: none;/);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ThinkingIndicator status="Thinking" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
