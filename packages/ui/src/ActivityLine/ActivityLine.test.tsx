/**
 * Who is typing and which agents are working, under a composer: typing as a
 * polite status with its dots, agents as one WorkingLine with its own region,
 * the two kept apart, and one line's height held when there is nothing to say.
 */
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { ActivityLine } from './index.js';

afterEach(cleanup);

const agents = [
  { id: 'swe', name: 'Senior Backend Engineer', character: 'gemlet' as const, hue: 'cyan' as const, status: 'is thinking...' },
  { id: 'cto', name: 'CTO', status: 'is mulling it over...' },
];

/** The typing region: the one that is not the working line's. */
const typingRegion = () => screen.getAllByRole('status').find((region) => !region.closest('.crewlet-working-line'))!;

test('says who is typing in a status, with the dots after the words, and stands empty when nobody is', () => {
  const { rerender } = render(<ActivityLine typing="Product Manager is typing" />);
  const status = typingRegion();
  expect(status.textContent).toBe('Product Manager is typing');
  expect(status.lastElementChild!.classList.contains('crewlet-bouncing-dots')).toBe(true);
  // The live region stays mounted, so the next change is heard.
  rerender(<ActivityLine />);
  expect(typingRegion()).toBe(status);
  expect(status.textContent).toBe('');
});

test('draws the agents at work as one working line, whose region stays mounted while none is', () => {
  const { container, rerender } = render(<ActivityLine />);
  const line = container.querySelector('.crewlet-working-line')!;
  const region = line.querySelector('[role="status"]')!;
  expect(line.classList.contains('is-idle')).toBe(true);
  rerender(<ActivityLine agents={agents} />);
  expect(container.querySelector('.crewlet-working-line')).toBe(line);
  expect(line.querySelector('.crewlet-working-line__names')!.textContent).toBe('Senior Backend Engineer and CTO');
  expect(line.querySelector('.crewlet-working-line__verb')!.textContent).toBe('are working');
  expect(region.textContent).toBe('Senior Backend Engineer and CTO are working.');
});

test('keeps people typing apart from agents at work: words and dots, with no face', () => {
  const { container } = render(<ActivityLine agents={agents} typing="Designer is typing" />);
  const typing = container.querySelector('.crewlet-activity-line__typing')!;
  expect(typing.querySelector('.crewlet-avatar')).toBeNull();
  expect(typing.textContent).toBe('Designer is typing');
  expect(container.querySelector('.crewlet-working-line .crewlet-avatar-stack')).not.toBeNull();
  // People first, in reading order as on screen.
  const root = container.firstElementChild!;
  expect(root.firstElementChild).toBe(typing);
});

test('keeps one line of height, and never grows wider than its column', () => {
  const uninstall = installSheets('ChatMessage/ChatScale.css', 'ActivityLine/ActivityLine.css');
  try {
    const { container } = render(<ActivityLine agents={agents} typing="Designer is typing" />);
    const root = container.firstElementChild as HTMLElement;
    expect(getComputedStyle(root).minHeight).toBe('20px');
    for (const part of root.children) expect(getComputedStyle(part).maxWidth).toBe('100%');
  } finally {
    uninstall();
  }
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ActivityLine typing="Designer is typing" agents={agents} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
