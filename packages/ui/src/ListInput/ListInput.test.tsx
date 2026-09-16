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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { ListInput } from './ListInput.js';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';

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
  expect(px(box, 'padding-inline')).toBe(0);
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
test('the new-item box comes before the list, and the add control beside the legend', () => {
  render(<Goals initial={['Ship', 'Measure']} />);
  const box = screen.getByLabelText('New goal');
  const card = document.querySelector('.crewlet-list-input__items')!;
  expect(box.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const add = screen.getByRole('button', { name: 'Add goal' });
  const legend = document.querySelector('legend')!;
  expect(legend.contains(add)).toBe(true);
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

  /*
   * The reveal itself is read off the rule that performs it. jsdom does not
   * re-evaluate a dynamic pseudo-class in a computed style (measured: a
   * focused input leaves `:focus-within` unmatched), so the alternative would
   * be a case that always passes.
   */
  const revealed = [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
    .find((rule) => rule.style.opacity === '1' && rule.selectorText.includes('__move'))!;
  expect(revealed.selectorText).toContain(':hover');
  expect(revealed.selectorText).toContain(':focus-within');
});
