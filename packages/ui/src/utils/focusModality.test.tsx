import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { FOCUS_MODALITY_ATTRIBUTE, trackFocusModality, useFocusModality } from './focusModality.js';

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
  expect(modality()).toBe('pointer');
  // A modifier on its own, and a shortcut, are neither.
  fireEvent.keyDown(button!, { key: 'Shift' });
  fireEvent.keyDown(button!, { key: 'k', metaKey: true });
  expect(modality()).toBe('pointer');
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
