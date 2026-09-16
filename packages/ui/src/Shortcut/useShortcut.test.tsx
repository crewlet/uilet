/**
 * Which presses reach a page shortcut, ported from the engine dashboard's
 * `app/Shell.test.tsx` cases for the two it binds (a chord and a bare slash)
 * and extended with the one that screen missed: a slash pressed on a focused
 * `select` opened search instead of spelling an option.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { useModalLayer } from '../Layer/index.js';
import { useShortcut, type ShortcutKey } from './index.js';

afterEach(cleanup);

const SEARCH: readonly ShortcutKey[] = [{ key: 'k', mod: true }, '/'];

/**
 * The smallest surface that holds the keyboard: a modal on the shared layer
 * stack. Written here rather than taken from Modal, because what the hook asks
 * the stack is only whether SOMETHING modal is up, and a suite that went
 * through a component would be testing that component's registration too.
 */
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children?: ReactNode }) {
  const { panelRef, veilRef } = useModalLayer({ onClose });
  return (
    <div ref={veilRef} role="presentation">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}

function Page({
  onKey,
  keys = SEARCH,
  children,
}: {
  onKey: () => void;
  keys?: readonly ShortcutKey[];
  children?: ReactNode;
}) {
  useShortcut({ keys, onKey });
  return (
    <div>
      <button>Retry</button>
      <input aria-label="Filter" />
      <select aria-label="Group">
        <option>state</option>
      </select>
      <div role="combobox" aria-label="Seat" tabIndex={0} aria-expanded="false" aria-controls="seats" />
      {children}
    </div>
  );
}

function press(key: string, init: Partial<KeyboardEventInit> = {}): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
}

test('the chord and the bare key both fire, and the press is claimed', () => {
  const onKey = vi.fn();
  render(<Page onKey={onKey} />);
  screen.getByRole('button', { name: 'Retry' }).focus();

  // fireEvent answers false when a listener called preventDefault, which is
  // how the shortcut says the press is now its own.
  expect(press('k', { ctrlKey: true })).toBe(false);
  expect(press('k', { metaKey: true })).toBe(false);
  expect(press('/')).toBe(false);
  expect(onKey).toHaveBeenCalledTimes(3);
});

test('a bare key is bare: a chord or an input method leaves it alone', () => {
  const onKey = vi.fn();
  render(<Page onKey={onKey} />);
  screen.getByRole('button', { name: 'Retry' }).focus();
  for (const init of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
    expect(press('/', init)).toBe(true);
  }
  expect(onKey).not.toHaveBeenCalled();
});

test('a press something else has already handled is not taken twice', () => {
  const onKey = vi.fn();
  render(<Page onKey={onKey} />);
  screen.getByRole('button', { name: 'Retry' }).focus();
  // A handler that runs first and claims the press, which is what a surface
  // closing on its own chord does.
  const claim = (event: KeyboardEvent) => event.preventDefault();
  window.addEventListener('keydown', claim, true);
  try {
    press('/');
  } finally {
    window.removeEventListener('keydown', claim, true);
  }
  expect(onKey).not.toHaveBeenCalled();
});

test('a bare key does nothing while somebody is typing, in a field of any kind', () => {
  const onKey = vi.fn();
  render(<Page onKey={onKey} />);
  for (const name of ['Filter', 'Group', 'Seat']) {
    screen.getByLabelText(name).focus();
    expect(press('/')).toBe(true);
    expect(onKey).not.toHaveBeenCalled();
  }
  // The chord is not typing: it fires from inside a field, which is what lets
  // a reader reach search from the filter box they are in.
  screen.getByLabelText('Filter').focus();
  press('k', { ctrlKey: true });
  expect(onKey).toHaveBeenCalledTimes(1);
});

test('a contenteditable region counts as typing too', () => {
  const onKey = vi.fn();
  render(
    <Page onKey={onKey}>
      <div contentEditable suppressContentEditableWarning data-testid="note" />
    </Page>,
  );
  screen.getByTestId('note').focus();
  press('/');
  expect(onKey).not.toHaveBeenCalled();
});

