/**
 * The date picker: the dialog it opens, the grid inside it, and the string it
 * hands back.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { DateTimePicker } from './DateTimePicker.js';

afterEach(cleanup);

function Picker({ initial = '', showTime = true }: { initial?: string; showTime?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DateTimePicker value={value} onChange={setValue} showTime={showTime} />
      <pre data-testid="value">{value}</pre>
    </>
  );
}

const held = () => screen.getByTestId('value').textContent;
/* Found by the half of its name that never changes: the name carries the
   moment the trigger holds, which is the whole point of it. */
const trigger = () => screen.getByRole('button', { name: /^Date:/ });
const open = () => fireEvent.click(trigger());

test('the panel is a dialog with a name, over a grid with rows', () => {
  render(<Picker initial="2026-03-10T09:30:00" />);
  open();
  expect(screen.getByRole('dialog', { name: 'Date' })).toBeTruthy();
  const grid = screen.getByRole('grid', { name: 'March 2026' });
  expect(grid).toBeTruthy();
  expect(screen.getByRole('gridcell', { name: 'Tuesday 10 March 2026' }).getAttribute('aria-selected')).toBe(
    'true',
  );
});

test('taking a day keeps the time it already held', () => {
  render(<Picker initial="2026-03-10T09:30:45" />);
  open();
  fireEvent.click(screen.getByRole('gridcell', { name: 'Friday 20 March 2026' }));
  expect(held()).toBe('2026-03-20T09:30:45');
});

test('a day taken with no time asked for closes the dialog', () => {
  render(<Picker initial="2026-03-10T00:00:00" showTime={false} />);
  open();
  fireEvent.click(screen.getByRole('gridcell', { name: 'Friday 20 March 2026' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(held()).toBe('2026-03-20T00:00:00');
});

test('the month is turned by named controls, and the heading says which', () => {
  render(<Picker initial="2026-03-10T00:00:00" />);
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('grid', { name: 'April 2026' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous year' }));
  expect(screen.getByRole('grid', { name: 'April 2025' })).toBeTruthy();
});

test('each time box is named and clamped to its own range', () => {
  render(<Picker initial="2026-03-10T09:30:00" />);
  open();
  const hour = screen.getByRole('spinbutton', { name: 'Hour' }) as HTMLInputElement;
  fireEvent.change(hour, { target: { value: '99' } });
  fireEvent.blur(hour);
  expect(held()).toBe('2026-03-10T23:30:00');

  const minute = screen.getByRole('spinbutton', { name: 'Minute' });
  fireEvent.change(minute, { target: { value: '5' } });
  fireEvent.blur(minute);
  expect(held()).toBe('2026-03-10T23:05:00');
});

test('Clear empties the value, and the trigger says what it holds', () => {
  render(<Picker initial="2026-03-10T09:30:00" />);
  expect(trigger().textContent).toContain('2026');
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(held()).toBe('');
  expect(trigger().textContent).toContain('Pick a date');
});

/*
 * The name is the whole point of the trigger, and it was the one thing the
 * trigger could not say: `aria-label` REPLACES the element's own content, so a
 * button drawn as a date announced itself as the question it answers.
 */
test('the trigger is named by the moment it holds, not just by what it is', () => {
  render(<Picker initial="2026-03-10T09:30:00" />);
  const name = trigger().getAttribute('aria-label')!;
  expect(name.startsWith('Date: ')).toBe(true);
  // Label in name: the words a reader can see are inside the name they speak.
  expect(name).toContain(trigger().textContent!);

  cleanup();
  render(<Picker />);
  expect(trigger().getAttribute('aria-label')).toBe('Date: nothing chosen');
});

test('Now takes this moment in one press, and stays inside the bounds', () => {
  render(<Picker initial="2026-03-10T09:30:00" />);
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Now' }));
  const at = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  expect(held()!.slice(0, 10)).toBe(`${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`);

  // Clamped rather than refused: a picker whose ceiling is in the past should
  // land on the ceiling rather than do nothing and say nothing about it.
  cleanup();
  function Capped() {
    const [value, setValue] = useState('2026-03-10T00:00:00');
    return (
      <>
        <DateTimePicker value={value} onChange={setValue} maxDate="2026-03-12" showTime={false} />
        <pre data-testid="value">{value}</pre>
      </>
    );
  }
  render(<Capped />);
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Today' }));
  expect(held()).toBe('2026-03-12T00:00:00');
});

test('every string the panel renders can be replaced', () => {
  render(
    <>
      <DateTimePicker
        value="2026-03-10T09:30:00"
        onChange={() => {}}
        ariaLabel="Commence"
        labels={{
          doneLabel: 'Terminé',
          nowLabel: 'Maintenant',
          triggerName: (name, value) => `${name} / ${value}`,
        }}
      />
    </>,
  );
  const named = screen.getByRole('button', { name: /^Commence \/ / });
  fireEvent.click(named);
  expect(screen.getByRole('button', { name: 'Terminé' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Maintenant' })).toBeTruthy();
});

test('a day outside the bounds refuses to be taken', () => {
  function Bounded() {
    const [value, setValue] = useState('2026-03-10T00:00:00');
    return (
      <>
        <DateTimePicker value={value} onChange={setValue} minDate="2026-03-10" showTime={false} />
        <pre data-testid="value">{value}</pre>
      </>
    );
  }
  render(<Bounded />);
  open();
  const refused = screen.getByRole('gridcell', { name: 'Monday 9 March 2026' });
  expect(refused.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(refused);
  expect(held()).toBe('2026-03-10T00:00:00');
});

test('inline draws the panel itself, with no trigger and no overlay', () => {
  const done = vi.fn();
  function Inline() {
    const [value, setValue] = useState('2026-03-10T09:30:45');
    return (
      <>
        <DateTimePicker inline value={value} onChange={setValue} onDone={done} ariaLabel="Created" />
        <pre data-testid="value">{value}</pre>
      </>
    );
  }
  render(<Inline />);
  /*
   * The surface holding this is already an overlay. Drawn as a trigger there,
   * reaching a date was two presses and two stacked panels for one answer.
   */
  expect(screen.queryByRole('button', { name: 'Created' })).toBe(null);
  expect(screen.queryByRole('dialog')).toBe(null);
  expect(screen.getByRole('grid', { name: 'March 2026' })).toBeTruthy();

  // The same calendar, hands back the same string.
  fireEvent.click(screen.getByRole('gridcell', { name: 'Friday 20 March 2026' }));
  expect(held()).toBe('2026-03-20T09:30:45');

  // And the surface is told when the reader is finished, since there is no
  // panel of this component's own to close.
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(done).toHaveBeenCalledTimes(1);
});
