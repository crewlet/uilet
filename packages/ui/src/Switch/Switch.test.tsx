/**
 * A switch says on and off, and says which it is.
 *
 * The state is the whole point: the two screens this replaces drew a binary
 * setting as an "On" and "Off" select, so a reader had to open a list to find
 * out whether a webhook was delivering.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Switch } from './Switch.js';

afterEach(cleanup);

test('it exposes its state as a switch, not as a ticked box', () => {
  function Setting() {
    const [on, setOn] = useState(false);
    return (
      <Switch
        label="Deliver webhooks"
        description="Pauses delivery without removing the app."
        checked={on}
        onCheckedChange={setOn}
      />
    );
  }
  render(<Setting />);
  const control = screen.getByRole('switch', { name: 'Deliver webhooks' }) as HTMLInputElement;
  // The state is the input's own checkedness, which the role maps to
  // aria-checked. There is deliberately no attribute: see the component doc.
  expect(control.checked).toBe(false);
  expect(screen.queryByRole('checkbox')).toBeNull();

  fireEvent.click(control);
  expect((screen.getByRole('switch', { name: 'Deliver webhooks' }) as HTMLInputElement).checked).toBe(true);
});

test('the name is the label and the consequence describes it', () => {
  render(
    <Switch
      label="Deliver webhooks"
      description="Pauses delivery without removing the app."
      checked
      onChange={() => {}}
    />,
  );
  const control = screen.getByRole('switch', { name: 'Deliver webhooks' });
  const described = document.getElementById(control.getAttribute('aria-describedby') ?? '');
  expect(described?.textContent).toBe('Pauses delivery without removing the app.');
});

test('a disabled switch does not move, and the whole row is one target', () => {
  const onCheckedChange = vi.fn();
  const { rerender } = render(
    <Switch label="Deliver webhooks" checked={false} disabled onCheckedChange={onCheckedChange} />,
  );
  fireEvent.click(screen.getByText('Deliver webhooks'));
  expect(onCheckedChange).not.toHaveBeenCalled();

  rerender(<Switch label="Deliver webhooks" checked={false} onCheckedChange={onCheckedChange} />);
  fireEvent.click(screen.getByText('Deliver webhooks'));
  expect(onCheckedChange).toHaveBeenCalledWith(true);
});

test('a switch with a reason stays a tab stop, does not move, and says why after its name', () => {
  const onCheckedChange = vi.fn();
  render(
    <Switch
      label="Product Manager gets every message"
      checked
      disabledReason="The org chart sets this for a team's own agents."
      onCheckedChange={onCheckedChange}
    />,
  );
  const control = screen.getByRole('switch', { name: 'Product Manager gets every message' }) as HTMLInputElement;
  // Soft, never native: a natively disabled control is skipped by Tab and
  // says nothing about why.
  expect(control.disabled).toBe(false);
  expect(control.getAttribute('aria-disabled')).toBe('true');
  const reason = document.getElementById(control.getAttribute('aria-describedby') ?? '');
  expect(reason?.textContent).toBe("The org chart sets this for a team's own agents.");
  fireEvent.click(control);
  expect(onCheckedChange).not.toHaveBeenCalled();
  expect(control.checked).toBe(true);
  cleanup();

  // UNCONTROLLED, the click itself is what is held.
  render(<Switch label="Catch up" defaultChecked={false} disabledReason="Paused by an administrator." />);
  const loose = screen.getByRole('switch', { name: 'Catch up' }) as HTMLInputElement;
  fireEvent.click(loose);
  expect(loose.checked).toBe(false);
});

test('a switch whose label is hidden keeps the label as its name', () => {
  const { container } = render(<Switch label="Designer gets every message" labelHidden checked={false} onChange={() => {}} />);
  expect(screen.getByRole('switch', { name: 'Designer gets every message' })).toBeDefined();
  expect(container.querySelector('.crewlet-switch')?.className).toContain('crewlet-switch--label-hidden');
  expect(container.querySelector('.crewlet-visually-hidden .crewlet-switch__label')).not.toBeNull();
});
