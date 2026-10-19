import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { EditingStatus } from './EditingStatus.js';

afterEach(cleanup);

test('says editing, and adds unsaved changes once something differs', () => {
  const { rerender } = render(<EditingStatus dirty={false} />);
  const status = screen.getByRole('status');
  expect(status.textContent).toBe('Editing');
  rerender(<EditingStatus dirty />);
  expect(status.textContent).toBe('EditingUnsaved changes');
  expect(status.className).toContain('crewlet-editing-status--dirty');
  rerender(<EditingStatus dirty saving />);
  expect(status.textContent).toBe('EditingSaving');
});

test('takes its words from the caller', () => {
  render(<EditingStatus dirty labels={{ editing: 'Drafting', unsaved: 'Not published' }} />);
  expect(screen.getByRole('status').textContent).toBe('DraftingNot published');
});
