/**
 * A setting drawn as a row of choices.
 *
 * Ported from the engine dashboard's `ui/controls.a11y.test.tsx` ("a
 * setting"), which was written for a defect nothing visible showed: the theme
 * and density controls announced themselves as TABS, so a screen reader went
 * looking for the panel each one opened and found none.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl.js';

afterEach(cleanup);

const themes = [
  { value: 'light', label: '', icon: <svg aria-hidden="true" />, title: 'Light' },
  { value: 'system', label: '', icon: <svg aria-hidden="true" />, title: 'Follow the system' },
  { value: 'dark', label: '', icon: <svg aria-hidden="true" />, title: 'Dark' },
];

test('is a radio group whose arrows select as they move', () => {
  const onValueChange = vi.fn();
  render(
    <SegmentedControl
      label="Theme"
      semantics="radio"
      value="system"
      options={themes}
      onValueChange={onValueChange}
    />,
  );
  const group = screen.getByRole('radiogroup', { name: 'Theme' });
  const radios = within(group).getAllByRole('radio');
  // Named, although their only visible content is a glyph.
  expect(screen.getByRole('radio', { name: 'Dark' })).toBe(radios[2]);
  expect(radios[1]!.getAttribute('aria-checked')).toBe('true');
  expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
  expect(screen.queryByRole('tab')).toBeNull();

  radios[1]!.focus();
  fireEvent.keyDown(radios[1]!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(radios[2]);
  expect(onValueChange).toHaveBeenLastCalledWith('dark');
  fireEvent.keyDown(radios[2]!, { key: 'ArrowUp' });
  expect(onValueChange).toHaveBeenLastCalledWith('system');
});

test('a screen-reader name can differ from the tooltip', () => {
  render(
    <SegmentedControl
      label="Density"
      semantics="radio"
      value="normal"
      options={[
        { value: 'compact', label: 'S', srLabel: 'Compact' },
        { value: 'normal', label: '', srLabel: 'Normal', title: 'Normal' },
      ]}
      onValueChange={() => {}}
    />,
  );
  // A label of "S" is a picture of a size, not a word: the reader hears the
  // word. An option that draws nothing takes the same name.
  expect(screen.getByRole('radio', { name: 'Compact' }).textContent).toBe('S');
  expect(screen.getByRole('radio', { name: 'Normal' })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'S' })).toBeNull();
});

test('options with a description are card rows, and the chosen one says so', () => {
  render(
    <SegmentedControl
      label="Template"
      semantics="radio"
      value="startup"
      options={[
        { value: 'startup', label: 'Startup', description: 'One unit, three seats.' },
        { value: 'agency', label: 'Agency', description: 'A unit per client.' },
      ]}
      onValueChange={() => {}}
    />,
  );
  const chosen = screen.getByRole('radio', { name: /Startup/ });
  expect(chosen.getAttribute('aria-checked')).toBe('true');
  expect(chosen.textContent).toContain('One unit, three seats.');

  /*
   * And the row does not also wear the pill chrome. Its rules set the
   * container's background, border, padding and `width: fit-content` and each
   * option's padding, radius and active chip, at the same weight as the card
   * rules and from a stylesheet that is bundled after them, so every one of
   * them won and the cards were drawn inside a pill bar.
   */
  const row = screen.getByRole('radiogroup', { name: 'Template' });
  expect(row.classList.contains('crewlet-segmented--cards')).toBe(true);
  expect(row.classList.contains('crewlet-tabs--pill')).toBe(false);
});

test('a disabled option is stepped over rather than focused', () => {
  render(
    <SegmentedControl
      label="View"
      semantics="radio"
      value="chart"
      options={[
        { value: 'chart', label: 'Chart' },
        { value: 'directory', label: 'Directory', disabled: true },
        { value: 'charter', label: 'Charter' },
      ]}
      onValueChange={() => {}}
    />,
  );
  const radios = screen.getAllByRole('radio');
  radios[0]!.focus();
  fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(radios[2]);
});

test('a row whose chosen option is disabled still has a tab stop somebody can reach', () => {
  render(
    <SegmentedControl
      label="View"
      semantics="radio"
      value="chart"
      options={[
        { value: 'chart', label: 'Chart', disabled: true },
        { value: 'charter', label: 'Charter' },
      ]}
      onValueChange={() => {}}
    />,
  );
  const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
  expect(radios.filter((radio) => radio.tabIndex === 0 && !radio.disabled)).toHaveLength(1);
  expect(radios[0]!.getAttribute('aria-checked')).toBe('true');
});
