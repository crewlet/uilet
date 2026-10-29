/**
 * An ordered list edited in place: Enter adds, Alt+Arrow and the buttons
 * move, focus follows the item, and every change is said out loud.
 *
 * Ported from the engine dashboard's `ui/ListField.test.tsx`. Each case is
 * one a keyboard or screen-reader user meets on the first list they edit:
 * Enter that saved the whole editor mid-sentence, a move that left focus on a
 * button now describing a different item, a removal that dropped focus to the
 * page, a reorder nobody heard. The one change in the port is where the
 * announcement lands: the package's single `Announcer`, not a live region the
 * component mounts for itself.
 */

import { cleanup, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRef, useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { InlineEditor } from '../InlineEditor/index.js';
import { ListInput, withDraft, type ListInputHandle } from './ListInput.js';
import { installSheets, px, userAction } from '../../../../apps/ui-tests/src/cascade.js';

afterEach(cleanup);

function Goals({
  initial,
  multiline,
  copies,
}: {
  initial: string[];
  multiline?: boolean;
  /** An owner that stores a copy of what it is given, as a reducer does. */
  copies?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form onSubmit={() => {}}>
      <Announcer />
      <ListInput
        label="Goals"
        itemName="goal"
        value={value}
        onChange={(next) => setValue(copies ? [...next] : next)}
        multiline={multiline}
        placeholder="Add a goal"
      />
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </form>
  );
}

const current = () => JSON.parse(screen.getByTestId('value').textContent ?? '[]') as string[];
const announced = () => screen.getByRole('status').textContent;

test('items are labelled controls in a group named by the list, edited in place', () => {
  render(<Goals initial={['Ship the beta', 'Hire two engineers']} />);
  expect(screen.getByRole('group', { name: 'Goals' })).toBeDefined();
  const second = screen.getByLabelText('Goal 2 of 2') as HTMLInputElement;
  fireEvent.change(second, { target: { value: 'Hire three engineers' } });
  expect(current()).toEqual(['Ship the beta', 'Hire three engineers']);
});

test('Enter in the new-item box adds a trimmed item, keeps focus there, and never submits', () => {
  render(<Goals initial={['Ship the beta']} />);
  const box = screen.getByLabelText('New goal') as HTMLInputElement;
  box.focus();
  fireEvent.change(box, { target: { value: '  Open a second region  ' } });
  expect(fireEvent.keyDown(box, { key: 'Enter' })).toBe(false);
  expect(current()).toEqual(['Ship the beta', 'Open a second region']);
  expect(box.value).toBe('');
  expect(document.activeElement).toBe(box);
  expect(announced()).toBe('Added goal 2 of 2');

  // Blank adds nothing, and is still no submit.
  expect(fireEvent.keyDown(box, { key: 'Enter' })).toBe(false);
  expect(current()).toHaveLength(2);
});

test('the Enter that accepts an input method’s word neither adds nor moves on', () => {
  render(<Goals initial={['Ship the beta', 'Hire two engineers']} />);
  const box = screen.getByLabelText('New goal') as HTMLInputElement;
  box.focus();
  fireEvent.change(box, { target: { value: 'ベータ版' } });
  expect(fireEvent.keyDown(box, { key: 'Enter', isComposing: true })).toBe(true);
  expect(fireEvent.keyDown(box, { key: 'Enter', keyCode: 229 })).toBe(true);
  expect(current()).toEqual(['Ship the beta', 'Hire two engineers']);
  expect(box.value).toBe('ベータ版');

  const first = screen.getByLabelText('Goal 1 of 2');
  first.focus();
  expect(fireEvent.keyDown(first, { key: 'Enter', isComposing: true })).toBe(true);
  expect(fireEvent.keyDown(first, { key: 'ArrowDown', altKey: true, isComposing: true })).toBe(true);
  expect(current()).toEqual(['Ship the beta', 'Hire two engineers']);
  expect(document.activeElement).toBe(first);

  fireEvent.keyDown(box, { key: 'Enter' });
  expect(current()).toEqual(['Ship the beta', 'Hire two engineers', 'ベータ版']);
});

test('Shift+Enter is a newline in a multiline list, and Enter still adds', () => {
  render(<Goals initial={[]} multiline />);
  const box = screen.getByLabelText('New goal') as HTMLTextAreaElement;
  expect(box.tagName).toBe('TEXTAREA');
  expect(fireEvent.keyDown(box, { key: 'Enter', shiftKey: true })).toBe(true);
  fireEvent.change(box, { target: { value: 'First line\nSecond line' } });
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(current()).toEqual(['First line\nSecond line']);
});

test('Enter in an item moves on to the next item, then to the new-item box', () => {
  render(<Goals initial={['a', 'b']} />);
  const first = screen.getByLabelText('Goal 1 of 2');
  first.focus();
  expect(fireEvent.keyDown(first, { key: 'Enter' })).toBe(false);
  expect(document.activeElement).toBe(screen.getByLabelText('Goal 2 of 2'));
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  expect(document.activeElement).toBe(screen.getByLabelText('New goal'));
});

test('Alt+Arrow moves the focused item, and focus and the element move with it', () => {
  // An owner that copies the array is the harder case: the list cannot tell
  // its own change from somebody else's by reference.
  render(<Goals initial={['a', 'b', 'c']} copies />);
  const a = screen.getByLabelText('Goal 1 of 3') as HTMLInputElement;
  a.focus();
  fireEvent.keyDown(a, { key: 'ArrowDown', altKey: true });
  expect(current()).toEqual(['b', 'a', 'c']);
  // The same element, now second, still holding focus.
  expect(screen.getByLabelText('Goal 2 of 3')).toBe(a);
  expect(document.activeElement).toBe(a);
  expect(announced()).toBe('Moved goal to position 2 of 3');

  fireEvent.keyDown(a, { key: 'ArrowUp', altKey: true });
  fireEvent.keyDown(a, { key: 'ArrowUp', altKey: true });
  expect(current()).toEqual(['a', 'b', 'c']);
});

test('a Move button keeps focus on the moved item’s button, switching sides at an end', () => {
  render(<Goals initial={['a', 'b', 'c']} />);
  expect(
    (screen.getByRole('button', { name: 'Move goal 1 of 3 up' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(
    (screen.getByRole('button', { name: 'Move goal 3 of 3 down' }) as HTMLButtonElement).disabled,
  ).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Move goal 2 of 3 down' }));
  expect(current()).toEqual(['a', 'c', 'b']);
  // "b" reached the bottom, so its Down is disabled and focus takes its Up.
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move goal 3 of 3 up' }));

  fireEvent.click(document.activeElement as HTMLButtonElement);
  expect(current()).toEqual(['a', 'b', 'c']);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move goal 2 of 3 up' }));

  // And the other way: "b" reaches the top, so focus takes its Down.
  fireEvent.click(document.activeElement as HTMLButtonElement);
  expect(current()).toEqual(['b', 'a', 'c']);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move goal 1 of 3 down' }));
});

test('removing an item focuses the one that took its place, else the one before, else the new box', () => {
  render(<Goals initial={['a', 'b']} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove goal 1 of 2' }));
  expect(current()).toEqual(['b']);
  expect(document.activeElement).toBe(screen.getByLabelText('Goal 1 of 1'));
  expect(announced()).toBe('Removed goal 1 of 2');

  fireEvent.click(screen.getByRole('button', { name: 'Remove goal 1 of 1' }));
  expect(current()).toEqual([]);
  expect(document.activeElement).toBe(screen.getByLabelText('New goal'));
});

test('two identical sentences are two items', () => {
  render(<Goals initial={['same', 'same']} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove goal 2 of 2' }));
  expect(current()).toEqual(['same']);
});

test('the group carries its help and its error, and both are read', () => {
  render(
    <ListInput
      label="Goals"
      itemName="goal"
      value={['a']}
      onChange={() => {}}
      helper="The first one is read first."
      error="A goal cannot be empty."
    />,
  );
  const group = screen.getByRole('group', { name: 'Goals' });
  const said = (group.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent);
  expect(said).toEqual(['The first one is read first.', 'A goal cannot be empty.']);
});

/* -------------------------------------------------------------------------
 * What is DRAWN. jsdom applies no stylesheet on its own, so the card, its
 * rules and the row's own height are invisible to every case above; these put
 * the real sheet in and read back what the cascade decides. A regular
 * expression over the file would pass while the defect shipped, which is how
 * three of them reached an owner in one week.
 * ---------------------------------------------------------------------- */

let removeSheet: (() => void) | null = null;
afterEach(() => {
  removeSheet?.();
  removeSheet = null;
});

/**
 * THE LIST IS ONE CARD, not a stack of boxes. Three items measured 256px
 * against the console's 111 because each was a two-row textarea with three
 * buttons beside it, and the card, its rules and the drawn position are what
 * make a list of sentences read as a list.
 */
test('the list is one bordered card whose rows are divided, not a stack of boxes', () => {
  removeSheet = installSheets('ListInput/ListInput.css');
  render(<Goals initial={['Ship', 'Measure', 'Learn']} />);
  const card = document.querySelector<HTMLElement>('.crewlet-list-input__items')!;
  expect(px(card, 'border-radius')).toBe(8);
  expect(getComputedStyle(card).overflow).toBe('hidden');
  // The colour is deliberately not substituted by the cascade helper, so the
  // width and the style are what is read: a border nobody draws is width 0.
  expect(px(card, 'border-top-width')).toBe(1);
  expect(getComputedStyle(card).borderTopStyle).toBe('solid');

  const rows = [...card.querySelectorAll<HTMLElement>('.crewlet-list-input__item')];
  expect(rows).toHaveLength(3);
  // Divided by a rule, and the last row does not draw one onto the card's
  // own bottom edge.
  for (const row of rows.slice(0, -1)) {
    expect(getComputedStyle(row).getPropertyValue('border-block-end-style')).toBe('solid');
  }
  expect(getComputedStyle(rows[2]!).getPropertyValue('border-block-end-style')).toBe('none');
  // One line: the block padding is a quarter step, so the row stands at the
  // height of the control inside it rather than of two rows of text.
  expect(px(rows[0]!, 'padding-top')).toBe(4);
  expect(px(rows[0]!, 'padding-left')).toBe(12);

  /*
   * AND THE CONTROL DOES NOT ADD ITS OWN STEP BACK. At its own 44px minimum
   * the row measured 53px against the console's 37 (measured in Chrome), and
   * its inline padding indented every sentence a second time past the number
   * beside it.
   */
  const control = rows[0]!.querySelector<HTMLElement>('.crewlet-textarea, .crewlet-input')!;
  expect(px(control, 'min-height')).toBe(0);
  const box = rows[0]!.querySelector<HTMLElement>('.crewlet-textarea, .crewlet-input__control')!;
  // The logical properties as written: jsdom keeps the shorthand it is given
  // rather than expanding it onto the physical sides.
  expect(px(box, 'padding-block')).toBe(4);
  // EDITING NEVER MOVES THE WORDS: an inset for the ring, taken back by a
  // margin of the same step, so the text sits where it sat at rest.
  expect(px(box, 'padding-inline')).toBe(8);
  expect(px(box, 'margin-inline')).toBe(-8);
  // The number on the text's first line, at the words' line height.
  const index = rows[0]!.querySelector('.crewlet-list-input__index')!;
  expect(getComputedStyle(index).alignSelf).toBe('flex-start');
  expect(px(index, 'padding-block-start')).toBe(5);
});

test('an item is one growing line, never a block of empty rows', () => {
  render(<Goals initial={['Ship']} multiline />);
  const item = screen.getByLabelText('Goal 1 of 1') as HTMLTextAreaElement;
  expect(item.rows).toBe(1);
  const box = screen.getByLabelText('New goal') as HTMLTextAreaElement;
  expect(box.rows).toBe(1);
});

/**
 * THE BOX IS ABOVE THE LIST, which is the order the two read in: this is
 * where an item is written, and what follows is what has been written. The
 * list above it put the answer before the question and pushed the box further
 * down the form with every item added.
 */
test('the new-item box comes before the list, and its Add button ends the box’s row', () => {
  render(<Goals initial={['Ship', 'Measure']} />);
  const box = screen.getByLabelText('New goal');
  const card = document.querySelector('.crewlet-list-input__items')!;
  expect(box.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const add = screen.getByRole('button', { name: 'Add goal' });
  // One way in beside Enter, at the end of the field's own row, showing the
  // word its name begins with; nothing floats beside the legend.
  expect(document.querySelector('legend')!.querySelector('button')).toBeNull();
  expect(add.closest('.crewlet-list-input__add')).toBe(box.closest('.crewlet-list-input__add'));
  expect(add.textContent).toBe('Add');
  // And it is the same door as Enter: what the box holds is appended.
  fireEvent.change(box, { target: { value: 'Learn' } });
  fireEvent.click(add);
  expect(screen.getByLabelText('Goal 3 of 3')).toHaveProperty('value', 'Learn');
});

/**
 * THE ROW'S POSITION IS DRAWN, because the order is the meaning here. It is
 * decoration to a reader's software: the control beside it is already named
 * "Goal 2 of 3", and a number read out before every sentence is the position
 * said twice.
 */
test('each row draws its position, and says it to nobody twice', () => {
  render(<Goals initial={['Ship', 'Measure']} />);
  const marks = [...document.querySelectorAll('.crewlet-list-input__index')];
  expect(marks.map((mark) => mark.textContent)).toEqual(['1', '2']);
  expect(marks.every((mark) => mark.getAttribute('aria-hidden') === 'true')).toBe(true);
});

/**
 * ONE CONTROL AT REST. Three per row is what turned a list of sentences into
 * a grid of buttons. Move up and Move down are still THERE, and still named:
 * they are revealed by the pointer and by the focus, never removed, because
 * an invisible control that takes a Tab is the worst of both.
 */
test('a row rests with one control, and reveals the pair that reorders it on focus', () => {
  removeSheet = installSheets('ListInput/ListInput.css');
  render(<Goals initial={['Ship', 'Measure']} />);
  const move = document.querySelector<HTMLElement>('.crewlet-list-input__move')!;
  expect(px(move, 'opacity')).toBe(0);
  // Still named, still in the tab order, and still reachable without the
  // pointer: Alt+Up and Alt+Down act from the item itself.
  expect(screen.getByRole('button', { name: 'Move goal 1 of 2 down' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Remove goal 1 of 2' })).toBeDefined();

  // Under the pointer, through the harness's stand-in for `:hover`.
  const release = userAction(move.closest('.crewlet-list-input__item')!, 'hover');
  expect(px(move, 'opacity')).toBe(1);
  release();

  /*
   * The reveal on focus is read off the rule that performs it. jsdom does not
   * re-evaluate a dynamic pseudo-class in a computed style (measured: a
   * focused input leaves `:focus-within` unmatched), so the alternative would
   * be a case that always passes. The harness writes a selector list as one
   * rule per selector (jsdom scores and matches a list wrongly), so the reveal
   * is every rule that performs it, taken together.
   */
  const revealed = [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
    .filter((rule) => rule.style.opacity === '1' && rule.selectorText.includes('__move'))
    .map((rule) => rule.selectorText);
  expect(revealed.some((selector) => selector.includes(':focus-within'))).toBe(true);
});

test('a list asked to take the focus puts it in the new-item box once, on mount', () => {
  const { rerender } = render(
    <ListInput label="Policies" itemName="policy" value={['Ask first.']} onChange={() => {}} focusOnMount />,
  );
  const box = screen.getByLabelText('New policy');
  expect(document.activeElement).toBe(box);
  // A later render does not take it back from where the reader moved it.
  const item = screen.getByLabelText('Policy 1 of 1') as HTMLInputElement;
  item.focus();
  rerender(<ListInput label="Policies" itemName="policy" value={['Ask first!']} onChange={() => {}} focusOnMount />);
  expect(document.activeElement).toBe(item);
});

test('a list not asked leaves the focus where it was', () => {
  render(<ListInput label="Policies" itemName="policy" value={[]} onChange={() => {}} />);
  expect(document.activeElement).toBe(document.body);
});

// ---- a list with limits, refusals and a grip --------------------------------

function Policies({
  initial,
  ...rest
}: { initial: string[] } & Partial<Omit<Parameters<typeof ListInput>[0], 'value' | 'onChange'>>) {
  const [value, setValue] = useState(initial);
  return (
    <form onSubmit={() => {}}>
      <Announcer />
      <ListInput label="Policies" itemName="policy" multiline {...rest} value={value} onChange={setValue} />
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </form>
  );
}

test('a full list says so where the box was, and the focus moves to what was just added', () => {
  render(<Policies initial={['One.']} maxItems={2} />);
  const box = screen.getByLabelText('New policy');
  box.focus();
  fireEvent.change(box, { target: { value: 'Two.' } });
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(current()).toEqual(['One.', 'Two.']);
  expect(screen.queryByLabelText('New policy')).toBeNull();
  expect(document.body.textContent).toContain("That's the most. Remove one to add another.");
  expect(document.activeElement).toBe(screen.getByLabelText('Policy 2 of 2'));
  expect(announced()).toBe("Added policy 2 of 2. That's the most. Remove one to add another.");
  // Every item is still the reader's: removing one brings the box back.
  fireEvent.click(screen.getByRole('button', { name: 'Remove policy 1 of 2' }));
  expect(screen.getByLabelText('New policy')).toBeDefined();
});

test('with a most, the help line ends in how many it holds of it, and the group is described by it', () => {
  const { rerender } = render(<Policies initial={['One.', 'Two.', 'Three.']} maxItems={5} helper="Short lines." />);
  const tally = document.querySelector('.crewlet-form-field__tally')!;
  expect(tally.textContent).toBe('3 of 5');
  const group = screen.getByRole('group', { name: /Policies/ });
  expect((group.getAttribute('aria-describedby') ?? '').split(' ')).toContain(tally.id);
  rerender(<Policies initial={['One.']} />);
  // Without a most there is nothing to count against.
  expect(document.querySelectorAll('.crewlet-form-field__tally')).toHaveLength(0);
});

test('the count reads 5 of 5 at the most, and its words are the caller’s', () => {
  render(<Policies initial={['1', '2', '3', '4', '5']} maxItems={5} tallyLabel={(count, max) => `${count} von ${max}`} />);
  expect(document.querySelector('.crewlet-form-field__tally')!.textContent).toBe('5 von 5');
  expect(document.body.textContent).toContain("That's the most. Remove one to add another.");
});

test('an item over the length limit keeps its words, says by how much, and is invalid', () => {
  render(<Policies initial={['Short.']} maxLength={10} />);
  const item = screen.getByLabelText('Policy 1 of 1');
  expect(item.getAttribute('aria-invalid')).toBeNull();
  expect(item.getAttribute('aria-describedby')).toBeNull();
  fireEvent.change(item, { target: { value: 'Far too long a policy.' } });
  expect(current()).toEqual(['Far too long a policy.']);
  expect(item.getAttribute('aria-invalid')).toBe('true');
  const count = document.getElementById(item.getAttribute('aria-describedby')!);
  expect(count?.textContent).toContain('12 characters over the limit of 10');
});

test('the new-item box refuses an item over the limit, and shows its count in the keycap’s place', () => {
  render(<Policies initial={[]} maxLength={10} />);
  const box = screen.getByLabelText('New policy');
  fireEvent.change(box, { target: { value: 'Exactly 10' } });
  expect(box.closest('.crewlet-textarea-shell')?.textContent).toContain('10 of 10 characters');
  fireEvent.change(box, { target: { value: 'Eleven char' } });
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(current()).toEqual([]);
  expect(box.getAttribute('aria-invalid')).toBe('true');
  expect((screen.getByRole('button', { name: 'Add policy' }) as HTMLButtonElement).disabled).toBe(true);
});

test('a refusal of one item is said under it and describes it', () => {
  render(
    <Policies
      initial={['Fine.', 'Refused.']}
      itemError={(index) => (index === 1 ? 'This policy repeats policy 1.' : undefined)}
    />,
  );
  expect(screen.getByLabelText('Policy 1 of 2').getAttribute('aria-invalid')).toBeNull();
  const refused = screen.getByLabelText('Policy 2 of 2');
  expect(refused.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(refused.getAttribute('aria-describedby')!)?.textContent).toBe(
    'This policy repeats policy 1.',
  );
});

/** What a drag carries, as far as the reorder hook reads or writes it. */
function carried() {
  return { effectAllowed: 'none', dropEffect: 'none', setData: vi.fn(), setDragImage: vi.fn() };
}

function dragOverAt(el: Element, y: number) {
  const event = createEvent.dragOver(el, { dataTransfer: carried() });
  Object.defineProperty(event, 'clientX', { value: 10 });
  Object.defineProperty(event, 'clientY', { value: y });
  fireEvent(el, event);
}

const rows = () =>
  within(document.querySelector<HTMLElement>('.crewlet-list-input__items')!)
    .getAllByRole('listitem');

test('a list that drags draws a grip per row, hidden from a screen reader and out of the tab order', () => {
  const { rerender } = render(<Policies initial={['One.', 'Two.']} />);
  expect(document.querySelector('.crewlet-list-input__handle')).toBeNull();
  rerender(<Policies initial={['One.', 'Two.']} reorderByDrag />);
  const grips = [...document.querySelectorAll<HTMLElement>('.crewlet-list-input__handle')];
  expect(grips).toHaveLength(2);
  for (const grip of grips) {
    expect(grip.getAttribute('aria-hidden')).toBe('true');
    expect(grip.getAttribute('draggable')).toBe('true');
    expect(grip.tabIndex).toBe(-1);
  }
});

test('a dragged row is dropped where it was carried, the item keeping its element, and it is said', () => {
  render(<Policies initial={['One.', 'Two.', 'Three.']} reorderByDrag />);
  const moved = screen.getByLabelText('Policy 1 of 3');
  const grip = rows()[0]!.querySelector('.crewlet-list-input__handle')!;
  fireEvent.dragStart(grip, { dataTransfer: carried() });
  expect(rows()[0]!.getAttribute('data-reorder')).toBe('dragging');
  // Past the middle of the last row on the way down.
  const last = rows()[2]!;
  dragOverAt(last, 10);
  fireEvent.drop(last, { dataTransfer: carried() });
  expect(current()).toEqual(['Two.', 'Three.', 'One.']);
  expect(screen.getByLabelText('Policy 3 of 3')).toBe(moved);
  expect(announced()).toBe('Moved policy to position 3 of 3');
});

test('a disabled list draws no grip', () => {
  render(<Policies initial={['One.']} reorderByDrag disabled />);
  expect(document.querySelector('.crewlet-list-input__handle')).toBeNull();
});

test('a list with every addition passes axe, full, over the limit and refused', async () => {
  const { container } = render(
    <Policies
      initial={['One.', 'A policy well past the limit.']}
      reorderByDrag
      maxItems={2}
      maxLength={12}
      itemError={(index) => (index === 0 ? 'Refused.' : undefined)}
    />,
  );
  expect((await axe.run(container)).violations).toEqual([]);
});

// ---- the draft, undo, a hidden legend, a focus handle, a byte limit ----------

/** A form that saves the list the way the Principles editor does: with `withDraft`. */
function SavedPolicies({ onSave }: { onSave: (saved: string[]) => void }) {
  const [value, setValue] = useState(['One.']);
  const [draft, setDraft] = useState('');
  const dirty = draft.trim() !== '' || value.length !== 1;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(withDraft(value, draft));
      }}
    >
      <Announcer />
      <ListInput label="Policies" itemName="policy" value={value} onChange={setValue} draft={draft} onDraftChange={setDraft} />
      <span data-testid="dirty">{String(dirty)}</span>
      <button type="submit">Save</button>
    </form>
  );
}

test('a policy typed and not added is the owner’s to see and to save, never dropped', () => {
  const onSave = vi.fn();
  render(<SavedPolicies onSave={onSave} />);
  fireEvent.change(screen.getByLabelText('New policy'), { target: { value: '  Ask first.  ' } });
  // The owner holds the box's text, so its unsaved-changes check sees it.
  expect(screen.getByTestId('dirty').textContent).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onSave).toHaveBeenCalledWith(['One.', 'Ask first.']);
});

test('the owner’s draft is the box’s text, and an add clears it through the owner', () => {
  const onDraftChange = vi.fn();
  const { rerender } = render(
    <ListInput label="Policies" itemName="policy" value={[]} onChange={() => {}} draft="Held" onDraftChange={onDraftChange} />,
  );
  const box = screen.getByLabelText('New policy') as HTMLInputElement;
  expect(box.value).toBe('Held');
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(onDraftChange).toHaveBeenLastCalledWith('');
  rerender(<ListInput label="Policies" itemName="policy" value={['Held']} onChange={() => {}} draft="" onDraftChange={onDraftChange} />);
  expect(box.value).toBe('');
});

test('withDraft appends the trimmed draft, and nothing for an empty one', () => {
  expect(withDraft(['a'], ' b ')).toEqual(['a', 'b']);
  expect(withDraft(['a'], '   ')).toEqual(['a']);
  expect(withDraft(['a'], undefined)).toEqual(['a']);
});

test('a removal leaves a row with Undo where it was, and Undo puts it back with the focus in it', () => {
  render(<Policies initial={['One.', 'Two.', 'Three.']} undoRemove />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove policy 2 of 3' }));
  expect(current()).toEqual(['One.', 'Three.']);
  const undo = screen.getByRole('button', { name: 'Undo' });
  expect(document.activeElement).toBe(undo);
  // In the item's own place in the order, and it says which.
  const rows = [...document.querySelectorAll('.crewlet-list-input__items > li')];
  expect(rows[1]?.className).toContain('crewlet-list-input__removed');
  expect(document.getElementById(undo.getAttribute('aria-describedby')!)?.textContent).toBe('Policy 2 removed.');
  fireEvent.click(undo);
  expect(current()).toEqual(['One.', 'Two.', 'Three.']);
  const two = screen.getByLabelText('Policy 2 of 3') as HTMLTextAreaElement;
  expect(two.value).toBe('Two.');
  expect(document.activeElement).toBe(two);
  expect(announced()).toBe('Restored policy 2 of 3');
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
});

test('the undo row goes with the next change to the list, and Dismiss takes it down', () => {
  render(<Policies initial={['One.', 'Two.', 'Three.']} undoRemove />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove policy 1 of 3' }));
  fireEvent.change(screen.getByLabelText('Policy 1 of 2'), { target: { value: 'Two!' } });
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Remove policy 2 of 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  expect(document.activeElement).toBe(screen.getByLabelText('Policy 1 of 1'));
});

test('removing the last item with undo keeps the list drawn for its row', () => {
  render(<Policies initial={['Only.']} undoRemove />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove policy 1 of 1' }));
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(current()).toEqual(['Only.']);
});

test('a hidden legend still names the group, and takes no line of its own', () => {
  const remove = installSheets('VisuallyHidden/VisuallyHidden.css');
  try {
    render(<Policies initial={['One.']} hideLabel />);
    const group = screen.getByRole('group', { name: 'Policies' });
    // The LEGEND is what is hidden, not just the words inside it: a legend
    // holding hidden text still stood a line tall above the box.
    const legend = group.querySelector('legend')!;
    expect(legend.classList.contains('crewlet-visually-hidden')).toBe(true);
    expect(getComputedStyle(legend).position).toBe('absolute');
    expect(px(legend, 'height')).toBe(1);
  } finally {
    remove();
  }
});

test('under 28rem of its own width a row gives its words the row, its buttons a line under them', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ListInput.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  expect(css).toMatch(/\.crewlet-list-input__items \{[^}]*container:\s*crewlet-list-input \/ inline-size;/);
  const narrow = /@container crewlet-list-input \(width < 28rem\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  expect(narrow).toMatch(/\.crewlet-list-input__item \{\s*flex-wrap:\s*wrap;/);
  expect(narrow).toMatch(/\.crewlet-list-input__item > \.crewlet-list-input__field \{\s*flex-basis:\s*calc\(100% - /);
  expect(narrow).toMatch(/\.crewlet-list-input__item > \.crewlet-list-input__actions \{\s*margin-inline-start:\s*auto;/);
});

test('the handle focuses an item at the end of its words, and the new-item box', () => {
  const handle = createRef<ListInputHandle>();
  render(<ListInput ref={handle} label="Policies" itemName="policy" value={['One.', 'Two.']} onChange={() => {}} />);
  handle.current!.focusItem(1);
  const two = screen.getByLabelText('Policy 2 of 2') as HTMLInputElement;
  expect(document.activeElement).toBe(two);
  expect(two.selectionStart).toBe(4);
  handle.current!.focusNew();
  expect(document.activeElement).toBe(screen.getByLabelText('New policy'));
  handle.current!.focusItem(9);
  expect(document.activeElement).toBe(screen.getByLabelText('New policy'));
});

test('an item is counted in characters on its trimmed text, so an emoji is one and the spaces none', () => {
  // "Go 🙂" is four characters and five UTF-16 units; the spaces around it are trimmed off.
  render(<Policies initial={['  Go 🙂  ']} maxLength={4} />);
  const item = screen.getByLabelText('Policy 1 of 1');
  expect(item.getAttribute('aria-invalid')).toBeNull();
  fireEvent.change(item, { target: { value: '  Go 🙂!  ' } });
  expect(item.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(item.getAttribute('aria-describedby')!)?.textContent).toContain(
    '1 character over the limit of 4',
  );
});

test('the new-item box counts an emoji once, and refuses a draft past the limit', () => {
  render(<Policies initial={[]} maxLength={4} />);
  const box = screen.getByLabelText('New policy');
  fireEvent.change(box, { target: { value: 'Go 🙂' } });
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(current()).toEqual(['Go 🙂']);
  fireEvent.change(screen.getByLabelText('New policy'), { target: { value: 'Go 🙂🙂' } });
  fireEvent.keyDown(screen.getByLabelText('New policy'), { key: 'Enter' });
  expect(current()).toEqual(['Go 🙂']);
});

test('a removal with an Undo row is said once, by the row, and Dismiss is described by it too', () => {
  render(<Policies initial={['One.', 'Two.']} undoRemove />);
  fireEvent.click(screen.getByRole('button', { name: 'Add policy' }));
  const before = announced();
  fireEvent.click(screen.getByRole('button', { name: 'Remove policy 1 of 2' }));
  // Nothing new in the live region: the focused Undo carries the sentence.
  expect(announced()).toBe(before);
  const dismiss = screen.getByRole('button', { name: 'Dismiss' });
  expect(document.getElementById(dismiss.getAttribute('aria-describedby')!)?.textContent).toBe('Policy 1 removed.');
});

test('Mod+Enter in the box or in an item passes through to the editor’s save and adds nothing', () => {
  const onSave = vi.fn();
  function Editor() {
    const [value, setValue] = useState(['One.']);
    const [draft, setDraft] = useState('');
    return (
      <InlineEditor label="Edit the policies" dirty onSave={onSave} onCancel={() => {}} focusOnMount={false}>
        <ListInput label="Policies" itemName="policy" value={value} onChange={setValue} draft={draft} onDraftChange={setDraft} />
        <pre data-testid="value">{JSON.stringify(value)}</pre>
      </InlineEditor>
    );
  }
  render(<Editor />);
  const box = screen.getByLabelText('New policy');
  fireEvent.change(box, { target: { value: 'Two.' } });
  fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
  fireEvent.keyDown(screen.getByLabelText('Policy 1 of 1'), { key: 'Enter', ctrlKey: true });
  expect(onSave).toHaveBeenCalledTimes(2);
  expect(current()).toEqual(['One.']);
  expect((box as HTMLInputElement).value).toBe('Two.');
  // Plain Enter still adds.
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(current()).toEqual(['One.', 'Two.']);
});

test('a one-line list wraps each item to be read, and takes no line break by any road', () => {
  render(<Policies initial={['A long policy that would scroll sideways in a one-line input.']} multiline={false} />);
  const item = screen.getByLabelText('Policy 1 of 1') as HTMLTextAreaElement;
  expect(item.tagName).toBe('TEXTAREA');
  expect(item.getAttribute('aria-multiline')).toBe('false');
  fireEvent.change(item, { target: { value: 'Ask first.\nAlways.' } });
  expect(current()).toEqual(['Ask first. Always.']);
  const box = screen.getByLabelText('New policy') as HTMLTextAreaElement;
  fireEvent.change(box, { target: { value: 'Name\nthe source.' } });
  expect(box.value).toBe('Name the source.');
  // Shift+Enter adds, as Enter does: there is no line to break.
  fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
  expect(current()).toEqual(['Ask first. Always.', 'Name the source.']);
});

test('a multi-line list keeps Shift+Enter as a line break', () => {
  render(<Policies initial={[]} />);
  const box = screen.getByLabelText('New policy') as HTMLTextAreaElement;
  expect(box.getAttribute('aria-multiline')).toBeNull();
  expect(fireEvent.keyDown(box, { key: 'Enter', shiftKey: true })).toBe(true);
});

test('with the legend shown or hidden the Add button stands at the end of the box’s row', () => {
  const { unmount } = render(<Policies initial={[]} />);
  expect(screen.getByRole('button', { name: 'Add policy' }).closest('legend')).toBeNull();
  expect(screen.getAllByRole('button', { name: /^Add/ })).toHaveLength(1);
  unmount();
  render(<Policies initial={[]} hideLabel />);
  const add = screen.getByRole('button', { name: 'Add policy' });
  expect(add.closest('legend')).toBeNull();
  expect(add.closest('.crewlet-list-input__add')).toBe(screen.getByLabelText('New policy').closest('.crewlet-list-input__add'));
});
