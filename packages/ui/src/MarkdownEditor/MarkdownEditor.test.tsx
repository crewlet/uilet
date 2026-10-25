/**
 * Writing markdown: what each control does to the source, and the editor that
 * applies it without taking the writer's caret away.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  MarkdownEditor,
  formatMarkdown,
  insertMarkdown,
  markdownWords,
  type MarkdownEditorApi,
  type MarkdownFormat,
} from './index.js';

afterEach(cleanup);

/** The source with the selection drawn as brackets: `a [b] c`, or `a | c` for a caret. */
function drawn(value: string, start: number, end: number): string {
  return start === end
    ? `${value.slice(0, start)}|${value.slice(start)}`
    : `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`;
}

/** Applies `format` to `source`, whose selection is written as brackets or a bar. */
function apply(source: string, format: MarkdownFormat): string {
  const caret = source.indexOf('|');
  const open = source.indexOf('[');
  const value = source.replace(/[[\]|]/g, '');
  const start = caret >= 0 ? caret : open;
  const end = caret >= 0 ? caret : source.indexOf(']') - 1;
  const edit = formatMarkdown(value, { start, end }, format);
  return drawn(edit.value, edit.selection.start, edit.selection.end);
}

describe('an inline format', () => {
  test('bold wraps the selection and keeps it selected inside the markers', () => {
    expect(apply('pay the [leftover] cent', 'bold')).toBe('pay the **[leftover]** cent');
  });

  test('a second press takes the format off, from outside or from inside the markers', () => {
    expect(apply('pay the **[leftover]** cent', 'bold')).toBe('pay the [leftover] cent');
    expect(apply('pay the [**leftover**] cent', 'bold')).toBe('pay the [leftover] cent');
  });

  test('the spaces a double click took are left outside, or CommonMark would not read it as bold', () => {
    expect(apply('pay the[ leftover ]cent', 'bold')).toBe('pay the **[leftover]** cent');
  });

  test('on a caret it writes the markers and leaves the caret between them', () => {
    expect(apply('pay |', 'bold')).toBe('pay **|**');
  });

  test('italic is the underscore, so it never shares a marker with bold', () => {
    expect(apply('[cent]', 'italic')).toBe('_[cent]_');
    expect(apply('[cent]', 'code')).toBe('`[cent]`');
  });
});

describe('a block format', () => {
  test('a heading marks the line the caret is on, and the caret moves with the text', () => {
    expect(apply('Intro\nNet bal|ances\nMore', 'heading2')).toBe('Intro\n## Net bal|ances\nMore');
  });

  test('one heading level replaces another rather than stacking on it', () => {
    expect(apply('### Net bal|ances', 'heading2')).toBe('## Net bal|ances');
  });

  test('a second press takes the heading off', () => {
    expect(apply('## Net bal|ances', 'heading2')).toBe('Net bal|ances');
  });

  test('every line a selection touches is marked, and the whole block stays selected', () => {
    expect(apply('[one\ntwo]', 'bulletList')).toBe('[- one\n- two]');
  });

  test('a list turned into another kind replaces the marker rather than nesting one in it', () => {
    expect(apply('[- one\n- two]', 'numberedList')).toBe('[1. one\n2. two]');
    expect(apply('[1. one\n2. two]', 'checklist')).toBe('[- [ ] one\n- [ ] two]');
  });

  test('a blank line inside a selection is left alone, and the numbering skips it', () => {
    expect(apply('[one\n\ntwo]', 'numberedList')).toBe('[1. one\n\n2. two]');
  });

  test('a caret on a blank line marks it, because the next item is written there', () => {
    expect(apply('one\n|', 'bulletList')).toBe('one\n- |');
  });

  test('a checked task counts as a checklist line, so a press takes the checklist off', () => {
    // Called directly: the bracket notation above would read a task's own box
    // as a selection.
    const value = '- [x] done\n- [ ] open';
    const edit = formatMarkdown(value, { start: 0, end: value.length }, 'checklist');
    expect(edit.value).toBe('done\nopen');
    expect(edit.selection).toEqual({ start: 0, end: 9 });
  });

  test('a selection that ends after a newline does not reach the line below it', () => {
    const edit = formatMarkdown('one\ntwo', { start: 0, end: 4 }, 'bulletList');
    expect(edit.value).toBe('- one\ntwo');
  });
});

describe('a table', () => {
  test('is set on lines of its own, with the first header cell selected to be named', () => {
    expect(apply('Above|Below', 'table')).toBe(
      'Above\n\n| [Column] | Column |\n| --- | --- |\n|  |  |\n\nBelow',
    );
  });

  test('at the start of an empty body it adds no blank lines at all', () => {
    expect(apply('|', 'table')).toBe('| [Column] | Column |\n| --- | --- |\n|  |  |');
  });
});

