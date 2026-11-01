/**
 * A request's steps: an ordered list named for a screen reader, each state
 * said in words after its label and drawn as one mark in one column, the
 * detail breaking only at its separators, and ids that must be unique.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { CircleDashedGlyph } from '@crewlethq/icons/glyphs';
import { installMotion } from '../../../../apps/ui-tests/src/cascade.js';
import { STEP_STATES, StepList, stepDetailPieces, type StepListStep } from './index.js';

afterEach(cleanup);

const STEPS: StepListStep[] = [
  {
    id: 'search',
    label: 'Search for duplicates',
    state: 'done',
    duration: '0.3s',
    detail: 'search_work · GET /work/search?q=flaky+sign-in+test',
  },
  { id: 'prepare', label: 'Prepare the task', state: 'running', detail: 'create_task' },
];

test('is an ordered list named for a screen reader, each state said after its label', () => {
  render(<StepList label="Steps" summary="1 of 2 done" steps={STEPS} />);
  const list = screen.getByRole('list', { name: 'Steps' });
  expect(list.tagName).toBe('OL');
  const items = within(list).getAllByRole('listitem');
  expect(items.map((item) => item.querySelector('.crewlet-step-list__label')!.textContent)).toEqual([
    'Search for duplicates, Done',
    'Prepare the task, Running',
  ]);
  expect(screen.getByText('1 of 2 done')).toBeTruthy();
  expect(screen.getByText('0.3s').className).toContain('crewlet-step-list__duration');
});

test('every state has its own mark, and the running mark is the spinner at the glyph size', () => {
  const { container } = render(
    <StepList label="Steps" steps={STEP_STATES.map((state) => ({ id: state, label: state, state }))} />,
  );
  for (const state of STEP_STATES) {
    const mark = container.querySelector(`.crewlet-step-list__step--${state} .crewlet-step-mark--${state}`);
    expect(mark, state).not.toBeNull();
    expect(mark!.getAttribute('aria-hidden')).toBe('true');
  }
  const ring = container.querySelector('.crewlet-step-mark--running .crewlet-spinner')!;
  expect(ring.className).toContain('crewlet-spinner--sm');
});

test('a step not started is a dashed circle, said "Not started", and quiet through', () => {
  const { container } = render(
    <StepList
      label="Stages"
      steps={[
        { id: 'address', label: 'Address', state: 'done', duration: '0 ms' },
        { id: 'connect', label: 'Connect', state: 'failed', duration: '30 ms', detail: 'connection refused' },
        { id: 'tls', label: 'Certificate', state: 'pending' },
      ]}
    />,
  );
  const step = container.querySelector('.crewlet-step-list__step--pending')!;
  // The outline of a step still to come, not one of the finished states' glyphs.
  const dashed = render(<CircleDashedGlyph size="sm" />).container.querySelector('svg')!.innerHTML;
  expect(step.querySelector('.crewlet-step-mark--pending svg')!.innerHTML).toBe(dashed);
  expect(step.querySelector('.crewlet-step-list__label')!.textContent).toBe('Certificate, Not started');
  // A caller says what "not started" means where it knows better.
  cleanup();
  render(<StepList label="Stages" labels={{ pending: 'Not reached' }} steps={[{ id: 'tls', label: 'Certificate', state: 'pending' }]} />);
  expect(screen.getByText(', Not reached')).toBeTruthy();
  // Its words take the mark's quiet ink, so the step is one ink rather than a full-ink label by a dimmed mark.
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'StepList.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(/\.crewlet-step-list__step--pending \.crewlet-step-list__label \{([^}]*)\}/.exec(css)?.[1]).toMatch(/color:\s*var\(--color-text-tertiary\)/);
  expect(css).toMatch(/\.crewlet-step-mark--pending[^{]*\{[^}]*--color-text-tertiary/);
});

test('a detail breaks only at a space or after a slash, a question mark or an ampersand', () => {
  expect(stepDetailPieces('get_spend · GET /tokens/breakdown?group=seat&window=week')).toEqual([
    'get_spend',
    ' ',
    '·',
    ' ',
    'GET',
    ' ',
    '/',
    'tokens/',
    'breakdown?',
    'group=seat&',
    'window=week',
  ]);
  // Never inside a name: sign-in stays one piece.
  expect(stepDetailPieces('q=flaky+sign-in+test')).toEqual(['q=flaky+sign-in+test']);
  const { container } = render(<StepList label="Steps" steps={STEPS} />);
  const pieces = Array.from(container.querySelectorAll('.crewlet-step-list__piece')).map((piece) => piece.textContent);
  expect(pieces).toContain('search?');
  expect(pieces).toContain('q=flaky+sign-in+test');
  expect(container.querySelector('.crewlet-step-list__detail')!.textContent).toBe(
    'search_work · GET /work/search?q=flaky+sign-in+test',
  );
});

test('under reduced motion the running ring stops and stays open', () => {
  const uninstall = installMotion('reduce', 'Spinner/Spinner.css', 'Stepper/StepList.css');
  const { container } = render(<StepList label="Steps" steps={STEPS} />);
  const ring = container.querySelector('.crewlet-spinner')!;
  expect(getComputedStyle(ring).animation).toBe('none');
  expect(getComputedStyle(ring).display).toBe('inline-block');
  uninstall();
});

test('refuses two steps with one id', () => {
  expect(() =>
    render(
      <StepList
        label="Steps"
        steps={[
          { id: 'a', label: 'One', state: 'done' },
          { id: 'a', label: 'Two', state: 'done' },
        ]}
      />,
    ),
  ).toThrow(/unique/);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <StepList label="Steps" summary="1 of 2 done" steps={STEPS} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
