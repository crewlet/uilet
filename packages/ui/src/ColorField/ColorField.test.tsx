/**
 * A colour field reports a colour only once it is one (lowercase `#rrggbb`),
 * refuses a value it cannot read when the reader leaves the field and not
 * before, keeps its swatch and its picker on the last colour that read, and
 * takes a new value from the host without fighting the reader's own typing.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { ColorField } from './index.js';

afterEach(cleanup);

function Field({ initial = '#5b3df5', required = false, onChange }: { initial?: string; required?: boolean; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <output data-testid="stored">{value}</output>
      <ColorField
        label="Primary"
        helper="Links, buttons and accents"
        value={value}
        required={required}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
      <button type="button" onClick={() => setValue('#112233')}>
        Reset
      </button>
    </>
  );
}

const field = () => screen.getByRole('textbox', { name: /Primary/ }) as HTMLInputElement;
const picker = () => screen.getByLabelText('Pick the Primary colour') as HTMLInputElement;
const stored = () => screen.getByTestId('stored').textContent;

test('is named by its label, described by its help, and its swatch is a named picker', () => {
  render(<Field />);
  expect(field().value).toBe('#5b3df5');
  expect(document.getElementById(field().getAttribute('aria-describedby') ?? '')?.textContent).toBe('Links, buttons and accents');
  expect(picker().type).toBe('color');
  expect(picker().value).toBe('#5b3df5');
});

test('reports a typed colour lowercased, and nothing while the value does not read', () => {
  const onChange = vi.fn();
  render(<Field onChange={onChange} />);
  fireEvent.change(field(), { target: { value: '#12' } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(field(), { target: { value: '#12AB9F' } });
  expect(onChange).toHaveBeenLastCalledWith('#12ab9f');
  expect(stored()).toBe('#12ab9f');
  // The reader's own spelling is kept while they type.
  expect(field().value).toBe('#12AB9F');
});

test('refuses a value it cannot read when the reader leaves, not while they type', () => {
  render(<Field />);
  fireEvent.change(field(), { target: { value: 'blue' } });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(field().getAttribute('aria-invalid')).not.toBe('true');
  fireEvent.blur(field());
  expect(screen.getByRole('alert').textContent).toBe('Enter the colour as # and six hex digits, such as #5b3df5.');
  expect(field().getAttribute('aria-invalid')).toBe('true');
  // The colour stored is the last one that read, and the swatch keeps it.
  expect(stored()).toBe('#5b3df5');
  expect(picker().value).toBe('#5b3df5');
});

test('refuses the three and eight digit forms, which a stored brand colour never takes', () => {
  const onChange = vi.fn();
  render(<Field onChange={onChange} />);
  for (const value of ['#fff', '#5b3df5ff', '5b3df5', 'rgb(1, 2, 3)']) {
    fireEvent.change(field(), { target: { value } });
  }
  expect(onChange).not.toHaveBeenCalled();
});

test('a colour picked in the swatch is written into the field and reported', () => {
  const onChange = vi.fn();
  render(<Field onChange={onChange} />);
  fireEvent.change(picker(), { target: { value: '#00aa55' } });
  expect(onChange).toHaveBeenLastCalledWith('#00aa55');
  expect(field().value).toBe('#00aa55');
});

test('an optional field emptied reports none; a required one refuses it', () => {
  const onChange = vi.fn();
  const { unmount } = render(<Field onChange={onChange} />);
  fireEvent.change(field(), { target: { value: '' } });
  expect(onChange).toHaveBeenLastCalledWith('');
  unmount();
  const onRequired = vi.fn();
  render(<Field required onChange={onRequired} />);
  fireEvent.change(field(), { target: { value: '' } });
  fireEvent.blur(field());
  expect(onRequired).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toBe('Choose a colour.');
});

test('a new value from the host replaces the draft and clears a refusal', () => {
  render(<Field />);
  fireEvent.change(field(), { target: { value: 'nope' } });
  fireEvent.blur(field());
  expect(screen.getByRole('alert')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(field().value).toBe('#112233');
  expect(screen.queryByRole('alert')).toBeNull();
});

test("draws the host's own refusal, and shows the host's value in the stored spelling", () => {
  render(<ColorField label="Text" value="#ABCDEF" onChange={() => {}} error="Text on the light ground reads at 3.2:1." />);
  expect(screen.getByRole('alert').textContent).toBe('Text on the light ground reads at 3.2:1.');
  const text = screen.getByRole('textbox', { name: /Text/ }) as HTMLInputElement;
  expect(text.value).toBe('#abcdef');
});

test('carries no axe violation, at rest and refused', async () => {
  const { container } = render(
    <main>
      <h1>Brand</h1>
      <ColorField label="Primary" value="#5b3df5" onChange={() => {}} />
      <ColorField label="Secondary" value="" optional onChange={() => {}} error="Choose a colour." />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
