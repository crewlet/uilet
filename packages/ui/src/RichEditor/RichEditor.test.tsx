/**
 * The editor as a writer meets it: Markdown typed as Markdown, the slash
 * menu, the keyboard, a paste, and a body that comes back as it went in.
 *
 * jsdom has no layout and no input pipeline, so the suites drive ProseMirror
 * where a browser would: text through `handleTextInput` (which is what the
 * input rules and the slash trigger listen on) and keys through
 * `handleKeyDown`. What the writer sees is then read off the DOM and the body
 * off `onChange`.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { RichEditor } from './RichEditor.js';
import { Editor, type EditorHandle } from './Editor.js';
import type { RichEditorCommand } from './types.js';

afterEach(cleanup);

function Harness({
  initial,
  handle,
  onValue,
  onSubmit,
  onEscape,
  commands,
}: {
  initial: string;
  handle: React.RefObject<EditorHandle | null>;
  onValue?: (value: string) => void;
  onSubmit?: () => void;
  onEscape?: () => void;
  commands?: RichEditorCommand[];
}) {
  const [value, setValue] = useState(initial);
  return (
    <Editor
      ref={handle}
      value={value}
      label="The body"
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
      onSubmit={onSubmit}
      onEscape={onEscape}
      commands={commands}
    />
  );
}

function mount(initial = '', extra: Partial<Parameters<typeof Harness>[0]> = {}) {
  const handle = createRef<EditorHandle>();
  const values: string[] = [];
  render(<Harness initial={initial} handle={handle} onValue={(v) => values.push(v)} {...extra} />);
  const view = handle.current!.view()!;
  return { view, values, last: () => values[values.length - 1] };
}

/** Type text one character at a time, as a keyboard would. */
function type(view: EditorView, text: string): void {
  for (const ch of text) {
    act(() => {
      const { from, to } = view.state.selection;
      const deflt = () => view.state.tr.insertText(ch, from, to);
      const handled = view.someProp('handleTextInput', (f) => f(view, from, to, ch, deflt));
      if (!handled) view.dispatch(deflt());
    });
  }
}

/** A key, with Control standing for Mod (jsdom is not a Mac). */
function press(view: EditorView, key: string, mods: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): boolean {
  let handled = false;
  act(() => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: Boolean(mods.ctrl),
      shiftKey: Boolean(mods.shift),
      altKey: Boolean(mods.alt),
      bubbles: true,
      cancelable: true,
    });
    handled = Boolean(view.someProp('handleKeyDown', (f) => f(view, event)));
  });
  return handled;
}

describe('the shell', () => {
  // FIRST, while the engine is not yet loaded: a load is cached for the page.
  test('draws the fallback while the engine loads', () => {
    render(<RichEditor value="" onChange={() => {}} label="The body" fallback={<p>The page as it reads</p>} />);
    expect(screen.getByText('The page as it reads')).toBeTruthy();
  });
  test('loads the editor and draws the body as an accessible textbox', async () => {
    render(<RichEditor value={'# Title\n\nBody'} onChange={() => {}} label="The body of Title" />);
    const box = await screen.findByRole('textbox', { name: 'The body of Title' });
    expect(box.getAttribute('aria-multiline')).toBe('true');
    expect(box.classList.contains('crewlet-document')).toBe(true);
    // A `#` heading is an h2, as the reader's renderer draws it.
    expect(box.querySelector('h2')?.textContent).toBe('Title');
  });

});

describe('a body that goes in comes back', () => {
  test('a load writes nothing back', () => {
    const { values } = mount('# Title\n\n* starred bullet\n\nText with  two spaces.\n');
    expect(values).toEqual([]);
  });

  test('an edit writes back only what changed', () => {
    const body = '# Title\n\n* starred bullet\n* another\n\nLast paragraph.\n';
    const { view, last } = mount(body);
    act(() => view.dispatch(view.state.tr.insertText(' Added', view.state.doc.content.size - 1)));
    expect(last()).toBe('# Title\n\n* starred bullet\n* another\n\nLast paragraph. Added\n');
  });

  test('a body changed from outside is read afresh', () => {
    const handle = createRef<EditorHandle>();
    const { rerender } = render(<Editor ref={handle} value="One" onChange={() => {}} label="The body" />);
    rerender(<Editor ref={handle} value={'## Two\n\nMerged in'} onChange={() => {}} label="The body" />);
    expect(handle.current!.view()!.dom.querySelector('h3')?.textContent).toBe('Two');
  });
});

