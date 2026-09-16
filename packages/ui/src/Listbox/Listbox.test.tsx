/**
 * The listbox keys, once, for every field that offers a list.
 *
 * The contract a combobox, a multi-select and a command palette all rely on,
 * including the one that matters most inside a modal: Escape closes the list
 * and nothing around it.
 *
 * Ported from the engine dashboard's `ui/useListbox.test.tsx`, with the reveal
 * case added, which is the bug this port fixes: the engine's own multi-select
 * and secret completion never scrolled the highlighted row into view.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useId, useState, type ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { useModalLayer } from '../Layer/index.js';
import { useListbox } from './index.js';

afterEach(cleanup);

function Picker({
  options,
  tabCommits,
  onCommit,
}: {
  options: string[];
  tabCommits?: boolean;
  onCommit: (value: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(true);
  const listbox = useListbox({
    id,
    open,
    count: options.length,
    tabCommits,
    onCommit: (i) => onCommit(options[i]!),
    onClose: () => setOpen(false),
  });
  return (
    <>
      <input
        aria-label="query"
        role="combobox"
        aria-expanded={open}
        aria-controls={listbox.listId}
        aria-activedescendant={open ? listbox.optionId(listbox.active) : undefined}
        onKeyDown={listbox.onKeyDown}
      />
      {open && (
        <ul role="listbox" id={listbox.listId} ref={listbox.listRef} aria-label="options" className="crewlet-listbox">
          {options.map((o, i) => (
            <li
              key={o}
              id={listbox.optionId(i)}
              role="option"
              className="crewlet-listbox__option"
              aria-selected={i === listbox.active}
              {...listbox.optionHandlers(i)}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function highlighted(): string | null {
  const input = screen.getByLabelText('query');
  const id = input.getAttribute('aria-activedescendant');
  return id ? (document.getElementById(id)?.textContent ?? null) : null;
}

test('the arrows wrap at both ends', () => {
  render(<Picker options={['a', 'b', 'c']} onCommit={() => {}} />);
  const input = screen.getByLabelText('query');
  expect(highlighted()).toBe('a');
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(highlighted()).toBe('c');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(highlighted()).toBe('a');
});

test('the highlight is clamped, not reset, when the list shrinks', () => {
  const { rerender } = render(<Picker options={['a', 'b', 'c']} onCommit={() => {}} />);
  const input = screen.getByLabelText('query');
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(highlighted()).toBe('c');
  rerender(<Picker options={['a', 'b']} onCommit={() => {}} />);
  expect(highlighted()).toBe('b');
});

test('Enter takes the highlighted option without submitting the form around it', () => {
  const onCommit = vi.fn();
  render(<Picker options={['a', 'b']} onCommit={onCommit} />);
  const input = screen.getByLabelText('query');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  // Prevented: that is what stops a browser's implicit form submission, which
  // jsdom does not perform and so cannot be observed directly.
  expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false);
  expect(onCommit).toHaveBeenCalledWith('b');
});

test('Tab takes the option only where the list is a completion, and never backwards', () => {
  const onCommit = vi.fn();
  const { rerender } = render(<Picker options={['a']} onCommit={onCommit} />);
  expect(fireEvent.keyDown(screen.getByLabelText('query'), { key: 'Tab' })).toBe(true);
  expect(onCommit).not.toHaveBeenCalled();

  rerender(<Picker options={['a']} tabCommits onCommit={onCommit} />);
  fireEvent.keyDown(screen.getByLabelText('query'), { key: 'Tab', shiftKey: true });
  expect(onCommit).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByLabelText('query'), { key: 'Tab' });
  expect(onCommit).toHaveBeenCalledWith('a');
});

/** A dialog on the layer stack, the surface a field usually sits inside. */
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const modal = useModalLayer({ onClose });
  return (
    <div className="veil" ref={modal.veilRef} role="presentation">
      <div role="dialog" aria-modal aria-label={title} tabIndex={-1} ref={modal.panelRef}>
        {children}
      </div>
    </div>
  );
}

test('Escape closes the list and leaves the dialog around it open', () => {
  const closed = vi.fn();
  render(
    <Dialog title="Edit seat" onClose={closed}>
      <Picker options={['a']} onCommit={() => {}} />
    </Dialog>,
  );
  const input = screen.getByLabelText('query');
  input.focus();
  // The press STOPS at the list: it is prevented, so nothing reads it as
  // unhandled, and it never reaches the document, where a page shortcut and
  // the layer stack are both listening.
  const atTheDocument = vi.fn();
  document.addEventListener('keydown', atTheDocument);
  try {
    expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(false);
    expect(atTheDocument).not.toHaveBeenCalled();
  } finally {
    document.removeEventListener('keydown', atTheDocument);
  }
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(closed).not.toHaveBeenCalled();

  fireEvent.keyDown(input, { key: 'Escape' });
  expect(closed).toHaveBeenCalledTimes(1);
});

