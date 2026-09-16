/**
 * Fullscreen, against a document that stands in for the browser's.
 *
 * jsdom implements none of the API, which is exactly the shape of the browser
 * this has to stay correct on (iPhone Safari offers no element fullscreen), so
 * the unsupported case is the DEFAULT here and the supported one is installed
 * per test.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { useFullscreen } from './index.js';

const request = vi.fn<(this: Element) => Promise<void>>();
const exitFullscreen = vi.fn<() => Promise<void>>();

/** Installs the API a browser that offers fullscreen has, for one test. */
function supportFullscreen(): () => void {
  const document_ = document as Document & { fullscreenElement: Element | null };
  const define = (target: object, name: string, value: unknown) => {
    const had = Object.getOwnPropertyDescriptor(target, name);
    Object.defineProperty(target, name, { configurable: true, writable: true, value });
    return () => {
      if (had) Object.defineProperty(target, name, had);
      else delete (target as Record<string, unknown>)[name];
    };
  };
  const undo = [
    define(document_, 'fullscreenEnabled', true),
    define(document_, 'fullscreenElement', null),
    define(document_, 'exitFullscreen', exitFullscreen),
    define(Element.prototype, 'requestFullscreen', request),
  ];
  request.mockImplementation(function (this: Element) {
    document_.fullscreenElement = this;
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });
  exitFullscreen.mockImplementation(() => {
    document_.fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });
  return () => {
    for (const restore of undo.reverse()) restore();
  };
}

function Panel() {
  const box = useRef<HTMLDivElement>(null);
  const { supported, active, toggle, exit } = useFullscreen(box);
  return (
    <div ref={box}>
      <p>supported: {String(supported)}</p>
      <p>active: {String(active)}</p>
      {supported ? (
        <button onClick={toggle}>{active ? 'Leave fullscreen' : 'Fullscreen'}</button>
      ) : null}
      <button onClick={exit}>Leave</button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('the control is not drawn where the browser has no fullscreen', () => {
  render(<Panel />);
  expect(screen.getByText('supported: false')).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Fullscreen' })).toBeNull();
});

test('a control that has never been mounted does not decide whether it is supported', () => {
  // The engine's version read the element's own requestFullscreen inside an
  // effect, so a panel that mounts later was told the browser cannot do it.
  const restore = supportFullscreen();
  try {
    render(<Panel />);
    expect(screen.getByText('supported: true')).toBeDefined();
  } finally {
    restore();
  }
});

test('the toggle enters, reports itself active and leaves again', async () => {
  const restore = supportFullscreen();
  try {
    render(<Panel />);
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' })));
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.getByText('active: true')).toBeDefined();

    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Leave fullscreen' })));
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.getByText('active: false')).toBeDefined();
  } finally {
    restore();
  }
});

test('another element going fullscreen does not make this one active', async () => {
  const restore = supportFullscreen();
  try {
    render(<Panel />);
    const other = document.createElement('div');
    document.body.append(other);
    await act(async () => {
      await other.requestFullscreen();
    });
    expect(screen.getByText('active: false')).toBeDefined();
    other.remove();
  } finally {
    restore();
  }
});

test('leaving does nothing while somebody else holds fullscreen', async () => {
  const restore = supportFullscreen();
  try {
    render(<Panel />);
    const other = document.createElement('div');
    document.body.append(other);
    await act(async () => {
      await other.requestFullscreen();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    // Not ours to leave: a surface acting outside itself would drop somebody
    // else's fullscreen on the way past.
    expect(exitFullscreen).not.toHaveBeenCalled();
    other.remove();
  } finally {
    restore();
  }
});

test('a refused request leaves the control as it was, and rejects nothing', async () => {
  const restore = supportFullscreen();
  // A request needs a user gesture and a permission policy that allows it, so
  // a refusal is ordinary. Unhandled, it is a console error in a click handler
  // that nobody can act on, so the rejection is watched for here rather than
  // only the state being checked.
  const unhandled: unknown[] = [];
  const watch = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', watch);
  try {
    /*
     * A PLAIN function rather than the spy: vitest attaches its own handler to
     * a promise a mock returns, in order to record how it settled, and a
     * rejection it has handled can never be seen as unhandled. The spy would
     * make the assertion below one that cannot fail.
     */
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      writable: true,
      value: () => Promise.reject(new Error('gesture required')),
    });
    render(<Panel />);
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' })));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unhandled).toEqual([]);
    expect(screen.getByText('active: false')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeDefined();
  } finally {
    process.off('unhandledRejection', watch);
    restore();
  }
});
