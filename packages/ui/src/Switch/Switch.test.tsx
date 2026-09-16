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