test('a page shortcut is silent while a modal holds the keyboard', () => {
  function WithDialog({ onKey }: { onKey: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <Page onKey={onKey}>
        <button onClick={() => setOpen(true)}>Open</button>
        {open ? (
          <Dialog title="Saving" onClose={() => setOpen(false)}>
            <button>Wait</button>
          </Dialog>
        ) : null}
      </Page>
    );
  }
  const onKey = vi.fn();
  render(<WithDialog onKey={onKey} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('dialog', { name: 'Saving' })).toBeDefined();

  // The page behind the dialog is inert. A shortcut that fired here could
  // navigate, and the navigation would unmount the dialog.
  press('k', { ctrlKey: true });
  press('/');
  expect(onKey).not.toHaveBeenCalled();

  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Saving' })).toBeNull();
  press('k', { ctrlKey: true });
  expect(onKey).toHaveBeenCalledTimes(1);
});

test('a surface shortcut asks to be bound while its surface is up', () => {
  function Surface({ onKey }: { onKey: () => void }) {
    const [open, setOpen] = useState(false);
    useShortcut({ keys: [{ key: 's', mod: true }], onKey, scope: 'any', enabled: open });
    return (
      <div>
        <button onClick={() => setOpen(true)}>Open</button>
        {open ? (
          <Dialog title="Editor" onClose={() => setOpen(false)}>
            <button>Save</button>
          </Dialog>
        ) : null}
      </div>
    );
  }
  const onKey = vi.fn();
  render(<Surface onKey={onKey} />);
  press('s', { ctrlKey: true });
  expect(onKey).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  press('s', { ctrlKey: true });
  expect(onKey).toHaveBeenCalledTimes(1);
});

test('a surface shortcut is silent under a surface raised over it', () => {
  /*
   * The engine dashboard's own case: the chord that opens search closes it
   * again, but NOT from beneath a token dialog raised over it, because that
   * would change a page the reader cannot see and hand focus behind the
   * dialog's veil. A surface cannot ask for `scope: 'page'` (it is itself the
   * modal that would silence it), so the other half of the rule is the
   * surface's own place in the stack.
   */
  function Palette({ onKey, onClose, children }: { onKey: () => void; onClose: () => void; children?: ReactNode }) {
    const { panelRef, veilRef, isTopmost } = useModalLayer({ onClose });
    useShortcut({ keys: [{ key: 'k', mod: true }], onKey, scope: 'any', enabled: isTopmost });
    return (
      <div ref={veilRef} role="presentation">
        <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Search" tabIndex={-1}>
          {children}
        </div>
      </div>
    );
  }
  function Page_({ onKey }: { onKey: () => void }) {
    const [token, setToken] = useState(false);
    return (
      <Palette onKey={onKey} onClose={() => {}}>
        <button onClick={() => setToken(true)}>Ask for a token</button>
        {token ? (
          <Dialog title="API token" onClose={() => setToken(false)}>
            <button>Save and reconnect</button>
          </Dialog>
        ) : null}
      </Palette>
    );
  }
  const onKey = vi.fn();
  render(<Page_ onKey={onKey} />);
  press('k', { ctrlKey: true });
  expect(onKey).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Ask for a token' }));
  expect(screen.getByRole('dialog', { name: 'API token' })).toBeDefined();
  press('k', { ctrlKey: true });
  expect(onKey).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'API token' })).toBeNull();
  press('k', { ctrlKey: true });
  expect(onKey).toHaveBeenCalledTimes(2);
});

test('a chord names exactly its modifiers, so redo is not undo', () => {
  const onKey = vi.fn();
  render(<Page onKey={onKey} keys={[{ key: 'z', mod: true }]} />);
  screen.getByRole('button', { name: 'Retry' }).focus();
  press('z', { ctrlKey: true, shiftKey: true });
  expect(onKey).not.toHaveBeenCalled();
  press('z', { ctrlKey: true });
  expect(onKey).toHaveBeenCalledTimes(1);
});

test('a letter is the same shortcut whatever the shift key did to it', () => {
  const onKey = vi.fn();
  render(<Page onKey={onKey} keys={[{ key: 'k', mod: true }]} />);
  screen.getByRole('button', { name: 'Retry' }).focus();
  // Caps Lock reports the capital, and it is still the same chord.
  press('K', { ctrlKey: true });
  expect(onKey).toHaveBeenCalledTimes(1);
});
