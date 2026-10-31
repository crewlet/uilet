/**
 * Something kept drawn while it leaves: what is drawn, when, and what the
 * wait gives way to.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { driveMotion, preferReducedMotion, settleMotion } from '../../../../apps/ui-tests/src/motion.js';
import { afterMotion, releaseFocus, runningMotion, usePresence } from './index.js';

const restorers: (() => void)[] = [];

afterEach(() => {
  cleanup();
  while (restorers.length > 0) restorers.pop()?.();
});

function reduced(reduce: boolean): void {
  restorers.push(preferReducedMotion(reduce));
}

/** A box the stylesheet would move, and the content it keeps while it leaves. */
function Probe({ shown, instant = false }: { shown: boolean; instant?: boolean }) {
  const box = useRef<HTMLDivElement | null>(null);
  const { present, leaving, entering } = usePresence(shown, box, { instant });
  return (
    <div ref={box} data-testid="box">
      {present ? (
        <p data-leaving={leaving ? '' : undefined} data-entering={entering ? '' : undefined} inert={leaving || undefined}>
          The content
        </p>
      ) : null}
    </div>
  );
}

const content = () => screen.queryByText('The content');

describe('the motion running on an element', () => {
  test('is none where the Web Animations API is missing', () => {
    expect(runningMotion(document.createElement('div'))).toEqual([]);
  });

  test('is what will end: an endless motion, and one already over, are left out', () => {
    const element = document.createElement('div');
    const driver = driveMotion(element);
    driver.start({ endTime: 200 });
    driver.start({ endTime: Number.POSITIVE_INFINITY });
    driver.start({ endTime: 120 }).finish();
    expect(runningMotion(element)).toHaveLength(1);
  });

  test('is waited for at once, synchronously, where none runs', () => {
    const done = vi.fn();
    afterMotion(document.createElement('div'), done);
    expect(done).toHaveBeenCalledTimes(1);
  });

  test('is waited out, and a motion replaced mid way is waited out in its turn', async () => {
    const element = document.createElement('div');
    const driver = driveMotion(element);
    const first = driver.start();
    const done = vi.fn();
    afterMotion(element, done);
    expect(done).not.toHaveBeenCalled();
    // Reversed: the first is cancelled, and the motion that replaces it runs.
    const second = driver.start();
    first.cancel();
    await settleMotion();
    expect(done).not.toHaveBeenCalled();
    second.finish();
    await settleMotion();
    expect(done).toHaveBeenCalledTimes(1);
  });

  test('is no longer waited for once the wait is cancelled', async () => {
    const element = document.createElement('div');
    const motion = driveMotion(element).start();
    const done = vi.fn();
    const cancel = afterMotion(element, done);
    cancel();
    motion.finish();
    await settleMotion();
    expect(done).not.toHaveBeenCalled();
  });
});

describe('the focus something leaving gives up', () => {
  function mount(): { container: HTMLElement; inside: HTMLButtonElement; outside: HTMLButtonElement } {
    document.body.innerHTML = '<div id="panel"><button>Unpin</button></div><button>Rooms</button>';
    const [inside, outside] = [...document.querySelectorAll('button')] as HTMLButtonElement[];
    return { container: document.getElementById('panel')!, inside: inside!, outside: outside! };
  }

  test('goes to the control the host names', () => {
    const { container, inside, outside } = mount();
    inside.focus();
    releaseFocus(container, outside);
    expect(document.activeElement).toBe(outside);
  });

  test('is taken off it where the host names nothing, or names something inside it', () => {
    const { container, inside } = mount();
    inside.focus();
    releaseFocus(container, null);
    expect(document.activeElement).toBe(document.body);
    inside.focus();
    releaseFocus(container, inside);
    expect(document.activeElement).toBe(document.body);
  });

  test('is left alone where the reader has moved on', () => {
    const { container, outside } = mount();
    outside.focus();
    releaseFocus(container, null);
    expect(document.activeElement).toBe(outside);
  });
});

describe('usePresence', () => {
  test('the first draw is what is shown, with no entrance', () => {
    reduced(false);
    const { rerender } = render(<Probe shown />);
    expect(content()?.hasAttribute('data-entering')).toBe(false);
    rerender(<Probe shown={false} />);
    // Nothing moves here, so it leaves at once.
    expect(content()).toBeNull();
  });

  test('nothing hidden on the first draw is drawn, and nothing waits', () => {
    reduced(false);
    render(<Probe shown={false} />);
    expect(content()).toBeNull();
  });

  test('hidden, it stays drawn and inert until the motion running on the box ends', async () => {
    reduced(false);
    const { rerender } = render(<Probe shown />);
    const motion = driveMotion(screen.getByTestId('box')).start();
    rerender(<Probe shown={false} />);
    expect(content()?.hasAttribute('data-leaving')).toBe(true);
    expect(content()?.hasAttribute('inert')).toBe(true);
    motion.finish();
    await settleMotion();
    expect(content()).toBeNull();
  });

  test('shown again on the way out, it is live where it is, entering until its motion ends', async () => {
    reduced(false);
    const { rerender } = render(<Probe shown />);
    const driver = driveMotion(screen.getByTestId('box'));
    const closing = driver.start();
    rerender(<Probe shown={false} />);
    const opening = driver.start();
    closing.cancel();
    rerender(<Probe shown />);
    expect(content()?.hasAttribute('inert')).toBe(false);
    expect(content()?.hasAttribute('data-entering')).toBe(true);
    await settleMotion();
    // The close that was under way ends nothing.
    expect(content()).not.toBeNull();
    expect(content()?.hasAttribute('data-entering')).toBe(true);
    opening.finish();
    await settleMotion();
    expect(content()?.hasAttribute('data-entering')).toBe(false);
  });

  test('under reduced motion it goes straight through, whatever is running', () => {
    reduced(true);
    const { rerender } = render(<Probe shown />);
    driveMotion(screen.getByTestId('box')).start();
    rerender(<Probe shown={false} />);
    expect(content()).toBeNull();
    rerender(<Probe shown />);
    expect(content()?.hasAttribute('data-entering')).toBe(false);
  });

  test('a change the host marks instant goes straight through', () => {
    reduced(false);
    const { rerender } = render(<Probe shown instant />);
    driveMotion(screen.getByTestId('box')).start();
    rerender(<Probe shown={false} instant />);
    expect(content()).toBeNull();
  });
});
