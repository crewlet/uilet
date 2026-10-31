/**
 * A searchable grid of emoji in a popover: the field takes focus, typing
 * filters by name, Enter picks the first match, and the grid is one tab stop
 * the arrows walk by its rows, across groups, and back up to the field.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { EMOJI_GROUPS, EmojiPicker, emojiName, searchEmoji, type EmojiPickerProps } from './index.js';

afterEach(cleanup);

function Picker(props: Partial<EmojiPickerProps>) {
  return (
    <EmojiPicker
      label="Add a reaction"
      onPick={() => {}}
      trigger={(_open, toggle) => (
        <button type="button" onClick={toggle}>
          React
        </button>
      )}
      {...props}
    />
  );
}

async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'React' }));
  const dialog = screen.getByRole('dialog', { name: 'Add a reaction' });
  const field = within(dialog).getByRole('textbox', { name: 'Search emoji' });
  await waitFor(() => expect(document.activeElement).toBe(field));
  return { dialog, field };
}

const cell = (name: string) => screen.getByRole('button', { name });

test('names an emoji by the picker, and an emoji it does not offer by itself', () => {
  expect(emojiName('👀')).toBe('eyes');
  expect(emojiName('🦄')).toBe('🦄');
});

test('searches by name, once each, and answers null for an empty query', () => {
  expect(searchEmoji('  ')).toBeNull();
  expect(searchEmoji('CHART')!.map((entry) => entry.name)).toEqual(['chart up', 'chart down']);
  expect(searchEmoji('zzz')).toEqual([]);
});

test('opens a dialog named for what it does, with the search field focused', async () => {
  render(<Picker />);
  const trigger = screen.getByRole('button', { name: 'React' });
  expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
  const { dialog } = await open();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  // Every group, named by its visible heading, with every emoji named.
  for (const group of EMOJI_GROUPS) {
    const named = within(dialog).getByRole('group', { name: group.label });
    expect(within(named).getAllByRole('button')).toHaveLength(group.items.length);
  }
  expect(cell('rocket').textContent).toBe('🚀');
});

test('typing filters by name, and a query with no match says so', async () => {
  render(<Picker />);
  const { dialog, field } = await open();
  fireEvent.change(field, { target: { value: 'rock' } });
  const results = within(dialog).getByRole('group', { name: 'Results' });
  expect(within(results).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['rocket']);
  fireEvent.change(field, { target: { value: 'zzz' } });
  expect(within(dialog).queryAllByRole('group')).toHaveLength(0);
  expect(within(dialog).getByRole('status').textContent).toBe('No emoji match “zzz”.');
});

test('a pick is reported and closes the panel, and the next opening starts from an empty search', async () => {
  const onPick = vi.fn();
  const onOpenChange = vi.fn();
  render(<Picker onPick={onPick} onOpenChange={onOpenChange} />);
  const { field } = await open();
  expect(onOpenChange).toHaveBeenLastCalledWith(true);
  fireEvent.change(field, { target: { value: 'eyes' } });
  fireEvent.click(cell('eyes'));
  expect(onPick).toHaveBeenCalledWith('👀');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
  const again = await open();
  expect((again.field as HTMLInputElement).value).toBe('');
});

test('Enter in the field picks the first match', async () => {
  const onPick = vi.fn();
  render(<Picker onPick={onPick} />);
  const { field } = await open();
  fireEvent.change(field, { target: { value: 'part' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onPick).toHaveBeenCalledWith('🎉');
  expect(screen.queryByRole('dialog')).toBeNull();
});

// THE GRID IS ONE TAB STOP THE ARROWS WALK BY ITS ROWS. Mutation: walk the
// flat list for ArrowDown, and a short row sends the reader to the wrong
// column; leave every cell tabbable, and Tab crosses forty emoji.
test('the arrows walk the grid by its rows, across groups, and up to the field', async () => {
  render(<Picker />);
  const { field } = await open();
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(cell('thumbs up'));
  const stops = () => screen.getAllByRole('button').filter((button) => button.tabIndex === 0 && button.closest('[role="dialog"]'));
  expect(stops()).toEqual([cell('thumbs up')]);
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(cell('check'));
  // Down from Frequently used's one row lands in the same column of Smileys.
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(cell('smile'));
  expect(stops()).toEqual([cell('smile')]);
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(cell('sleeping'));
  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  expect(document.activeElement).toBe(cell('memo'));
  fireEvent.keyDown(document.activeElement!, { key: 'Home' });
  expect(document.activeElement).toBe(cell('thumbs up'));
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
  expect(document.activeElement).toBe(field);
});

test('a short last row is reached from the column past its end', async () => {
  render(<Picker />);
  const { field } = await open();
  fireEvent.change(field, { target: { value: 's' } });
  // More than one row of matches, the second one short.
  const matches = searchEmoji('s')!;
  expect(matches.length).toBeGreaterThan(8);
  expect(matches.length % 8).not.toBe(0);
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  const last = document.activeElement;
  fireEvent.keyDown(last!, { key: 'Home' });
  for (let step = 0; step < 7; step += 1) fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(last);
});

test('Escape closes the panel and returns focus to the trigger', async () => {
  render(<Picker />);
  const { field } = await open();
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'React' }));
});

test('takes its words and its emoji from the caller', async () => {
  render(
    <Picker
      groups={[{ label: 'Team', items: [{ emoji: '🦄', name: 'unicorn' }] }]}
      labels={{ search: 'Emoji suchen', none: (query) => `Nichts für ${query}.` }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'React' }));
  const field = screen.getByRole('textbox', { name: 'Emoji suchen' });
  expect(screen.getByRole('group', { name: 'Team' })).toBeTruthy();
  fireEvent.change(field, { target: { value: 'x' } });
  expect(screen.getByRole('status').textContent).toBe('Nichts für x.');
});

test('carries no axe violation while open', async () => {
  const { container } = render(
    <main>
      <Picker />
    </main>,
  );
  await open();
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(container).toBeTruthy();
  expect(result.violations).toEqual([]);
});
