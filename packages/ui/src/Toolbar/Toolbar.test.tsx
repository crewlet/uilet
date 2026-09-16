/**
 * The keyboard contract of a toolbar, which is the whole reason the role
 * exists: one tab stop, arrows between the controls, and a composite child
 * that keeps its own options.
 *
 * The organization builder this is taken from declared `role="toolbar"` with
 * every control a separate tab stop, so the role's promise was false and
 * reaching the content under it cost twelve presses.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { Toolbar } from './index.js';

afterEach(cleanup);

/** A segmented group of the shape a toolbar holds: one stop, its own options. */
function Segmented({ label, options }: { label: string; options: string[] }) {
  const [value, setValue] = useState(options[0]);
  return (
    <div role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          tabIndex={value === option ? 0 : -1}
          onClick={() => setValue(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Builder() {
  return (
    <Toolbar label="Organization builder">
      <Segmented label="Builder view" options={['Canvas', 'Outline']} />
      <button>Undo</button>
      <button>Redo</button>
      <button>Review and save</button>
    </Toolbar>
  );
}

function stops(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('button')].filter((button) => button.tabIndex === 0);
}

test('the whole row is one stop in the page tab order', () => {
  render(<Builder />);
  // Four controls and a group, and exactly one of them is tabbable.
  expect(stops().map((button) => button.textContent)).toEqual(['Canvas']);
});

test('the arrows walk the row, and wrap', () => {
  render(<Builder />);
  const canvas = screen.getByRole('radio', { name: 'Canvas' });
  const outline = screen.getByRole('radio', { name: 'Outline' });
  const undo = screen.getByRole('button', { name: 'Undo' });
  const save = screen.getByRole('button', { name: 'Review and save' });
  canvas.focus();

  // Inside the group first: the widget's own options, then out of it.
  fireEvent.keyDown(canvas, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(canvas);

  outline.focus();
  fireEvent.keyDown(outline, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(undo);

  fireEvent.keyDown(undo, { key: 'ArrowLeft' });
  // Back into the group, at the option the group itself is resting on.
  expect(document.activeElement).toBe(canvas);

  fireEvent.keyDown(canvas, { key: 'End' });
  expect(document.activeElement).toBe(save);
  fireEvent.keyDown(save, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(canvas);
  fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(save);
  fireEvent.keyDown(save, { key: 'Home' });
  expect(document.activeElement).toBe(canvas);
});

test('a composite child keeps the arrows until its own last option', () => {
  render(<Builder />);
  const canvas = screen.getByRole('radio', { name: 'Canvas' });
  canvas.focus();
  // Not taken by the toolbar: the group has another option to the right, and
  // moving past it would strand a reader who wanted to change the view.
  expect(fireEvent.keyDown(canvas, { key: 'ArrowRight' })).toBe(true);
  expect(document.activeElement).toBe(canvas);
});

test('the stop follows focus, so the arrows carry on from where a press landed', () => {
  render(<Builder />);
  const redo = screen.getByRole('button', { name: 'Redo' });
  // A pointer press lands here; the arrows must carry on from this control
  // rather than from wherever the row was resting.
  redo.focus();
  fireEvent.keyDown(redo, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Review and save' }));
});

test('a text field keeps its own caret keys', () => {
  render(
    <Toolbar label="Filters">
      <input aria-label="Filter by name" />
      <button>Clear</button>
    </Toolbar>,
  );
  const field = screen.getByLabelText('Filter by name');
  field.focus();
  // Left, right, Home and End are the caret's, and a field never gives them
  // back: a toolbar holding one is usually a filter bar, which is group mode.
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    expect(fireEvent.keyDown(field, { key })).toBe(true);
    expect(document.activeElement).toBe(field);
  }
});

test('a child can keep the arrows outright', () => {
  // A control with its own horizontal meaning for them: a canvas pan, a
  // slider, a chart cursor. It says so once rather than the toolbar keeping a
  // list of the components that are like that.
  render(
    <Toolbar label="Canvas">
      <button data-toolbar-keys="own">Pan the canvas</button>
      <button>Fit</button>
    </Toolbar>,
  );
  const pan = screen.getByRole('button', { name: 'Pan the canvas' });
  pan.focus();
  expect(fireEvent.keyDown(pan, { key: 'ArrowRight' })).toBe(true);
  expect(document.activeElement).toBe(pan);
});

test('group mode leaves every control its own tab stop and takes no keys', () => {
  render(
    <Toolbar label="Filters" mode="group">
      <button>State</button>
      <button>Unit</button>
    </Toolbar>,
  );
  const group = screen.getByRole('group', { name: 'Filters' });
  expect(group.getAttribute('role')).toBe('group');
  const state = screen.getByRole('button', { name: 'State' });
  expect(state.tabIndex).toBe(0);
  expect(screen.getByRole('button', { name: 'Unit' }).tabIndex).toBe(0);
  state.focus();
  expect(fireEvent.keyDown(state, { key: 'ArrowRight' })).toBe(true);
  expect(document.activeElement).toBe(state);
});

test('a control that arrives later joins the row rather than becoming a second stop', () => {
  function Growing() {
    const [extra, setExtra] = useState(false);
    return (
      <Toolbar label="Builder">
        <button onClick={() => setExtra(true)}>Select a node</button>
        {extra ? <button>Delete</button> : null}
      </Toolbar>
    );
  }
  render(<Growing />);
  fireEvent.click(screen.getByRole('button', { name: 'Select a node' }));
  expect(stops().map((button) => button.textContent)).toEqual(['Select a node']);
  const select = screen.getByRole('button', { name: 'Select a node' });
  select.focus();
  fireEvent.keyDown(select, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete' }));
});

test('the toolbar has no accessibility violations', async () => {
  const view = render(<Builder />);
  const result = await axe.run(view.container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
