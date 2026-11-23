/**
 * A process's steps, one plain line each: the state is read with every step,
 * the call behind it and a failure's reason sit under it, and a long list
 * folds to its last steps under one line that counts the rest and their
 * failures, opened by Show all and folded again by Show fewer.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { StepTimeline, type StepTimelineStep } from './index.js';

afterEach(cleanup);

const step = (n: number, state: StepTimelineStep['state'] = 'done', extra: Partial<StepTimelineStep> = {}) => ({
  key: `s${n}`,
  text: `Step ${n}`,
  state,
  ...extra,
});

test('every step reads its state after its words', () => {
  render(
    <StepTimeline
      label="What the run did"
      steps={[step(1), step(2, 'failed', { why: 'The read was refused' }), step(3, 'running'), step(4, 'pending')]}
    />,
  );
  const items = within(screen.getByRole('list', { name: 'What the run did' })).getAllByRole('listitem');
  expect(items.map((li) => li.textContent)).toEqual([
    'Step 1, Done',
    'Step 2, FailedThe read was refused',
    'Step 3, In progress',
    'Step 4, Not started',
  ]);
  expect(items.map((li) => li.dataset.state)).toEqual(['done', 'failed', 'running', 'pending']);
});

test('the call behind a step and its time stand quiet under and beside it', () => {
  render(
    <StepTimeline
      label="Steps"
      steps={[step(1, 'done', { detail: 'tokens days=7', time: '07:02', dateTime: '2026-11-23T07:02:00Z' })]}
    />,
  );
  expect(screen.getByText('tokens days=7').className).toContain('crewlet-step-timeline__detail');
  const time = screen.getByText('07:02');
  expect(time.tagName).toBe('TIME');
  expect(time.getAttribute('datetime')).toBe('2026-11-23T07:02:00Z');
});

test('a long list folds to its last steps under a count of the rest and their failures', () => {
  const steps = Array.from({ length: 12 }, (_, i) => step(i + 1, i === 2 || i === 4 ? 'failed' : 'done'));
  render(<StepTimeline label="Steps" steps={steps} collapseAfter={8} tail={4} />);
  const list = screen.getByRole('list', { name: 'Steps' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  expect(within(list).getAllByRole('listitem')[0]!.textContent).toContain('Step 9');
  const fold = screen.getByRole('button', { name: /8 earlier steps, 2 failed/ });
  expect(fold.getAttribute('aria-expanded')).toBe('false');
  expect(fold.textContent).toContain('Show all 12');

  fireEvent.click(fold);
  expect(within(list).getAllByRole('listitem')).toHaveLength(12);
  const fewer = screen.getByRole('button', { name: 'Show fewer' });
  expect(fewer.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(fewer);
  expect(within(list).getAllByRole('listitem')).toHaveLength(4);
});

test('a list at its fold point is drawn whole, with no fold', () => {
  render(<StepTimeline label="Steps" steps={Array.from({ length: 8 }, (_, i) => step(i + 1))} collapseAfter={8} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
  expect(screen.queryByRole('button')).toBeNull();
});

test('it passes axe, folded and open', async () => {
  const { container } = render(
    <StepTimeline
      label="Steps"
      steps={Array.from({ length: 10 }, (_, i) => step(i + 1, i === 9 ? 'running' : 'done', { detail: `read_${i}` }))}
    />,
  );
  expect((await axe.run(container)).violations).toEqual([]);
  fireEvent.click(screen.getByRole('button'));
  expect((await axe.run(container)).violations).toEqual([]);
});
