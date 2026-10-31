/**
 * Chosen items as chips inside the field: Backspace in an empty box removes
 * the last, Enter with words typed is the host's first match, focus stays in
 * the box, and the host's keys come first.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { ChipField, type ChipFieldItem } from './index.js';

afterEach(cleanup);

const PEOPLE: ChipFieldItem[] = [
  { id: 'ada', label: 'Ada', leading: <span data-testid="face" /> },
  { id: 'miles', label: 'Miles' },
];

function Picker({ onCommit, onKeyDown }: { onCommit?: () => void; onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void }) {
  const [items, setItems] = useState(PEOPLE);
  const [query, setQuery] = useState('');
  return (
    <>
      <Announcer />
      <ChipField
        items={items}
        onRemove={(id) => setItems((all) => all.filter((item) => item.id !== id))}
        query={query}
        onQueryChange={setQuery}
        onCommit={onCommit}
        onKeyDown={onKeyDown}
        label="Find people and agents"
        placeholder="Enter a name or role"
      />
    </>
  );
}

const announced = () => screen.getByRole('status').textContent;

test('the chosen are chips in a named list, each with a Remove control, before the box', () => {
  render(<Picker />);
  const chips = screen.getByRole('list', { name: 'Chosen' });
  expect(chips.querySelectorAll('li')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Remove Ada' })).toBeDefined();
  const box = screen.getByRole('textbox', { name: 'Find people and agents' });
  expect(box.getAttribute('autocomplete')).toBe('off');
  // The chip's face is drawn inside it.
  expect(chips.contains(screen.getByTestId('face'))).toBe(true);
});

test('Backspace in an empty box removes the last chip, says so, and keeps focus in the box', () => {
  render(<Picker />);
  const box = screen.getByRole('textbox', { name: 'Find people and agents' });
  box.focus();
  fireEvent.keyDown(box, { key: 'Backspace' });
  expect(screen.queryByRole('button', { name: 'Remove Miles' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Remove Ada' })).toBeDefined();
  expect(announced()).toBe('Removed Miles');
  expect(document.activeElement).toBe(box);
});

test('Backspace with words typed edits the words', () => {
  render(<Picker />);
  const box = screen.getByRole('textbox', { name: 'Find people and agents' });
  fireEvent.change(box, { target: { value: 'ad' } });
  const key = fireEvent.keyDown(box, { key: 'Backspace' });
  expect(key).toBe(true);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('a chip\'s Remove control removes it and returns focus to the box', () => {
  render(<Picker />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Ada' }));
  expect(screen.queryByRole('button', { name: 'Remove Ada' })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Find people and agents' }));
});

test('Enter with words typed is the host\'s, and Enter with none is left to the form', () => {
  let commits = 0;
  render(<Picker onCommit={() => (commits += 1)} />);
  const box = screen.getByRole('textbox', { name: 'Find people and agents' });
  expect(fireEvent.keyDown(box, { key: 'Enter' })).toBe(true);
  expect(commits).toBe(0);
  fireEvent.change(box, { target: { value: 'ad' } });
  expect(fireEvent.keyDown(box, { key: 'Enter' })).toBe(false);
  expect(commits).toBe(1);
  // A chord is not Enter: it belongs to whatever owns it.
  expect(fireEvent.keyDown(box, { key: 'Enter', metaKey: true })).toBe(true);
  expect(commits).toBe(1);
});

test('nothing is taken mid-composition', () => {
  let commits = 0;
  render(<Picker onCommit={() => (commits += 1)} />);
  const box = screen.getByRole('textbox', { name: 'Find people and agents' });
  fireEvent.keyDown(box, { key: 'Backspace', isComposing: true });
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  fireEvent.change(box, { target: { value: 'ad' } });
  fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
  expect(commits).toBe(0);
});

test('a key the host handles first is left alone', () => {
  render(<Picker onKeyDown={(event) => event.key === 'Backspace' && event.preventDefault()} />);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Find people and agents' }), { key: 'Backspace' });
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('the host makes the box a combobox by passing its attributes through', () => {
  render(
    <ChipField
      items={[]}
      onRemove={() => undefined}
      query=""
      onQueryChange={() => undefined}
      label="Who the message is to"
      prefix="To:"
      variant="bare"
      role="combobox"
      aria-expanded
      aria-controls="suggestions"
    />,
  );
  const box = screen.getByRole('combobox', { name: 'Who the message is to' });
  expect(box.getAttribute('aria-controls')).toBe('suggestions');
  expect(box.closest('.crewlet-chip-field')?.classList.contains('crewlet-chip-field--bare')).toBe(true);
  expect(screen.getByText('To:')).toBeDefined();
  // No chips, no empty list.
  expect(screen.queryByRole('list')).toBeNull();
});

test('a field with chips carries no axe violation', async () => {
  const { container } = render(
    <main>
      <Picker />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
