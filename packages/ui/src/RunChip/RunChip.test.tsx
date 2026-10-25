/**
 * A request's state as a disclosure: named by its words with a comma where
 * the separator is drawn, open while the request works and closed once it
 * settles, words with a reserved chevron slot while there is nothing to open,
 * and the state's tone in the title's ink.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { channels, installThemed, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { StepList } from '../Stepper/index.js';
import { RunChip, type RunState } from './index.js';

afterEach(cleanup);

const tokenColour = (palette: ReadonlyMap<string, string>, name: string) => channels(palette.get(`--${name}`)!);

const steps = <StepList label="Steps" steps={[{ id: 'read', label: 'Read token spend by agent', state: 'running' }]} />;

test('is named and copied by its words, the separator drawn and a comma said in its place', () => {
  const { container } = render(
    <RunChip state="done" title="Done in 5s" meta="2 steps">
      {steps}
    </RunChip>,
  );
  const trigger = screen.getByRole('button', { name: 'Done in 5s, 2 steps' });
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  // THE DOT IS THE STYLE SHEET'S, so a copy of the chip carries the comma
  // alone ("Waiting for your approval, · 2 steps" was the defect).
  expect(trigger.textContent).toBe('Done in 5s, 2 steps');
  expect(container.querySelector('.crewlet-run-chip__meta')!.textContent).toBe('2 steps');
  const css = readFileSync(join(import.meta.dirname, 'RunChip.css'), 'utf8');
  expect(css).toMatch(/\.crewlet-run-chip__meta::before\s*\{[^}]*content: '\\00b7' \/ '';/);
});

test('opens while the request works and closes itself when it settles', () => {
  const { rerender } = render(
    <RunChip state="working" title="Working" meta="3s">
      {steps}
    </RunChip>,
  );
  const trigger = screen.getByRole('button');
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('region', { name: 'Working, 3s' })).toBeTruthy();
  // The reader closes it; a ticking time does not reopen it.
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  rerender(
    <RunChip state="working" title="Working" meta="4s">
      {steps}
    </RunChip>,
  );
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  rerender(
    <RunChip state="done" title="Done in 5s" meta="1 step">
      {steps}
    </RunChip>,
  );
  expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
  // Opened by the reader once done, it stays open.
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true');
});

test('with nothing to open it is words, its chevron slot kept and unpainted', () => {
  const { container } = render(<RunChip state="thinking" title="Thinking" />);
  expect(screen.queryByRole('button')).toBeNull();
  expect(container.querySelector('.crewlet-disclosure__trigger--static')!.textContent).toBe('Thinking');
  expect(container.querySelector('.crewlet-disclosure__chevron--reserved')).not.toBeNull();
  // The mark stands after the reserved slot, where the working chip will draw it.
  expect(container.querySelector('.crewlet-disclosure__icon .crewlet-step-mark--running')).not.toBeNull();
});

test('a controlled chip follows its open prop and reports presses', () => {
  const changes: boolean[] = [];
  render(
    <RunChip state="working" title="Working" open={false} onOpenChange={(next) => changes.push(next)}>
      {steps}
    </RunChip>,
  );
  fireEvent.click(screen.getByRole('button'));
  expect(changes).toEqual([true]);
  expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
});

test('waiting takes the warning ink and failed the danger ink; the rest the secondary ink', () => {
  const uninstall = installThemed('light', 'Disclosure/Disclosure.css', 'RunChip/RunChip.css');
  const colours = themeColours('light');
  const ink = (state: RunState) => {
    const { container, unmount } = render(
      <RunChip state={state} title={state}>
        {steps}
      </RunChip>,
    );
    const colour = channels(getComputedStyle(container.querySelector('.crewlet-run-chip__trigger')!).color);
    unmount();
    return colour;
  };
  expect(ink('waiting')).toEqual(tokenColour(colours, 'color-feedback-warning-ink'));
  expect(ink('failed')).toEqual(tokenColour(colours, 'color-feedback-danger-ink'));
  expect(ink('done')).toEqual(tokenColour(colours, 'color-text-secondary'));
  uninstall();
});

test('carries no axe violation, open, closed and with nothing to open', async () => {
  const { container } = render(
    <main>
      <RunChip state="working" title="Working" meta="3s">
        {steps}
      </RunChip>
      <RunChip state="done" title="Done in 5s" meta="2 steps">
        {steps}
      </RunChip>
      <RunChip state="thinking" title="Thinking" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
