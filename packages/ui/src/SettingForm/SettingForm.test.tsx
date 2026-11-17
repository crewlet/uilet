/** SettingForm: one setting's panel, its control, its short lines and its two buttons. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Input } from '../Input/index.js';
import { SettingForm } from './index.js';

afterEach(cleanup);

function panel(props: Partial<Parameters<typeof SettingForm>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(
    <SettingForm label="Review rounds per turn" htmlFor="rounds" onSave={onSave} onCancel={onCancel} {...props}>
      {(field) => <Input id={field.id} aria-describedby={field.describedBy} defaultValue="4" />}
    </SettingForm>,
  );
  return { onSave, onCancel };
}

test('labels its control and describes it with the hint and the error', () => {
  panel({ hint: '1 to 10', error: 'At most 10.' });
  const field = screen.getByLabelText('Review rounds per turn');
  const described = (field.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
  expect(described).toEqual(['1 to 10', 'At most 10.']);
});

test('saves on Enter in the field and on Save, and cancels on Cancel', () => {
  const { onSave, onCancel } = panel();
  fireEvent.submit(screen.getByLabelText('Review rounds per turn'));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onSave).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('holds Save, reachable and saying why, while it has nothing to save', () => {
  const { onSave } = panel({ saveHeld: 'This is the value already.' });
  const save = screen.getByRole('button', { name: 'Save' });
  fireEvent.click(save);
  fireEvent.submit(screen.getByLabelText('Review rounds per turn'));
  expect(onSave).not.toHaveBeenCalled();
  expect(save.getAttribute('aria-disabled')).toBe('true');
});

test("says the save's outcome between the field and the buttons, and Save's word for the press", () => {
  panel({ status: <p>Every schedule moves with it.</p>, saveLabel: 'Save anyway', subject: 'Agent CEO' });
  expect(screen.getByText('Every schedule moves with it.')).toBeTruthy();
  expect(screen.getByText('Agent CEO')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Save anyway' })).toBeTruthy();
});
