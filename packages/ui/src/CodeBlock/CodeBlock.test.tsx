/**
 * What a block of code owes a reader: a selection that keeps its lines, a
 * select-all that means this record rather than the whole page, and a way IN
 * to a block that scrolls.
 *
 * The three selectable cases are ported from the engine dashboard's
 * `ui/primitives.test.tsx`; the line cases are the defect this rebuild fixes.
 * The `focusWhenScrollable` cases are the other half of that dashboard's
 * reason for keeping its own block: it measured which blocks actually scroll,
 * because a tab stop in front of every one of a phase card's dozens of
 * tool-argument blocks is noise a keyboard reader walks through.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { CodeBlock, type CodeBlockProps } from './index.js';

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

/**
 * `focusWhenScrollable`: the tab stop the component works out for itself.
 *
 * jsdom has no layout, so every one of the four metrics is 0 and nothing ever
 * overflows. They are stubbed on `HTMLElement.prototype`, which SHADOWS the
 * getters jsdom puts on `Element.prototype`, so putting them back is a delete
 * rather than a descriptor somebody has to reconstruct.
 */
describe('focusWhenScrollable', () => {
  const AXES = ['scrollHeight', 'clientHeight', 'scrollWidth', 'clientWidth'] as const;
  type Axis = (typeof AXES)[number];

  // A box exactly filled by its content: nothing overflows on either axis,
  // which is the ordinary three-line tool argument.
  const FITS: Record<Axis, number> = { scrollHeight: 100, clientHeight: 100, scrollWidth: 100, clientWidth: 100 };
  let metrics: Record<Axis, number> = { ...FITS };

  class FakeResizeObserver {
    static made: FakeResizeObserver[] = [];
    observed: Element[] = [];
    constructor(private callback: ResizeObserverCallback) {
      FakeResizeObserver.made.push(this);
    }
    observe(element: Element): void {
      this.observed.push(element);
    }
    unobserve(): void {}
    disconnect(): void {}
    /** What the window, an ancestor opening, or a font landing looks like. */
    resize(): void {
      act(() => this.callback([], this as unknown as ResizeObserver));
    }
  }

  // Assigned rather than stubbed, as Canvas's suite records: the setup file
  // defines the property writable but not configurable.
  const realResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    metrics = { ...FITS };
    for (const axis of AXES) {
      Object.defineProperty(HTMLElement.prototype, axis, { configurable: true, get: () => metrics[axis] });
    }
    FakeResizeObserver.made = [];
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    for (const axis of AXES) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[axis];
    globalThis.ResizeObserver = realResizeObserver;
  });

  test('the stub is what jsdom would otherwise refuse to answer', () => {
    // A measurement harness that answered 0 either way would pass every case
    // below for a component that never measured anything at all.
    const { container } = render(<CodeBlock code="body" plain />);
    const box = container.querySelector('pre')!;
    expect(box.clientHeight).toBe(100);
    metrics.scrollHeight = 900;
    expect(box.scrollHeight).toBe(900);
  });

  test('a block that overflows downwards becomes a named tab stop', () => {
    // A ceiling with 900 lines under it. Safari leaves a scroll container out
    // of the tab order, so without this the record is unreachable.
    metrics.scrollHeight = 900;
    render(<CodeBlock code={RECORD} plain maxHeight={200} focusWhenScrollable label="The turn record, as JSON" />);
    const block = screen.getByRole('region', { name: 'The turn record, as JSON' });
    expect(block.getAttribute('tabindex')).toBe('0');
  });

  test('a block that fits stays out of the tab order, which is the whole point', () => {
    // The three-line tool argument. A card carries dozens, and a stop in front
    // of each is what made the consumer keep its own block.
    const { container } = render(
      <CodeBlock code="body" plain maxHeight={200} focusWhenScrollable label="The read_config arguments" />,
    );
    const block = container.querySelector('pre')!;
    expect(block.getAttribute('tabindex')).toBeNull();
    expect(block.getAttribute('role')).toBeNull();
    expect(block.getAttribute('aria-label')).toBeNull();
  });

  test('the sideways axis counts too', () => {
    // `wrap={false}` makes a wide line scroll sideways in a box that is not
    // tall enough to scroll at all, so a component measuring only the height
    // leaves exactly the aligned blocks — a diff, a table of output —
    // unreachable.
    metrics.scrollWidth = 900;
    render(<CodeBlock code="a\tb\tc" plain wrap={false} focusWhenScrollable label="The seat table" />);
    expect(screen.getByRole('region', { name: 'The seat table' }).getAttribute('tabindex')).toBe('0');
  });

  test('a block promoted for its scrollbar does NOT take select-all', () => {
    // THE SPLIT, proved. Reaching a block and owning a document chord are two
    // decisions; a block promoted because it happens to scroll never asked for
    // the chord, and swallowing it would take the reader's page-wide select-all
    // away and put nothing in its place.
    metrics.scrollHeight = 900;
    render(
      <div>
        <p>page furniture nobody asked to select</p>
        <CodeBlock code={RECORD} plain maxHeight={200} focusWhenScrollable label="The tool arguments" />
      </div>,
    );
    const block = screen.getByRole('region', { name: 'The tool arguments' });
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

  test('a selectable block keeps the chord and may ask for the scroll stop as well', () => {
    // The two doors compose: this one is focusable because it owns the chord,
    // whether or not it ever overflows.
    render(<CodeBlock code={RECORD} plain selectable focusWhenScrollable label="The turn record, as JSON" />);
    const block = screen.getByRole('region', { name: 'The turn record, as JSON' });
    expect(block.getAttribute('tabindex')).toBe('0');

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyA',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    block.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  test('a box that grows under a reader is promoted on the resize', () => {
    // The box is resized by the window, by a disclosure opening above it and
    // by a font landing, and none of those is a render of this component.
    const { container } = render(
      <CodeBlock code="body" plain maxHeight={200} focusWhenScrollable label="The streamed record" />,
    );
    const block = container.querySelector('pre')!;
    expect(block.getAttribute('tabindex')).toBeNull();

    const observer = FakeResizeObserver.made[0]!;
    // The PRE, which is the box that scrolls. Watching the wrapper would miss
    // a ceiling change that never moves the wrapper at all.
    expect(observer.observed).toEqual([block]);

    metrics.clientHeight = 40;
    observer.resize();
    expect(block.getAttribute('tabindex')).toBe('0');
    expect(block.getAttribute('role')).toBe('region');
    expect(block.getAttribute('aria-label')).toBe('The streamed record');
  });

  test('without a ResizeObserver the block is still measured once', () => {
    // It is absent in older embedded browsers, where an unguarded construction
    // throws and takes the page with it. The first measurement still stands.
    const held = globalThis.ResizeObserver;
    // @ts-expect-error the suite is removing it on purpose, which is the case.
    delete globalThis.ResizeObserver;
    metrics.scrollHeight = 900;
    try {
      expect(() =>
        render(<CodeBlock code={RECORD} plain maxHeight={200} focusWhenScrollable label="The turn record" />),
      ).not.toThrow();
      expect(screen.getByRole('region', { name: 'The turn record' }).getAttribute('tabindex')).toBe('0');
    } finally {
      globalThis.ResizeObserver = held;
    }
  });

  test('a block that did not ask is never promoted, and pays for no observer', () => {
    // ADDITIVE. Every call site written before this prop renders exactly as it
    // did, however far it overflows, and none of them starts an observer.
    metrics.scrollHeight = 900;
    const { container } = render(<CodeBlock code={RECORD} plain maxHeight={200} />);
    const block = container.querySelector('pre')!;
    expect(block.getAttribute('tabindex')).toBeNull();
    expect(block.getAttribute('role')).toBeNull();
    expect(FakeResizeObserver.made).toEqual([]);
  });
});

