/**
 * The two affordances a value has: copy it, and be told whether that worked.
 *
 * These are asserted rather than assumed because both were WRONG before, and
 * silently. A copy that reached no clipboard clicked exactly like one that
 * did, and `Copyable` awaited `document.execCommand` and reported success
 * whatever it returned, so on the plain http origin anybody reads a remote
 * console at, the tick appeared over an empty clipboard.
 *
 * The CopyButton cases are ported from the engine dashboard's
 * `ui/primitives.test.tsx`.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Copyable, CopyButton } from './index.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Give the component the Clipboard API, and report what it was handed. */
function withClipboard(): { written: string[]; fail?: boolean } {
  const state: { written: string[]; fail?: boolean } = { written: [] };
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    clipboard: {
      writeText: (text: string) => {
        if (state.fail) return Promise.reject(new Error('refused'));
        state.written.push(text);
        return Promise.resolve();
      },
    },
  });
  return state;
}

async function press(name: RegExp | string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

describe('CopyButton', () => {
  test('puts the text on the clipboard and says it did', async () => {
    const clipboard = withClipboard();
    render(<CopyButton text='{"turn_id":"t-1"}' />);

    await press(/copy/i);

    expect(clipboard.written).toEqual(['{"turn_id":"t-1"}']);
    // THE FEEDBACK IS THE FEATURE. The clipboard is invisible; without the
    // control saying so, a working copy and a dead button are one event.
    expect(screen.getByRole('button').textContent).toContain('Copied');
  });

  test('falls back to execCommand where the Clipboard API is absent', async () => {
    // Which is not hypothetical: the API is gated on a secure context, so it
    // is simply undefined on the http origin anybody reads the console of a
    // machine that is not their laptop at.
    vi.stubGlobal('navigator', { ...globalThis.navigator, clipboard: undefined });
    const copied: string[] = [];
    const exec = vi.fn(() => {
      const field = document.querySelector('textarea');
      copied.push(field?.value ?? '');
      return true;
    });
    Object.defineProperty(document, 'execCommand', { writable: true, configurable: true, value: exec });

    render(<CopyButton text="fallback text" />);
    await press(/copy/i);

    expect(exec).toHaveBeenCalledWith('copy');
    expect(copied).toEqual(['fallback text']);
    expect(screen.getByRole('button').textContent).toContain('Copied');
    // The scratch field is not left behind for the next reader to tab into.
    expect(document.querySelector('textarea')).toBeNull();
  });

  test('says so when the browser refuses, rather than looking like it worked', async () => {
    const clipboard = withClipboard();
    clipboard.fail = true;
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      configurable: true,
      value: () => false,
    });

    render(<CopyButton text="anything" />);
    await press(/copy/i);

    expect(screen.getByRole('button').textContent).toContain('Copy failed');
  });

  test('hands focus back to the control after the fallback takes it', async () => {
    // The fallback SELECTS an off-screen field, which takes focus off the
    // button that was pressed. Left there, a keyboard reader's next Tab starts
    // from the top of the document rather than from the control they just
    // used.
    vi.stubGlobal('navigator', { ...globalThis.navigator, clipboard: undefined });
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      configurable: true,
      value: () => true,
    });

    render(<CopyButton text="x" />);
    const button = screen.getByRole('button');
    button.focus();
    await press(/copy/i);

    expect(document.activeElement).toBe(button);
  });

  test('settles back to Copy so the label is never a stale claim', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withClipboard();
    render(<CopyButton text="x" />);

    await press(/copy/i);
    expect(screen.getByRole('button').textContent).toContain('Copied');

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    const label = screen.getByRole('button').textContent ?? '';
    expect(label).toContain('Copy');
    expect(label).not.toContain('Copied');
  });

  test('resolves a thunk on the press, so a live record is not serialized per frame', async () => {
    const clipboard = withClipboard();
    let calls = 0;
    const produce = () => {
      calls += 1;
      return 'assembled once';
    };
    const { rerender } = render(<CopyButton text={produce} />);
    // Re-rendered as a streamed frame would: the thunk is not called.
    rerender(<CopyButton text={produce} />);
    rerender(<CopyButton text={produce} />);
    expect(calls).toBe(0);

    await press(/copy/i);
    expect(calls).toBe(1);
    expect(clipboard.written).toEqual(['assembled once']);
  });

  test('the status text is not part of the button accessible name', async () => {
    withClipboard();
    render(<CopyButton text="x" />);
    await press(/copy/i);

    // getByRole matches on the accessible NAME, so an exact-name query is the
    // assertion: with the live region inside the button, the control was named
    // "Copied copied to the clipboard".
    expect(screen.getByRole('button', { name: 'Copied' })).toBeDefined();
    expect(screen.getByRole('status').textContent).toBe('copied to the clipboard');
  });
});

describe('Copyable', () => {
  test('is ONE tab stop: the value is text and the button is the only control', () => {
    render(<Copyable value="seat_01HZX" ariaLabel="Copy the seat id" />);

    const stops = [...document.querySelectorAll('[tabindex], button, a[href], input')];
    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(screen.getByRole('button', { name: 'Copy the seat id' }));
    // The value is read as text, not announced as a control that does nothing.
    expect(screen.getByText('seat_01HZX').getAttribute('role')).toBeNull();
  });

  test('reports a refusal instead of showing the tick over an empty clipboard', async () => {
    const clipboard = withClipboard();
    clipboard.fail = true;
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      configurable: true,
      value: () => false,
    });

    render(<Copyable value="seat_01HZX" ariaLabel="Copy the seat id" />);
    await press('Copy the seat id');

    expect(screen.getByRole('status').textContent).toBe('the browser refused the clipboard');
  });

  test('copies the whole value even when the chip draws a shortened one', async () => {
    const clipboard = withClipboard();
    render(<Copyable value="0f8c2a11-4d1e-49f5-9b3a-2f1c7d0e5a44" ariaLabel="Copy the id" />);

    // Drawn short, so the row stays one line.
    expect(screen.getByRole('button', { name: 'Copy the id' })).toBeDefined();
    await press('Copy the id');
    expect(clipboard.written).toEqual(['0f8c2a11-4d1e-49f5-9b3a-2f1c7d0e5a44']);
  });

  test('an absent value draws nothing at all', () => {
    const { container } = render(<Copyable value={null} />);
    expect(container.innerHTML).toBe('');
  });
});
