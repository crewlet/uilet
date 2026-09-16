/**
 * Choosing several from many, and holding several typed in by hand.
 *
 * The options half is ported from the engine dashboard's
 * `ui/MultiPicker.test.tsx`: the combobox and listbox semantics a screen
 * reader relies on, toggling without losing the search, and Escape closing
 * the list rather than the editor it sits in. Two things change in the port
 * and both are the composition rather than the behaviour: the field is named
 * by a `FormField` around it instead of a label it renders itself, and what
 * it announces goes through the package's one `Announcer` instead of a live
 * region of its own.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { FormField } from '../Input/index.js';
import { Modal } from '../Modal/index.js';
import { TagsInput, type TagsInputOption } from './TagsInput.js';

afterEach(cleanup);

const OPTIONS: TagsInputOption[] = [
  { value: 'Software Engineer', group: 'Seats', description: 'software-engineer' },
  { value: 'Site Reliability', group: 'Seats', description: 'site-reliability' },
  { value: 'Designer', group: 'Seats', description: 'designer' },
  { value: 'Engineering', group: 'Units' },
];

function Manages({
  initial = [] as string[],
  inModal = false,
  onClose = () => {},
  options = OPTIONS as TagsInputOption[] | undefined,
  ordered = false,
}) {
  const [value, setValue] = useState(initial);
  const picker = (
    <FormField label="Manages">
      {(field) => (
        <TagsInput
          id={field.id}
          label="Manages"
          options={options}
          allowCustom={false}
          ordered={ordered}
          value={value}
          onChange={setValue}
        />
      )}
    </FormField>
  );
  return (
    <>
      <Announcer />
      {inModal ? (
        <Modal open title="Edit seat" onClose={onClose}>
          {picker}
        </Modal>
      ) : (
        picker
      )}
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </>
  );
}

const current = () => JSON.parse(screen.getByTestId('value').textContent ?? '[]') as string[];
const box = () => screen.getByRole('combobox', { name: 'Manages' }) as HTMLInputElement;
const announced = () => screen.getByRole('status').textContent;

function highlighted(): string | null {
  const id = box().getAttribute('aria-activedescendant');
  return id ? (document.getElementById(id)?.textContent ?? null) : null;
}

test('the field is a labelled list combobox, and the list is multiselectable', () => {
  render(<Manages />);
  expect(box().getAttribute('aria-autocomplete')).toBe('list');
  expect(box().getAttribute('aria-expanded')).toBe('false');
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  const list = screen.getByRole('listbox', { name: 'Manages' });
  expect(list.getAttribute('aria-multiselectable')).toBe('true');
  expect(box().getAttribute('aria-controls')).toBe(list.id);
  expect(box().getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('group', { name: 'Units' })).toBeDefined();
});

test('typing narrows by label or value, case-insensitively', () => {
  render(<Manages />);
  fireEvent.change(box(), { target: { value: 'ENG' } });
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Software Engineersoftware-engineer',
    'Engineering',
  ]);
});

test('Enter toggles the highlighted option, keeps the list and the search, and says what changed', () => {
  render(<Manages />);
  fireEvent.change(box(), { target: { value: 's' } });
  expect(highlighted()).toContain('Software Engineer');
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(highlighted()).toContain('Site Reliability');

  expect(fireEvent.keyDown(box(), { key: 'Enter' })).toBe(false);
  expect(current()).toEqual(['Site Reliability']);
  const row = screen.getByRole('option', { name: /Site Reliability/ });
  expect(row.getAttribute('aria-selected')).toBe('true');
  // And it SHOWS it. Enter toggles without moving the highlight, so with no
  // mark on the row itself the press changed nothing a reader could see in
  // the list: the only record of the choice was a chip outside it.
  expect(row.querySelector('.crewlet-tags-input__option-tick')!.childElementCount).toBe(1);
  expect(
    screen.getByRole('option', { name: /Designer/ })!.querySelector('.crewlet-tags-input__option-tick')!
      .childElementCount,
  ).toBe(0);
  expect(box().value).toBe('s');
  expect(screen.getByRole('listbox')).toBeDefined();
  expect(announced()).toBe('Added Site Reliability');

  fireEvent.keyDown(box(), { key: 'Enter' });
  expect(current()).toEqual([]);
  expect(announced()).toBe('Removed Site Reliability');
});

test('keys an input method is composing with choose, open and remove nothing', () => {
  render(<Manages initial={['Designer']} />);
  box().focus();
  expect(fireEvent.keyDown(box(), { key: 'ArrowDown', isComposing: true })).toBe(true);
  expect(box().getAttribute('aria-expanded')).toBe('false');

  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(highlighted()).toContain('Software Engineer');
  expect(fireEvent.keyDown(box(), { key: 'Enter', keyCode: 229 })).toBe(true);
  // Backspace mid-composition deletes from the word, not the last choice.
  expect(fireEvent.keyDown(box(), { key: 'Backspace', isComposing: true })).toBe(true);
  expect(current()).toEqual(['Designer']);

  fireEvent.keyDown(box(), { key: 'Enter' });
  expect(current()).toEqual(['Designer', 'Software Engineer']);
});

test('a press on an option toggles it, appended in the order chosen', () => {
  render(<Manages initial={['Designer']} />);
  fireEvent.click(box());
  fireEvent.mouseDown(screen.getByRole('option', { name: /Engineering/ }));
  expect(current()).toEqual(['Designer', 'Engineering']);
});

test('a chosen value has a named Remove, and Backspace in an empty search removes the last', () => {
  render(<Manages initial={['Designer', 'Engineering']} />);
  const chips = screen.getByRole('list', { name: 'Chosen: Manages' });
  expect(chips.textContent).toContain('Designer');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Designer' }));
  expect(current()).toEqual(['Engineering']);
  expect(announced()).toBe('Removed Designer');

  fireEvent.keyDown(box(), { key: 'Backspace' });
  expect(current()).toEqual([]);
  expect(announced()).toBe('Removed Engineering');
});

test('a chosen value the options no longer offer is shown as itself, not dropped', () => {
  render(<Manages initial={['Former Unit']} />);
  expect(screen.getByRole('button', { name: 'Remove Former Unit' })).toBeDefined();
});

test('after a Remove, focus goes to the next chip, else the previous, else the field', () => {
  render(<Manages initial={['Designer', 'Engineering']} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Designer' }));
  // "Engineering" took the removed chip's place, so its Remove takes focus.
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Engineering' }));

  fireEvent.click(screen.getByRole('button', { name: 'Remove Engineering' }));
  expect(current()).toEqual([]);
  expect(document.activeElement).toBe(box());
});

test('Escape closes the list and leaves the dialog open; a second Escape closes it', () => {
  let closed = 0;
  render(<Manages inModal onClose={() => (closed += 1)} />);
  box().focus();
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(closed).toBe(0);
  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(closed).toBe(1);
});

test('a search that matches nothing says so, offers no listbox, and Escape still closes only that', () => {
  let closed = 0;
  render(<Manages inModal onClose={() => (closed += 1)} />);
  box().focus();
  fireEvent.change(box(), { target: { value: 'zzz' } });
  expect(screen.getByText(/Nothing matches/)).toBeDefined();
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(box().getAttribute('aria-expanded')).toBe('false');
  // Enter with a search typed is not a save.
  expect(fireEvent.keyDown(box(), { key: 'Enter' })).toBe(false);
  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(screen.queryByText(/Nothing matches/)).toBeNull();
  expect(closed).toBe(0);
});

test('a press on the veil with the list open closes the list and leaves the dialog', () => {
  const closed = vi.fn();
  const { container } = render(
    <Modal open title="Edit seat" onClose={closed}>
      <Manages />
    </Modal>,
  );
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(screen.getByRole('listbox')).toBeDefined();

  // The PRESS is what the stack acts on, and it acts on the topmost surface
  // only. Swallowing the click that follows it, so the dialog beneath does not
  // take it either, is the same stack's pairing, which Modal picks up when it
  // moves onto the modal layer.
  const veil = container.ownerDocument.querySelector('.crewlet-modal-overlay')!;
  fireEvent.pointerDown(veil);
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(closed).not.toHaveBeenCalled();
});

test('with no list on screen, Escape is the sheet’s on the first press', () => {
  let closed = 0;
  render(<Manages inModal onClose={() => (closed += 1)} options={[]} />);
  box().focus();
  // Asked to open, with nothing to offer and nothing typed: nothing is drawn.
  fireEvent.click(box());
  expect(screen.queryByRole('listbox')).toBeNull();
  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(closed).toBe(1);
});

test('an ordered chain moves a chip with Alt+Arrow and with its Move controls', () => {
  render(<Manages initial={['Designer', 'Engineering', 'Software Engineer']} ordered />);
  const later = screen.getByRole('button', { name: 'Move Designer later' });
  fireEvent.click(later);
  expect(current()).toEqual(['Engineering', 'Designer', 'Software Engineer']);
  expect(announced()).toBe('Moved Designer to position 2 of 3');

  // The chip keeps its element across the move, so focus follows it.
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move Designer later' }));
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft', altKey: true });
  expect(current()).toEqual(['Designer', 'Engineering', 'Software Engineer']);
  // At the front, Move earlier is refused rather than wrapping.
  expect(
    (screen.getByRole('button', { name: 'Move Designer earlier' }) as HTMLButtonElement).disabled,
  ).toBe(true);
});

test('with no options it is the free-text field, which commits on Enter, comma and blur', () => {
  function Free() {
    const [value, setValue] = useState<string[]>([]);
    return (
      <>
        <Announcer />
        <TagsInput label="Allowed ranges" value={value} onChange={setValue} aria-label="Ranges" />
        <pre data-testid="value">{JSON.stringify(value)}</pre>
      </>
    );
  }
  render(<Free />);
  // Named by what the caller passes, because nothing else names it: a field
  // standing on its own has no FormField label to borrow an id from.
  const field = screen.getByRole('textbox', { name: 'Ranges' }) as HTMLInputElement;
  fireEvent.change(field, { target: { value: '10.0.0.0/8' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(current()).toEqual(['10.0.0.0/8']);

  fireEvent.change(field, { target: { value: '192.168.0.0/16' } });
  fireEvent.keyDown(field, { key: ',' });
  expect(current()).toEqual(['10.0.0.0/8', '192.168.0.0/16']);

  // A free-text draft IS the value, so leaving the field keeps it.
  fireEvent.change(field, { target: { value: '172.16.0.0/12' } });
  fireEvent.blur(field);
  expect(current()).toEqual(['10.0.0.0/8', '192.168.0.0/16', '172.16.0.0/12']);
});

test('a query is not a value, so options mode adds nothing on the way out', () => {
  render(<Manages />);
  fireEvent.change(box(), { target: { value: 'Site' } });
  fireEvent.blur(box());
  expect(current()).toEqual([]);
});

test('a paste of several values says how many, not just a number', () => {
  function Free() {
    const [value, setValue] = useState<string[]>([]);
    return (
      <>
        <Announcer />
        <TagsInput label="Allowed ranges" aria-label="Ranges" value={value} onChange={setValue} />
        <pre data-testid="value">{JSON.stringify(value)}</pre>
      </>
    );
  }
  render(<Free />);
  const field = screen.getByRole('textbox', { name: 'Ranges' });
  fireEvent.paste(field, { clipboardData: { getData: () => '10.0.0.0/8, 192.168.0.0/16' } });
  expect(current()).toEqual(['10.0.0.0/8', '192.168.0.0/16']);
  // "Added 2" names nothing. One value is still named by its own words.
  expect(announced()).toBe('Added 2 values');

  fireEvent.paste(field, { clipboardData: { getData: () => '172.16.0.0/12,' } });
  expect(announced()).toBe('Added 172.16.0.0/12');
});

test('Alt+Arrow moves a chip from any of its controls, not only its Move ones', () => {
  render(<Manages initial={['Designer', 'Engineering']} ordered />);
  const remove = screen.getByRole('button', { name: 'Remove Designer' });
  remove.focus();
  // A chip at the front has its Move earlier disabled, so a reader who tabbed
  // past it was standing on the Remove when they pressed Alt+Arrow.
  fireEvent.keyDown(remove, { key: 'ArrowRight', altKey: true });
  expect(current()).toEqual(['Engineering', 'Designer']);
});

test('the list scrolls to the row the arrows are on, not to the one already chosen', () => {
  render(<Manages initial={['Software Engineer']} />);
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  const list = screen.getByRole('listbox');
  const rows = screen.getAllByRole('option');

  /*
   * jsdom lays nothing out, so the list's own box and its rows are measured
   * here: a 100px tall list whose rows are 40px each, with the fourth row
   * below the fold. The chosen row is the FIRST one and is in view, which is
   * what made the shared model's reveal do nothing at all.
   */
  const rect = (top: number, bottom: number) =>
    vi.fn(
      () =>
        ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect,
    );
  list.getBoundingClientRect = rect(0, 100);
  rows.forEach((row, at) => {
    row.getBoundingClientRect = rect(at * 40, at * 40 + 40);
  });
  let scrolled = 0;
  Object.defineProperty(list, 'scrollTop', {
    configurable: true,
    get: () => scrolled,
    set: (next: number) => {
      scrolled = next;
    },
  });

  // Down to the fourth row. The stubbed rectangles do not move as the list
  // scrolls, so the third and fourth rows each ask for their own step and the
  // two add up: 20 to bring row three's bottom into view, then 60 for row
  // four's. Without the reveal nothing moves at all.
  for (let press = 0; press < 3; press += 1) fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(rows[3]!.getAttribute('data-active')).toBe('true');
  expect(scrolled).toBe(80);
});

/*
 * The list itself, through axe. The suite in apps/ui-tests runs over the
 * components that draw a surface with no interaction; a list only exists once
 * somebody opens it, and it is the richest markup in this package: a portalled
 * panel of groups, options, headings and a name, none of which the cases above
 * would notice losing.
 */
async function auditPage(): Promise<string[]> {
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    // Contrast needs layout and resolved custom properties, neither of which
    // jsdom has. The palette suite measures it from the stylesheets instead.
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`,
  );
}

test('the chips and the open list carry no violation', async () => {
  render(
    <main>
      <h1>Seats</h1>
      <Manages initial={['Designer', 'Engineering']} ordered />
    </main>,
  );
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(screen.getByRole('listbox', { name: 'Manages' })).toBeTruthy();
  expect(await auditPage()).toEqual([]);
});
