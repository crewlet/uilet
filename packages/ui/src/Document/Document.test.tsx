/**
 * Rendered markdown, set on the ramp: what the element is, and the two rules
 * of its stylesheet whose failure nothing on a screen reports.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Document, DocumentTitle, DocumentTitleField } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'Document.css'), 'utf8');

/** Every `property: value` pair of the stylesheet, comments removed. */
const declarations = (property: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`, 'g'))].map(
    (match) => match[1]?.trim() ?? '',
  );

test('a document is a div on the reading measure by default', () => {
  const { container } = render(<Document>body</Document>);
  const root = container.firstElementChild as HTMLElement;
  expect(root.tagName).toBe('DIV');
  expect(root.className.split(' ')).toEqual(['crewlet-document', 'crewlet-document--md', 'crewlet-document--measure']);
});

test('a page that stands alone is an article, and a narrow pane can drop the measure', () => {
  const { container } = render(
    <Document as="article" size="sm" measure="none" aria-label="Settlement algorithm">
      body
    </Document>,
  );
  const root = container.firstElementChild as HTMLElement;
  expect(root.tagName).toBe('ARTICLE');
  expect(root.className).toContain('crewlet-document--sm');
  expect(root.className).not.toContain('measure');
  expect(root.getAttribute('aria-label')).toBe('Settlement algorithm');
});

test('no presentation prop reaches the DOM', () => {
  const { container } = render(
    <Document size="sm" measure="none">
      body
    </Document>,
  );
  const root = container.firstElementChild as HTMLElement;
  for (const name of ['size', 'measure', 'as']) expect(root.getAttribute(name)).toBeNull();
});

test('a title is the page h1 by default, and an h2 where the screen already has one', () => {
  render(
    <>
      <DocumentTitle>Settlement algorithm</DocumentTitle>
      <DocumentTitle as="h2">Split modes</DocumentTitle>
    </>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Settlement algorithm' }).className).toBe('crewlet-document-title');
  expect(screen.getByRole('heading', { level: 2, name: 'Split modes' })).toBeTruthy();
});

test('every size the stylesheet sets is a step on the type ramp', () => {
  // A reading column in sizes of its own (32, 20, 18, 15 and 14.5px were
  // measured on the one this replaces) drifts from every surface beside it.
  const sizes = declarations('font-size');
  expect(sizes.length).toBeGreaterThan(5);
  for (const size of sizes) expect(size).toMatch(/^var\(--font-size-[\w-]+\)$/);
});

test('every gap is a spacing step or the document rhythm itself', () => {
  // The one exception is the task box's nudge onto its first line, which is
  // read off that line (half of what it is taller than the text), not a gap.
  for (const value of [...declarations('margin-block-start'), ...declarations('gap')]) {
    expect(value).toMatch(/^(var\(--(spacing-\d+|crewlet-document-[\w-]+)\)|calc\(\(1lh - 1em\) \/ 2\))$/);
  }
});

test('the margin reset comes before the rhythm, or the rhythm is reset with it', () => {
  // The shorthand in the reset clears the top margin too, at the same
  // specificity. Written after the sibling rule it wins, and every block runs
  // into the next with no gap at all, which is how the rhythm this replaces died.
  const reset = css.indexOf('.crewlet-document :where(p, h1');
  const rhythm = css.indexOf('.crewlet-document > * + *');
  expect(reset).toBeGreaterThan(-1);
  expect(rhythm).toBeGreaterThan(reset);
});

test('a task list and a wide table are recognised by their shape, not by a class', () => {
  // Any renderer that emits the markup it would emit anyway gets both.
  expect(css).toContain("ul:has(> li > input[type='checkbox'])");
  expect(css).toContain(':where(div):has(> table)');
  expect(css).not.toMatch(/\.md-|\.markdown/);
});

test('a title being written is a named text field set as the title, refused by aria-invalid', () => {
  render(<DocumentTitleField aria-label="Title" placeholder="Untitled" defaultValue="" />);
  const field = screen.getByRole('textbox', { name: 'Title' });
  // A textarea that wraps, named as ONE line of text: assistive technology
  // announces a single-line field, as the input it replaced was.
  expect(field.tagName).toBe('TEXTAREA');
  expect(field.getAttribute('aria-multiline')).toBe('false');
  expect(field.getAttribute('rows')).toBe('1');
  expect(field.className).toContain('crewlet-document-title');
  expect(field.getAttribute('aria-invalid')).toBeNull();
  cleanup();
  render(<DocumentTitleField aria-label="Title" error defaultValue="Taken" />);
  expect(screen.getByRole('textbox', { name: 'Title' }).getAttribute('aria-invalid')).toBe('true');
});

test('a title being written, and one refused, carries no accessibility violation', async () => {
  const { container } = render(
    <main>
      <h1>New document</h1>
      <DocumentTitleField aria-label="Title" placeholder="Untitled" />
      <DocumentTitleField aria-label="Second title" error />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

function Controlled({ onKeyDown }: { onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void }) {
  const [title, setTitle] = useState('Quarterly plan');
  return (
    <>
      <DocumentTitleField aria-label="Title" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={onKeyDown} />
      <output data-testid="value">{title}</output>
    </>
  );
}

test('Enter inserts no line break, and reaches the caller as an input would hand it on', () => {
  const onKeyDown = vi.fn();
  render(<Controlled onKeyDown={onKeyDown} />);
  const field = screen.getByRole('textbox', { name: 'Title' });
  // The key is the caller's, unprevented, exactly as an input's is.
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onKeyDown).toHaveBeenCalledTimes(1);
  expect(onKeyDown.mock.calls[0]![0].defaultPrevented).toBe(false);
  // The line break itself is refused where every way of typing one passes.
  for (const inputType of ['insertLineBreak', 'insertParagraph']) {
    const typed = new InputEvent('beforeinput', { inputType, bubbles: true, cancelable: true });
    field.dispatchEvent(typed);
    expect(typed.defaultPrevented, inputType).toBe(true);
  }
  const letter = new InputEvent('beforeinput', { inputType: 'insertText', data: 'a', bubbles: true, cancelable: true });
  field.dispatchEvent(letter);
  expect(letter.defaultPrevented).toBe(false);
});

test('Enter submits the form it is in when the form has a submit button, as an input does', () => {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <DocumentTitleField aria-label="Title" defaultValue="Plan" />
      <button type="submit">Create</button>
    </form>,
  );
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Title' }), { key: 'Enter' });
  expect(onSubmit).toHaveBeenCalledTimes(1);
  // A caller that takes Enter for itself keeps it.
  cleanup();
  const submitted = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <form onSubmit={submitted}>
      <DocumentTitleField aria-label="Title" defaultValue="Plan" onKeyDown={(event) => event.preventDefault()} />
      <button type="submit">Create</button>
    </form>,
  );
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Title' }), { key: 'Enter' });
  expect(submitted).not.toHaveBeenCalled();
});

test('a pasted line break becomes a space before the caller reads the value', () => {
  render(<Controlled />);
  const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Title' });
  fireEvent.change(field, { target: { value: 'Quarterly\nplan\r\nfor Q4' } });
  expect(screen.getByTestId('value').textContent).toBe('Quarterly plan for Q4');
  expect(field.value).toBe('Quarterly plan for Q4');
});

test('it grows to what it holds, so a long title wraps instead of being cut', () => {
  // jsdom lays nothing out, so the content's height is given: what the field
  // is asked is that its height follows its scrollHeight as the value grows.
  let content = 40;
  const scroll = vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(() => content);
  try {
    render(<Controlled />);
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Title' });
    expect(field.style.height).toBe('40px');
    content = 120;
    fireEvent.change(field, { target: { value: 'Weekly planning, October: what shipped, what slipped and what is next' } });
    expect(field.style.height).toBe('120px');
  } finally {
    scroll.mockRestore();
  }
});

test('a ref reaches the field itself', () => {
  const ref = createRef<HTMLTextAreaElement>();
  render(<DocumentTitleField ref={ref} aria-label="Title" defaultValue="Plan" />);
  expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Title' }));
});
