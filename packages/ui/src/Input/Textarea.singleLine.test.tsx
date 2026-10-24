/**
 * A one-line value that wraps to be read: no line break gets in by any road,
 * and the keys around it are left to whoever owns them.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { InlineEditor } from '../InlineEditor/index.js';
import { FormField, Textarea, foldLineBreaks } from './index.js';

afterEach(cleanup);

function Mission({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('Make shared costs fair.');
  return (
    <>
      <Announcer />
      <FormField label="Mission">
        {(field) => (
          <Textarea
            id={field.id}
            singleLine
            autoResize
            rows={1}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              onChange?.(event.target.value);
            }}
          />
        )}
      </FormField>
    </>
  );
}

const box = () => screen.getByRole('textbox', { name: 'Mission' }) as HTMLTextAreaElement;

test('line breaks and the space around them fold into one space', () => {
  expect(foldLineBreaks('one\ntwo')).toBe('one two');
  expect(foldLineBreaks('one  \r\n\r\n  two\rthree')).toBe('one two three');
  expect(foldLineBreaks('no break')).toBe('no break');
  // Every break the engine refuses, each on its own, so dropping one fails.
  for (const br of ['\n', '\r', '\v', '\f', '\u0085', '\u2028', '\u2029']) {
    expect(foldLineBreaks(`one${br}two`), JSON.stringify(br)).toBe('one two');
  }
});

test('it is announced as a one-line field, and is a textarea so it wraps', () => {
  render(<Mission />);
  expect(box().tagName).toBe('TEXTAREA');
  expect(box().getAttribute('aria-multiline')).toBe('false');
});

test('Enter and Shift+Enter write no line break; Mod+Enter and a composing Enter pass through', () => {
  render(<Mission />);
  expect(fireEvent.keyDown(box(), { key: 'Enter' })).toBe(false);
  expect(fireEvent.keyDown(box(), { key: 'Enter', shiftKey: true })).toBe(false);
  expect(fireEvent.keyDown(box(), { key: 'Enter', ctrlKey: true })).toBe(true);
  expect(fireEvent.keyDown(box(), { key: 'Enter', metaKey: true })).toBe(true);
  expect(fireEvent.keyDown(box(), { key: 'Enter', isComposing: true })).toBe(true);
});

test('a pasted line break reaches the owner as a space, with the caret kept', () => {
  const onChange = vi.fn();
  render(<Mission onChange={onChange} />);
  const el = box();
  // The caret just after the pasted break, where a paste leaves it.
  fireEvent.change(el, { target: { value: 'Make shared\ncosts fair.', selectionStart: 12, selectionEnd: 12 } });
  expect(onChange).toHaveBeenLastCalledWith('Make shared costs fair.');
  expect(el.value).toBe('Make shared costs fair.');
  expect(el.selectionStart).toBe(12);
  // Not silently: the writer is told the paste was changed.
  expect(screen.getByRole('status').textContent).toBe('Line breaks were replaced with spaces: this field holds one line.');
});

test('a pasted Unicode line or paragraph separator, or NEL, is folded too', () => {
  const onChange = vi.fn();
  render(<Mission onChange={onChange} />);
  for (const br of ['\u2028', '\u2029', '\u0085', '\v', '\f']) {
    fireEvent.change(box(), { target: { value: `Fair${br}shares.` } });
    expect(onChange, JSON.stringify(br)).toHaveBeenLastCalledWith('Fair shares.');
  }
});

test('a change with no line break says nothing', () => {
  render(<Mission />);
  fireEvent.change(box(), { target: { value: 'Fair shares.' } });
  expect(screen.getByRole('status').textContent).toBe('');
});

test('a multi-line textarea is untouched: its Enter and its line breaks are the writer’s', () => {
  const onChange = vi.fn();
  render(<Textarea aria-label="Vision" defaultValue="" onChange={(event) => onChange(event.target.value)} />);
  const el = screen.getByRole('textbox', { name: 'Vision' }) as HTMLTextAreaElement;
  expect(el.getAttribute('aria-multiline')).toBeNull();
  expect(fireEvent.keyDown(el, { key: 'Enter' })).toBe(true);
  fireEvent.change(el, { target: { value: 'one\ntwo' } });
  expect(onChange).toHaveBeenLastCalledWith('one\ntwo');
});

test('inside an InlineEditor, Enter does not save and Mod+Enter does', () => {
  const onSave = vi.fn();
  render(
    <InlineEditor label="Edit the mission" dirty onSave={onSave} onCancel={() => {}}>
      <Mission />
    </InlineEditor>,
  );
  fireEvent.keyDown(box(), { key: 'Enter' });
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.keyDown(box(), { key: 'Enter', ctrlKey: true });
  expect(onSave).toHaveBeenCalledTimes(1);
});

test('passes axe', async () => {
  const { container } = render(<Mission />);
  expect((await axe.run(container)).violations).toEqual([]);
});
