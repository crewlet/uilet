/**
 * Who is typing and which agent is working, under a composer: typing as a
 * polite status, working as a ThinkingIndicator that announces its label
 * once, and one line's height held when there is nothing to say.
 */
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { ActivityLine } from './index.js';

afterEach(cleanup);

test('says who is typing in a status, which stands empty when nobody is', () => {
  const { rerender } = render(<ActivityLine typing="Product Manager is typing" />);
  const status = screen.getByRole('status');
  expect(status.textContent).toBe('Product Manager is typing');
  // The live region stays mounted, so the next change is heard.
  rerender(<ActivityLine />);
  expect(screen.getByRole('status')).toBe(status);
  expect(status.textContent).toBe('');
});

test('draws the working agent beside the Ask Crewlet mark, announcing its label once', () => {
  const { rerender } = render(
    <ActivityLine working="Senior Backend Engineer is writing a reply · Reading the diff" workingLabel="Senior Backend Engineer is writing a reply" />,
  );
  const line = document.querySelector('.crewlet-thinking__status')!;
  expect(line.textContent).toBe('Senior Backend Engineer is writing a reply · Reading the diff');
  const announced = screen.getAllByRole('status').find((region) => region.closest('.crewlet-thinking'))!;
  expect(announced.textContent).toBe('Senior Backend Engineer is writing a reply');
  rerender(
    <ActivityLine working="Senior Backend Engineer is writing a reply · Running the tests" workingLabel="Senior Backend Engineer is writing a reply" />,
  );
  expect(announced.textContent).toBe('Senior Backend Engineer is writing a reply');
});

test('draws a queued request still, with what it waits behind', () => {
  render(<ActivityLine working="Product Manager is queued behind its current task" queued />);
  const indicator = document.querySelector('.crewlet-thinking')!;
  expect(indicator.classList.contains('crewlet-thinking--queued')).toBe(true);
  expect(indicator.querySelector('.crewlet-thinking__status')!.textContent).toBe(
    'Product Manager is queued behind its current task',
  );
});

test('keeps one line of height, and never grows wider than its column', () => {
  const uninstall = installSheets('ChatMessage/ChatScale.css', 'ActivityLine/ActivityLine.css');
  try {
    const { container } = render(<ActivityLine working="A very long status" typing="Designer is typing" />);
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
      <ActivityLine typing="Designer is typing" working="CTO is writing a reply" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
