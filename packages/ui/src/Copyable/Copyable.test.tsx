/**
 * The two affordances a value has: copy it, and be told whether that worked,
 * including when the browser refuses the clipboard.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installThemed, themeColour } from '../../../../apps/ui-tests/src/cascade.js';
import { Copyable, CopyButton } from './index.js';
// Through the package root, because "it is exported" is under test: a
// function missing from the folder barrel is one no consumer can import.
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
 * Make the fallback path the only one, with `execCommand` answering `run`.
 * The stub takes focus first, as a browser's `select()` does and jsdom's does
 * not, so the focus-restoring assertions can fail.
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

/** The run of text each `<wbr>` in `el` follows: where the value may break. */
const breaksAfter = (el: Element) => [...el.querySelectorAll('wbr')].map((wbr) => wbr.previousSibling?.textContent ?? '');

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
    // The fallback selects an off-screen field, taking focus off the button;
    // `withFallback` moves focus as a browser would, so this can fail.
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
     * `writeText` can settle after the reader has left; the reset timer is the
     * observable state write, so none may be armed after unmount.
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
     * StrictMode runs every effect's cleanup once, so the liveness ref must be
     * turned back on in the effect body or every copy reads as abandoned.
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

  test('a refusal holds by default, and settles on a clock only when it is given one', async () => {
    // A refusal is news: a control that has gone back to offering its action
    // is indistinguishable from one nobody pressed. So the button holds it
    // until the next press unless the caller asks for a clock.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFallback(false);
    render(<CopyButton text="x" />);

    await press(/copy/i);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('button').textContent).toContain('Copy failed');
    cleanup();

    render(<CopyButton text="x" failedResetMs={undefined} resetMs={2000} />);
    await press(/copy/i);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    // `undefined` is the default too, which is `null` on the button.
    expect(screen.getByRole('button').textContent).toContain('Copy failed');
  });

  test('a second identical refusal still reaches the live region', async () => {
    // The message is keyed on the attempt, so the region's content is
    // REPLACED rather than re-rendered, which a screen reader announces.
    withFallback(false);
    render(<CopyButton text="x" />);
    await press(/copy/i);
    const first = screen.getByRole('status').firstElementChild;
    await press(/copy/i);
    const second = screen.getByRole('status').firstElementChild;
    expect(second?.textContent).toBe('the browser refused the clipboard');
    expect(second).not.toBe(first);
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

  test('a block draws its whole value, wrapped, never cut short', () => {
    const url = 'https://app.example.com/integrations/oauth/callback/7f3a9c2e';
    render(<Copyable value={url} variant="block" monospace />);
    // Every character is in the value, with no shortened form drawn in its place.
    expect(screen.getByText(url).classList.contains('crewlet-copyable__value')).toBe(true);
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Copyable.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = /\.crewlet-copyable--block \.crewlet-copyable__value \{([^}]*)\}/.exec(css)?.[1] ?? '';
    // It wraps at any character, keeps its spaces, and neither scrolls nor ends in an ellipsis.
    expect(rule).toMatch(/white-space:\s*pre-wrap;/);
    expect(rule).toMatch(/overflow-wrap:\s*anywhere;/);
    expect(rule).toMatch(/text-overflow:\s*clip;/);
    expect(rule).not.toMatch(/overflow-x:\s*auto/);
  });

  test('a block breaks an address after each slash and dot, and an opaque token at any character', () => {
    const url = 'https://app.example.com/integrations/oauth/callback';
    const token = 'cwl_pat_01a1dc5f-3ec7-7cf4-a60d-30e3034af0a7';
    const { container } = render(
      <>
        <Copyable value={url} variant="block" monospace />
        <Copyable value={token} variant="block" monospace />
        <Copyable value="crewlet config import -file company.yaml" variant="block" monospace />
      </>,
    );
    const [address, opaque, command] = [...container.querySelectorAll('.crewlet-copyable')];
    expect(breaksAfter(address!)).toEqual(['https:/', '/', 'app.', 'example.', 'com/', 'integrations/', 'oauth/']);
    expect(address!.querySelector('.crewlet-copyable__value')!.textContent).toBe(url);
    expect(address!.classList.contains('crewlet-copyable--opaque')).toBe(false);
    expect(opaque!.classList.contains('crewlet-copyable--opaque')).toBe(true);
    expect(command!.classList.contains('crewlet-copyable--opaque')).toBe(false);
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Copyable.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.crewlet-copyable--opaque \.crewlet-copyable__value \{\s*word-break:\s*break-all;\s*\}/);
  });

  test('an email or a host name breaks only after an @ or a dot, never mid-name, and copies as it is', async () => {
    const clipboard = withClipboard();
    const email = 'crewlet-gr-example-1@example-crewlet.iam.gserviceaccount.com';
    const { container } = render(
      <>
        <Copyable value={email} variant="block" monospace ariaLabel="Copy the email" />
        <Copyable value="api.eu.example.com" variant="compact" />
        <Copyable value="cwl_pat_01a1dc5f-3ec7-7cf4" variant="block" monospace />
      </>,
    );
    const [address, host, token] = [...container.querySelectorAll('.crewlet-copyable')];
    expect(breaksAfter(address!)).toEqual(['crewlet-gr-example-1@', 'example-crewlet.', 'iam.', 'gserviceaccount.']);
    expect(breaksAfter(host!)).toEqual(['api.', 'eu.', 'example.']);
    // Not opaque, so no line breaks inside a name unless one name is wider than the line.
    expect(address!.classList.contains('crewlet-copyable--opaque')).toBe(false);
    expect(host!.classList.contains('crewlet-copyable--opaque')).toBe(false);
    // A token with no separator still breaks at any character.
    expect(token!.querySelectorAll('wbr')).toHaveLength(0);
    expect(token!.classList.contains('crewlet-copyable--opaque')).toBe(true);
    expect(address!.querySelector('.crewlet-copyable__value')!.textContent).toBe(email);
    await press('Copy the email');
    expect(clipboard.written).toEqual([email]);
  });

  test('a dot or an @ that opens a name is not a break', () => {
    const { container } = render(
      <>
        <Copyable value="~/.config/crewlet" variant="block" monospace />
        <Copyable value="@crewlethq/ui" variant="block" monospace />
      </>,
    );
    const [dotfile, scope] = [...container.querySelectorAll('.crewlet-copyable')];
    expect(breaksAfter(dotfile!)).toEqual(['~/', '.config/']);
    expect(breaksAfter(scope!)).toEqual(['@crewlethq/']);
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
 * The write on its own, with no state machine around it, for a caller that
 * owns its feedback (a toast, a form's status line).
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

test('an inline value takes the size and ink of the row it stands in, a value among values', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Copyable.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = /\.crewlet-copyable--inline \.crewlet-copyable__value \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(rule).toMatch(/font-size: inherit/);
  expect(rule).toMatch(/color: inherit/);
  const { container } = render(<Copyable value="https://api.example.com/v1/" variant="inline" monospace />);
  // Whole: the inline variant never cuts a value it was not asked to.
  expect(container.querySelector('.crewlet-copyable__value')!.textContent).toBe('https://api.example.com/v1/');
});

test('a compact value is framed, sized to itself, drawn whole as copied, its control always shown', () => {
  // Read back from the cascade, so the compact rules are measured winning over the base and IconButton ones.
  const uninstall = installThemed('light', 'IconButton/IconButton.css', 'Copyable/Copyable.css');
  try {
    const name = 'crewlet-growth-marketing-lead';
    const address = 'crewlet-growth@example-identity.iam.example.com/agents';
    const { container } = render(
      <>
        <Copyable value={name} variant="compact" ariaLabel="Copy the key's name" />
        <Copyable value={name} variant="chip" />
        <Copyable value={address} variant="compact" />
      </>,
    );
    const [compact, chip, path] = [...container.querySelectorAll('.crewlet-copyable')];
    // A chip cuts a value this long; compact draws it whole, with no tooltip repeating what is drawn.
    expect(chip!.querySelector('.crewlet-copyable__value')!.textContent).toContain('…');
    const drawn = compact!.querySelector('.crewlet-copyable__value')!;
    expect(drawn.textContent).toBe(name);
    expect(drawn.hasAttribute('title')).toBe(false);
    const value = getComputedStyle(drawn);
    expect(value.getPropertyValue('white-space')).toBe('pre-wrap');
    expect(value.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(value.getPropertyValue('text-overflow')).toBe('clip');
    const frame = getComputedStyle(compact!);
    const strong = ['color-border-strong'].map((token) => `--${token}`)[0]!;
    expect(channels(frame.borderTopColor)).toEqual(parseHex(themeColour('light', strong)));
    // Sized to the value: no width of its own, as a block's whole row has.
    expect(['', 'auto']).toContain(frame.width);
    const button = getComputedStyle(screen.getByRole('button', { name: "Copy the key's name" }));
    expect(button.opacity).toBe('1');
    expect(button.width).toBe('24px');
    expect(compact!.classList.contains('crewlet-copyable--opaque')).toBe(true);
    expect(breaksAfter(path!)).toEqual(['crewlet-growth@', 'example-identity.', 'iam.', 'example.', 'com/']);
  } finally {
    cleanup();
    uninstall();
  }
});

test('words drawn in an identifier\'s place take the surrounding face, and a short id stays mono', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Copyable.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = /\.crewlet-copyable--words \.crewlet-copyable__value \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(rule).toMatch(/font-family: inherit/);
  const words = render(<Copyable value="01a1e319-46d8" display="Signed-in session" displayWords variant="inline" />);
  expect(words.container.querySelector('.crewlet-copyable')!.classList.contains('crewlet-copyable--words')).toBe(true);
  expect(words.container.querySelector('.crewlet-copyable__value')!.textContent).toBe('Signed-in session');
  cleanup();
  const id = render(<Copyable value="5f2fb65cc4a1" display="5f2fb65" variant="inline" />);
  expect(id.container.querySelector('.crewlet-copyable--words')).toBeNull();
});
