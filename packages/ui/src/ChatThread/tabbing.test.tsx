/**
 * A transcript is one stop in the tab order: Tab lands on a message row,
 * walks that row's own controls, and leaves for the next stop that is not
 * inside another message. jsdom moves no focus on Tab by itself, so every
 * move asserted here is one the log made.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ChatMessage } from '../ChatMessage/index.js';
import { ChatThread } from './index.js';

afterEach(cleanup);

function Row({ n }: { n: number }) {
  return (
    <ChatMessage
      id={`m-${n}`}
      label={`Message ${n}`}
      author={`Person ${n}`}
      time="09:00"
      timeTitle="9:00 AM"
      avatar={<span aria-hidden="true">P{n}</span>}
    >
      <p>Words {n}</p>
      <button type="button">React {n}</button>
      <button type="button">Reply {n}</button>
    </ChatMessage>
  );
}

function mount() {
  render(
    <>
      <button type="button">Before</button>
      <ChatThread label="Conversation">
        <button type="button">Older messages</button>
        <Row n={1} />
        <button type="button">Day pill</button>
        <Row n={2} />
        <Row n={3} />
      </ChatThread>
      <button type="button">After</button>
    </>,
  );
}

const row = (n: number) => screen.getByRole('article', { name: `Message ${n}` });
const button = (name: string) => screen.getByRole('button', { name });
const focused = () => document.activeElement;
/** Tab as a reader presses it: the key on the focused element, then the focus it causes. */
function tab(shift = false) {
  fireEvent.keyDown(focused()!, { key: 'Tab', shiftKey: shift });
}
/** Focus that Tab moved from `from` to `to` by the browser's own order. */
function tabbedInto(to: HTMLElement, from: HTMLElement) {
  fireEvent.keyDown(from, { key: 'Tab' });
  to.focus();
  fireEvent.focusIn(to, { relatedTarget: from });
  fireEvent.keyUp(to, { key: 'Tab' });
}

/** Lays the log and its rows out: the log 0 to 300, each row 100px tall from `top`, and named buttons 24px tall. */
function layout(rows: Record<number, number>, buttons: Record<string, number> = {}) {
  const box = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 600, width: 600, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  screen.getByRole('log').getBoundingClientRect = () => box(0, 300);
  for (const [n, top] of Object.entries(rows)) row(Number(n)).getBoundingClientRect = () => box(top, top + 100);
  for (const [name, top] of Object.entries(buttons)) button(name).getBoundingClientRect = () => box(top, top + 24);
}

// Mutation: drop the log's Tab handling and Tab from a row's last control
// walks into the next message's controls.
test("Tab past a row's last control leaves for the next stop outside the messages", () => {
  mount();
  button('Reply 2').focus();
  tab();
  expect(focused()).toBe(button('After'));
});

test('Tab from a row walks its own controls in order, then leaves', () => {
  mount();
  row(2).focus();
  tab();
  expect(focused()).toBe(button('React 2'));
  tab();
  expect(focused()).toBe(button('Reply 2'));
  tab();
  expect(focused()).toBe(button('After'));
});

test('a control between rows is a stop of its own', () => {
  mount();
  layout({ 1: 0, 2: 120, 3: 240 }, { 'Day pill': 110 });
  button('Reply 1').focus();
  tab();
  expect(focused()).toBe(button('Day pill'));
});

test("Shift+Tab mirrors it: back through the row's controls to the row, then out past the log", () => {
  mount();
  layout({ 1: 0, 2: 120, 3: 240 }, { 'Day pill': 110 });
  button('Reply 3').focus();
  tab(true);
  expect(focused()).toBe(button('React 3'));
  tab(true);
  expect(focused()).toBe(row(3));
  tab(true);
  // Not Reply 2 in the row above, and not the log's own scroller.
  expect(focused()).toBe(button('Day pill'));
});

test('Tab into the log lands on a message row, not on the scroller', () => {
  mount();
  tabbedInto(screen.getByRole('log'), button('Before'));
  // jsdom lays nothing out, so no row is in view and the newest one is chosen.
  expect(focused()).toBe(row(3));
});

test('Shift+Tab into the log from below lands on the row, not on its last control', () => {
  mount();
  tabbedInto(button('Reply 3'), button('After'));
  expect(focused()).toBe(row(3));
});

test('the row last focused is where Tab lands again, while it is in view', () => {
  mount();
  layout({ 1: -200, 2: 0, 3: 150 });
  row(2).focus();
  button('After').focus();
  tabbedInto(screen.getByRole('log'), button('Before'));
  expect(focused()).toBe(row(2));
});

test('scrolled out of view, the last row focused gives way to the newest in view', () => {
  mount();
  layout({ 1: 0, 2: 120, 3: 400 });
  row(1).focus();
  button('After').focus();
  layout({ 1: -300, 2: 50, 3: 200 });
  tabbedInto(screen.getByRole('log'), button('Before'));
  expect(focused()).toBe(row(3));
});

test('a click on a control inside a row is left where it lands', () => {
  mount();
  button('After').focus();
  const react = button('React 2');
  react.focus();
  fireEvent.focusIn(react, { relatedTarget: button('After') });
  expect(focused()).toBe(react);
});

// Mutation: let an off-screen control in the log be a stop, and Shift+Tab out
// of the newest row scrolls the whole history to its head.
test('a control in the log scrolled out of view is passed over, not scrolled to', () => {
  mount();
  layout({ 1: 0, 2: 120, 3: 240 }, { 'Older messages': -900, 'Day pill': -20 });
  row(1).focus();
  tab(true);
  expect(focused()).toBe(button('Before'));
});

test('Tab from a control between rows follows the same rule', () => {
  mount();
  layout({ 1: -400, 2: 30, 3: 160 }, { 'Older messages': -900, 'Day pill': 4 });
  button('Day pill').focus();
  tab(true);
  // Not Older messages far above, not the rows' controls, not the log.
  expect(focused()).toBe(button('Before'));
  button('Day pill').focus();
  tab();
  expect(focused()).toBe(button('After'));
});
