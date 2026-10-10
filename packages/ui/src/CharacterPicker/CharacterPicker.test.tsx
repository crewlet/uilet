/**
 * The choice of an agent's character.
 *
 * A grid of thirty radios, and the one thing a grid adds to a radio group:
 * the options sit in rows, so Up and Down have to move a row, not one option
 * along, or the arrow lands somewhere the reader is not looking.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CREWLET_CHARACTERS, CREWLET_CHARACTER_GEOMETRY, type CrewletCharacterId } from '@crewlethq/icons/characters';
import { CHARACTER_PICKER_COLUMNS, CharacterPicker } from './index.js';

afterEach(cleanup);

/** A picker that keeps its own choice, as a form would. */
function Controlled({ start = 'crewlet' as CrewletCharacterId, onChange = (_: CrewletCharacterId) => {} }) {
  const [value, setValue] = useState<CrewletCharacterId>(start);
  return (
    <CharacterPicker
      label="Character"
      value={value}
      hue="cyan"
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const checked = () => screen.getByRole('radio', { checked: true });

describe('the character picker', () => {
  test('is a named radio group of every character, the chosen one checked', () => {
    render(<CharacterPicker label="Character" value="hexlet" onValueChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Character' });
    const radios = screen.getAllByRole('radio');
    expect(group.contains(radios[0]!)).toBe(true);
    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual(
      CREWLET_CHARACTERS.map((id) => CREWLET_CHARACTER_GEOMETRY[id].name),
    );
    expect(checked().getAttribute('aria-label')).toBe('Hexlet');
  });

  test('is one tab stop, on the chosen character', () => {
    render(<CharacterPicker label="Character" value="gemlet" onValueChange={() => {}} />);
    const stops = screen.getAllByRole('radio').filter((radio) => radio.tabIndex === 0);
    expect(stops.map((radio) => radio.getAttribute('aria-label'))).toEqual(['Gemlet']);
  });

  test('chooses as the arrows move, Left and Right in reading order', () => {
    const onChange = vi.fn();
    render(<Controlled start="hexlet" onChange={onChange} />);
    checked().focus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('peaklet');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('crewlet');
    expect(document.activeElement).toBe(checked());
  });

  test('moves a whole row on Up and Down, and stops at the grid\'s edge', () => {
    const onChange = vi.fn();
    render(<Controlled start="hexlet" onChange={onChange} />);
    checked().focus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(CREWLET_CHARACTERS[1 + CHARACTER_PICKER_COLUMNS]);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith('hexlet');
    onChange.mockClear();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
    expect(checked().getAttribute('aria-label')).toBe('Hexlet');
  });

  test('goes to the first and the last character on Home and End', () => {
    const onChange = vi.fn();
    render(<Controlled start="octlet" onChange={onChange} />);
    checked().focus();
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(CREWLET_CHARACTERS[CREWLET_CHARACTERS.length - 1]);
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('crewlet');
  });

  test('says which is chosen with the badge\'s own selected ring, and previews every option in the hue', () => {
    const { container } = render(<CharacterPicker label="Character" value="foxlet" hue="rose" onValueChange={() => {}} />);
    const rings = container.querySelectorAll('.crewlet-avatar--ring-brand');
    expect(rings).toHaveLength(1);
    expect(checked().contains(rings[0]!)).toBe(true);
    expect(container.querySelectorAll('.crewlet-avatar--hue-rose')).toHaveLength(CREWLET_CHARACTERS.length);
  });

  test('offers only the characters it is given', () => {
    render(
      <CharacterPicker label="Character" value="octlet" characters={['octlet', 'hivelet']} onValueChange={() => {}} />,
    );
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Octlet',
      'Hivelet',
    ]);
  });

  test('chooses nothing while disabled', () => {
    const onValueChange = vi.fn();
    render(<CharacterPicker label="Character" value="hexlet" disabled onValueChange={onValueChange} />);
    expect(screen.getByRole('radiogroup').getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Gemlet' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Edit seat</h1>
        <CharacterPicker label="Character" value="chatlet" hue="green" onValueChange={() => {}} />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
