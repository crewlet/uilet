/**
 * A limit's count: counted as a reader counts, drawn in the ink its state
 * takes, read as one sentence, and said aloud only as it crosses a step. And
 * the field that carries one: described by it, and refused past it.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { FormField, Textarea } from '../Input/index.js';
import { CharacterCount, characterCountState, countCharacters } from './index.js';

afterEach(cleanup);

test('a character is a code point, so an emoji is one and not two', () => {
  expect(countCharacters('')).toBe(0);
  expect(countCharacters('plain')).toBe(5);
  expect('🙂'.length).toBe(2);
  expect(countCharacters('🙂')).toBe(1);
  expect(countCharacters('café 🙂')).toBe(6);
});

test('the state turns at nine tenths of the limit and past it, never at it', () => {
  expect(characterCountState(0, 100)).toBe('within');
  expect(characterCountState(89, 100)).toBe('within');
  expect(characterCountState(90, 100)).toBe('near');
  expect(characterCountState(100, 100)).toBe('near');
  expect(characterCountState(101, 100)).toBe('over');
});

test('the digits are drawn hidden and one sentence is read', () => {
  const { container } = render(<CharacterCount length={120} max={500} announce={false} />);
  const count = container.querySelector('.crewlet-character-count')!;
  expect(count.className).toContain('crewlet-character-count--within');
  expect(count.querySelector('[aria-hidden="true"]')?.textContent).toBe('120/500');
  expect(count.textContent).toContain('120 of 500 characters');
});

test('past the limit it says by how much, in the danger step', () => {
  const { container } = render(<CharacterCount length={512} max={500} announce={false} />);
  const count = container.querySelector('.crewlet-character-count')!;
  expect(count.className).toContain('crewlet-character-count--over');
  expect(count.textContent).toContain('12 characters over the limit of 500');
});

function Typed({ length }: { length: number }) {
  return (
    <>
      <Announcer />
      <CharacterCount length={length} max={100} />
    </>
  );
}

const said = () => screen.getByRole('status').textContent;

test('it says each crossing once and nothing between, and nothing on mount', () => {
  const { rerender } = render(<Typed length={120} />);
  // Opened already over: the count describes it; nothing interrupts.
  expect(said()).toBe('');
  rerender(<Typed length={80} />);
  expect(said()).toBe('Within the limit again');
  rerender(<Typed length={95} />);
  expect(said()).toBe('5 characters left');
  rerender(<Typed length={97} />);
  // Still near: the last thing said stands, nothing new.
  expect(said()).toBe('5 characters left');
  rerender(<Typed length={101} />);
  expect(said()).toBe('1 character over the limit of 100');
});

function Mission() {
  const [text, setText] = useState('Make shared costs fair');
  return (
    <FormField label="Mission" helper="One sentence." limit={{ length: countCharacters(text), max: 30 }}>
      {(field) => (
        <Textarea
          id={field.id}
          aria-describedby={field.describedBy}
          error={field.invalid}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      )}
    </FormField>
  );
}

test('a limited field is described by its help and its count, and is invalid once over', async () => {
  const { container } = render(<Mission />);
  const box = screen.getByRole('textbox', { name: 'Mission' }) as HTMLTextAreaElement;
  const described = (box.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id));
  expect(described.map((node) => node?.textContent)).toEqual(['One sentence.', expect.stringContaining('22 of 30')]);
  expect(box.getAttribute('aria-invalid')).toBeNull();

  fireEvent.change(box, { target: { value: 'Make shared costs fair for everyone' } });
  // Soft: what was typed stays, and the field says it is refused.
  expect(box.value).toBe('Make shared costs fair for everyone');
  expect(box.getAttribute('aria-invalid')).toBe('true');
  expect(container.querySelector('.crewlet-form-field')?.className).toContain('is-error');
  expect((await axe.run(container)).violations).toEqual([]);
});

test('a field with no limit draws its help line exactly as before', () => {
  const { container } = render(
    <FormField label="Name" helper="As it is shown.">
      {(field) => <Textarea id={field.id} aria-describedby={field.describedBy} />}
    </FormField>,
  );
  expect(container.querySelector('.crewlet-form-field__meta')).toBeNull();
  expect(container.querySelector('.crewlet-character-count')).toBeNull();
});

test('a field limited in characters counts an emoji once, where .length counts two', () => {
  // Four characters, five UTF-16 units: at a limit of four it is within.
  const text = 'Go 🙂';
  expect(text.length).toBe(5);
  render(
    <FormField label="Mission" limit={{ length: countCharacters(text), max: 4 }}>
      {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} error={f.invalid} value={text} readOnly />}
    </FormField>,
  );
  expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBeNull();
});
