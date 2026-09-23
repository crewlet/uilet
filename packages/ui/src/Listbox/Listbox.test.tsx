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

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useId, useState, type ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { useModalLayer } from '../Layer/index.js';
import { useListbox, useOptionKeys } from './index.js';

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

test('an Enter held with Command, Control or Option is a chord, and the option is not taken', () => {
  // A command palette draws "⌘↵ ask an agent" beside a row; taking the row as
  // well as running the chord ran both.
  const onCommit = vi.fn();
  render(<Picker options={['a', 'b']} onCommit={onCommit} />);
  const input = screen.getByLabelText('query');
  for (const modifier of ['metaKey', 'ctrlKey', 'altKey'] as const) {
    // Not prevented either, so whatever owns the chord still sees it whole.
    expect(fireEvent.keyDown(input, { key: 'Enter', [modifier]: true }), modifier).toBe(true);
  }
  expect(onCommit).not.toHaveBeenCalled();
  expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false);
  expect(onCommit).toHaveBeenCalledWith('a');
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

test('a scroller holding more than the list scrolls to the highlighted ROW, not to the first thing selected in it', () => {
  // A command palette's scroller carries the answer it leads with, and an
  // answer can hold a tab or a chip that says it is selected. Found by
  // `[aria-selected="true"]`, that was the row brought into view.
  const options = ['a', 'b', 'c', 'd', 'e', 'f'];
  function Scroller() {
    const id = useId();
    const listbox = useListbox({ id, open: true, count: options.length, onCommit: () => {}, onClose: () => {} });
    return (
      <>
        <input
          aria-label="query"
          role="combobox"
          aria-expanded
          aria-controls={listbox.listId}
          aria-activedescendant={listbox.optionId(listbox.active)}
          onKeyDown={listbox.onKeyDown}
        />
        <div data-testid="scroller" ref={listbox.listRef}>
          <div role="tablist" aria-label="lead">
            <button role="tab" aria-selected="true">
              chosen
            </button>
          </div>
          <ul role="listbox" id={listbox.listId} aria-label="options">
            {options.map((o, i) => (
              <li key={o} id={listbox.optionId(i)} role="option" aria-selected={i === listbox.active}>
                {o}
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  }
  render(<Scroller />);
  const box = screen.getByTestId('scroller');
  let scrolled = 0;
  Object.defineProperty(box, 'scrollTop', {
    configurable: true,
    get: () => scrolled,
    set: (value: number) => {
      scrolled = value;
    },
  });
  const rect = (top: number, height: number) =>
    ({ top, height, bottom: top + height, left: 0, right: 0, width: 200, x: 0, y: top }) as DOMRect;
  box.getBoundingClientRect = () => rect(0, 60);
  // The selected tab sits above the window, where following it would scroll up.
  screen.getByRole('tab').getBoundingClientRect = () => rect(-100 - scrolled, 20);
  for (const [index, option] of screen.getAllByRole('option').entries()) {
    option.getBoundingClientRect = () => rect(index * 20 - scrolled, 20);
  }
  const input = screen.getByLabelText('query');
  for (let step = 0; step < 4; step++) fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(highlighted()).toBe('e');
  expect(scrolled).toBe(40);
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

/*
 * THE ROW'S OWN SIZING, read off the stylesheet, because jsdom performs no
 * layout and the failure this guards is purely a layout one.
 *
 * `.crewlet-listbox` is a column flex container with a `max-height` and
 * `overflow-y: auto`, which makes every row a flex ITEM. A flex item's
 * automatic minimum size is its content, and that is what makes a column
 * scroll rather than compress — but an explicit `min-height` REPLACES that
 * automatic minimum with a fixed floor. So a list long enough to scroll first
 * squeezed every row down to the floor, and a row is `overflow: visible`, so
 * its content painted over its neighbours.
 *
 * It was every row, not an edge: 19.5px of text plus 16px of padding = 35.5px
 * against a 28px floor. Measured in a browser on a nine-option Select, five
 * rows drawn over one another, two of them 59px inside a 28px box.
 *
 * The pair has to hold TOGETHER, which is why one test asserts both: the floor
 * alone is the bug, and `flex: none` alone would drop the floor a short row
 * needs to match the rows around it.
 */
const listboxCss = (): string =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Listbox.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

test('a row keeps its floor and cannot be shrunk under its own content', () => {
  const row = /\.crewlet-listbox__option\s*\{([^}]*)\}/.exec(listboxCss())?.[1] ?? '';
  expect(row).toMatch(/min-height:\s*var\(--size-row-sm\)/);
  expect(row).toMatch(/flex:\s*none/);
});

test('and neither is the separator, whose content minimum is zero', () => {
  // The one child a squeezed column can flatten completely — and it would do
  // it exactly when the list is long enough to need the grouping it draws.
  const rule = /\.crewlet-listbox__separator\s*\{([^}]*)\}/.exec(listboxCss())?.[1] ?? '';
  expect(rule).toMatch(/flex:\s*none/);
  expect(rule).toMatch(/height:\s*1px/);
});

/*
 * `opening` ANSWERS -1 WHEN NOTHING CAN BE TAKEN, tested at the hook because
 * that is where the only consumer without a re-step of its own reads it:
 * DataView's filter axis seeds its highlight through this call and has nothing
 * downstream to correct a bad answer.
 *
 * `step` already answers -1 for "no row can be taken"; `opening` used to clamp
 * that with `Math.max(..., 0)`, which turned the one input the function exists
 * for — a list whose every row is disabled — back into index 0, naming a row
 * Enter refuses. And the clamp in `useListbox` floored it a second time, so
 * even an honest -1 could not survive: "-1 when nothing is" was unreachable
 * for any list with rows in it.
 */
function Opening({ disabled }: { disabled: (index: number) => boolean }) {
  const id = useId();
  const listbox = useListbox({ id, open: true, count: 3, onCommit: () => {}, onClose: () => {} });
  const keys = useOptionKeys({ listbox, count: 3, disabled });
  const [seeded, setSeeded] = useState<number | null>(null);
  return (
    <button
      type="button"
      data-testid="probe"
      data-active={listbox.active}
      data-seeded={seeded ?? ''}
      onClick={() => {
        const next = keys.opening(-1);
        setSeeded(next);
        listbox.setActive(next);
      }}
    >
      seed
    </button>
  );
}

test('a freshly opened list whose every row is disabled highlights none of them', () => {
  render(<Opening disabled={() => true} />);
  fireEvent.click(screen.getByTestId('probe'));
  const probe = screen.getByTestId('probe');
  expect(probe.getAttribute('data-seeded')).toBe('-1');
  // And the clamp lets it through: flooring at 0 here is what made the value
  // above unreachable the moment the list had any rows at all.
  expect(probe.getAttribute('data-active')).toBe('-1');
});

test('and one with a takeable row still opens on it', () => {
  render(<Opening disabled={(index) => index < 2} />);
  fireEvent.click(screen.getByTestId('probe'));
  expect(screen.getByTestId('probe').getAttribute('data-active')).toBe('2');
});
