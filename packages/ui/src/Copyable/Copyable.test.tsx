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

import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Copyable, CopyButton } from './index.js';
// Through the PACKAGE ROOT rather than the neighbouring file, because "it is
// exported" is the thing under test: the folder barrel names its exports one
// by one and the package's `exports` map publishes only `dist/*/index.js`, so
// a function reachable from the module but missing from the barrel is a
// function no consumer can import.
import { writeClipboard } from '@crewlethq/ui';

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

/**
 * A clipboard whose write is HELD, the way a permission prompt holds one.
 *
 * `writeText` does not resolve until the returned `settle` is called, which is
 * the gap every real browser opens between the press and the answer.
 */
function withHeldClipboard(): { settle: () => void } {
  let release: (() => void) | undefined;
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    clipboard: {
      writeText: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    },
  });
  return {
    settle: () => {
      if (!release) throw new Error('nothing asked for the clipboard yet');
      release();
    },
  };
}

/**
 * Make the fallback path the only one there is, and say what `execCommand`
 * does once it is reached.
 *
 * THE STUB TAKES FOCUS FIRST, and that is the whole reason this helper exists
 * rather than two inline `Object.defineProperty` calls. In every real engine
 * `field.select()` focuses the field — which is exactly why the fallback has
 * to put focus back — but jsdom's `select()` only sets the selection range and
 * leaves `document.activeElement` alone. So in a test focus never left the
 * button in the first place, and an assertion that it was RESTORED passes
 * whether the restoring line is in the source or not. Measured: deleting
 * `held.focus()` from `execCommandCopy` left the whole suite green.
 *
 * Standing the focus move back up here is what gives those assertions teeth.
 */
