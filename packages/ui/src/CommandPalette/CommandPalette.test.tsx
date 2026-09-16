/**
 * Search is a launcher reached from anywhere, so what it has to get right is
 * the keyboard: the highlighted row is the one Enter opens, focus never leaves
 * the field, and a screen reader hears each row as it is reached.
 *
 * Ported from the engine dashboard's `app/CommandPalette.test.tsx`, minus the
 * cases about what it searched: the rows come from the caller here, so what is
 * left is the surface, the combobox and the veil.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { CommandPalette, type CommandPaletteGroup } from './index.js';
import { layerCount } from '../Layer/index.js';

afterEach(cleanup);

/** Thirty seats and four screens, the shape the engine's own palette offers. */
function groups(seats: number, open: (id: string) => void): CommandPaletteGroup[] {
  const screens = ['Fleet', 'Activity', 'Seats', 'Tools'];
  return [
    {
      id: 'go',
      label: 'Go to',
      items: screens.map((name) => ({ id: `nav-${name}`, label: name, hint: 'a screen', onSelect: () => open(name) })),
    },
    {
      id: 'seats',
      label: 'Seats',
      items: Array.from({ length: seats }, (_, at) => ({
        id: `seat-${at}`,
        label: `Engineer ${at + 1}`,
        hint: `@engineer-${at + 1}`,
        onSelect: () => open(`Engineer ${at + 1}`),
      })),
    },
  ];
}

function mount({
  seats = 30,
  onClose = () => {},
  onOpen = () => {},
}: { seats?: number; onClose?: () => void; onOpen?: (id: string) => void } = {}) {
  function Harness() {
    const [query, setQuery] = useState('');
    return (
      <CommandPalette
        open
        onClose={onClose}
        query={query}
        onQueryChange={setQuery}
        groups={groups(seats, onOpen)}
      />
    );
  }
  return render(<Harness />);
}

test('it is a combobox: the arrows move a highlight the field names, and Tab never walks the results', () => {
  const onClose = vi.fn();
  const onOpen = vi.fn();
  mount({ onClose, onOpen });
  const field = screen.getByRole('combobox', { name: 'Search' });
  const list = screen.getByRole('listbox', { name: 'Results' });
  expect(field.getAttribute('aria-controls')).toBe(list.id);
  expect(document.activeElement).toBe(field);

  const highlighted = () => document.getElementById(field.getAttribute('aria-activedescendant')!);
  const first = within(list).getAllByRole('option')[0]!;
  expect(highlighted()).toBe(first);
  expect(first.getAttribute('aria-selected')).toBe('true');

  fireEvent.keyDown(field, { key: 'ArrowDown' });
  const second = within(list).getAllByRole('option')[1]!;
  expect(highlighted()).toBe(second);
  expect(second.getAttribute('aria-selected')).toBe('true');
  expect(first.getAttribute('aria-selected')).toBe('false');
  // Focus stayed where the reader types.
  expect(document.activeElement).toBe(field);

  // Each group is named by its own heading.
  const seats = within(list).getByRole('group', { name: 'Seats' });
  expect(within(seats).getAllByRole('option')[0]!.textContent).toContain('Engineer 1');

  // No row is a tab stop, so Tab wraps straight back to the field.
  expect(within(list).queryAllByRole('option').some((option) => option.tabIndex >= 0)).toBe(false);
  // The trap takes the press (the field is the last stop) and puts focus back.
  expect(fireEvent.keyDown(field, { key: 'Tab' })).toBe(false);
  expect(document.activeElement).toBe(field);

  // Enter opens the highlighted row and closes the surface.
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onOpen).toHaveBeenCalledWith('Activity');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a highlight past the end of a list that shrank under it stays on a real row', () => {
  function Harness() {
    const [query, setQuery] = useState('');
    const [seats, setSeats] = useState(30);
    return (
      <>
        <button onClick={() => setSeats(0)}>Drop the seats</button>
        <CommandPalette
          open
          onClose={() => {}}
          query={query}
          onQueryChange={setQuery}
          groups={groups(seats, () => {})}
        />
      </>
    );
  }
  render(<Harness />);
  const field = screen.getByRole('combobox', { name: 'Search' });
  const count = screen.getAllByRole('option').length;

  // Up from the first row wraps to the last, as every list's highlight does.
  fireEvent.keyDown(field, { key: 'ArrowUp' });
  expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[count - 1]!.id);

  fireEvent.click(screen.getByRole('button', { name: 'Drop the seats' }));
  const remaining = screen.getAllByRole('option');
  expect(remaining.length).toBeLessThan(count);
  const last = remaining[remaining.length - 1]!;
  expect(field.getAttribute('aria-activedescendant')).toBe(last.id);
  expect(last.getAttribute('aria-selected')).toBe('true');
});

