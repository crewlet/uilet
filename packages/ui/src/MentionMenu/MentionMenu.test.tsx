/**
 * The composer's @ and # suggestions: a listbox the message box owns, wired
 * to `useListbox` for its keys, whose rows are PersonRows; and the word
 * being typed at the caret.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useId, useState } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { useListbox } from '../Listbox/index.js';
import { MentionMenu, caretPoint, mentionQuery, type MentionOption } from './index.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { radius } from '@crewlethq/tokens';
import { installThemed } from '../../../../apps/ui-tests/src/cascade.js';

// A path rather than `new URL(..., import.meta.url)`, which Vite rewrites.
const here = dirname(fileURLToPath(import.meta.url));

afterEach(cleanup);

const OPTIONS: MentionOption[] = [
  { id: 'pm', insert: '@pm', label: 'Product Manager', detail: 'Writing the brief', mark: <span />, note: 'Working' },
  { id: 'ada', insert: '@ada', label: 'Ada', detail: 'ada', mark: <span /> },
  { id: 'channel', insert: '@channel', label: '@channel', detail: 'Notify everyone in this room', mark: <span /> },
];

/** A message box with the menu, wired the way the docs say. */
function Composer({ onTake }: { onTake: (insert: string) => void }) {
  const [value, setValue] = useState('');
  const [caret, setCaret] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const query = mentionQuery(value, caret);
  const open = query !== null && closedAt !== query.start;
  const listbox = useListbox({
    id: useId(),
    open,
    count: OPTIONS.length,
    tabCommits: true,
    onCommit: (index) => onTake(OPTIONS[index]!.insert),
    onClose: () => setClosedAt(query?.start ?? null),
  });
  return (
    <div style={{ position: 'relative' }} ref={listbox.anchorRef}>
      {open ? (
        <MentionMenu
          id={listbox.listId}
          listRef={listbox.listRef}
          label="People and agents"
          options={OPTIONS}
          active={listbox.active}
          onPick={(option) => onTake(option.insert)}
          onHover={listbox.setActive}
        />
      ) : null}
      <textarea
        aria-label="Message"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listbox.listId : undefined}
        aria-activedescendant={open ? listbox.optionId(listbox.active) : undefined}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setCaret(event.target.selectionStart);
        }}
        onKeyDown={(event) => listbox.onKeyDown(event)}
      />
    </div>
  );
}

describe('mentionQuery', () => {
  test('finds the word after a trigger at the caret, and where the trigger stands', () => {
    expect(mentionQuery('Hello @pr', 9)).toEqual({ trigger: '@', query: 'pr', start: 6 });
    expect(mentionQuery('#', 1)).toEqual({ trigger: '#', query: '', start: 0 });
    expect(mentionQuery('see #eng-team', 13)).toEqual({ trigger: '#', query: 'eng-team', start: 4 });
    expect(mentionQuery('Hej @José', 9)).toEqual({ trigger: '@', query: 'José', start: 4 });
  });

  test('opens nothing inside a word, after a space, or before the caret reaches the trigger', () => {
    expect(mentionQuery('ada@crewlet.com', 15)).toBeNull();
    expect(mentionQuery('@pm said', 8)).toBeNull();
    expect(mentionQuery('Hello @pm', 3)).toBeNull();
    expect(mentionQuery('', 0)).toBeNull();
  });
});

