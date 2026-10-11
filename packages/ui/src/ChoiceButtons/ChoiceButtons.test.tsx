/**
 * One answer sent with one press: the recommended option first and marked, a
 * pending answer that holds every option still, and a reason that keeps focus.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { ChoiceButtons, type ChoiceButtonOption } from './index.js';

afterEach(cleanup);

const OPTIONS: ChoiceButtonOption[] = [
  { value: 'greedy', label: 'Greedy only', detail: 'Simple and fast.' },
  { value: 'exact', label: 'Exact search', detail: 'Fewest transfers.' },
  { value: 'later', label: 'Decide later' },
];

test('is a named group of buttons, the recommended one first and marked in its name', () => {
  render(<ChoiceButtons label="Answers" options={OPTIONS} recommended="exact" onChoose={() => {}} />);
  const group = screen.getByRole('group', { name: 'Answers' });
  const buttons = Array.from(group.querySelectorAll('button'));
  expect(buttons.map((b) => b.textContent)).toEqual([
    'Exact search Fewest transfers. Recommended',
    'Greedy only Simple and fast.',
    'Decide later',
  ]);
  expect(buttons[0]!.className).toContain('crewlet-choice-buttons__option--recommended');
  expect(screen.getByRole('button', { name: 'Exact search Fewest transfers. Recommended' })).toBeTruthy();
});

test('keeps the given order where nothing is recommended', () => {
  render(<ChoiceButtons label="Answers" options={OPTIONS} recommended="none-of-these" onChoose={() => {}} />);
  const labels = screen.getAllByRole('button').map((b) => b.querySelector('.crewlet-choice-buttons__label')!.textContent);
  expect(labels).toEqual(['Greedy only', 'Exact search', 'Decide later']);
  expect(document.querySelector('.crewlet-choice-buttons__option--recommended')).toBeNull();
});

test('one press sends the option', () => {
  const onChoose = vi.fn();
  render(<ChoiceButtons label="Answers" options={OPTIONS} onChoose={onChoose} />);
  fireEvent.click(screen.getByRole('button', { name: /Decide later/ }));
  expect(onChoose).toHaveBeenCalledWith('later');
});

test('while one is on its way every option holds still, and the one sent says it is busy', () => {
  const onChoose = vi.fn();
  render(<ChoiceButtons label="Answers" options={OPTIONS} pending="greedy" onChoose={onChoose} />);
  const sent = screen.getByRole('button', { name: /Greedy only/ });
  const other = screen.getByRole('button', { name: /Exact search/ });
  expect(sent.getAttribute('aria-busy')).toBe('true');
  expect(other.getAttribute('aria-busy')).toBeNull();
  expect(other.getAttribute('aria-disabled')).toBe('true');
  // Soft, never native: the control keeps its focus.
  expect((other as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(other);
  expect(onChoose).not.toHaveBeenCalled();
});

test('a reason nothing can be chosen is read after each option, and nothing is sent', () => {
  const onChoose = vi.fn();
  render(
    <ChoiceButtons
      label="Answers"
      options={OPTIONS}
      onChoose={onChoose}
      disabledReason="Only the approver can answer."
    />,
  );
  const button = screen.getByRole('button', { name: /Exact search/ });
  const reason = document.getElementById(button.getAttribute('aria-describedby')!);
  expect(reason?.textContent).toBe('Only the approver can answer.');
  fireEvent.click(button);
  expect(onChoose).not.toHaveBeenCalled();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Decision</h1>
      <ChoiceButtons label="Answers" options={OPTIONS} recommended="greedy" onChoose={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