describe('Markdown typed as Markdown', () => {
  const cases: [string, string, string][] = [
    ['# ', 'Heading', '# Heading'],
    ['### ', 'Small', '### Small'],
    ['- ', 'item', '- item'],
    ['* ', 'item', '* item'],
    ['1. ', 'first', '1. first'],
    ['3) ', 'third', '3) third'],
    ['[ ] ', 'task', '- [ ] task'],
    ['[x] ', 'done', '- [x] done'],
    ['> ', 'quoted', '> quoted'],
  ];
  test.each(cases)('%j becomes a block', (prefix, words, want) => {
    const { view, last } = mount('');
    type(view, prefix + words);
    expect(last()).toBe(want);
  });

  test('three backticks and a language open a code block', () => {
    const { view, last } = mount('');
    type(view, '```ts ');
    type(view, 'let a = 1');
    expect(last()).toBe('```ts\nlet a = 1\n```');
  });

  test('three hyphens make a divider', () => {
    const { view, last } = mount('');
    // Three hyphens, spelt out so no scan reads them as a custom property.
    type(view, '-'.repeat(3));
    type(view, 'after');
    expect(last()).toBe('---\n\nafter');
  });

  test.each([
    ['**bold**', '**bold**', 'strong'],
    ['*it*', '*it*', 'em'],
    ['_it_', '_it_', 'em'],
    ['~~gone~~', '~~gone~~', 'del'],
    ['`code`', '`code`', 'code'],
  ])('%s becomes a format', (typed, want, tag) => {
    const { view, last } = mount('');
    type(view, `a ${typed} b`);
    expect(last()).toBe(`a ${want} b`);
    expect(view.dom.querySelector(tag)).toBeTruthy();
  });

  test('a typed link becomes a link only when its address may be followed', () => {
    const { view, last } = mount('');
    type(view, 'see [docs](https://example.com) ');
    expect(view.dom.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(last()).toBe('see [docs](https://example.com)');
    const other = mount('');
    type(other.view, '[x](javascript:alert(1)) ');
    expect(other.view.dom.querySelector('a')).toBeNull();
  });

  test('Backspace right after a rule gives back what was typed', () => {
    const { view, last } = mount('');
    type(view, '# ');
    press(view, 'Backspace');
    // The literal heading marker, escaped so it is read back as text.
    expect(last()).toBe('\\#');
  });
});

describe('the slash menu', () => {
  test('opens on a slash, filters on what follows, and inserts the block chosen', async () => {
    const { view, last } = mount('');
    type(view, '/');
    const menu = screen.getByRole('listbox', { name: 'Blocks' });
    expect(menu).toBeTruthy();
    expect(view.dom.getAttribute('aria-controls')).toBe(menu.id);
    type(view, 'tab');
    const options = screen.getAllByRole('option');
    expect(options[0]?.textContent).toContain('Table');
    expect(view.dom.getAttribute('aria-activedescendant')).toBe(options[0]?.id);
    press(view, 'Enter');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(view.dom.querySelector('table th')).toBeTruthy();
    expect(last()).toBe('|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |');
  });

  test('moves with the arrows and wraps', () => {
    const { view } = mount('');
    type(view, '/');
    const first = view.dom.getAttribute('aria-activedescendant');
    press(view, 'ArrowDown');
    expect(view.dom.getAttribute('aria-activedescendant')).not.toBe(first);
    press(view, 'ArrowUp');
    expect(view.dom.getAttribute('aria-activedescendant')).toBe(first);
    press(view, 'ArrowUp');
    const options = screen.getAllByRole('option');
    expect(view.dom.getAttribute('aria-activedescendant')).toBe(options[options.length - 1]?.id);
  });

  test('Escape closes it and keeps what was typed', () => {
    const { view, last } = mount('');
    type(view, '/he');
    expect(press(view, 'Escape')).toBe(true);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(last()).toBe('/he');
  });

  test('does not open inside a word or an address', () => {
    const { view } = mount('');
    type(view, 'https:/');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('lists a caller command, which opens its panel and inserts a link', () => {
    const command: RichEditorCommand = {
      key: 'page',
      label: 'Link to a page',
      keywords: ['page'],
      panel: (api) => (
        <button type="button" onClick={() => api.insertLink('Runbook', '#/doclet/pages/42')}>
          Runbook
        </button>
      ),
    };
    const { view, last } = mount('', { commands: [command] });
    type(view, '/page');
    press(view, 'Enter');
    act(() => screen.getByRole('button', { name: 'Runbook' }).click());
    expect(last()).toBe('[Runbook](#/doclet/pages/42)');
  });
});

describe('the keyboard', () => {
  test('formats with the shortcuts every editor shares', () => {
    const { view, last } = mount('word');
    act(() => {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 5)));
    });
    press(view, 'b', { ctrl: true });
    expect(last()).toBe('**word**');
    press(view, 'i', { ctrl: true });
    expect(last()).toBe('***word***');
  });

  test('Tab nests a list item and Shift-Tab brings it back', () => {
    const { view, last } = mount('- one\n- two');
    act(() => {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, view.state.doc.content.size - 3)));
    });
    expect(press(view, 'Tab')).toBe(true);
    expect(last()).toBe('- one\n  - two');
    press(view, 'Tab', { shift: true });
    expect(last()).toBe('- one\n- two');
  });

  test('Enter in a task item starts another task', () => {
    const { view, last } = mount('');
    type(view, '[ ] first');
    press(view, 'Enter');
    type(view, 'second');
    expect(last()).toBe('- [ ] first\n- [ ] second');
  });

  test('Command or Control with Enter saves, and Escape leaves', () => {
    const onSubmit = vi.fn();
    const onEscape = vi.fn();
    const { view } = mount('Body', { onSubmit, onEscape });
    press(view, 'Enter', { ctrl: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    press(view, 'Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

describe('a paste', () => {
  function paste(view: EditorView, data: Record<string, string>) {
    const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => data[type] ?? '', types: Object.keys(data) },
    });
    act(() => {
      view.dom.dispatchEvent(event);
    });
    return event;
  }

  test('reads HTML into blocks without ever parsing it through a sink', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    const writes = vi.fn();
    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: true,
      get: descriptor.get!,
      set(value: string) {
        writes(value);
        descriptor.set!.call(this, value);
      },
    });
    try {
      const { view, last } = mount('');
      const event = paste(view, {
        'text/html':
          '<h2>Plan</h2><p>Use <b>bold</b> and <a href="https://example.com">a link</a><script>alert(1)</script></p>' +
          '<ul><li>one<li>two</ul><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">refused</a>',
        'text/plain': 'Plan',
      });
      expect(event.defaultPrevented).toBe(true);
      expect(writes).not.toHaveBeenCalled();
      expect(last()).toBe('## Plan\n\nUse **bold** and [a link](https://example.com)\n\n- one\n- two\n\nrefused');
    } finally {
      Object.defineProperty(Element.prototype, 'innerHTML', descriptor);
    }
  });

  test('reads Google Docs formatting written as styles', () => {
    const { view, last } = mount('');
    paste(view, {
      'text/html':
        '<b style="font-weight:normal" id="docs-internal-guid-1"><p><span style="font-weight:700">Strong</span> and <span style="font-style:italic">slanted</span></p></b>',
    });
    expect(last()).toBe('**Strong** and *slanted*');
  });

  test('reads Markdown text as Markdown', () => {
    const { view, last } = mount('');
    paste(view, { 'text/plain': '## Steps\n\n1. one\n2. two\n\n`code` and **bold**' });
    expect(last()).toBe('## Steps\n\n1. one\n2. two\n\n`code` and **bold**');
  });

  test('pastes plain text line by line', () => {
    const { view, last } = mount('');
    paste(view, { 'text/plain': 'first line\nsecond line' });
    expect(last()).toBe('first line\n\nsecond line');
  });

  test('turns a pasted address over a selection into a link', () => {
    const { view, last } = mount('words');
    act(() => {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6)));
    });
    paste(view, { 'text/plain': 'https://example.com' });
    expect(last()).toBe('[words](https://example.com)');
  });
});