test('an insert replaces the selection and leaves the caret after it', () => {
  const edit = insertMarkdown('see this', { start: 4, end: 8 }, '[Split modes](#/doclet/pages/p1)');
  expect(drawn(edit.value, edit.selection.start, edit.selection.end)).toBe(
    'see [Split modes](#/doclet/pages/p1)|',
  );
});

test('words are counted the way a writer counts them', () => {
  expect(markdownWords("## Net balances\n- Ana's share, 42 cents")).toBe(6);
  expect(markdownWords('')).toBe(0);
});

/* ---- the editor ------------------------------------------------------------- */

function Harness({
  initial = '',
  onSubmit,
  actions,
}: {
  initial?: string;
  onSubmit?: () => void;
  actions?: (editor: MarkdownEditorApi) => React.ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      label="The page, in markdown"
      renderPreview={(source) => <div data-testid="preview">{source.toUpperCase()}</div>}
      onSubmit={onSubmit}
      actions={actions}
      footer={<span>{markdownWords(value)} words</span>}
    />
  );
}

const field = () => screen.getByRole('textbox', { name: 'The page, in markdown' }) as HTMLTextAreaElement;

test('the source is a named field under a one stop formatting bar', () => {
  render(<Harness initial="Body" />);
  expect(field().value).toBe('Body');
  const bar = screen.getByRole('toolbar', { name: 'Formatting' });
  for (const name of ['Heading', 'Subheading', 'Bold', 'Italic', 'Code', 'Bulleted list', 'Numbered list', 'Checklist', 'Table']) {
    expect(bar.contains(screen.getByRole('button', { name }))).toBe(true);
  }
  expect(screen.getByRole('tab', { name: 'Write' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByText('1 words')).toBeTruthy();
});

test('a control applies its format to the field selection and leaves the selection inside it', () => {
  render(<Harness initial="pay the leftover cent" />);
  field().setSelectionRange(8, 16);
  fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
  expect(field().value).toBe('pay the **leftover** cent');
  expect([field().selectionStart, field().selectionEnd]).toEqual([10, 18]);
  expect(document.activeElement).toBe(field());
});

test('a press on a control does not take focus from the field', () => {
  render(<Harness initial="words" />);
  const bold = screen.getByRole('button', { name: 'Bold' });
  // A mousedown whose default is prevented never moves focus.
  expect(fireEvent.mouseDown(bold)).toBe(false);
});

test('Command or Control with B and I are bold and italic, and with Enter the caller submit', () => {
  const onSubmit = vi.fn();
  render(<Harness initial="cent" onSubmit={onSubmit} />);
  field().setSelectionRange(0, 4);
  fireEvent.keyDown(field(), { key: 'b', metaKey: true });
  expect(field().value).toBe('**cent**');
  field().setSelectionRange(2, 6);
  fireEvent.keyDown(field(), { key: 'i', ctrlKey: true });
  expect(field().value).toBe('**_cent_**');
  fireEvent.keyDown(field(), { key: 'Enter', metaKey: true });
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('Preview draws the source with the caller renderer, and the controls rest while it shows', () => {
  render(<Harness initial="net balances" />);
  fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
  expect(screen.getByTestId('preview').textContent).toBe('NET BALANCES');
  expect(screen.queryByRole('textbox')).toBeNull();
  expect((screen.getByRole('button', { name: 'Bold' }) as HTMLButtonElement).disabled).toBe(true);
  // The preview is the panel of the tab that opened it.
  const panel = screen.getByRole('tabpanel');
  expect(panel.getAttribute('aria-labelledby')).toBe(screen.getByRole('tab', { name: 'Preview' }).id);
});

test('an empty body previews as a sentence, never as a blank box', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
  expect(screen.getByText('Nothing to preview yet.')).toBeTruthy();
});

test('a control of the caller own inserts at the writer caret through the editor it is handed', () => {
  render(
    <Harness
      initial="See  for the rule."
      actions={(editor) => (
        <button type="button" disabled={editor.mode !== 'write'} onClick={() => editor.insert('[Split modes](#/p1)')}>
          Link a page
        </button>
      )}
    />,
  );
  field().setSelectionRange(4, 4);
  fireEvent.click(screen.getByRole('button', { name: 'Link a page' }));
  expect(field().value).toBe('See [Split modes](#/p1) for the rule.');
});

test('the editor carries no axe violation in either view', async () => {
  const { container } = render(<Harness initial="## Net balances" />);
  const tags = { runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } };
  expect((await axe.run(container, tags)).violations.map((violation) => violation.id)).toEqual([]);
  await act(async () => {
    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
  });
  expect((await axe.run(container, tags)).violations.map((violation) => violation.id)).toEqual([]);
});
