/**
 * A checkbox is named by its label, described by its consequence, and toggled
 * from anywhere on its row.
 *
 * Ported from the engine dashboard's `ui/Checkbox.test.tsx`, against uilet's
 * own prop names. The cases are the same four, plus the two the rebuild adds:
 * a caller's own description is kept, and a third state can be shown.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Checkbox } from './Checkbox.js';

afterEach(cleanup);

function Choice({ disabled }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <Checkbox
      framed
      tone="danger"
      checked={on}
      onCheckedChange={setOn}
      disabled={disabled}
      label="Also remove the accounts Crewlet created"
      description="Each agent's account at the vendor is deleted."
    />
  );
}

test('the name is the label alone, and the consequence is its description', () => {
  render(<Choice />);
  const box = screen.getByRole('checkbox', { name: 'Also remove the accounts Crewlet created' });
  const described = document.getElementById(box.getAttribute('aria-describedby') ?? '');
  expect(described?.textContent).toBe("Each agent's account at the vendor is deleted.");
});

test('a press anywhere on the row toggles it, and the change reports the new state', () => {
  const onCheckedChange = vi.fn();
  render(<Checkbox label="Clear lead" checked={false} onCheckedChange={onCheckedChange} />);
  fireEvent.click(screen.getByText('Clear lead'));
  expect(onCheckedChange).toHaveBeenCalledWith(true);
});

test('a disabled checkbox cannot be ticked', () => {
  render(<Choice disabled />);
  const box = screen.getByRole('checkbox') as HTMLInputElement;
  fireEvent.click(screen.getByText('Also remove the accounts Crewlet created'));
  expect(box.checked).toBe(false);
  expect(box.disabled).toBe(true);
});

test('a destructive, framed choice carries both on the row, and a plain one carries neither', () => {
  const { container, rerender } = render(<Choice />);
  const row = container.querySelector('label')!;
  expect(row.classList.contains('crewlet-checkbox--danger')).toBe(true);
  expect(row.classList.contains('crewlet-checkbox--framed')).toBe(true);
  rerender(<Checkbox label="Enabled" checked onChange={() => {}} />);
  const plain = container.querySelector('label')!;
  expect(
    plain.classList.contains('crewlet-checkbox--danger') ||
      plain.classList.contains('crewlet-checkbox--framed'),
  ).toBe(false);
  expect(screen.getByRole('checkbox').getAttribute('aria-describedby')).toBeNull();
});

test("a caller's own description is joined, not overwritten", () => {
  render(
    <>
      <p id="field-help">Every account is removed at the vendor.</p>
      <Checkbox
        label="Also remove the accounts"
        description="This cannot be undone."
        aria-describedby="field-help"
        checked={false}
        onChange={() => {}}
      />
    </>,
  );
  const ids = (screen.getByRole('checkbox').getAttribute('aria-describedby') ?? '').split(' ');
  expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
    'This cannot be undone.',
    'Every account is removed at the vendor.',
  ]);
});

test('some of what it stands for is a third state, not a guess at one of two', () => {
  const { rerender } = render(
    <Checkbox label="Every seat" indeterminate checked={false} onChange={() => {}} />,
  );
  const box = screen.getByRole('checkbox') as HTMLInputElement;
  expect(box.indeterminate).toBe(true);
  // And it comes back off when the prop does, without the element remounting.
  rerender(<Checkbox label="Every seat" checked onChange={() => {}} />);
  expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(false);
});
