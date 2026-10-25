import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { EditingStatus } from './EditingStatus.js';

afterEach(cleanup);

test('says editing, and adds unsaved changes once something differs', () => {
  const { rerender } = render(<EditingStatus dirty={false} />);
  const status = screen.getByRole('status');
  expect(status.textContent).toBe('Editing');
  rerender(<EditingStatus dirty />);
  expect(status.textContent).toBe('Editing, Unsaved changes');
  expect(status.className).toContain('crewlet-editing-status--dirty');
  rerender(<EditingStatus dirty saving />);
  expect(status.textContent).toBe('Editing, Saving');
});

test('takes its words from the caller', () => {
  render(<EditingStatus dirty labels={{ editing: 'Drafting', unsaved: 'Not published' }} />);
  expect(screen.getByRole('status').textContent).toBe('Drafting, Not published');
});

test('with a last save, says how long ago once nothing is unsaved, and announces only "Saved"', () => {
  const at = Date.now() - 2 * 60_000;
  const { rerender } = render(<EditingStatus dirty={false} savedAt={at} labels={{ editing: 'Draft' }} />);
  const status = screen.getByRole('status');
  const shown = status.querySelector('.crewlet-editing-status__state [aria-hidden="true"]')!;
  expect(shown.textContent).toMatch(/^Saved .*2.*ago$/);
  // The ticking time is hidden from the live region; the word is what it says.
  expect(status.querySelector('.crewlet-editing-status__state')!.textContent).toBe(`${shown.textContent}Saved`);
  // Unsaved edits and a save in flight say so instead.
  rerender(<EditingStatus dirty savedAt={at} labels={{ editing: 'Draft' }} />);
  expect(status.textContent).toBe('Draft, Unsaved changes');
  rerender(<EditingStatus dirty saving savedAt={at} labels={{ editing: 'Draft' }} />);
  expect(status.textContent).toBe('Draft, Saving');
});

test('the saved words are the caller’s', () => {
  render(
    <EditingStatus
      dirty={false}
      savedAt={Date.now() - 2 * 60_000}
      labels={{ editing: 'Entwurf', saved: (ago) => `gespeichert ${ago}`, savedSpoken: 'Gespeichert' }}
    />,
  );
  const state = screen.getByRole('status').querySelector('.crewlet-editing-status__state')!;
  expect(state.textContent).toMatch(/^gespeichert .*Gespeichert$/);
});