test('the type is what demands a name from whichever door takes focus', () => {
  /*
   * Each `@ts-expect-error` below is an ASSERTION, and `npm run typecheck` is
   * where it runs: the build fails if the error it names ever stops happening,
   * which is what makes the union a test rather than a comment. A focusable
   * `role="region"` with no accessible name is a tab stop a screen reader
   * announces as nothing, and there are now two doors onto focus, so the
   * invariant has to hold at both.
   *
   * The shapes are the point; nothing here is rendered.
   */
  // @ts-expect-error a block that owns the chord has to carry a name
  const ownsTheChord: CodeBlockProps = { code: 'body', selectable: true };
  // @ts-expect-error a block that may be promoted for its scrollbar has to carry one too
  const mayBePromoted: CodeBlockProps = { code: 'body', focusWhenScrollable: true };
  // @ts-expect-error a name on a block that can never take focus names nothing
  const namesNothing: CodeBlockProps = { code: 'body', label: 'Nothing is named this' };
  // The legal shapes: neither door and no name, or either door with one.
  const plainBlock: CodeBlockProps = { code: 'body' };
  const bothDoors: CodeBlockProps = {
    code: 'body',
    selectable: true,
    focusWhenScrollable: true,
    label: 'The turn record, as JSON',
  };
  expect([ownsTheChord, mayBePromoted, namesNothing, plainBlock, bothDoors]).toHaveLength(5);
});

