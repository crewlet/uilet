/**
 * One record edited where it is read: the focus lands in the field, the keys
 * save and cancel only when nothing inside has claimed them, and Save is
 * never a dead button.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { FormField, Textarea } from '../Input/index.js';
import { InlineEditor, type InlineEditorProps } from './index.js';

afterEach(cleanup);

function Editor({
  saved = 'Make shared costs fair.',
  onSave = () => {},
  onCancel = () => {},
  ...rest
}: Partial<Omit<InlineEditorProps, 'dirty' | 'children' | 'label'>> & { saved?: string }) {
  const [draft, setDraft] = useState(saved);
  return (
    <InlineEditor label="Edit the mission" dirty={draft !== saved} onSave={onSave} onCancel={onCancel} {...rest}>
      <FormField label="Mission">
        {(field) => <Textarea id={field.id} value={draft} onChange={(event) => setDraft(event.target.value)} />}
      </FormField>
    </InlineEditor>
  );
}

const box = () => screen.getByRole('textbox', { name: 'Mission' }) as HTMLTextAreaElement;
const save = () => screen.getByRole('button', { name: 'Save' });
const cancel = () => screen.getByRole('button', { name: 'Cancel' });

test('it is a form named by its label, and the focus lands at the end of the first field', () => {
  render(<Editor />);
  expect(screen.getByRole('form', { name: 'Edit the mission' })).toBeDefined();
  expect(document.activeElement).toBe(box());
  expect(box().selectionStart).toBe(box().value.length);
});

test('asked not to, it leaves the focus where it was', () => {
  render(<Editor focusOnMount={false} />);
  expect(document.activeElement).toBe(document.body);
});

test('Save says why it does nothing while nothing has changed, and keeps its focus', () => {
  const onSave = vi.fn();
  render(<Editor onSave={onSave} />);
  expect(save().getAttribute('aria-disabled')).toBe('true');
  expect(save().hasAttribute('disabled')).toBe(false);
  const reason = document.getElementById(save().getAttribute('aria-describedby')!.split(' ').at(-1)!);
  expect(reason?.textContent).toBe('Nothing has changed yet.');
  fireEvent.click(save());
  fireEvent.keyDown(box(), { key: 'Enter', ctrlKey: true });
  expect(onSave).not.toHaveBeenCalled();
});

test('once something has changed, Save and Mod+Enter save, and Enter alone is the field’s', () => {
  const onSave = vi.fn();
  render(<Editor onSave={onSave} />);
  fireEvent.change(box(), { target: { value: 'Make shared costs fair, to the cent.' } });
  expect(save().getAttribute('aria-disabled')).toBeNull();
  fireEvent.keyDown(box(), { key: 'Enter' });
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.keyDown(box(), { key: 'Enter', metaKey: true });
  expect(onSave).toHaveBeenCalledTimes(1);
  fireEvent.click(save());
  expect(onSave).toHaveBeenCalledTimes(2);
});

test('a field that refuses its value holds Save, and says so', () => {
  const onSave = vi.fn();
  render(<Editor onSave={onSave} invalid />);
  fireEvent.change(box(), { target: { value: 'Changed.' } });
  fireEvent.keyDown(box(), { key: 'Enter', ctrlKey: true });
  expect(onSave).not.toHaveBeenCalled();
  expect(save().getAttribute('aria-disabled')).toBe('true');
  expect(document.body.textContent).toContain('Fix the highlighted field first.');
});

test('Escape cancels, unless something inside claimed it or a word is being composed', () => {
  const onCancel = vi.fn();
  render(<Editor onCancel={onCancel} />);
  fireEvent.keyDown(box(), { key: 'Escape', isComposing: true });
  expect(onCancel).not.toHaveBeenCalled();
  box().addEventListener('keydown', (event) => event.preventDefault(), { once: true });
  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(onCancel).toHaveBeenCalledTimes(1);
  fireEvent.click(cancel());
  expect(onCancel).toHaveBeenCalledTimes(2);
});

test('while saving, Save spins and neither control nor key acts again', () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<Editor onSave={onSave} onCancel={onCancel} saving />);
  expect(screen.getByRole('form').getAttribute('aria-busy')).toBe('true');
  expect(save().getAttribute('aria-busy')).toBe('true');
  fireEvent.change(box(), { target: { value: 'Changed.' } });
  fireEvent.click(save());
  fireEvent.click(cancel());
  fireEvent.keyDown(box(), { key: 'Escape' });
  fireEvent.keyDown(box(), { key: 'Enter', ctrlKey: true });
  expect(onSave).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('Saving');
});

test('a failure is an alert above the bar, and a notice stands beside it', () => {
  render(<Editor error="The mission could not be saved." notice={<p>The company changed.</p>} />);
  expect(screen.getByRole('alert').textContent).toBe('The mission could not be saved.');
  expect(document.body.textContent).toContain('The company changed.');
});

test('passes axe in each state', async () => {
  const { container, rerender } = render(<Editor />);
  expect((await axe.run(container)).violations).toEqual([]);
  rerender(<Editor saving error="Refused." />);
  expect((await axe.run(container)).violations).toEqual([]);
});