test('the list is a listbox the field points at, its rows named options with the PersonRow design', () => {
  render(<Composer onTake={() => undefined} />);
  const field = screen.getByRole('combobox', { name: 'Message' });
  fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
  const list = screen.getByRole('listbox', { name: 'People and agents' });
  const options = screen.getAllByRole('option');
  expect(options).toHaveLength(3);
  expect(options[0]!.id).toBe(`${list.id}-0`);
  expect(options[0]!.classList.contains('crewlet-person-row')).toBe(true);
  expect(options[0]!.classList.contains('crewlet-person-row--compact')).toBe(true);
  expect(field.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
  expect(options[0]!.getAttribute('aria-selected')).toBe('true');
  // The trailing word is drawn at the row's end.
  expect(options[0]!.textContent).toContain('Working');
  // The keyboard hints at the foot.
  expect(screen.getByText('Enter or Tab to choose')).toBeDefined();
});

test('the arrows move the highlight and wrap, and Tab takes the highlighted option', () => {
  const taken: string[] = [];
  render(<Composer onTake={(insert) => taken.push(insert)} />);
  const field = screen.getByRole('combobox', { name: 'Message' });
  fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
  fireEvent.keyDown(field, { key: 'ArrowUp' });
  expect(field.getAttribute('aria-activedescendant')).toMatch(/-2$/);
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  expect(field.getAttribute('aria-activedescendant')).toMatch(/-0$/);
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  fireEvent.keyDown(field, { key: 'Tab' });
  expect(taken).toEqual(['@ada']);
});

test('a press on an option takes it without taking focus from the field', () => {
  const taken: string[] = [];
  render(<Composer onTake={(insert) => taken.push(insert)} />);
  const field = screen.getByRole('combobox', { name: 'Message' });
  fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
  const option = screen.getByRole('option', { name: /@channel/ });
  const press = fireEvent.mouseDown(option);
  // Prevented, so the field keeps focus and the list is not closed by a blur.
  expect(press).toBe(false);
  expect(taken).toEqual(['@channel']);
});

test('Escape closes the list and nothing else', () => {
  render(<Composer onTake={() => undefined} />);
  const field = screen.getByRole('combobox', { name: 'Message' });
  fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('the foot is the host\'s to replace or drop', () => {
  const { rerender } = render(
    <MentionMenu id="m" label="Rooms" options={OPTIONS} active={0} onPick={() => undefined} onHover={() => undefined} footer={null} />,
  );
  expect(document.querySelector('.crewlet-mention-menu__footer')).toBeNull();
  rerender(
    <MentionMenu id="m" label="Rooms" options={OPTIONS} active={0} onPick={() => undefined} onHover={() => undefined} labels={{ hints: ['Pick a room'] }} />,
  );
  expect(document.querySelector('.crewlet-mention-menu__footer')?.textContent).toBe('Pick a room');
});

test('an open menu carries no axe violation', async () => {
  const { container } = render(
    <main>
      <Composer onTake={() => undefined} />
    </main>,
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Message' }), { target: { value: '@', selectionStart: 1 } });
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('before the arrows the active row rests: still the selected option, drawn quietly', () => {
  const props = { id: 'people', label: 'People and agents', options: OPTIONS, active: 0, onPick: () => {}, onHover: () => {} };
  const { container, rerender } = render(<MentionMenu {...props} keyed={false} />);
  const menu = container.querySelector('.crewlet-mention-menu')!;
  expect(menu.classList.contains('crewlet-mention-menu--resting')).toBe(true);
  // The field's active descendant is still a selected option for a screen reader.
  expect(screen.getAllByRole('option')[0]!.getAttribute('aria-selected')).toBe('true');
  rerender(<MentionMenu {...props} keyed />);
  expect(menu.classList.contains('crewlet-mention-menu--resting')).toBe(false);
});

describe('the chat appearance and the caret anchor', () => {
  const menu = (props: Partial<Parameters<typeof MentionMenu>[0]> = {}) =>
    render(
      <div style={{ position: 'relative' }}>
        <MentionMenu id="m" label="People and agents" options={OPTIONS} active={0} onPick={() => {}} onHover={() => {}} {...props} />
      </div>,
    ).container.querySelector<HTMLElement>('.crewlet-mention-menu')!;

  // Mutation: draw the heading in chat and the label text shows above the rows.
  test('a chat list draws no heading, and the list keeps its name', () => {
    const card = menu({ appearance: 'chat' });
    expect(card.classList.contains('crewlet-mention-menu--chat')).toBe(true);
    expect(card.querySelector('.crewlet-mention-menu__label')).toBeNull();
    expect(screen.getByRole('listbox', { name: 'People and agents' })).toBeTruthy();
    cleanup();
    expect(menu().querySelector('.crewlet-mention-menu__label')?.textContent).toBe('People and agents');
  });

  test('an anchor moves the card along to the trigger; without one it starts at the box edge', () => {
    const card = menu({ anchor: 120 });
    expect(card.classList.contains('crewlet-mention-menu--anchored')).toBe(true);
    expect(card.style.getPropertyValue('--crewlet-mention-menu-anchor')).toBe('120px');
    cleanup();
    const plain = menu();
    expect(plain.classList.contains('crewlet-mention-menu--anchored')).toBe(false);
    expect(plain.style.getPropertyValue('--crewlet-mention-menu-anchor')).toBe('');
  });

  // The face column's middle stands under the trigger, clamped inside the box.
  test('the anchored card puts its face column under the trigger, inside the box', () => {
    const css = readFileSync(join(here, 'MentionMenu.css'), 'utf8');
    const rule = /\.crewlet-mention-menu--anchored\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule.replace(/\s+/g, ' ')).toContain(
      'clamp( 0px, calc(var(--crewlet-mention-menu-anchor) - var(--spacing-1) - var(--spacing-2) - var(--crewlet-mention-menu-face) / 2), calc(100% - min(100%, var(--crewlet-mention-menu-cap))) )',
    );
    const chat = /\.crewlet-mention-menu--chat\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(chat).toContain('--crewlet-mention-menu-face: 20px');
    expect(chat).toContain('--crewlet-mention-menu-cap: var(--crewlet-mention-menu-width, 480px)');
  });

  test('chat rows are 32px tall at the transcript size, on the small corner', () => {
    const uninstall = installThemed('light', 'ChatMessage/ChatScale.css', 'PersonRow/PersonRow.css', 'MentionMenu/MentionMenu.css');
    try {
      const card = menu({ appearance: 'chat' });
      const row = getComputedStyle(card.querySelector('.crewlet-person-row')!);
      expect(row.minHeight).toBe('32px');
      expect(getComputedStyle(card).borderRadius).toBe(radius.sm);
      expect(getComputedStyle(card).getPropertyValue('--crewlet-mention-menu-face').trim()).toBe('20px');
    } finally {
      uninstall();
    }
  });
});

describe('caretPoint', () => {
  // jsdom lays nothing out, so the mirror's marker is given an offset and the
  // field a scroll and a box: the point is the field's border, the marker's
  // offset less the scroll, and the field's place in the box it is measured from.
  test('is the marker offset in the mirror, less the scroll, plus the border and the field\'s place', () => {
    const field = document.createElement('textarea');
    field.value = 'Can @ad';
    field.style.borderLeftWidth = '1px';
    field.style.borderTopWidth = '1px';
    field.style.borderStyle = 'solid';
    field.style.lineHeight = '20px';
    document.body.append(field);
    const box = document.createElement('div');
    document.body.append(box);
    Object.defineProperty(field, 'scrollTop', { value: 5, configurable: true });
    const seen: string[] = [];
    const left = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft')!;
    const top = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', { configurable: true, get(this: HTMLElement) { seen.push(this.parentElement?.textContent ?? ''); return 40; } });
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, get: () => 30 });
    field.getBoundingClientRect = () => ({ left: 110, top: 300 }) as DOMRect;
    box.getBoundingClientRect = () => ({ left: 100, top: 200 }) as DOMRect;
    try {
      expect(caretPoint(field, 4)).toEqual({ left: 41, top: 26, height: 20 });
      expect(caretPoint(field, 4, box)).toEqual({ left: 51, top: 126, height: 20 });
      // The mirror holds the text before the caret, then the marker.
      expect(seen[0]).toBe('Can @ad');
      expect(document.body.contains(document.querySelector('[style*="-9999px"]'))).toBe(false);
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetLeft', left);
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', top);
      field.remove();
      box.remove();
    }
  });
});
