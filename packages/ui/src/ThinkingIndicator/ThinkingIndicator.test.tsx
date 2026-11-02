/**
 * The assistant at work: the Assistant's mark with its spark turning and its
 * companion twinkling, a status line under a shimmer, and one announcement
 * however often the line changes.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { ThinkingIndicator } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'ThinkingIndicator.css'), 'utf8');

/** The body of the first rule whose selector is exactly `selector`, outside any at-rule. */
const ruleBody = (source: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';
};

/** One keyframes block, as text. */
const keyframes = (name: string) => new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? '';

test('draws the Assistant mark, hidden, on the 16 pixel grid, with the two parts the stylesheet moves', () => {
  const { container } = render(<ThinkingIndicator status="Thinking" />);
  const mark = container.querySelector('svg.crewlet-product-mark--assistant')!;
  expect(mark.getAttribute('aria-hidden')).toBe('true');
  expect(mark.getAttribute('viewBox')).toBe('0 0 16 16');
  expect(mark.querySelectorAll('[data-motion="turn"]')).toHaveLength(1);
  expect(mark.querySelectorAll('[data-motion="twinkle"]')).toHaveLength(1);
});

test('turns the spark and twinkles its companion on one timeline, each about its own centre', () => {
  const pivot = ruleBody(css, ".crewlet-thinking__mark [data-motion='turn'],\n.crewlet-thinking__mark [data-motion='twinkle']");
  expect(pivot).toMatch(/transform-box: fill-box;/);
  expect(pivot).toMatch(/transform-origin: center;/);
  expect(css).toMatch(
    /\.crewlet-thinking__mark \[data-motion='turn'\]\s*\{\s*animation: crewlet-thinking-turn var\(--motion-duration-spark\) linear infinite;/,
  );
  expect(css).toMatch(
    /\.crewlet-thinking__mark \[data-motion='twinkle'\]\s*\{\s*animation: crewlet-thinking-twinkle var\(--motion-duration-spark\) linear infinite;/,
  );
});

test('tucks the spark through the middle of its quarter turn, in one transform', () => {
  // The design's stops and the three pieces of its one eased curve. A tip at
  // full size sweeps through the companion between 26.6 and 63.4 degrees, so
  // the scale must already be 0.8 by 15.37 degrees and hold it to 74.63.
  const turn = keyframes('crewlet-thinking-turn');
  expect(turn).toMatch(/0%,\s*20% \{\s*transform: rotate\(0deg\) scale\(1\);\s*animation-timing-function: cubic-bezier\(0\.4878, 0, 0\.7883, 0\.4041\);/);
  expect(turn).toMatch(/37\.5% \{\s*transform: rotate\(15\.37deg\) scale\(0\.8\);\s*animation-timing-function: cubic-bezier\(0\.4462, 0\.2792, 0\.5538, 0\.7208\);/);
  expect(turn).toMatch(/52\.5% \{\s*transform: rotate\(74\.63deg\) scale\(0\.8\);\s*animation-timing-function: cubic-bezier\(0\.2117, 0\.5959, 0\.5122, 1\);/);
  expect(turn).toMatch(/70%,\s*100% \{\s*transform: rotate\(90deg\) scale\(1\);/);
  // Rotate and scale never animate as separate properties that could drift.
  expect(turn).not.toMatch(/(^|\s)(rotate|scale):/);
  const twinkle = keyframes('crewlet-thinking-twinkle');
  expect(twinkle).toMatch(/45% \{\s*transform: scale\(0\.7\);\s*opacity: 0\.5;/);
  expect(twinkle).toMatch(/70%,\s*100% \{\s*transform: scale\(1\);\s*opacity: 1;/);
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

test('holds a still working pose under a reduced-motion preference, and stops every motion', () => {
  const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  expect(reduced).toMatch(/\.crewlet-thinking__mark \[data-motion='turn'\]\s*\{\s*animation: none;\s*transform: scale\(0\.8\);\s*\}/);
  expect(reduced).toMatch(
    /\.crewlet-thinking__mark \[data-motion='twinkle'\]\s*\{\s*animation: none;\s*transform: scale\(0\.7\);\s*opacity: 0\.5;\s*\}/,
  );
  // The pose is swapped in at once: nothing in the stylesheet eases into it.
  expect(css).not.toMatch(/transition(-[a-z]+)?\s*:/);
  expect(reduced).toMatch(/\.crewlet-thinking__status\s*\{[^}]*animation: none;/);
  expect(reduced).toMatch(/\.crewlet-thinking__status\s*\{[^}]*background-image: none;/);
});

// A request waiting behind the agent's current task must not read as one being
// written. Mutation: drop the queued rules, or keep either animation, and a
// queued indicator turns its spark as if the work had started.
test('rests while queued: the mark in its idle pose, the line still, and it says Queued', () => {
  const { container, rerender } = render(
    <ThinkingIndicator status="Product Manager is queued behind its current task" queued />,
  );
  const root = container.querySelector('.crewlet-thinking')!;
  expect(root.classList.contains('crewlet-thinking--queued')).toBe(true);
  expect(screen.getByRole('status').textContent).toBe('Queued');
  const mark = ruleBody(
    css,
    ".crewlet-thinking--queued .crewlet-thinking__mark [data-motion='turn'],\n.crewlet-thinking--queued .crewlet-thinking__mark [data-motion='twinkle']",
  );
  expect(mark).toMatch(/animation: none;/);
  expect(mark).toMatch(/transform: none;/);
  expect(mark).toMatch(/opacity: 1;/);
  const line = ruleBody(css, '.crewlet-thinking--queued .crewlet-thinking__status');
  expect(line).toMatch(/background-image: none;/);
  expect(line).toMatch(/color: var\(--color-text-secondary\);/);
  expect(line).not.toMatch(/crewlet-thinking-shimmer/);
  // When the work starts the same indicator moves again, and says so.
  rerender(<ThinkingIndicator status="Thinking" />);
  expect(container.querySelector('.crewlet-thinking--queued')).toBeNull();
  expect(screen.getByRole('status').textContent).toBe('Thinking');
});

test('a label still wins over the queued default', () => {
  render(<ThinkingIndicator queued label="Waiting for the Product Manager" />);
  expect(screen.getByRole('status').textContent).toBe('Waiting for the Product Manager');
});

// A long status in a column that sizes its items by their content (a
// message's footer) made the indicator as wide as its words, and a phone's
// transcript scrolled sideways. Mutation: drop the cap, and it reads none.
test('is never wider than its column, so a long status truncates', () => {
  const uninstall = installSheets('ThinkingIndicator/ThinkingIndicator.css');
  try {
    const { container } = render(<ThinkingIndicator status="Senior Backend Engineer is writing a reply" />);
    const root = container.querySelector<HTMLElement>('.crewlet-thinking')!;
    expect(getComputedStyle(root).maxWidth).toBe('100%');
    const line = container.querySelector<HTMLElement>('.crewlet-thinking__status')!;
    expect(getComputedStyle(line).textOverflow).toBe('ellipsis');
  } finally {
    uninstall();
  }
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
