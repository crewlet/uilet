/**
 * A lost race is said as an alert, names who won once the host knows, and
 * comes down when the reader dismisses it.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { Button } from '../Button/index.js';
import { ConflictNote } from './index.js';

afterEach(cleanup);

test('names whoever won the race, as an alert', () => {
  render(<ConflictNote subject="ENG-12" changedBy="Maya Ortiz" />);
  expect(screen.getByRole('alert').textContent).toContain(
    'ENG-12 was changed by Maya Ortiz since you opened it. Look again, then retry.',
  );
});

test('says the record changed while nobody can be named, or the given sentence', () => {
  const { rerender } = render(<ConflictNote subject="ENG-12" />);
  expect(screen.getByRole('alert').textContent).toContain('ENG-12 was changed since you opened it.');
  rerender(<ConflictNote subject="ENG-12" changedBy="" message="The task moved on to version 7." />);
  expect(screen.getByRole('alert').textContent).toContain('The task moved on to version 7.');
});

test('Dismiss is offered only with a handler, and calls it', () => {
  const onDismiss = vi.fn();
  const { rerender } = render(<ConflictNote subject="ENG-12" />);
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<ConflictNote subject="ENG-12" onDismiss={onDismiss} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('carries the host controls beside Dismiss, and its words can be replaced', () => {
  render(
    <ConflictNote
      subject="Roadmap"
      changedBy="Jane"
      actions={<Button size="small">Reload</Button>}
      onDismiss={() => {}}
      labels={{ dismiss: 'Schliessen' }}
    />,
  );
  expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Schliessen' })).toBeTruthy();
});

test('carries no violation', async () => {
  const { container } = render(<ConflictNote subject="ENG-12" changedBy="Maya" onDismiss={() => {}} />);
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
