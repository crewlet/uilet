/**
 * The composer's @ and # suggestions: a listbox the message box owns, wired
 * to `useListbox` for its keys, whose rows are PersonRows; and the word
 * being typed at the caret.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useId, useState } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { useListbox } from '../Listbox/index.js';
import { MentionMenu, mentionQuery, type MentionOption } from './index.js';

afterEach(cleanup);

const OPTIONS: MentionOption[] = [
  { id: 'pm', insert: '@pm', label: 'Product Manager', detail: 'Writing the brief', mark: <span />, note: 'Working' },
  { id: 'ada', insert: '@ada', label: 'Ada', detail: 'ada', mark: <span /> },
  { id: 'channel', insert: '@channel', label: '@channel', detail: 'Notify everyone in this room', mark: <span /> },
];

/** A message box with the menu, wired the way the docs say. */
function Composer({ onTake }: { onTake: (insert: string) => void }) {
  const [value, setValue] = useState('');
  const [caret, setCaret] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const query = mentionQuery(value, caret);
  const open = query !== null && closedAt !== query.start;
  const listbox = useListbox({
    id: useId(),
    open,
    count: OPTIONS.length,
    tabCommits: true,
    onCommit: (index) => onTake(OPTIONS[index]!.insert),
    onClose: () => setClosedAt(query?.start ?? null),
  });
  return (
    <div style={{ position: 'relative' }} ref={listbox.anchorRef}>
      {open ? (
        <MentionMenu
          id={listbox.listId}
          listRef={listbox.listRef}
          label="People and agents"
          options={OPTIONS}
          active={listbox.active}
          onPick={(option) => onTake(option.insert)}
          onHover={listbox.setActive}
        />
      ) : null}
      <textarea
        aria-label="Message"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listbox.listId : undefined}
        aria-activedescendant={open ? listbox.optionId(listbox.active) : undefined}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setCaret(event.target.selectionStart);
        }}
        onKeyDown={(event) => listbox.onKeyDown(event)}
      />
    </div>
  );
}

describe('mentionQuery', () => {
  test('finds the word after a trigger at the caret, and where the trigger stands', () => {
    expect(mentionQuery('Hello @pr', 9)).toEqual({ trigger: '@', query: 'pr', start: 6 });
    expect(mentionQuery('#', 1)).toEqual({ trigger: '#', query: '', start: 0 });
    expect(mentionQuery('see #eng-team', 13)).toEqual({ trigger: '#', query: 'eng-team', start: 4 });
    expect(mentionQuery('Hej @José', 9)).toEqual({ trigger: '@', query: 'José', start: 4 });
  });

  test('opens nothing inside a word, after a space, or before the caret reaches the trigger', () => {
    expect(mentionQuery('ada@crewlet.com', 15)).toBeNull();
    expect(mentionQuery('@pm said', 8)).toBeNull();
    expect(mentionQuery('Hello @pm', 3)).toBeNull();
    expect(mentionQuery('', 0)).toBeNull();
  });
});

test('the list is a listbox the field points at, its rows named options with the PersonRow design', () => {
  render(<Composer onTake={() => undefined} />);
  const field = screen.getByRole('combobox', { name: 'Message' });
  fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
  const list = screen.getByRole('listbox', { name: 'People and agents' });
  const options = screen.getAllByRole('option');
  expect(options).toHaveLength(3);
  expect(options[0]!.id).toBe(`${list.id}-0`);
  expect(options[0]!.classList.contains('crewlet-person-row')).toBe(true);
  expect(options[0]!.classList.contains('crewlet-person-row--compact')).toBe(true);
  expect(field.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
  expect(options[0]!.getAttribute('aria-selected')).toBe('true');
  // The trailing word is drawn at the row's end.
  expect(options[0]!.textContent).toContain('Working');
  // The keyboard hints at the foot.
  expect(screen.getByText('Enter or Tab to choose')).toBeDefined();
});

test('the arrows move the highlight and wrap, and Tab takes the highlighted option', () => {
  const taken: string[] = [];
  render(<Composer onTake={(insert) => taken.push(insert)} />);
  const field = screen.getByRole('combobox', { name: 'Message' });
  fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
  fireEvent.keyDown(field, { key: 'ArrowUp' });
  expect(field.getAttribute('aria-activedescendant')).toMatch(/-2$/);
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  expect(field.getAttribute('aria-activedescendant')).toMatch(/-0$/);
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  fireEvent.keyDown(field, { key: 'Tab' });
  expect(taken).toEqual(['@ada']);
});

test('a press on an option takes it without taking focus from the field', () => {
  const taken: string[] = [];
  render(<Composer onTake={(insert) => taken.push(insert)} />);
  const field = screen.getByRole('combobox', { name: 'Message' });
  fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
  const option = screen.getByRole('option', { name: /@channel/ });
  const press = fireEvent.mouseDown(option);
  // Prevented, so the field keeps focus and the list is not closed by a blur.
  expect(press).toBe(false);
  expect(taken).toEqual(['@channel']);
});

test('Escape closes the list and nothing else', () => {
  render(<Composer onTake={() => undefined} />);
  const field = screen.getByRole('combobox', { name: 'Message' });
  fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('the foot is the host\'s to replace or drop', () => {
  const { rerender } = render(
    <MentionMenu id="m" label="Rooms" options={OPTIONS} active={0} onPick={() => undefined} onHover={() => undefined} footer={null} />,
  );
  expect(document.querySelector('.crewlet-mention-menu__footer')).toBeNull();
  rerender(
    <MentionMenu id="m" label="Rooms" options={OPTIONS} active={0} onPick={() => undefined} onHover={() => undefined} labels={{ hints: ['Pick a room'] }} />,
  );
  expect(document.querySelector('.crewlet-mention-menu__footer')?.textContent).toBe('Pick a room');
});

test('an open menu carries no axe violation', async () => {
  const { container } = render(
    <main>
      <Composer onTake={() => undefined} />
    </main>,
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Message' }), { target: { value: '@', selectionStart: 1 } });
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