function withFallback(run: boolean | (() => boolean)) {
  vi.stubGlobal('navigator', { ...globalThis.navigator, clipboard: undefined });
  Object.defineProperty(document, 'execCommand', {
    writable: true,
    configurable: true,
    value: () => {
      document.querySelector('textarea')?.focus();
      return typeof run === 'function' ? run() : run;
    },
  });
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
    const copied: string[] = [];
    withFallback(() => {
      copied.push(document.querySelector('textarea')?.value ?? '');
      return true;
    });

    render(<CopyButton text="fallback text" />);
    await press(/copy/i);

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
    //
    // `withFallback` is what makes this assert anything: jsdom's `select()`
    // does not move focus, so written against a bare `execCommand` stub this
    // case passed with the restoration deleted.
    withFallback(true);

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

  test('a write that settles after the screen is gone arms nothing', async () => {
    /*
     * THE GAP IS THE AWAIT. `writeText` is held for as long as the browser
     * holds its permission prompt, and a reader can answer that prompt by
     * navigating away. The reset timer used to be armed AFTER that await, so
     * it was armed after the unmount cleanup had already run and clearing it
     * was nobody's job any more: one leaked timer per abandoned copy, whose
     * callback is a state write to a component that no longer exists.
     *
     * The timer is what is asserted because it is what is observable — React
     * drops a state write to an unmounted tree silently — and it is also
     * sufficient, since the timer IS that state write.
     */
    vi.useFakeTimers();
    const held = withHeldClipboard();
    const { unmount } = render(<CopyButton text="x" />);

    await press(/copy/i);
    // The reader answers the prompt by leaving.
    unmount();
    const pending = vi.getTimerCount();

    // ... and the browser settles the write afterwards.
    await act(async () => {
      held.settle();
    });

    expect(vi.getTimerCount()).toBe(pending);
  });

  test('still reports under StrictMode, which mounts, unmounts and mounts again', async () => {
    /*
     * The other edge of the liveness ref. StrictMode runs every effect's
     * cleanup once on purpose, so a ref that is only ever turned OFF is off
     * for the rest of a development render — and then every copy takes the
     * abandoned path and the control never says anything at all. Turning it
     * back on in the effect BODY is what makes the guard survive that, and
     * this is the case that says so.
     */
    const clipboard = withClipboard();
    render(
      <StrictMode>
        <CopyButton text="strict" />
      </StrictMode>,
    );

    await press(/copy/i);

    expect(clipboard.written).toEqual(['strict']);
    expect(screen.getByRole('button').textContent).toContain('Copied');
  });

  test('a refusal still settles on the success clock by default', async () => {
    // The DEFAULT is unchanged, which is what lets `failedResetMs` be additive:
    // a call site that has not asked for a separate clock does not get one.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFallback(false);
    render(<CopyButton text="x" />);

    await press(/copy/i);
    expect(screen.getByRole('button').textContent).toContain('Copy failed');

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    const label = screen.getByRole('button').textContent ?? '';
    expect(label).toContain('Copy');
    expect(label).not.toContain('failed');
  });

  test('a refusal can be held until the next press, so it is not missed', async () => {
    // A success confirms something the reader asked for; a refusal is news,
    // and a control that has gone back to offering its action is
    // indistinguishable from one nobody ever pressed.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFallback(false);
    render(<CopyButton text="x" failedResetMs={null} />);

    await press(/copy/i);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByRole('button').textContent).toContain('Copy failed');
  });

  test('a refusal takes its own clock when it is given one', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFallback(false);
    render(<CopyButton text="x" failedResetMs={8000} />);

    await press(/copy/i);
    // Well past the success clock, which is the one it used to settle on.
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole('button').textContent).toContain('Copy failed');

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByRole('button').textContent ?? '').not.toContain('failed');
  });

  test('a held refusal does not hold a SUCCESS too', async () => {
    // The two clocks are genuinely separate: opting a refusal out of the reset
    // must not leave a stale tick standing on the next successful copy.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withClipboard();
    render(<CopyButton text="x" failedResetMs={null} />);

    await press(/copy/i);
    expect(screen.getByRole('button').textContent).toContain('Copied');

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole('button').textContent ?? '').not.toContain('Copied');
  });

  test('hands focus back even when the fallback THROWS', async () => {
    // The restoration lives in a `finally`, and this is the path that says so:
    // a `catch` that returned early would leave focus on a textarea that has
    // already been removed, which lands it on the document body.
    withFallback(() => {
      throw new Error('blocked by policy');
    });

    render(<CopyButton text="x" />);
    const button = screen.getByRole('button');
    button.focus();
    await press(/copy/i);

    expect(document.activeElement).toBe(button);
    // And the throw is reported rather than swallowed into a tick.
    expect(button.textContent).toContain('Copy failed');
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

  test('takes the same refusal clock as the button', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFallback(false);
    render(<Copyable value="seat_01HZX" ariaLabel="Copy the seat id" failedResetMs={null} />);

    await press('Copy the seat id');
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    // The glyph and the chip's own `is-failed` ink are what a sighted reader
    // has, so the class is the assertion rather than the status text, which is
    // written once and never rewritten.
    expect(document.querySelector('.crewlet-copyable.is-failed')).not.toBeNull();
  });
});

/**
 * The write on its own, with no state machine around it.
 *
 * A caller that already owns its feedback — a toast, a form's status line —
 * had to reimplement both paths to get the write, and the second path is the
 * deprecated `execCommand` dance with the focus restoration in it. That is
 * how a copy button ends up sending a keyboard reader back to the top of the
 * page.
 */
describe('writeClipboard', () => {
  test('writes through the Clipboard API and answers true', async () => {
    const clipboard = withClipboard();

    await expect(writeClipboard('standalone')).resolves.toBe(true);
    expect(clipboard.written).toEqual(['standalone']);
  });

  test('falls back where the API is absent, and still restores focus', async () => {
    const copied: string[] = [];
    withFallback(() => {
      copied.push(document.querySelector('textarea')?.value ?? '');
      return true;
    });
    // A control the caller owns, focused, exactly as a real one would be.
    const held = document.createElement('button');
    document.body.appendChild(held);
    held.focus();

    await expect(writeClipboard('insecure origin')).resolves.toBe(true);

    expect(copied).toEqual(['insecure origin']);
    expect(document.activeElement).toBe(held);
    expect(document.querySelector('textarea')).toBeNull();
    held.remove();
  });

  test('reports a refusal as false rather than as a throw', async () => {
    const clipboard = withClipboard();
    clipboard.fail = true;
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      configurable: true,
      value: () => false,
    });

    // A caller that must tell a refusal from a success is exactly the caller
    // that must not receive one as an exception.
    await expect(writeClipboard('x')).resolves.toBe(false);
  });
});
