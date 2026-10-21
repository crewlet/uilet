import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  FOCUS_MODALITY_ATTRIBUTE,
  FOCUS_RETURNED_ATTRIBUTE,
  returnFocus,
  trackFocusModality,
  useFocusModality,
} from './focusModality.js';

const modality = () => document.documentElement.getAttribute(FOCUS_MODALITY_ATTRIBUTE);

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

test('a tracked document starts as a pointer, and Tab and a press move it', () => {
  const release = trackFocusModality();
  expect(modality()).toBe('pointer');
  fireEvent.keyDown(document.body, { key: 'Tab' });
  expect(modality()).toBe('keyboard');
  fireEvent.pointerDown(document.body);
  expect(modality()).toBe('pointer');
  release();
});

test('typing in a field is not the keyboard moving focus, but a key elsewhere is', () => {
  /*
   * The ring a field draws for the keyboard is wider than the pointer's. If a
   * character typed into a field the reader clicked counted as the keyboard,
   * the ring would widen under the first letter they typed.
   */
  document.body.innerHTML = '<textarea></textarea><div contenteditable="true"></div><input type="checkbox" /><button>Go</button>';
  const release = trackFocusModality();
  const [textarea, editable, checkbox, button] = ['textarea', '[contenteditable]', 'input', 'button'].map(
    (selector) => document.querySelector(selector)!,
  );
  fireEvent.keyDown(textarea!, { key: 'a' });
  fireEvent.keyDown(editable!, { key: 'Enter' });
  // A shortcut inside a field is copy, paste or undo.
  fireEvent.keyDown(textarea!, { key: 'v', metaKey: true });
  fireEvent.keyDown(textarea!, { key: 'z', ctrlKey: true });
  expect(modality()).toBe('pointer');
  // A modifier on its own is neither.
  fireEvent.keyDown(button!, { key: 'Shift' });
  fireEvent.keyDown(button!, { key: 'Meta', metaKey: true });
  expect(modality()).toBe('pointer');
  // A shortcut outside a field is the keyboard: Cmd+K opens the palette, and
  // focus goes back on Escape to wherever the reader was, ringed.
  fireEvent.keyDown(button!, { key: 'k', metaKey: true });
  expect(modality()).toBe('keyboard');
  fireEvent.pointerDown(document.body);
  // Space on a checkbox and Enter on a button move nothing, but they are the
  // keyboard: what they open next may focus a field.
  fireEvent.keyDown(checkbox!, { key: ' ' });
  expect(modality()).toBe('keyboard');
  fireEvent.pointerDown(document.body);
  fireEvent.keyDown(button!, { key: 'Enter' });
  expect(modality()).toBe('keyboard');
  // Tab out of a field is the keyboard, wherever focus is.
  fireEvent.pointerDown(document.body);
  fireEvent.keyDown(textarea!, { key: 'Tab' });
  expect(modality()).toBe('keyboard');
  release();
});

test('the listeners are counted: the attribute stays while anything tracks, and goes with the last', () => {
  const first = trackFocusModality();
  const second = trackFocusModality();
  first();
  // A release called twice is one release, or the second field to unmount
  // would take the attribute away from a third still on the page.
  first();
  expect(modality()).toBe('pointer');
  second();
  expect(modality()).toBeNull();
  fireEvent.keyDown(document.body, { key: 'Tab' });
  expect(modality()).toBeNull();
});

test('a component tracks for as long as it is mounted', () => {
  function Field() {
    useFocusModality();
    return <input aria-label="Title" />;
  }
  const { unmount } = render(<Field />);
  expect(modality()).toBe('pointer');
  fireEvent.keyDown(document.body, { key: 'Tab' });
  expect(modality()).toBe('keyboard');
  unmount();
  expect(modality()).toBeNull();
});

test('focus handed back is marked until it leaves, and a refusal leaves no mark', () => {
  /*
   * A trigger focused again when its palette closes matches :focus-visible,
   * because the palette's field always did. The mark is what lets the base
   * stylesheet keep that ring off under the pointer.
   */
  document.body.innerHTML = '<button>Open</button><button>Other</button><button disabled>Off</button>';
  const [open, other, off] = [...document.querySelectorAll('button')];
  expect(returnFocus(open)).toBe(true);
  expect(document.activeElement).toBe(open);
  expect(open!.hasAttribute(FOCUS_RETURNED_ATTRIBUTE)).toBe(true);
  // Focus that leaves takes the mark with it, so a later Tab back rings.
  other!.focus();
  expect(open!.hasAttribute(FOCUS_RETURNED_ATTRIBUTE)).toBe(false);
  // An element that cannot take focus is reported, and not left marked.
  expect(returnFocus(off)).toBe(false);
  expect(off!.hasAttribute(FOCUS_RETURNED_ATTRIBUTE)).toBe(false);
  expect(returnFocus(null)).toBe(false);
});