describe('the ceiling', () => {
  test('a block with none of its own declares nothing, so an ancestor value reaches it', () => {
    // There is deliberately NO default height: adding one would change what
    // every existing call site renders. What replaces "every caller remembers
    // a prop" is the cascade — see the stylesheet case below.
    const { container } = render(<CodeBlock code="body" plain />);
    const block = container.querySelector('.crewlet-codeblock') as HTMLElement;
    expect(block.style.getPropertyValue('--crewlet-codeblock-max-height')).toBe('');
    expect(block.className).not.toContain('crewlet-codeblock--bounded');
  });

  test('maxHeight="none" is how one block escapes an ancestor ceiling', () => {
    const { container } = render(<CodeBlock code="body" plain maxHeight="none" />);
    const block = container.querySelector('.crewlet-codeblock') as HTMLElement;
    expect(block.style.getPropertyValue('--crewlet-codeblock-max-height')).toBe('none');
    expect(block.className).toContain('crewlet-codeblock--bounded');
  });

  test('the height is read from the cascade, once', () => {
    /*
     * No runtime test can reach this one: the suite runs in jsdom with the
     * stylesheet resolved to an empty module, so the rule is read as SOURCE,
     * the way the repository's own source scan reads a component.
     *
     * The fallback is what makes the cascading ceiling additive — with nothing
     * declared anywhere the property resolves to `none`, which is its initial
     * value, so a block with no ceiling is unbounded exactly as before.
     */
    const stylesheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'CodeBlock.css'), 'utf8');
    // DECLARATIONS, so comments are stripped first. The count is the whole
    // point of the case and the prose around a rule is free to quote one: a
    // scan that read `max-height:` anywhere in the file would go red on a
    // comment explaining why there is only one, which is a gate crying wolf
    // at the sentence written to defend it.
    const rules = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(rules).toMatch(/max-height:\s*var\(--crewlet-codeblock-max-height,\s*none\)/);
    // ONCE. A second rule restating the height is how the two come to disagree.
    expect(rules.match(/max-height:/g)).toHaveLength(1);
  });
});

test('plain is about the header and never about the wrapping', () => {
  /*
   * THE NAMING TRAP. `plain` is a word other code blocks spend on the opposite
   * meaning — the engine dashboard's own `.code.plain` was `white-space: pre`,
   * so a port that carried the prop across turned wrapping off and read as a
   * block that had lost its header for free. Here the two are independent in
   * both directions, and this is what says so.
   */
  const { container } = render(<CodeBlock code="a long line of output" plain language="json" />);
  expect(container.querySelector('.crewlet-codeblock__header')).toBeNull();
  expect(container.querySelector('.crewlet-codeblock')?.className).not.toContain('crewlet-codeblock--nowrap');

  cleanup();
  const { container: headed } = render(<CodeBlock code="a\tb\tc" wrap={false} language="json" />);
  expect(headed.querySelector('.crewlet-codeblock__header')).toBeTruthy();
  expect(headed.querySelector('.crewlet-codeblock')?.className).toContain('crewlet-codeblock--nowrap');
});
