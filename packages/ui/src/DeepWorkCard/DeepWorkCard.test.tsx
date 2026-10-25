/**
 * A deep run's card: its state on the tag, its limits as named meters, its
 * activity in the mono face, its steps open while few and folded behind
 * their count when many, and its note in the state's tone.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import type { StepListStep } from '../Stepper/index.js';
import { DEEP_WORK_STATES, DeepWorkCard, type DeepWorkMeasure } from './index.js';

afterEach(cleanup);

const measures: DeepWorkMeasure[] = [
  { key: 'time', label: 'Time', value: 240, max: 1200, hint: '4m of 20m', valueText: '4 minutes of 20' },
  { key: 'calls', label: 'Crewlet calls', value: 12, max: 60, hint: '12 of 60' },
  { key: 'budget', label: 'Budget used', value: 34, max: 100, hint: '34%' },
];

const step = (n: number): StepListStep => ({ id: `s${n}`, label: `Read page ${n}`, state: 'done' });

test('the card is named by its title and its state, and draws every limit as a meter', () => {
  render(<DeepWorkCard state="running" goal="Audit last week's spend" measures={measures} />);
  expect(screen.getByRole('region', { name: 'Deep work Working' })).toBeTruthy();
  expect(screen.getByText("Audit last week's spend")).toBeTruthy();
  const meters = screen.getAllByRole('meter');
  expect(meters).toHaveLength(3);
  expect(meters[0]!.getAttribute('aria-valuetext')).toBe('4 minutes of 20');
  expect(meters[1]!.getAttribute('aria-valuetext')).toBe('12 of 60');
});

test('activity is a named list of mono lines, each line whole in its title', () => {
  render(<DeepWorkCard state="running" goal="Build the report" activity={['git status', 'npm test']} />);
  const list = screen.getByRole('list', { name: 'Latest activity' });
  const lines = list.querySelectorAll('li');
  expect(Array.from(lines).map((li) => li.textContent)).toEqual(['git status', 'npm test']);
  expect(lines[1]!.querySelector('code')).not.toBeNull();
  expect(lines[1]!.getAttribute('title')).toBe('npm test');
});

test('a few steps are drawn open; many fold behind their count', () => {
  const { rerender } = render(<DeepWorkCard state="running" goal="g" steps={[step(1), step(2)]} />);
  expect(screen.getByRole('list', { name: 'Steps' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /steps/ })).toBeNull();
  rerender(<DeepWorkCard state="running" goal="g" steps={[1, 2, 3, 4, 5].map(step)} />);
  const toggle = screen.getByRole('button', { name: /5 steps/ });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('list', { name: 'Steps' }).querySelectorAll('li')).toHaveLength(5);
});

test('a failed run says why as an alert, a waiting run as a status', () => {
  const { rerender } = render(<DeepWorkCard state="failed" goal="g" note="The run reached its time limit." />);
  expect(screen.getByRole('alert').textContent).toBe('The run reached its time limit.');
  rerender(<DeepWorkCard state="waiting" goal="g" note="Waiting for your approval of the change below." />);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('Waiting for your approval');
});

test('every state has its own words', () => {
  const said = new Set<string>();
  for (const state of DEEP_WORK_STATES) {
    const { unmount } = render(<DeepWorkCard state={state} goal="g" />);
    const region = screen.getByRole('region');
    said.add(region.getAttribute('aria-labelledby') ? (region.textContent ?? '') : '');
    unmount();
  }
  expect(said.size).toBe(DEEP_WORK_STATES.length);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <DeepWorkCard
        state="stopped"
        goal="Audit last week's spend"
        measures={measures}
        activity={['ls -la']}
        steps={[1, 2, 3, 4].map(step)}
        note="You stopped it."
      />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