test('a key an input method is composing with moves, takes and closes nothing', () => {
  const onCommit = vi.fn();
  render(<Picker options={['a', 'b']} onCommit={onCommit} />);
  const input = screen.getByLabelText('query');
  // The arrows walk the candidates and Enter accepts one; Safari marks that
  // Enter only by its key code, after the composition flag has cleared.
  for (const init of [{ isComposing: true }, { keyCode: 229 }]) {
    expect(fireEvent.keyDown(input, { key: 'ArrowDown', ...init })).toBe(true);
    expect(highlighted()).toBe('a');
    expect(fireEvent.keyDown(input, { key: 'Enter', ...init })).toBe(true);
    expect(fireEvent.keyDown(input, { key: 'Escape', ...init })).toBe(true);
  }
  expect(onCommit).not.toHaveBeenCalled();
  expect(screen.getByRole('listbox')).toBeDefined();

  // Once the word is written, the same keys are the list's again.
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onCommit).toHaveBeenCalledWith('b');
});

test('a press on an option takes it on mousedown, before the field can blur', () => {
  const onCommit = vi.fn();
  render(<Picker options={['a', 'b']} onCommit={onCommit} />);
  const option = screen.getByRole('option', { name: 'b' });
  expect(fireEvent.mouseDown(option)).toBe(false);
  expect(onCommit).toHaveBeenCalledWith('b');
  fireEvent.mouseEnter(screen.getByRole('option', { name: 'a' }));
  expect(highlighted()).toBe('a');
});

test('the highlighted row is brought into view by scrolling the list and nothing else', () => {
  // jsdom lays nothing out, so the geometry is supplied: a 60px window over
  // 20px rows. `scrollIntoView` does not exist here at all, which is how an
  // unguarded call takes the whole suite with it.
  const options = ['a', 'b', 'c', 'd', 'e', 'f'];
  render(<Picker options={options} onCommit={() => {}} />);
  const list = screen.getByRole('listbox');
  let scrolled = 0;
  Object.defineProperty(list, 'scrollTop', {
    configurable: true,
    get: () => scrolled,
    set: (value: number) => {
      scrolled = value;
    },
  });
  const rect = (top: number, height: number) =>
    ({ top, height, bottom: top + height, left: 0, right: 0, width: 200, x: 0, y: top }) as DOMRect;
  list.getBoundingClientRect = () => rect(0, 60);
  for (const [index, option] of screen.getAllByRole('option').entries()) {
    option.getBoundingClientRect = () => rect(index * 20 - scrolled, 20);
  }
  const outside = () => {
    const row = list.querySelector<HTMLElement>('[aria-selected="true"]')!;
    const at = row.getBoundingClientRect();
    return at.top < 0 || at.bottom > 60;
  };

  const input = screen.getByLabelText('query');
  for (let step = 0; step < 4; step++) fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(highlighted()).toBe('e');
  expect(scrolled).toBe(40);
  expect(outside()).toBe(false);

  // And back up the other way, which the wrap reaches first.
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(highlighted()).toBe('a');
  expect(scrolled).toBe(0);
  expect(outside()).toBe(false);
});

test('a list that is a modal’s whole body leaves Escape and the veil to the modal', () => {
  // Shaped the way a command palette is: the modal first, then its list, in
  // one component, so a list registered as a popup would sit above its modal.
  function Palette({ onClose, onListClose }: { onClose: () => void; onListClose: () => void }) {
    const id = useId();
    const options = ['a', 'b'];
    const modal = useModalLayer({ onClose });
    const listbox = useListbox({
      id,
      open: true,
      count: options.length,
      popup: false,
      onCommit: () => {},
      onClose: onListClose,
    });
    return (
      <div className="veil" ref={modal.veilRef} role="presentation">
        <div role="dialog" aria-modal aria-label="Search" tabIndex={-1} ref={modal.panelRef}>
          <input
            aria-label="query"
            role="combobox"
            aria-expanded
            aria-controls={listbox.listId}
            aria-activedescendant={listbox.optionId(listbox.active)}
            onKeyDown={listbox.onKeyDown}
          />
          <ul role="listbox" id={listbox.listId} ref={listbox.listRef} aria-label="options">
            {options.map((o, i) => (
              <li key={o} id={listbox.optionId(i)} role="option" aria-selected={i === listbox.active}>
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  const closed = vi.fn();
  const listClosed = vi.fn();
  const { container, unmount } = render(<Palette onClose={closed} onListClose={listClosed} />);
  const input = screen.getByLabelText('query');
  // The keys are still the list's.
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(highlighted()).toBe('b');

  // A press on the veil is the modal's, closed on its click. Were the list a
  // popup above the modal, the press itself would have closed the list.
  const veil = container.querySelector('.veil')!;
  fireEvent.pointerDown(veil);
  fireEvent.click(veil);
  expect(listClosed).not.toHaveBeenCalled();
  expect(closed).toHaveBeenCalledTimes(1);

  // Escape reaches the modal through the stack rather than the list.
  unmount();
  closed.mockClear();
  render(<Palette onClose={closed} onListClose={listClosed} />);
  expect(fireEvent.keyDown(screen.getByLabelText('query'), { key: 'Escape' })).toBe(false);
  expect(listClosed).not.toHaveBeenCalled();
  expect(closed).toHaveBeenCalledTimes(1);
});
