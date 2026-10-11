/**
 * The badge is the control: it names what it changes and what it holds now,
 * opens the characters and the hues on demand, and applies a choice as it is
 * made. A disabled one is the badge alone.
 */

import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AvatarPicker, type AvatarPickerValue } from './index.js';

afterEach(cleanup);

function Picker({ onChange }: { onChange?: (next: AvatarPickerValue) => void }) {
  const [value, setValue] = useState<AvatarPickerValue>({ character: 'gemlet', hue: 'cyan' });
  return (
    <AvatarPicker
      name="Software Engineer"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

test('the badge is a button that says what it changes and what it holds', () => {
  render(<Picker />);
  const button = screen.getByRole('button', { name: "Change Software Engineer's profile icon, now Gemlet in Cyan" });
  expect(button.getAttribute('aria-expanded')).toBe('false');
  expect(button.querySelector('[data-character="gemlet"]')).not.toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('opens the characters and the hues, and applies each choice as it is made', () => {
  const onChange = vi.fn();
  render(<Picker onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: /profile icon/ }));
  const panel = screen.getByRole('dialog', { name: 'Profile icon' });
  fireEvent.click(within(panel).getByRole('radio', { name: 'Hexlet' }));
  expect(onChange).toHaveBeenLastCalledWith({ character: 'hexlet', hue: 'cyan' });
  fireEvent.click(within(panel).getByRole('radio', { name: 'Rose' }));
  expect(onChange).toHaveBeenLastCalledWith({ character: 'hexlet', hue: 'rose' });
  expect(screen.getByRole('button', { name: /now Hexlet in Rose/ })).toBeDefined();
});

test('a disabled picker is the badge alone, with nothing to press', () => {
  const { container } = render(
    <AvatarPicker name="Software Engineer" value={{ character: 'gemlet', hue: 'cyan' }} onChange={() => {}} disabled />,
  );
  expect(screen.queryByRole('button')).toBeNull();
  expect(container.querySelector('[data-character="gemlet"]')).not.toBeNull();
});