test('a press on a row keeps focus in the field, and its click opens the row', () => {
  const onClose = vi.fn();
  const onOpen = vi.fn();
  mount({ onClose, onOpen });
  const field = screen.getByRole('combobox', { name: 'Search' });
  expect(document.activeElement).toBe(field);

  const row = screen.getAllByRole('option')[2]!;
  // Prevented: a press on something that is not a control moves focus to the
  // nearest focusable ancestor, which is the dialog around the list.
  expect(fireEvent.mouseDown(row)).toBe(false);
  expect(onOpen).not.toHaveBeenCalled();

  fireEvent.click(row);
  expect(onOpen).toHaveBeenCalledWith('Seats');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a press on the veil closes it on its click, as every modal veil does', () => {
  const onClose = vi.fn();
  mount({ onClose });
  const veil = document.querySelector<HTMLElement>('.crewlet-modal-overlay')!;
  // The results are the surface's own body, not a popup above it. A popup
  // would close on the press, before the click a tap ends with, and let that
  // click land on the screen the veil was covering.
  // ONE surface on the stack, which is what `popup: false` buys: a second
  // layer for the list would be the topmost, would take the veil's press on
  // pointerdown, and the click that press ends with would land on the screen
  // the veil was covering.
  expect(layerCount()).toBe(1);
  fireEvent.pointerDown(veil);
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(veil);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('Escape closes it, and the results take no Escape of their own first', () => {
  const onClose = vi.fn();
  mount({ onClose });
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search' }), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('with nothing to offer it says so, outside the list rather than inside it', () => {
  render(
    <CommandPalette
      open
      onClose={() => {}}
      query="zzz"
      onQueryChange={() => {}}
      groups={[]}
      emptyMessage="No screen, seat or unit matches that."
    />,
  );
  const field = screen.getByRole('combobox', { name: 'Search' });
  const list = screen.getByRole('listbox');
  const said = screen.getByText('No screen, seat or unit matches that.');
  expect(field.getAttribute('aria-activedescendant')).toBeNull();
  expect(within(list).queryAllByRole('option')).toHaveLength(0);
  // A listbox takes options and groups. A sentence inside one is a child of a
  // kind the role does not allow, and a reader's software may skip it.
  expect(list.contains(said)).toBe(false);
});

test('a new query puts the highlight back on the best match', () => {
  function Harness() {
    const [query, setQuery] = useState('');
    const all = groups(30, () => {});
    const shown = query
      ? all.map((group) => ({
          ...group,
          items: group.items.filter((item) => String(item.label).toLowerCase().includes(query.toLowerCase())),
        })).filter((group) => group.items.length > 0)
      : all;
    return (
      <CommandPalette open onClose={() => {}} query={query} onQueryChange={setQuery} groups={shown} />
    );
  }
  render(<Harness />);
  const field = screen.getByRole('combobox', { name: 'Search' });
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[2]!.id);

  fireEvent.change(field, { target: { value: 'Engineer' } });
  // A new list, led by its best match: a highlight left where the last list
  // happened to put it points at a row that means nothing now.
  expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0]!.id);
});

test('rest props reach the frame, which is how an application closes it with its own chord', () => {
  const onClose = vi.fn();
  render(
    <CommandPalette
      open
      onClose={onClose}
      query=""
      onQueryChange={() => {}}
      groups={groups(2, () => {})}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') onClose();
      }}
    />,
  );
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search' }), { key: 'k', metaKey: true });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('the palette carries no accessibility violation', async () => {
  mount();
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