describe('the open surfaces', () => {
  async function violations(): Promise<string[]> {
    const result = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(', ')})`);
  }

  function focus(view: EditorView) {
    act(() => {
      view.dom.focus();
      view.dom.dispatchEvent(new FocusEvent('focus'));
    });
  }

  test('the slash menu carries no violation', async () => {
    const { view } = mount('');
    focus(view);
    type(view, '/');
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(await violations()).toEqual([]);
  });

  test('the selection toolbar carries no violation, and names its pressed formats', async () => {
    const { view } = mount('**bold** words');
    focus(view);
    act(() => view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 5))));
    const bar = screen.getByRole('toolbar', { name: 'Formatting' });
    expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')).toBe('true');
    expect(bar).toBeTruthy();
    expect(await violations()).toEqual([]);
  });

  test('the link panel carries no violation, and refuses an address that may not be followed', async () => {
    const { view, last } = mount('words');
    focus(view);
    act(() => view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6))));
    press(view, 'k', { ctrl: true });
    const dialog = screen.getByRole('dialog', { name: 'Link' });
    expect(await violations()).toEqual([]);
    const field = screen.getByLabelText('Address') as HTMLInputElement;
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(field, 'javascript:alert(1)');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => screen.getByRole('button', { name: 'Apply' }).click());
    expect(dialog.textContent).toContain('Use an address that starts with');
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(field, 'https://example.com');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => screen.getByRole('button', { name: 'Apply' }).click());
    expect(last()).toBe('[words](https://example.com)');
  });

  test('the table bar carries no violation', async () => {
    const { view } = mount('| a | b |\n|---|---|\n| 1 | 2 |');
    focus(view);
    act(() => view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 4))));
    expect(screen.getByRole('toolbar', { name: 'Table' })).toBeTruthy();
    expect(await violations()).toEqual([]);
  });
});
