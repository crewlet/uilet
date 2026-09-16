/**
 * What a block of code owes a reader: a selection that keeps its lines, and a
 * select-all that means this record rather than the whole page.
 *
 * The three selectable cases are ported from the engine dashboard's
 * `ui/primitives.test.tsx`; the line cases are the defect this rebuild fixes.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { CodeBlock } from './index.js';

afterEach(cleanup);

const RECORD = '{\n  "turn_id": "t-1",\n  "phase": "execute"\n}';

describe('lines', () => {
  test('a selection keeps the line breaks', () => {
    // Every line used to be a span with nothing between them, so the block's
    // textContent and any Range over it ran the lines together: a reader who
    // selected the block and copied it got one line of JSON with the structure
    // gone.
    const { container } = render(<CodeBlock code={RECORD} showLineNumbers />);
    const code = container.querySelector('code')!;
    // The numbers are aria-hidden decoration, so read the content spans.
    const text = [...code.querySelectorAll('.crewlet-codeblock__linecontent')]
      .map((line) => line.textContent)
      .join('\n');
    expect(text).toBe(RECORD);
    expect(code.textContent).toContain('\n');
  });

  test('with no line numbers the code is ONE text node', () => {
    // Which is what a selection, a browser find and a copy all want: a block
    // split into a span per line is a block whose text a find cannot match
    // across.
    const { container } = render(<CodeBlock code={RECORD} plain />);
    const code = container.querySelector('code')!;
    expect(code.childNodes).toHaveLength(1);
    expect(code.childNodes[0]?.nodeType).toBe(Node.TEXT_NODE);
    expect(code.textContent).toBe(RECORD);
  });

  test('a trailing newline is trimmed rather than drawn as an empty line', () => {
    const { container } = render(<CodeBlock code={'one\ntwo\n\n'} showLineNumbers />);
    expect(container.querySelectorAll('.crewlet-codeblock__line')).toHaveLength(2);
  });
});

describe('selectable', () => {
  test('a selectable block takes Command or Control plus A for itself', () => {
    render(
      <div>
        <p>page furniture nobody asked to select</p>
        <CodeBlock selectable label="The turn record, as JSON" code={'{"turn_id":"t-1"}'} plain />
      </div>,
    );
    const block = screen.getByRole('region', { name: 'The turn record, as JSON' });

    // A CYRILLIC LAYOUT: the physical A key reports `key: "ф"`. Browsers
    // resolve select-all from the key's POSITION, so a handler matching only
    // `key` declines here and the page-wide select-all it exists to replace
    // happens instead.
    const event = new KeyboardEvent('keydown', {
      key: 'ф',
      code: 'KeyA',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    block.dispatchEvent(event);

    // Handled: the browser's document-wide select-all never runs.
    expect(event.defaultPrevented).toBe(true);
    const selection = window.getSelection();
    expect(selection?.toString()).toBe('{"turn_id":"t-1"}');
    // Scoped: the paragraph beside it is not in the range.
    expect(selection?.toString()).not.toContain('page furniture');
  });

  test('a plain chord elsewhere in the block own keys is left alone', () => {
    render(<CodeBlock selectable label="A block" code="body" plain />);
    const block = screen.getByRole('region');

    for (const init of [
      { key: 'a', code: 'KeyA' }, // no modifier: typing, not selecting
      { key: 'a', code: 'KeyA', ctrlKey: true, altKey: true }, // a different chord
      // Control plus Shift plus A is Chrome's tab search. Swallowing a chord
      // the browser owns takes it away and puts nothing in its place.
      { key: 'A', code: 'KeyA', ctrlKey: true, shiftKey: true },
      { key: 'c', code: 'KeyC', ctrlKey: true }, // copy, which the browser keeps
    ]) {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
      block.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  test('a block that did not ask for it is not focusable and takes no keys', () => {
    // The ordinary case, a tool call's arguments or a prompt, must not become
    // a tab stop: there are dozens of them on one card, and a keyboard reader
    // would have to step through every one.
    const { container } = render(<CodeBlock code="body" plain />);
    const block = container.querySelector('pre')!;
    expect(block.getAttribute('tabindex')).toBeNull();
    expect(block.getAttribute('role')).toBeNull();

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyA',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    block.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('chrome', () => {
  test('plain draws no header, so a block inside a row that has one is not doubled', () => {
    const { container } = render(<CodeBlock code="body" plain language="json" />);
    expect(container.querySelector('.crewlet-codeblock__header')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('a ceiling is the component own variable rather than a style a caller restates', () => {
    const { container } = render(<CodeBlock code="body" maxHeight={320} plain />);
    const block = container.querySelector('.crewlet-codeblock') as HTMLElement;
    expect(block.style.getPropertyValue('--crewlet-codeblock-max-height')).toBe('320px');
  });
});

test('a block wraps unless its columns are the point', () => {
  // The common case is a block a reader READS: a message, a record, a stack
  // trace. A sideways scrollbar on one of those is a line nobody finds the end
  // of, and the reader has to drag to see the end of a sentence. A caller says
  // wrap={false} when the alignment carries meaning, which is a diff or a
  // table of output.
  const { container } = render(<CodeBlock code="a very long single line of output" />);
  expect(container.querySelector('.crewlet-codeblock')?.className).not.toContain(
    'crewlet-codeblock--nowrap',
  );

  cleanup();
  const { container: columns } = render(<CodeBlock code="a\tb\tc" wrap={false} />);
  expect(columns.querySelector('.crewlet-codeblock')?.className).toContain('crewlet-codeblock--nowrap');
});
